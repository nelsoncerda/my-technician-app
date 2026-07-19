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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConsent = getConsent;
exports.acceptConsent = acceptConsent;
exports.createReport = createReport;
exports.listOwnReports = listOwnReports;
exports.listBlocks = listBlocks;
exports.createBlock = createBlock;
exports.deleteBlock = deleteBlock;
exports.getAdminQueue = getAdminQueue;
exports.moderateTechnician = moderateTechnician;
exports.moderateProfilePhoto = moderateProfilePhoto;
exports.resolveReport = resolveReport;
exports.moderateUser = moderateUser;
exports.claimReport = claimReport;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
const emailService_1 = require("../services/emailService");
const moderationService_1 = require("../services/moderationService");
const REPORT_CONTENT_TYPES = new Set(Object.values(client_1.ReportContentType));
const REPORT_REASONS = new Set(Object.values(client_1.ReportReason));
const FINAL_REPORT_STATUSES = new Set([
    client_1.ContentReportStatus.RESOLVED,
    client_1.ContentReportStatus.DISMISSED,
]);
const REPORT_ACTIONS = new Set(Object.values(client_1.ModerationAction));
const ACTIVE_REPORT_STATUSES = [
    client_1.ContentReportStatus.OPEN,
    client_1.ContentReportStatus.UNDER_REVIEW,
];
function requestMetadata(req) {
    var _a;
    return {
        ipAddress: req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || null,
        userAgent: req.headers['user-agent'] || null,
    };
}
function sha256(value) {
    return crypto_1.default.createHash('sha256').update(value).digest('hex');
}
function parseQueueLimit(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value))
        return 25;
    return Math.min(50, Math.max(1, Number(value)));
}
function cleanOptionalText(value, maximum) {
    if (value === undefined || value === null || value === '')
        return null;
    if (typeof value !== 'string')
        return undefined;
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > maximum)
        return undefined;
    return cleaned;
}
function getConsent(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const consent = yield prisma_1.default.ugcTermsConsent.findUnique({
                where: {
                    userId_termsVersion: {
                        userId: req.auth.userId,
                        termsVersion: moderationService_1.CURRENT_UGC_TERMS_VERSION,
                    },
                },
                select: { termsVersion: true, acceptedAt: true },
            });
            res.json(Object.assign({ requiredVersion: moderationService_1.CURRENT_UGC_TERMS_VERSION, accepted: Boolean(consent) }, (consent && {
                acceptedVersion: consent.termsVersion,
                acceptedAt: consent.acceptedAt,
            })));
        }
        catch (error) {
            console.error('Error reading UGC consent:', error);
            res.status(500).json({ message: 'No se pudo consultar la aceptación de las reglas' });
        }
    });
}
function acceptConsent(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, moderationService_1.hasInlineCurrentTermsConsent)(req.body)) {
            return res.status(400).json({
                code: 'INVALID_UGC_TERMS_VERSION',
                message: 'Debes aceptar la versión vigente de las reglas de la comunidad',
                requiredVersion: moderationService_1.CURRENT_UGC_TERMS_VERSION,
            });
        }
        try {
            const consent = yield (0, moderationService_1.recordCurrentTermsConsent)(Object.assign({ userId: req.auth.userId }, requestMetadata(req)));
            res.json({
                requiredVersion: moderationService_1.CURRENT_UGC_TERMS_VERSION,
                accepted: true,
                acceptedVersion: consent.termsVersion,
                acceptedAt: consent.acceptedAt,
            });
        }
        catch (error) {
            console.error('Error saving UGC consent:', error);
            res.status(500).json({ message: 'No se pudo guardar la aceptación de las reglas' });
        }
    });
}
function createReport(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { targetUserId, technicianId, contentType, reason } = req.body || {};
        const details = cleanOptionalText((_a = req.body) === null || _a === void 0 ? void 0 : _a.details, 500);
        if (typeof targetUserId !== 'string' || !targetUserId.trim() || targetUserId.length > 100) {
            return res.status(400).json({ message: 'La persona reportada no es válida' });
        }
        if (targetUserId === req.auth.userId) {
            return res.status(400).json({ message: 'No puedes reportarte a ti mismo' });
        }
        if (technicianId !== undefined && (typeof technicianId !== 'string' || !technicianId.trim() || technicianId.length > 100)) {
            return res.status(400).json({ message: 'El perfil técnico reportado no es válido' });
        }
        if (!REPORT_CONTENT_TYPES.has(contentType)) {
            return res.status(400).json({ message: 'El tipo de contenido reportado no es válido' });
        }
        if (!REPORT_REASONS.has(reason)) {
            return res.status(400).json({ message: 'El motivo del reporte no es válido' });
        }
        if (details === undefined || (reason === client_1.ReportReason.OTHER && !details)) {
            return res.status(400).json({ message: 'Describe brevemente el motivo del reporte' });
        }
        const normalizedTargetUserId = targetUserId.trim();
        const normalizedTechnicianId = typeof technicianId === 'string' ? technicianId.trim() : null;
        const dedupeKey = `${req.auth.userId}:${normalizedTargetUserId}:${contentType}`;
        try {
            const report = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const targetUser = yield tx.user.findUnique({
                    where: { id: normalizedTargetUserId },
                    select: { id: true, photoUrl: true, deletedAt: true, technician: { select: { id: true } } },
                });
                if (!targetUser || targetUser.deletedAt) {
                    throw new ModerationRequestError(404, 'Usuario reportado no encontrado');
                }
                if (normalizedTechnicianId && ((_a = targetUser.technician) === null || _a === void 0 ? void 0 : _a.id) !== normalizedTechnicianId) {
                    throw new ModerationRequestError(400, 'El perfil técnico no pertenece al usuario reportado');
                }
                if (contentType === client_1.ReportContentType.PROFILE && !targetUser.technician) {
                    throw new ModerationRequestError(400, 'Este usuario no tiene un perfil técnico público');
                }
                if (contentType === client_1.ReportContentType.PHOTO && !targetUser.photoUrl) {
                    throw new ModerationRequestError(400, 'Este usuario no tiene una foto pública para reportar');
                }
                const approvedPhoto = contentType === client_1.ReportContentType.PHOTO
                    ? yield tx.profilePhotoSubmission.findFirst({
                        where: { userId: targetUser.id, status: client_1.ProfilePhotoModerationStatus.APPROVED },
                        orderBy: { reviewedAt: 'desc' },
                        select: { id: true },
                    })
                    : null;
                return tx.contentReport.create({
                    data: {
                        reporterId: req.auth.userId,
                        targetUserId: targetUser.id,
                        technicianId: normalizedTechnicianId || ((_b = targetUser.technician) === null || _b === void 0 ? void 0 : _b.id) || null,
                        profilePhotoSubmissionId: (approvedPhoto === null || approvedPhoto === void 0 ? void 0 : approvedPhoto.id) || null,
                        contentType,
                        reason,
                        details,
                        contentFingerprint: contentType === client_1.ReportContentType.PHOTO && targetUser.photoUrl
                            ? sha256(targetUser.photoUrl)
                            : null,
                        dedupeKey,
                    },
                    include: {
                        targetUser: { select: { id: true, name: true } },
                        technician: { select: { id: true } },
                    },
                });
            }));
            // Alerting is best effort. The report is already durable in the queue and a
            // mail outage must never prevent a user from reporting safety concerns.
            void (0, emailService_1.sendModerationReportAlert)({
                reportId: report.id,
                contentType: report.contentType,
                reason: report.reason,
                createdAt: report.createdAt,
            }).catch((error) => console.error('Moderation report alert failed:', error));
            res.status(201).json(report);
        }
        catch (error) {
            if (error instanceof ModerationRequestError) {
                return res.status(error.status).json({ message: error.message });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ message: 'Ya existe un reporte abierto sobre este contenido' });
            }
            console.error('Error creating moderation report:', error);
            res.status(500).json({ message: 'No se pudo enviar el reporte' });
        }
    });
}
function listOwnReports(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reports = yield prisma_1.default.contentReport.findMany({
                where: { reporterId: req.auth.userId },
                select: {
                    id: true,
                    targetUserId: true,
                    technicianId: true,
                    contentType: true,
                    reason: true,
                    details: true,
                    status: true,
                    action: true,
                    reviewedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    targetUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            res.json(reports);
        }
        catch (error) {
            console.error('Error listing moderation reports:', error);
            res.status(500).json({ message: 'No se pudieron cargar tus reportes' });
        }
    });
}
function listBlocks(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const blocks = yield prisma_1.default.userBlock.findMany({
                where: { blockerId: req.auth.userId },
                select: {
                    id: true,
                    blockedUserId: true,
                    createdAt: true,
                    blockedUser: { select: { id: true, name: true, photoUrl: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
            });
            res.json(blocks);
        }
        catch (error) {
            console.error('Error listing blocks:', error);
            res.status(500).json({ message: 'No se pudo cargar la lista de bloqueos' });
        }
    });
}
function createBlock(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const blockedUserId = req.params.userId;
        if (!blockedUserId || blockedUserId.length > 100) {
            return res.status(400).json({ message: 'El usuario que deseas bloquear no es válido' });
        }
        if (blockedUserId === req.auth.userId) {
            return res.status(400).json({ message: 'No puedes bloquearte a ti mismo' });
        }
        try {
            const blockedUser = yield prisma_1.default.user.findUnique({
                where: { id: blockedUserId },
                select: { id: true, deletedAt: true },
            });
            if (!blockedUser || blockedUser.deletedAt) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            const block = yield prisma_1.default.userBlock.create({
                data: { blockerId: req.auth.userId, blockedUserId },
                select: {
                    id: true,
                    blockedUserId: true,
                    createdAt: true,
                    blockedUser: { select: { id: true, name: true, photoUrl: true, role: true } },
                },
            });
            res.status(201).json(block);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ message: 'Este usuario ya está bloqueado' });
            }
            console.error('Error blocking user:', error);
            res.status(500).json({ message: 'No se pudo bloquear al usuario' });
        }
    });
}
function deleteBlock(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.params.userId || req.params.userId.length > 100) {
            return res.status(400).json({ message: 'El usuario que deseas desbloquear no es válido' });
        }
        try {
            const deleted = yield prisma_1.default.userBlock.deleteMany({
                where: { blockerId: req.auth.userId, blockedUserId: req.params.userId },
            });
            if (deleted.count === 0)
                return res.status(404).json({ message: 'Bloqueo no encontrado' });
            res.status(204).send();
        }
        catch (error) {
            console.error('Error unblocking user:', error);
            res.status(500).json({ message: 'No se pudo desbloquear al usuario' });
        }
    });
}
function getAdminQueue(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = parseQueueLimit(req.query.limit);
        const overdueBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
        try {
            const [reports, pendingProfiles, pendingPhotos, reportCount, profileCount, photoCount, overdueReports, overdueProfiles, overduePhotos,] = yield Promise.all([
                prisma_1.default.contentReport.findMany({
                    where: { status: { in: ACTIVE_REPORT_STATUSES } },
                    select: {
                        id: true,
                        reporterId: true,
                        targetUserId: true,
                        technicianId: true,
                        profilePhotoSubmissionId: true,
                        contentType: true,
                        reason: true,
                        details: true,
                        status: true,
                        reviewedById: true,
                        createdAt: true,
                        updatedAt: true,
                        reporter: { select: { id: true, name: true, email: true } },
                        targetUser: { select: { id: true, name: true, email: true, moderationStatus: true } },
                        reviewedBy: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                    take: limit,
                }),
                prisma_1.default.technician.findMany({
                    where: {
                        moderationStatus: client_1.TechnicianModerationStatus.PENDING,
                        user: { moderationStatus: client_1.UserModerationStatus.ACTIVE },
                    },
                    select: {
                        id: true,
                        userId: true,
                        specializations: true,
                        location: true,
                        companyName: true,
                        moderationStatus: true,
                        moderationSubmittedAt: true,
                        user: { select: { id: true, name: true, email: true, phone: true } },
                    },
                    orderBy: { moderationSubmittedAt: 'asc' },
                    take: limit,
                }),
                prisma_1.default.profilePhotoSubmission.findMany({
                    where: { status: client_1.ProfilePhotoModerationStatus.PENDING },
                    select: {
                        id: true,
                        userId: true,
                        imageData: true,
                        status: true,
                        submittedAt: true,
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                    orderBy: { submittedAt: 'asc' },
                    take: limit,
                }),
                prisma_1.default.contentReport.count({ where: { status: { in: ACTIVE_REPORT_STATUSES } } }),
                prisma_1.default.technician.count({
                    where: {
                        moderationStatus: client_1.TechnicianModerationStatus.PENDING,
                        user: { moderationStatus: client_1.UserModerationStatus.ACTIVE },
                    },
                }),
                prisma_1.default.profilePhotoSubmission.count({ where: { status: client_1.ProfilePhotoModerationStatus.PENDING } }),
                prisma_1.default.contentReport.count({
                    where: { status: { in: ACTIVE_REPORT_STATUSES }, createdAt: { lte: overdueBefore } },
                }),
                prisma_1.default.technician.count({
                    where: {
                        moderationStatus: client_1.TechnicianModerationStatus.PENDING,
                        moderationSubmittedAt: { lte: overdueBefore },
                        user: { moderationStatus: client_1.UserModerationStatus.ACTIVE },
                    },
                }),
                prisma_1.default.profilePhotoSubmission.count({
                    where: { status: client_1.ProfilePhotoModerationStatus.PENDING, submittedAt: { lte: overdueBefore } },
                }),
            ]);
            res.json({
                reports: reports.map((_a) => {
                    var { targetUser } = _a, item = __rest(_a, ["targetUser"]);
                    const { moderationStatus } = targetUser, safeTargetUser = __rest(targetUser, ["moderationStatus"]);
                    return Object.assign(Object.assign(Object.assign({}, item), { targetUser: Object.assign(Object.assign({}, safeTargetUser), { accountModerationStatus: moderationStatus }) }), (0, moderationService_1.moderationAge)(item.createdAt));
                }),
                pendingProfiles: pendingProfiles.map((_a) => {
                    var { moderationStatus } = _a, item = __rest(_a, ["moderationStatus"]);
                    return (Object.assign(Object.assign(Object.assign({}, item), { technicianModerationStatus: moderationStatus, submittedAt: item.moderationSubmittedAt }), (0, moderationService_1.moderationAge)(item.moderationSubmittedAt)));
                }),
                pendingPhotos: pendingPhotos.map((_a) => {
                    var { imageData } = _a, item = __rest(_a, ["imageData"]);
                    return (Object.assign(Object.assign(Object.assign({}, item), { photoUrl: imageData }), (0, moderationService_1.moderationAge)(item.submittedAt)));
                }),
                counts: {
                    reports: reportCount,
                    pendingProfiles: profileCount,
                    pendingPhotos: photoCount,
                    overdue: overdueReports + overdueProfiles + overduePhotos,
                },
            });
        }
        catch (error) {
            console.error('Error loading moderation queue:', error);
            res.status(500).json({ message: 'No se pudo cargar la cola de moderación' });
        }
    });
}
function moderateTechnician(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const decision = (_a = req.body) === null || _a === void 0 ? void 0 : _a.decision;
        const reason = cleanOptionalText((_b = req.body) === null || _b === void 0 ? void 0 : _b.reason, 1000);
        if (!['APPROVE', 'REJECT', 'SUSPEND'].includes(decision)) {
            return res.status(400).json({ message: 'La decisión no es válida' });
        }
        if (reason === undefined || ((decision === 'REJECT' || decision === 'SUSPEND') && !reason)) {
            return res.status(400).json({ message: 'Indica una razón breve para esta decisión' });
        }
        try {
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const technician = yield tx.technician.findUnique({
                    where: { id: req.params.id },
                    select: {
                        id: true,
                        moderationStatus: true,
                        moderationSubmittedAt: true,
                        user: { select: { moderationStatus: true } },
                    },
                });
                if (!technician)
                    throw new ModerationRequestError(404, 'Técnico no encontrado');
                if (technician.user.moderationStatus !== client_1.UserModerationStatus.ACTIVE) {
                    throw new ModerationRequestError(409, 'La cuenta de este técnico está suspendida');
                }
                const targetStatus = technicianTargetStatus(technician.moderationStatus, decision);
                if (!targetStatus) {
                    throw new ModerationRequestError(409, `No se puede ${decision.toLowerCase()} un perfil ${technician.moderationStatus}`);
                }
                const claimed = yield tx.technician.updateMany({
                    where: {
                        id: technician.id,
                        moderationStatus: technician.moderationStatus,
                        moderationSubmittedAt: technician.moderationSubmittedAt,
                        user: { moderationStatus: client_1.UserModerationStatus.ACTIVE },
                    },
                    data: {
                        moderationStatus: targetStatus,
                        moderationReason: reason,
                        moderatedAt: new Date(),
                        moderatedById: req.auth.userId,
                    },
                });
                if (claimed.count !== 1) {
                    throw new ModerationRequestError(409, 'El perfil cambió mientras lo revisabas; actualiza la cola');
                }
                const result = yield tx.technician.findUnique({
                    where: { id: technician.id },
                    select: {
                        id: true,
                        userId: true,
                        moderationStatus: true,
                        moderationReason: true,
                        moderatedAt: true,
                    },
                });
                if (!result)
                    throw new ModerationRequestError(409, 'El perfil ya no está disponible');
                yield tx.moderationAuditLog.create({
                    data: {
                        actorId: req.auth.userId,
                        action: `TECHNICIAN_${decision}`,
                        targetType: 'TECHNICIAN',
                        targetId: technician.id,
                        fromStatus: technician.moderationStatus,
                        toStatus: targetStatus,
                        reason,
                    },
                });
                return result;
            }));
            const { moderationStatus, moderationReason } = updated, safeTechnician = __rest(updated, ["moderationStatus", "moderationReason"]);
            res.json(Object.assign(Object.assign({}, safeTechnician), { technicianModerationStatus: moderationStatus, technicianModerationReason: moderationReason }));
        }
        catch (error) {
            sendModerationError(error, res, 'No se pudo moderar el perfil técnico');
        }
    });
}
function moderateProfilePhoto(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const decision = (_a = req.body) === null || _a === void 0 ? void 0 : _a.decision;
        const reason = cleanOptionalText((_b = req.body) === null || _b === void 0 ? void 0 : _b.reason, 1000);
        if (!['APPROVE', 'REJECT'].includes(decision)) {
            return res.status(400).json({ message: 'La decisión no es válida' });
        }
        if (reason === undefined || (decision === 'REJECT' && !reason)) {
            return res.status(400).json({ message: 'Indica una razón breve para rechazar la foto' });
        }
        try {
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const submission = yield tx.profilePhotoSubmission.findUnique({
                    where: { id: req.params.id },
                    select: { id: true, userId: true, imageData: true, status: true },
                });
                if (!submission)
                    throw new ModerationRequestError(404, 'Foto pendiente no encontrada');
                if (submission.status !== client_1.ProfilePhotoModerationStatus.PENDING) {
                    throw new ModerationRequestError(409, 'Esta foto ya fue moderada');
                }
                const status = decision === 'APPROVE'
                    ? client_1.ProfilePhotoModerationStatus.APPROVED
                    : client_1.ProfilePhotoModerationStatus.REJECTED;
                // Claim the pending submission before publishing or rejecting it. A
                // second moderator (or a replacement upload) must lose this conditional
                // transition instead of applying contradictory side effects.
                const claimed = yield tx.profilePhotoSubmission.updateMany({
                    where: { id: submission.id, status: client_1.ProfilePhotoModerationStatus.PENDING },
                    data: {
                        pendingKey: null,
                        status,
                        reviewedAt: new Date(),
                        reviewedById: req.auth.userId,
                        reviewNote: reason,
                    },
                });
                if (claimed.count !== 1) {
                    throw new ModerationRequestError(409, 'La foto cambió mientras la revisabas; actualiza la cola');
                }
                if (decision === 'APPROVE') {
                    const current = yield tx.user.findUnique({
                        where: { id: submission.userId },
                        select: { photoUrl: true },
                    });
                    if (!current)
                        throw new ModerationRequestError(404, 'Usuario no encontrado');
                    yield tx.user.update({
                        where: { id: submission.userId },
                        data: { photoUrl: submission.imageData },
                    });
                    yield tx.profileChangeHistory.create({
                        data: {
                            userId: submission.userId,
                            fieldName: 'photoUrl',
                            oldValue: current.photoUrl ? '[previous approved photo]' : null,
                            newValue: '[moderated photo approved]',
                            changedBy: req.auth.userId,
                            changeReason: reason || 'Foto aprobada por moderación',
                        },
                    });
                }
                const result = yield tx.profilePhotoSubmission.update({
                    where: { id: submission.id },
                    data: {
                        imageData: '',
                    },
                    select: {
                        id: true,
                        userId: true,
                        status: true,
                        reviewedAt: true,
                        reviewNote: true,
                    },
                });
                yield tx.moderationAuditLog.create({
                    data: {
                        actorId: req.auth.userId,
                        action: `PROFILE_PHOTO_${decision}`,
                        targetType: 'PROFILE_PHOTO',
                        targetId: submission.id,
                        fromStatus: submission.status,
                        toStatus: status,
                        reason,
                    },
                });
                return result;
            }));
            const { status } = updated, safePhoto = __rest(updated, ["status"]);
            res.json(Object.assign(Object.assign({}, safePhoto), { photoModerationStatus: status }));
        }
        catch (error) {
            sendModerationError(error, res, 'No se pudo moderar la foto');
        }
    });
}
function resolveReport(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const status = (_a = req.body) === null || _a === void 0 ? void 0 : _a.status;
        const action = (_b = req.body) === null || _b === void 0 ? void 0 : _b.action;
        const resolutionNote = cleanOptionalText((_c = req.body) === null || _c === void 0 ? void 0 : _c.resolutionNote, 1000);
        if (!FINAL_REPORT_STATUSES.has(status) || !REPORT_ACTIONS.has(action)) {
            return res.status(400).json({ message: 'El estado o la acción no son válidos' });
        }
        if (resolutionNote === undefined || !resolutionNote) {
            return res.status(400).json({ message: 'La resolución debe incluir una nota interna' });
        }
        try {
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const report = yield tx.contentReport.findUnique({
                    where: { id: req.params.id },
                    select: {
                        id: true,
                        targetUserId: true,
                        technicianId: true,
                        contentType: true,
                        contentFingerprint: true,
                        status: true,
                        reviewedById: true,
                    },
                });
                if (!report)
                    throw new ModerationRequestError(404, 'Reporte no encontrado');
                if (!ACTIVE_REPORT_STATUSES.includes(report.status)) {
                    throw new ModerationRequestError(409, 'Este reporte ya tiene una resolución final');
                }
                if (status === client_1.ContentReportStatus.DISMISSED && action !== client_1.ModerationAction.NONE) {
                    throw new ModerationRequestError(400, 'Un reporte descartado no puede aplicar una sanción');
                }
                if (report.status === client_1.ContentReportStatus.UNDER_REVIEW &&
                    report.reviewedById &&
                    report.reviewedById !== req.auth.userId) {
                    throw new ModerationRequestError(409, 'Otro administrador está revisando este reporte');
                }
                // Atomically claim the final decision before applying any sanction. The
                // entire transaction rolls back if a side effect fails, while concurrent
                // requests (including double-clicks by the same reviewer) lose because
                // the source status no longer matches after the winner commits.
                const decisionWhere = report.status === client_1.ContentReportStatus.OPEN
                    ? { id: report.id, status: client_1.ContentReportStatus.OPEN, reviewedById: null }
                    : {
                        id: report.id,
                        status: client_1.ContentReportStatus.UNDER_REVIEW,
                        reviewedById: report.reviewedById || null,
                    };
                const decisionClaim = yield tx.contentReport.updateMany({
                    where: decisionWhere,
                    data: {
                        status,
                        action,
                        resolutionNote,
                        reviewedById: req.auth.userId,
                        reviewedAt: new Date(),
                        dedupeKey: null,
                    },
                });
                if (decisionClaim.count !== 1) {
                    throw new ModerationRequestError(409, 'El reporte cambió mientras lo revisabas; actualiza la cola');
                }
                if (action === client_1.ModerationAction.CONTENT_REMOVED) {
                    if (report.contentType !== client_1.ReportContentType.PHOTO || !report.contentFingerprint) {
                        throw new ModerationRequestError(400, 'La eliminación de contenido solo aplica a la foto reportada');
                    }
                    const target = yield tx.user.findUnique({
                        where: { id: report.targetUserId },
                        select: { photoUrl: true, deletedAt: true },
                    });
                    if (!(target === null || target === void 0 ? void 0 : target.photoUrl) || target.deletedAt || sha256(target.photoUrl) !== report.contentFingerprint) {
                        throw new ModerationRequestError(409, 'La foto reportada ya cambió; revisa el contenido actual');
                    }
                    const removed = yield tx.user.updateMany({
                        where: { id: report.targetUserId, photoUrl: target.photoUrl },
                        data: { photoUrl: null },
                    });
                    if (removed.count !== 1) {
                        throw new ModerationRequestError(409, 'La foto reportada cambió mientras la revisabas');
                    }
                    yield tx.profileChangeHistory.create({
                        data: {
                            userId: report.targetUserId,
                            fieldName: 'photoUrl',
                            oldValue: '[reported approved photo]',
                            newValue: null,
                            changedBy: req.auth.userId,
                            changeReason: `Reporte ${report.id}: ${resolutionNote}`,
                        },
                    });
                }
                if (action === client_1.ModerationAction.TECHNICIAN_SUSPENDED) {
                    if (!report.technicianId) {
                        throw new ModerationRequestError(400, 'El reporte no corresponde a un perfil técnico');
                    }
                    const technician = yield tx.technician.findUnique({
                        where: { id: report.technicianId },
                        select: { moderationStatus: true },
                    });
                    if (!technician || technician.moderationStatus !== client_1.TechnicianModerationStatus.APPROVED) {
                        throw new ModerationRequestError(409, 'El perfil técnico no está actualmente aprobado');
                    }
                    const suspended = yield tx.technician.updateMany({
                        where: {
                            id: report.technicianId,
                            moderationStatus: client_1.TechnicianModerationStatus.APPROVED,
                        },
                        data: {
                            moderationStatus: client_1.TechnicianModerationStatus.SUSPENDED,
                            moderationReason: resolutionNote,
                            moderatedAt: new Date(),
                            moderatedById: req.auth.userId,
                        },
                    });
                    if (suspended.count !== 1) {
                        throw new ModerationRequestError(409, 'El perfil técnico cambió mientras lo revisabas');
                    }
                }
                if (action === client_1.ModerationAction.USER_SUSPENDED) {
                    const target = yield tx.user.findUnique({
                        where: { id: report.targetUserId },
                        select: { id: true, role: true, moderationStatus: true, deletedAt: true },
                    });
                    if (!target || target.deletedAt) {
                        throw new ModerationRequestError(404, 'Usuario reportado no encontrado');
                    }
                    if (target.role === 'admin') {
                        throw new ModerationRequestError(403, 'No se puede suspender una cuenta administrativa desde un reporte');
                    }
                    if (target.moderationStatus === client_1.UserModerationStatus.SUSPENDED) {
                        throw new ModerationRequestError(409, 'La cuenta reportada ya está suspendida');
                    }
                    const suspended = yield tx.user.updateMany({
                        where: {
                            id: target.id,
                            role: { not: 'admin' },
                            moderationStatus: client_1.UserModerationStatus.ACTIVE,
                        },
                        data: {
                            moderationStatus: client_1.UserModerationStatus.SUSPENDED,
                            moderationReason: resolutionNote,
                            moderatedAt: new Date(),
                            moderatedById: req.auth.userId,
                        },
                    });
                    if (suspended.count !== 1) {
                        throw new ModerationRequestError(409, 'La cuenta cambió mientras revisabas el reporte');
                    }
                }
                const result = yield tx.contentReport.findUnique({
                    where: { id: report.id },
                    select: {
                        id: true,
                        status: true,
                        action: true,
                        resolutionNote: true,
                        reviewedAt: true,
                        updatedAt: true,
                    },
                });
                yield tx.moderationAuditLog.create({
                    data: {
                        actorId: req.auth.userId,
                        action: `REPORT_${status}`,
                        targetType: 'REPORT',
                        targetId: report.id,
                        fromStatus: report.status,
                        toStatus: status,
                        reason: resolutionNote,
                        metadata: { moderationAction: action },
                    },
                });
                return result;
            }));
            res.json(updated);
        }
        catch (error) {
            sendModerationError(error, res, 'No se pudo resolver el reporte');
        }
    });
}
function moderateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const decision = (_a = req.body) === null || _a === void 0 ? void 0 : _a.decision;
        const reason = cleanOptionalText((_b = req.body) === null || _b === void 0 ? void 0 : _b.reason, 1000);
        if (!['SUSPEND', 'RESTORE'].includes(decision)) {
            return res.status(400).json({ message: 'La decisión no es válida' });
        }
        if (reason === undefined || !reason) {
            return res.status(400).json({ message: 'Indica una razón breve para esta decisión' });
        }
        if (req.params.id === req.auth.userId) {
            return res.status(400).json({ message: 'No puedes cambiar el estado de tu propia cuenta' });
        }
        try {
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const user = yield tx.user.findUnique({
                    where: { id: req.params.id },
                    select: { id: true, role: true, moderationStatus: true, deletedAt: true },
                });
                if (!user)
                    throw new ModerationRequestError(404, 'Usuario no encontrado');
                // A deleted tombstone cannot receive a new sanction, but an admin must
                // be able to lift its existing sanction after an external appeal so the
                // privacy-safe email marker no longer prevents account recreation.
                if (user.deletedAt && decision !== 'RESTORE') {
                    throw new ModerationRequestError(404, 'Usuario no encontrado');
                }
                if (user.role === 'admin') {
                    throw new ModerationRequestError(403, 'No puedes moderar otra cuenta administrativa');
                }
                const targetStatus = decision === 'SUSPEND'
                    ? client_1.UserModerationStatus.SUSPENDED
                    : client_1.UserModerationStatus.ACTIVE;
                if (user.moderationStatus === targetStatus) {
                    throw new ModerationRequestError(409, `La cuenta ya está ${targetStatus.toLowerCase()}`);
                }
                const changed = yield tx.user.updateMany({
                    where: {
                        id: user.id,
                        role: { not: 'admin' },
                        deletedAt: user.deletedAt ? { not: null } : null,
                        moderationStatus: user.moderationStatus,
                    },
                    data: {
                        moderationStatus: targetStatus,
                        moderationReason: decision === 'SUSPEND' ? reason : null,
                        moderatedAt: new Date(),
                        moderatedById: req.auth.userId,
                    },
                });
                if (changed.count !== 1) {
                    throw new ModerationRequestError(409, 'La cuenta cambió mientras la moderabas; actualiza la lista');
                }
                const result = yield tx.user.findUnique({
                    where: { id: user.id },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        moderationStatus: true,
                        moderationReason: true,
                        moderatedAt: true,
                    },
                });
                if (!result)
                    throw new ModerationRequestError(409, 'La cuenta ya no está disponible');
                yield tx.moderationAuditLog.create({
                    data: {
                        actorId: req.auth.userId,
                        action: `USER_${decision}`,
                        targetType: 'USER',
                        targetId: user.id,
                        fromStatus: user.moderationStatus,
                        toStatus: targetStatus,
                        reason,
                    },
                });
                return result;
            }));
            const { moderationStatus, moderationReason } = updated, safeUser = __rest(updated, ["moderationStatus", "moderationReason"]);
            res.json(Object.assign(Object.assign({}, safeUser), { accountModerationStatus: moderationStatus, accountModerationReason: moderationReason }));
        }
        catch (error) {
            sendModerationError(error, res, 'No se pudo cambiar el estado de la cuenta');
        }
    });
}
function claimReport(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const claimed = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const report = yield tx.contentReport.findUnique({
                    where: { id: req.params.id },
                    select: { id: true, status: true, reviewedById: true, updatedAt: true },
                });
                if (!report)
                    throw new ModerationRequestError(404, 'Reporte no encontrado');
                if (!ACTIVE_REPORT_STATUSES.includes(report.status)) {
                    throw new ModerationRequestError(409, 'Este reporte ya tiene una resolución final');
                }
                if (report.status === client_1.ContentReportStatus.UNDER_REVIEW) {
                    if (report.reviewedById === req.auth.userId)
                        return report;
                    throw new ModerationRequestError(409, 'Otro administrador está revisando este reporte');
                }
                const result = yield tx.contentReport.updateMany({
                    where: { id: report.id, status: client_1.ContentReportStatus.OPEN },
                    data: {
                        status: client_1.ContentReportStatus.UNDER_REVIEW,
                        reviewedById: req.auth.userId,
                    },
                });
                if (result.count !== 1) {
                    throw new ModerationRequestError(409, 'Otro administrador tomó este reporte');
                }
                yield tx.moderationAuditLog.create({
                    data: {
                        actorId: req.auth.userId,
                        action: 'REPORT_CLAIMED',
                        targetType: 'REPORT',
                        targetId: report.id,
                        fromStatus: client_1.ContentReportStatus.OPEN,
                        toStatus: client_1.ContentReportStatus.UNDER_REVIEW,
                    },
                });
                return tx.contentReport.findUnique({
                    where: { id: report.id },
                    select: { id: true, status: true, reviewedById: true, updatedAt: true },
                });
            }));
            res.json(claimed);
        }
        catch (error) {
            sendModerationError(error, res, 'No se pudo tomar el reporte');
        }
    });
}
function technicianTargetStatus(current, decision) {
    const approvable = new Set([
        client_1.TechnicianModerationStatus.PENDING,
        client_1.TechnicianModerationStatus.REJECTED,
        client_1.TechnicianModerationStatus.SUSPENDED,
    ]);
    if (decision === 'APPROVE' && approvable.has(current))
        return client_1.TechnicianModerationStatus.APPROVED;
    if (decision === 'REJECT' && current === client_1.TechnicianModerationStatus.PENDING) {
        return client_1.TechnicianModerationStatus.REJECTED;
    }
    if (decision === 'SUSPEND' && current === client_1.TechnicianModerationStatus.APPROVED) {
        return client_1.TechnicianModerationStatus.SUSPENDED;
    }
    return null;
}
class ModerationRequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
function sendModerationError(error, res, fallback) {
    if (error instanceof ModerationRequestError) {
        res.status(error.status).json({ message: error.message });
        return;
    }
    console.error(fallback, error);
    res.status(500).json({ message: fallback });
}
