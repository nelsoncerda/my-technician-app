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
exports.requireAdmin = exports.optionalAuth = exports.requireAuthAllowSuspended = exports.requireAuth = void 0;
exports.requireRole = requireRole;
exports.requireSelfOrAdmin = requireSelfOrAdmin;
exports.requireSelfOrActiveAdmin = requireSelfOrActiveAdmin;
exports.requireTechnicianOwnerOrAdmin = requireTechnicianOwnerOrAdmin;
const prisma_1 = __importDefault(require("../prisma"));
const token_1 = require("../security/token");
function unauthorized(res) {
    return res.status(401).json({ message: 'Autenticación requerida' });
}
function forbidden(res) {
    return res.status(403).json({ message: 'No autorizado' });
}
function accountSuspended(res, reason) {
    return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Esta cuenta está suspendida. Contacta a soporte si deseas apelar.',
        accountModerationStatus: 'SUSPENDED',
        accountModerationReason: reason || null,
        limitedAccess: true,
        supportUrl: '/support',
    });
}
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authorization = req.headers.authorization;
    if (!(authorization === null || authorization === void 0 ? void 0 : authorization.startsWith('Bearer '))) {
        unauthorized(res);
        return;
    }
    const payload = (0, token_1.verifyAuthToken)(authorization.slice('Bearer '.length).trim());
    if (!payload) {
        unauthorized(res);
        return;
    }
    try {
        // The database remains authoritative for account existence and current role.
        // This immediately invalidates deleted users and stale role claims.
        const user = yield prisma_1.default.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
        });
        if (!user || user.deletedAt) {
            unauthorized(res);
            return;
        }
        if (user.moderationStatus === 'SUSPENDED') {
            accountSuspended(res, user.moderationReason);
            return;
        }
        req.auth = { userId: user.id, role: (0, token_1.normalizeAuthRole)(user.role) };
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.requireAuth = requireAuth;
/**
 * Limited authentication for rights that must remain available after an
 * account suspension: own-report history and permanent self-service deletion.
 * Never attach this middleware to general application or admin routes.
 */
const requireAuthAllowSuspended = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authorization = req.headers.authorization;
    if (!(authorization === null || authorization === void 0 ? void 0 : authorization.startsWith('Bearer '))) {
        unauthorized(res);
        return;
    }
    const payload = (0, token_1.verifyAuthToken)(authorization.slice('Bearer '.length).trim());
    if (!payload) {
        unauthorized(res);
        return;
    }
    try {
        const user = yield prisma_1.default.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
        });
        if (!user || user.deletedAt) {
            unauthorized(res);
            return;
        }
        req.auth = {
            userId: user.id,
            role: (0, token_1.normalizeAuthRole)(user.role),
            accountSuspended: user.moderationStatus === 'SUSPENDED',
        };
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.requireAuthAllowSuspended = requireAuthAllowSuspended;
/**
 * Adds authenticated context to otherwise-public routes. A missing token keeps
 * the request anonymous; a supplied but invalid/stale token is rejected so a
 * blocked user cannot bypass visibility rules by sending a bad credential.
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authorization = req.headers.authorization;
    if (!authorization) {
        next();
        return;
    }
    if (!authorization.startsWith('Bearer ')) {
        unauthorized(res);
        return;
    }
    const payload = (0, token_1.verifyAuthToken)(authorization.slice('Bearer '.length).trim());
    if (!payload) {
        unauthorized(res);
        return;
    }
    try {
        const user = yield prisma_1.default.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
        });
        if (!user || user.deletedAt) {
            unauthorized(res);
            return;
        }
        if (user.moderationStatus === 'SUSPENDED') {
            accountSuspended(res, user.moderationReason);
            return;
        }
        req.auth = { userId: user.id, role: (0, token_1.normalizeAuthRole)(user.role) };
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.optionalAuth = optionalAuth;
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth) {
            unauthorized(res);
            return;
        }
        if (!roles.includes(req.auth.role)) {
            forbidden(res);
            return;
        }
        next();
    };
}
function requireSelfOrAdmin(paramName = 'id') {
    return (req, res, next) => {
        if (!req.auth) {
            unauthorized(res);
            return;
        }
        if (req.auth.role !== 'admin' && req.params[paramName] !== req.auth.userId) {
            forbidden(res);
            return;
        }
        next();
    };
}
/** Active administrators may delete other accounts; suspended administrators
 * retain only the same self-deletion right as every other suspended user. */
function requireSelfOrActiveAdmin(paramName = 'id') {
    return (req, res, next) => {
        if (!req.auth) {
            unauthorized(res);
            return;
        }
        const isSelf = req.params[paramName] === req.auth.userId;
        const isActiveAdmin = req.auth.role === 'admin' && !req.auth.accountSuspended;
        if (!isSelf && !isActiveAdmin) {
            forbidden(res);
            return;
        }
        next();
    };
}
function requireTechnicianOwnerOrAdmin(fieldName = 'technicianId', source = 'params') {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!req.auth) {
            unauthorized(res);
            return;
        }
        if (req.auth.role === 'admin') {
            next();
            return;
        }
        if (req.auth.role !== 'technician') {
            forbidden(res);
            return;
        }
        const technicianId = source === 'params' ? req.params[fieldName] : (_a = req.body) === null || _a === void 0 ? void 0 : _a[fieldName];
        if (typeof technicianId !== 'string' || !technicianId) {
            res.status(400).json({ message: 'ID del técnico requerido' });
            return;
        }
        try {
            const technician = yield prisma_1.default.technician.findUnique({
                where: { id: technicianId },
                select: { userId: true },
            });
            if (!technician || technician.userId !== req.auth.userId) {
                forbidden(res);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
}
exports.requireAdmin = requireRole('admin');
