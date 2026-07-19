import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import {
  subscribeToAccountSuspended,
  toLimitedAccessUser,
} from '@/lib/account-suspension';
import { getVerificationStatus } from '@/lib/profile-api';
import type { RegisterInput, User } from '@/types/api';

const SESSION_KEY = 'tecnicos-en-rd.session.v1';

export interface SessionUser extends User {
  mapVisible?: boolean;
}

interface StoredSession {
  token: string;
  user: SessionUser;
}

interface SessionIdentity {
  token: string;
  userId: string;
}

const SESSION_CHANGED_MESSAGE = 'La sesión cambió mientras se completaba la operación.';

export interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateSessionUser: (updates: Partial<SessionUser>) => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  resendVerification: () => Promise<string>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutEmbeddedPhoto(user: SessionUser): SessionUser {
  if (typeof user.photoUrl !== 'string' || !user.photoUrl.trim().toLowerCase().startsWith('data:')) {
    return user;
  }

  const { photoUrl: _embeddedPhoto, ...persistableUser } = user;
  return persistableUser;
}

function toPersistableSession(session: StoredSession): StoredSession {
  return {
    token: session.token,
    user: withoutEmbeddedPhoto(session.user),
  };
}

function getSessionIdentity(session: StoredSession): SessionIdentity {
  return { token: session.token, userId: session.user.id };
}

function matchesSessionIdentity(
  session: StoredSession | null,
  expected: SessionIdentity
): session is StoredSession {
  return session?.token === expected.token && session.user.id === expected.userId;
}

function parseSession(value: string | null): StoredSession | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || typeof parsed.token !== 'string' || !isRecord(parsed.user)) {
      return null;
    }
    const user = parsed.user;
    if (
      typeof user.id !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.email !== 'string' ||
      !['user', 'technician', 'admin'].includes(String(user.role))
    ) {
      return null;
    }
    return toPersistableSession({
      token: parsed.token,
      user: user as unknown as SessionUser,
    });
  } catch {
    return null;
  }
}

