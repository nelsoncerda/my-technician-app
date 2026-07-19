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
exports.MODERATION_SLA_HOURS = exports.CURRENT_UGC_TERMS_VERSION = void 0;
exports.hasInlineCurrentTermsConsent = hasInlineCurrentTermsConsent;
exports.hasCurrentTermsConsent = hasCurrentTermsConsent;
exports.recordCurrentTermsConsent = recordCurrentTermsConsent;
exports.termsRequiredPayload = termsRequiredPayload;
exports.moderationAge = moderationAge;
const prisma_1 = __importDefault(require("../prisma"));
exports.CURRENT_UGC_TERMS_VERSION = '2026-07-18';
exports.MODERATION_SLA_HOURS = 24;
function hasInlineCurrentTermsConsent(body) {
    var _a;
    if (!body || typeof body !== 'object' || Array.isArray(body))
        return false;
    const value = body;
    const accepted = value.ugcTermsAccepted === true || value.accepted === true;
    const version = (_a = value.ugcTermsVersion) !== null && _a !== void 0 ? _a : value.termsVersion;
    return accepted && version === exports.CURRENT_UGC_TERMS_VERSION;
}
function hasCurrentTermsConsent(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, db = prisma_1.default) {
        const consent = yield db.ugcTermsConsent.findUnique({
            where: {
                userId_termsVersion: {
                    userId,
                    termsVersion: exports.CURRENT_UGC_TERMS_VERSION,
                },
            },
            select: { id: true },
        });
        return Boolean(consent);
    });
}
function recordCurrentTermsConsent(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const db = (_a = input.db) !== null && _a !== void 0 ? _a : prisma_1.default;
        return db.ugcTermsConsent.upsert({
            where: {
                userId_termsVersion: {
                    userId: input.userId,
                    termsVersion: exports.CURRENT_UGC_TERMS_VERSION,
                },
            },
            update: {},
            create: {
                userId: input.userId,
                termsVersion: exports.CURRENT_UGC_TERMS_VERSION,
                ipAddress: input.ipAddress || null,
                userAgent: ((_b = input.userAgent) === null || _b === void 0 ? void 0 : _b.slice(0, 500)) || null,
            },
        });
    });
}
function termsRequiredPayload() {
    return {
        code: 'UGC_TERMS_REQUIRED',
        message: 'Debes aceptar las reglas de la comunidad antes de publicar contenido',
        requiredVersion: exports.CURRENT_UGC_TERMS_VERSION,
        termsUrl: '/terms#community-rules',
    };
}
function moderationAge(createdAt, now = new Date()) {
    const ageHours = Math.max(0, (now.getTime() - createdAt.getTime()) / 3600000);
    return {
        ageHours: Math.round(ageHours * 10) / 10,
        overdue: ageHours >= exports.MODERATION_SLA_HOURS,
    };
}
