"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountIdentityDigest = accountIdentityDigest;
const crypto_1 = __importDefault(require("crypto"));
const configuredSecret = ((_a = process.env.ACCOUNT_IDENTITY_SECRET) === null || _a === void 0 ? void 0 : _a.trim())
    || ((_b = process.env.AUTH_SECRET) === null || _b === void 0 ? void 0 : _b.trim());
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
function accountIdentityDigest(email) {
    const normalizedEmail = email.trim().toLowerCase();
    return crypto_1.default
        .createHmac('sha256', IDENTITY_SECRET)
        .update(`deleted-account-email-v1:${normalizedEmail}`)
        .digest('hex');
}