async function readStoredSession(): Promise<StoredSession | null> {
  if (Platform.OS === 'web') return null;
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
  const parsedSession = parseSession(rawSession);

  // Migrate any legacy session that embedded a base64 profile photo in Keychain.
  if (rawSession && parsedSession) {
    const sanitizedSession = JSON.stringify(toPersistableSession(parsedSession));
    if (sanitizedSession !== rawSession) {
      await SecureStore.setItemAsync(SESSION_KEY, sanitizedSession, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  }

  return parsedSession;
}

async function writeStoredSession(session: StoredSession | null): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(toPersistableSession(session)), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<StoredSession | null>(null);
  const sessionRevisionRef = useRef(0);
  const authOperationRef = useRef(0);
  const storageWriteRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    const initialRevision = sessionRevisionRef.current;
    const initialAuthOperation = authOperationRef.current;

    void readStoredSession()
      .then((storedSession) => {
        if (
          active &&
          sessionRevisionRef.current === initialRevision &&
          authOperationRef.current === initialAuthOperation
        ) {
          sessionRef.current = storedSession;
          setSession(storedSession);
        }
      })
      .catch(() => {
        // A locked/unavailable keychain should behave like a signed-out session.
        if (
          active &&
          sessionRevisionRef.current === initialRevision &&
          authOperationRef.current === initialAuthOperation
        ) {
          sessionRef.current = null;
          setSession(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const commitSession = useCallback(async (nextSession: StoredSession | null) => {
    sessionRevisionRef.current += 1;
    sessionRef.current = nextSession;
    setSession(nextSession);

    // Serialize writes so a slow earlier update can never overwrite a later logout.
    const storageWrite = storageWriteRef.current
      .catch(() => undefined)
      .then(() => writeStoredSession(nextSession));
    storageWriteRef.current = storageWrite;
    await storageWrite;
  }, []);

  useEffect(() => subscribeToAccountSuspended((notice) => {
    const currentSession = sessionRef.current;
    // Ignore a late response from a session that has already logged out or
    // been replaced by a different account.
    if (!currentSession || currentSession.token !== notice.token) return;
    if (
      currentSession.user.limitedAccess &&
      currentSession.user.accountModerationStatus === 'SUSPENDED' &&
      currentSession.user.accountModerationReason === notice.accountModerationReason
    ) return;

    void commitSession({
      token: currentSession.token,
      user: toLimitedAccessUser(currentSession.user, notice),
    }).catch(() => undefined);
  }), [commitSession]);

  const performLogin = useCallback(async (
    email: string,
    password: string,
    authOperation: number
  ) => {
    const response = await api.auth.login(email.trim().toLowerCase(), password);
    if (authOperationRef.current !== authOperation) {
      throw new Error(SESSION_CHANGED_MESSAGE);
    }
    const { moderationReason, moderationStatus, token, ...user } = response;
    const normalizedUser: SessionUser = {
      ...user,
      technicianModerationStatus:
        user.technicianModerationStatus ?? moderationStatus,
      technicianModerationReason:
        user.technicianModerationReason ?? moderationReason,
    };
    await commitSession({ token, user: normalizedUser });
  }, [commitSession]);

  const login = useCallback(async (email: string, password: string) => {
    const authOperation = ++authOperationRef.current;
    await performLogin(email, password, authOperation);
  }, [performLogin]);

  const register = useCallback(async (input: RegisterInput) => {
    const authOperation = ++authOperationRef.current;
    const normalizedInput: RegisterInput = {
      ...input,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
      specializations: input.specializations
        ?.map((specialization) => specialization.trim())
        .filter(Boolean),
      location: input.location?.trim() || undefined,
      companyName: input.companyName?.trim() || undefined,
    };
    await api.auth.register(normalizedInput);
    if (authOperationRef.current !== authOperation) {
      throw new Error(SESSION_CHANGED_MESSAGE);
    }
    await performLogin(normalizedInput.email, normalizedInput.password, authOperation);
  }, [performLogin]);

  const logout = useCallback(async () => {
    authOperationRef.current += 1;
    await commitSession(null);
  }, [commitSession]);

  const updateSessionUser = useCallback(async (updates: Partial<SessionUser>) => {
    if (!session) throw new Error('Debes iniciar sesión para actualizar tu cuenta.');
    const expectedSession = getSessionIdentity(session);
    const currentSession = sessionRef.current;
    if (!matchesSessionIdentity(currentSession, expectedSession)) {
      throw new Error(SESSION_CHANGED_MESSAGE);
    }
    await commitSession({
      token: currentSession.token,
      user: { ...currentSession.user, ...updates },
    });
  }, [commitSession, session]);

  const refreshVerificationStatus = useCallback(async () => {
    if (!session) throw new Error('Debes iniciar sesión para verificar tu correo.');
    const expectedSession = getSessionIdentity(session);
    const result = await getVerificationStatus(session.token);
    const currentSession = sessionRef.current;
    if (!matchesSessionIdentity(currentSession, expectedSession)) {
      throw new Error(SESSION_CHANGED_MESSAGE);
    }
    const nextUser: SessionUser = {
      ...currentSession.user,
      emailVerified: result.emailVerified,
      ...(result.accountModerationStatus && {
        accountModerationStatus: result.accountModerationStatus,
      }),
      ...(typeof result.limitedAccess === 'boolean' && {
        limitedAccess: result.limitedAccess,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'accountModerationReason') && {
        accountModerationReason: result.accountModerationReason,
      }),
      ...(result.technicianModerationStatus && {
        technicianModerationStatus: result.technicianModerationStatus,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'technicianModerationReason') && {
        technicianModerationReason: result.technicianModerationReason,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'photoModerationStatus') && {
        photoModerationStatus: result.photoModerationStatus,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'photoModerationReason') && {
        photoModerationReason: result.photoModerationReason,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'photoModerationSubmissionId') && {
        photoModerationSubmissionId: result.photoModerationSubmissionId,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'pendingPhotoSubmissionId') && {
        pendingPhotoSubmissionId: result.pendingPhotoSubmissionId,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'photoSubmittedAt') && {
        photoSubmittedAt: result.photoSubmittedAt,
      }),
      ...(Object.prototype.hasOwnProperty.call(result, 'photoModerationReviewedAt') && {
        photoModerationReviewedAt: result.photoModerationReviewedAt,
      }),
    };
    if (JSON.stringify(nextUser) !== JSON.stringify(currentSession.user)) {
      await commitSession({ token: currentSession.token, user: nextUser });
    }
    return result.emailVerified;
  }, [commitSession, session]);

  const resendVerification = useCallback(async () => {
    if (!session) throw new Error('Debes iniciar sesión para reenviar la verificación.');
    const result = await api.auth.resendVerification(session.user.email);
    return result.message;
  }, [session]);

  const deleteAccount = useCallback(async () => {
    if (!session) throw new Error('Debes iniciar sesión para eliminar tu cuenta.');
    const expectedSession = getSessionIdentity(session);
    await api.users.delete(session.user.id, session.token);
    if (matchesSessionIdentity(sessionRef.current, expectedSession)) {
      authOperationRef.current += 1;
      await commitSession(null);
    }
  }, [commitSession, session]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    isLoading,
    isAuthenticated: session !== null,
    login,
    register,
    updateSessionUser,
    refreshVerificationStatus,
    resendVerification,
    logout,
    deleteAccount,
  }), [
    deleteAccount,
    isLoading,
    login,
    logout,
    refreshVerificationStatus,
    register,
    resendVerification,
    session,
    updateSessionUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
