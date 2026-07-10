"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.isHashedPassword = isHashedPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = __importDefault(require("crypto"));
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
function deriveKey(password, salt, keyLength, options) {
    return new Promise((resolve, reject) => {
        crypto_1.default.scrypt(password, salt, keyLength, options, (error, derivedKey) => {
            if (error)
                reject(error);
            else
                resolve(derivedKey);
        });
    });
}
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = crypto_1.default.randomBytes(16);
        const derivedKey = yield deriveKey(password, salt, KEY_LENGTH, {
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
    });
}
function isHashedPassword(value) {
    return value.startsWith(`${SCRYPT_PREFIX}$`);
}
function verifyPassword(password, storedPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isHashedPassword(storedPassword)) {
            const supplied = Buffer.from(password);
            const stored = Buffer.from(storedPassword);
            const valid = supplied.length === stored.length && crypto_1.default.timingSafeEqual(supplied, stored);
            return { valid, needsRehash: valid };
        }
        const [prefix, nValue, rValue, pValue, saltValue, hashValue] = storedPassword.split('$');
        const N = Number(nValue);
        const r = Number(rValue);
        const p = Number(pValue);
        // Only accept the version/parameters this application emits. This prevents a
        // malformed database value from turning login into an expensive scrypt call.
        if (prefix !== SCRYPT_PREFIX ||
            N !== SCRYPT_N ||
            r !== SCRYPT_R ||
            p !== SCRYPT_P ||
            !saltValue ||
            !hashValue) {
            return { valid: false, needsRehash: false };
        }
        try {
            const expected = Buffer.from(hashValue, 'base64url');
            if (expected.length !== KEY_LENGTH) {
                return { valid: false, needsRehash: false };
            }
            const actual = yield deriveKey(password, Buffer.from(saltValue, 'base64url'), expected.length, {
                N,
                r,
                p,
                maxmem: MAX_MEMORY,
            });
            return {
                valid: actual.length === expected.length && crypto_1.default.timingSafeEqual(actual, expected),
                needsRehash: false,
            };
        }
        catch (_a) {
            return { valid: false, needsRehash: false };
        }
    });
}
