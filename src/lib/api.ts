const AUTH_TOKEN_KEY = 'tecnicos-rd:auth-token';
const AUTH_USER_KEY = 'tecnicos-rd:auth-user';
export const ACCOUNT_SUSPENDED_EVENT = 'tecnicos-rd:account-suspended';

export interface AccountSuspendedEventDetail {
  accountModerationStatus: 'SUSPENDED';
  accountModerationReason?: string | null;
  limitedAccess: true;
  suspensionMessage?: string;
  supportUrl?: string;
}

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getAuthToken = (): string | null => {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getStoredUser = <T>(): T | null => {
  if (!canUseStorage()) return null;

  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const setAuthSession = <T>(token: string, user: T) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const updateStoredUser = <T>(user: T) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

export const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 403 && token && canUseStorage()) {
    const data = await response.clone().json().catch(() => null) as Record<string, unknown> | null;
    // A response that belongs to an older session must never restrict the
    // account that is currently signed in.
    if (data?.code === 'ACCOUNT_SUSPENDED' && getAuthToken() === token) {
      const detail: AccountSuspendedEventDetail = {
        accountModerationStatus: 'SUSPENDED',
        accountModerationReason: typeof data.accountModerationReason === 'string'
          ? data.accountModerationReason
          : null,
        limitedAccess: true,
        suspensionMessage: typeof data.message === 'string' ? data.message : undefined,
        supportUrl: typeof data.supportUrl === 'string' ? data.supportUrl : undefined,
      };
      const storedUser = getStoredUser<Record<string, unknown>>();
      if (storedUser) updateStoredUser({ ...storedUser, ...detail });
      window.dispatchEvent(new CustomEvent<AccountSuspendedEventDetail>(
        ACCOUNT_SUSPENDED_EVENT,
        { detail }
      ));
    }
  }

  if (response.status === 401 && token && canUseStorage()) {
    clearAuthSession();
    window.dispatchEvent(new Event('tecnicos-rd:session-expired'));
  }

  return response;
};
