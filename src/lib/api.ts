const AUTH_TOKEN_KEY = 'tecnicos-rd:auth-token';
const AUTH_USER_KEY = 'tecnicos-rd:auth-user';

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

  if (response.status === 401 && token && canUseStorage()) {
    clearAuthSession();
    window.dispatchEvent(new Event('tecnicos-rd:session-expired'));
  }

  return response;
};
