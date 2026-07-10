import crypto from 'crypto';

export type AuthRole = 'user' | 'technician' | 'admin';

export interface AuthTokenPayload {
  sub: string;
  role: AuthRole;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const configuredSecret = process.env.AUTH_SECRET?.trim();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('AUTH_SECRET must be configured with at least 32 characters when NODE_ENV=production');
}

const AUTH_SECRET = configuredSecret || 'technicos-en-rd-development-auth-secret';

if (!isProduction && !configuredSecret) {
  console.warn('AUTH_SECRET is not configured; using a development-only fallback');
}

function sign(encodedPayload: string): Buffer {
  return crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest();
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === 'user' || value === 'technician' || value === 'admin';
}

export function createAuthToken(userId: string, role: AuthRole): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: userId,
    role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload).toString('base64url')}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const actualSignature = Buffer.from(encodedSignature, 'base64url');
    const expectedSignature = sign(encodedPayload);
    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<AuthTokenPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      !isAuthRole(payload.role) ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function normalizeAuthRole(role: string): AuthRole {
  return isAuthRole(role) ? role : 'user';
}
