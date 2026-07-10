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
exports.requireAdmin = exports.requireAuth = void 0;
exports.requireRole = requireRole;
exports.requireSelfOrAdmin = requireSelfOrAdmin;
exports.requireTechnicianOwnerOrAdmin = requireTechnicianOwnerOrAdmin;
const prisma_1 = __importDefault(require("../prisma"));
const token_1 = require("../security/token");
function unauthorized(res) {
    return res.status(401).json({ message: 'Autenticación requerida' });
}
function forbidden(res) {
    return res.status(403).json({ message: 'No autorizado' });
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
            select: { id: true, role: true },
        });
        if (!user) {
            unauthorized(res);
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
