import crypto from 'crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });

  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export function isHashedPassword(value: string): boolean {
  return value.startsWith(`${SCRYPT_PREFIX}$`);
}

export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<PasswordVerificationResult> {
  if (!isHashedPassword(storedPassword)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    const valid = supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
    return { valid, needsRehash: valid };
  }

  const [prefix, nValue, rValue, pValue, saltValue, hashValue] = storedPassword.split('$');
  const N = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);

  // Only accept the version/parameters this application emits. This prevents a
  // malformed database value from turning login into an expensive scrypt call.
  if (
    prefix !== SCRYPT_PREFIX ||
    N !== SCRYPT_N ||
    r !== SCRYPT_R ||
    p !== SCRYPT_P ||
    !saltValue ||
    !hashValue
  ) {
    return { valid: false, needsRehash: false };
  }

  try {
    const expected = Buffer.from(hashValue, 'base64url');
    if (expected.length !== KEY_LENGTH) {
      return { valid: false, needsRehash: false };
    }

    const actual = await deriveKey(password, Buffer.from(saltValue, 'base64url'), expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEMORY,
    });

    return {
      valid: actual.length === expected.length && crypto.timingSafeEqual(actual, expected),
      needsRehash: false,
    };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
