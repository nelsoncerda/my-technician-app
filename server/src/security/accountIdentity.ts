import crypto from 'crypto';

const configuredSecret = process.env.ACCOUNT_IDENTITY_SECRET?.trim()
  || process.env.AUTH_SECRET?.trim();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('ACCOUNT_IDENTITY_SECRET (or AUTH_SECRET fallback) must contain at least 32 characters in production');
}

const IDENTITY_SECRET = configuredSecret || 'technicos-en-rd-development-auth-secret';

/**
 * Returns a stable, keyed pseudonymous identifier for account-recreation
 * safety checks. The normalized email is never stored in a deletion marker,
 * and the digest cannot be reproduced without the server's stable identity
 * secret. ACCOUNT_IDENTITY_SECRET must not be rotated without a marker migration.
 */
export function accountIdentityDigest(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return crypto
    .createHmac('sha256', IDENTITY_SECRET)
    .update(`deleted-account-email-v1:${normalizedEmail}`)
    .digest('hex');
}
