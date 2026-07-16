import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import type { RegisterInput, User } from '@/types/api';

const SESSION_KEY = 'tecnicos-en-rd.session.v1';

interface StoredSession {
  token: string;
  user: User;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    return parsed as unknown as StoredSession;
  } catch {
    return null;
  }
}

async function readStoredSession(): Promise<StoredSession | null> {
  if (Platform.OS === 'web') return null;
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
  return parseSession(rawSession);
}

async function writeStoredSession(session: StoredSession | null): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void readStoredSession()
      .then((storedSession) => {
        if (active) setSession(storedSession);
      })
      .catch(() => {
        // A locked/unavailable keychain should behave like a signed-out session.
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback(async (nextSession: StoredSession | null) => {
    await writeStoredSession(nextSession);
    setSession(nextSession);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login(email.trim().toLowerCase(), password);
    const { token, ...user } = response;
    await persistSession({ token, user });
  }, [persistSession]);

  const register = useCallback(async (input: RegisterInput) => {
    const normalizedInput: RegisterInput = {
      ...input,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
    };
    await api.auth.register(normalizedInput);
    await login(normalizedInput.email, normalizedInput.password);
  }, [login]);

  const logout = useCallback(async () => {
    await persistSession(null);
  }, [persistSession]);

  const deleteAccount = useCallback(async () => {
    if (!session) throw new Error('Debes iniciar sesión para eliminar tu cuenta.');
    await api.users.delete(session.user.id, session.token);
    await persistSession(null);
  }, [persistSession, session]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    isLoading,
    isAuthenticated: session !== null,
    login,
    register,
    logout,
    deleteAccount,
  }), [deleteAccount, isLoading, login, logout, register, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
