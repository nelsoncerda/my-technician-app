"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthToken = createAuthToken;
exports.verifyAuthToken = verifyAuthToken;
exports.normalizeAuthRole = normalizeAuthRole;
const crypto_1 = __importDefault(require("crypto"));
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const configuredSecret = (_a = process.env.AUTH_SECRET) === null || _a === void 0 ? void 0 : _a.trim();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters when NODE_ENV=production');
}
const AUTH_SECRET = configuredSecret || 'technicos-en-rd-development-auth-secret';
if (!isProduction && !configuredSecret) {
    console.warn('AUTH_SECRET is not configured; using a development-only fallback');
}
function sign(encodedPayload) {
    return crypto_1.default.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest();
}
function isAuthRole(value) {
    return value === 'user' || value === 'technician' || value === 'admin';
}
function createAuthToken(userId, role) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: userId,
        role,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encodedPayload}.${sign(encodedPayload).toString('base64url')}`;
}
function verifyAuthToken(token) {
    const [encodedPayload, encodedSignature, extra] = token.split('.');
    if (!encodedPayload || !encodedSignature || extra)
        return null;
    try {
        const actualSignature = Buffer.from(encodedSignature, 'base64url');
        const expectedSignature = sign(encodedPayload);
        if (actualSignature.length !== expectedSignature.length ||
            !crypto_1.default.timingSafeEqual(actualSignature, expectedSignature)) {
            return null;
        }
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.sub !== 'string' ||
            !payload.sub ||
            !isAuthRole(payload.role) ||
            typeof payload.iat !== 'number' ||
            typeof payload.exp !== 'number' ||
            payload.iat > now + 60 ||
            payload.exp <= now) {
            return null;
        }
        return payload;
    }
    catch (_a) {
        return null;
    }
}
function normalizeAuthRole(role) {
    return isAuthRole(role) ? role : 'user';
}
