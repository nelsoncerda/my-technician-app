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
exports.addTechnicianReview = exports.deleteTechnician = exports.verifyTechnician = exports.updateTechnicianServiceArea = exports.registerTechnician = exports.getTechnicians = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
const serviceArea_1 = require("../utils/serviceArea");
const contentModeration_1 = require("../utils/contentModeration");
const moderationService_1 = require("../services/moderationService");
class ReviewAuthorizationError extends Error {
}
class DuplicateReviewError extends Error {
}
class TermsConsentRequiredError extends Error {
}
const getTechnicians = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let hiddenUserIds = [];
        if (req.auth) {
            const blocks = yield prisma_1.default.userBlock.findMany({
                where: {
                    OR: [
                        { blockerId: req.auth.userId },
                        { blockedUserId: req.auth.userId },
                    ],
                },
                select: { blockerId: true, blockedUserId: true },
            });
            hiddenUserIds = Array.from(new Set(blocks.map((block) => (block.blockerId === req.auth.userId ? block.blockedUserId : block.blockerId))));
        }
        // Written review text is intentionally never returned publicly. Both
        // the legacy and ratings views expose only aggregate rating information.
        const technicians = yield prisma_1.default.technician.findMany({
            where: Object.assign({ moderationStatus: 'APPROVED', user: { moderationStatus: 'ACTIVE' } }, (hiddenUserIds.length > 0 && { userId: { notIn: hiddenUserIds } })),
            include: {
                user: {
                    select: { name: true, photoUrl: true },
                },
                _count: {
                    select: { reviews: true },
                },
            },
        });
        const formattedTechnicians = technicians.map((tech) => (Object.assign(Object.assign({ id: tech.id }, (tech.userId && { userId: tech.userId })), { name: tech.user.name, photoUrl: tech.user.photoUrl, specialization: tech.specializations.join(', '), specializations: tech.specializations, location: tech.location, companyName: tech.companyName || null, rating: tech.rating, ratingCount: tech._count.reviews, verified: tech.verified, mapLocation: (0, serviceArea_1.toPublicMapLocation)(tech) })));
        res.json(formattedTechnicians);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching technicians', error });
    }
});
exports.getTechnicians = getTechnicians;
const registerTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { specializations, location, phone, companyName, serviceArea, mapVisible } = req.body;
        const userId = req.auth.userId;
        const alreadyAcceptedTerms = yield (0, moderationService_1.hasCurrentTermsConsent)(userId);
        const acceptsTermsNow = (0, moderationService_1.hasInlineCurrentTermsConsent)(req.body);
        if (!alreadyAcceptedTerms && !acceptsTermsNow) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        const account = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        if (!account)
            return res.status(404).json({ message: 'Usuario no encontrado' });
        const nameRejection = (0, contentModeration_1.publicTextRejection)('El nombre', account.name);
        if (nameRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: nameRejection });
        }
        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations
                .filter((value) => typeof value === 'string')
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
        if (normalizedSpecializations.length === 0 || normalizedSpecializations.length > 10) {
            return res.status(400).json({ message: 'Selecciona entre 1 y 10 especialidades' });
        }
        if (typeof location !== 'string' || !location.trim() || location.trim().length > 160) {
            return res.status(400).json({ message: 'La ubicación es requerida' });
        }
        if (mapVisible !== undefined && typeof mapVisible !== 'boolean') {
            return res.status(400).json({ message: 'La visibilidad en el mapa no es válida' });
        }
        const companyRejection = (0, contentModeration_1.publicTextRejection)('El nombre de la empresa', typeof companyName === 'string' ? companyName : null);
        if (companyRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: companyRejection });
        }
        const normalizedServiceArea = serviceArea === undefined
            ? undefined
            : (0, serviceArea_1.normalizeServiceAreaInput)(serviceArea);
        const technician = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (acceptsTermsNow) {
                yield (0, moderationService_1.recordCurrentTermsConsent)({
                    userId,
                    ipAddress: req.ip || ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || null,
                    userAgent: req.headers['user-agent'] || null,
                    db: tx,
                });
            }
            if (typeof phone === 'string' && phone.trim()) {
                yield tx.user.update({
                    where: { id: userId },
                    data: { phone: phone.trim() },
                });
            }
            const createdTechnician = yield tx.technician.create({
                data: Object.assign(Object.assign(Object.assign({ userId, specializations: normalizedSpecializations, location: location.trim(), companyName: typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null }, (normalizedServiceArea !== undefined && {
                    serviceAreaLatitude: (_b = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.latitude) !== null && _b !== void 0 ? _b : null,
                    serviceAreaLongitude: (_c = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.longitude) !== null && _c !== void 0 ? _c : null,
                    serviceAreaRadiusKm: (_d = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.radiusKm) !== null && _d !== void 0 ? _d : 5,
                })), (mapVisible !== undefined && { mapVisible })), { moderationStatus: 'PENDING', moderationSubmittedAt: new Date() }),
            });
            yield tx.user.update({
                where: { id: userId },
                data: { role: 'technician' },
            });
            return createdTechnician;
        }));
        const { moderationStatus, moderationReason, moderatedById: _moderatedById, moderatedAt: _moderatedAt } = technician, safeTechnician = __rest(technician, ["moderationStatus", "moderationReason", "moderatedById", "moderatedAt"]);
        res.status(201).json(Object.assign(Object.assign({}, safeTechnician), { technicianModerationStatus: moderationStatus, technicianModerationReason: moderationReason, mapLocation: (0, serviceArea_1.toPublicMapLocation)(technician) }));
    }
    catch (error) {
        if (error instanceof serviceArea_1.ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ message: 'Este usuario ya tiene un perfil técnico' });
        }
        res.status(500).json({ message: 'Error registering technician', error });
    }
});
exports.registerTechnician = registerTechnician;
const updateTechnicianServiceArea = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hasServiceArea = Object.prototype.hasOwnProperty.call(req.body, 'serviceArea');
        const hasMapVisible = Object.prototype.hasOwnProperty.call(req.body, 'mapVisible');
        const hasLocation = Object.prototype.hasOwnProperty.call(req.body, 'location');
        if (!hasServiceArea && !hasMapVisible && !hasLocation) {
            return res.status(400).json({ message: 'Indica un área de servicio o la visibilidad del mapa' });
        }
        if (hasMapVisible && typeof req.body.mapVisible !== 'boolean') {
            return res.status(400).json({ message: 'La visibilidad en el mapa no es válida' });
        }
        if (hasLocation &&
            (typeof req.body.location !== 'string' || !req.body.location.trim() || req.body.location.trim().length > 160)) {
            return res.status(400).json({ message: 'La ubicación no es válida' });
        }
        const normalizedServiceArea = hasServiceArea
            ? (0, serviceArea_1.normalizeServiceAreaInput)(req.body.serviceArea)
            : undefined;
        const changesPublicServiceArea = hasLocation || normalizedServiceArea !== undefined;
        const technician = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const current = yield tx.technician.findUnique({
                where: { id: req.params.id },
                select: { id: true, userId: true, moderationStatus: true },
            });
            if (!current)
                return null;
            if (changesPublicServiceArea && !(yield (0, moderationService_1.hasCurrentTermsConsent)(current.userId, tx))) {
                throw new TermsConsentRequiredError();
            }
            // The public fields and their return-to-review transition are one
            // write, so unreviewed coordinates can never remain APPROVED after
            // a partial failure. A suspension is deliberately preserved.
            return tx.technician.update({
                where: { id: current.id },
                data: Object.assign(Object.assign(Object.assign(Object.assign({}, (hasLocation && { location: req.body.location.trim() })), (hasMapVisible && { mapVisible: req.body.mapVisible })), (normalizedServiceArea !== undefined && {
                    serviceAreaLatitude: (_a = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.latitude) !== null && _a !== void 0 ? _a : null,
                    serviceAreaLongitude: (_b = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.longitude) !== null && _b !== void 0 ? _b : null,
                    serviceAreaRadiusKm: (_c = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.radiusKm) !== null && _c !== void 0 ? _c : 5,
                })), (changesPublicServiceArea && current.moderationStatus !== 'SUSPENDED' && {
                    moderationStatus: 'PENDING',
                    moderationReason: null,
                    moderationSubmittedAt: new Date(),
                    moderatedAt: null,
                    moderatedById: null,
                })),
            });
        }));
        if (!technician) {
            return res.status(404).json({ message: 'Técnico no encontrado' });
        }
        res.json({
            id: technician.id,
            location: technician.location,
            mapVisible: technician.mapVisible,
            technicianModerationStatus: technician.moderationStatus,
            mapLocation: (0, serviceArea_1.toPublicMapLocation)(technician),
        });
    }
    catch (error) {
        if (error instanceof TermsConsentRequiredError) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        if (error instanceof serviceArea_1.ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: 'Técnico no encontrado' });
        }
        console.error('Error updating technician service area:', error);
        res.status(500).json({ message: 'Error al actualizar el área de servicio' });
    }
});
exports.updateTechnicianServiceArea = updateTechnicianServiceArea;
const verifyTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const technician = yield prisma_1.default.technician.update({
            where: { id },
            data: { verified: true },
        });
        const { moderationStatus, moderationReason, moderatedById: _moderatedById } = technician, safeTechnician = __rest(technician, ["moderationStatus", "moderationReason", "moderatedById"]);
        res.json(Object.assign(Object.assign({}, safeTechnician), { technicianModerationStatus: moderationStatus, technicianModerationReason: moderationReason }));
    }
    catch (error) {
        res.status(500).json({ message: 'Error verifying technician', error });
    }
});
exports.verifyTechnician = verifyTechnician;
const deleteTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const technician = yield tx.technician.findUnique({
                where: { id },
                select: { userId: true, moderationStatus: true },
            });
            if (!technician) {
                return { outcome: 'not_found' };
            }
            if (technician.moderationStatus === 'SUSPENDED') {
                return { outcome: 'suspended' };
            }
            yield tx.technician.delete({ where: { id } });
            const user = yield tx.user.update({
                where: { id: technician.userId },
                data: { role: 'user' },
                select: { id: true, role: true },
            });
            return { outcome: 'deleted', user };
        }));
        if (result.outcome === 'not_found') {
            return res.status(404).json({ message: 'Técnico no encontrado' });
        }
        if (result.outcome === 'suspended') {
            return res.status(409).json({
                code: 'TECHNICIAN_SUSPENDED',
                message: 'Un perfil técnico suspendido no se puede eliminar ni volver a crear. Contacta a soporte para apelar.',
                supportUrl: '/support',
            });
        }
        res.json({
            message: 'Perfil técnico eliminado y cuenta convertida en usuario',
            userId: result.user.id,
            role: result.user.role,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003' || error.code === 'P2014') {
                return res.status(409).json({
                    message: 'No se puede eliminar este perfil porque tiene reservas o reseñas asociadas',
                });
            }
            if (error.code === 'P2025') {
                return res.status(404).json({ message: 'Técnico no encontrado' });
            }
        }
        console.error('Error deleting technician:', error);
        res.status(500).json({ message: 'Error al eliminar el perfil técnico' });
    }
});
exports.deleteTechnician = deleteTechnician;
const addTechnicianReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: technicianId } = req.params;
        const { rating, comment } = req.body;
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'La calificación debe ser un entero entre 1 y 5' });
        }
        const allowedFeedback = new Set([
            'Llegó a tiempo',
            'Buena comunicación',
            'Trabajo de calidad',
            'Buen trato',
            'Precio claro',
        ]);
        if (typeof comment !== 'string' || !allowedFeedback.has(comment.trim())) {
            return res.status(400).json({
                message: 'Selecciona una opción de comentario disponible',
                allowedFeedback: Array.from(allowedFeedback),
            });
        }
        if (!(yield (0, moderationService_1.hasCurrentTermsConsent)(req.auth.userId))) {
            return res.status(428).json((0, moderationService_1.termsRequiredPayload)());
        }
        const review = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const [author, completedBooking, existingReview] = yield Promise.all([
                tx.user.findUnique({
                    where: { id: req.auth.userId },
                    select: { name: true },
                }),
                tx.booking.findFirst({
                    where: {
                        customerId: req.auth.userId,
                        technicianId,
                        status: 'COMPLETED',
                    },
                    select: { id: true },
                }),
                tx.review.findFirst({
                    where: {
                        technicianId,
                        authorId: req.auth.userId,
                    },
                    select: { id: true },
                }),
            ]);
            if (!author || !completedBooking) {
                throw new ReviewAuthorizationError();
            }
            if (existingReview) {
                throw new DuplicateReviewError();
            }
            const createdReview = yield tx.review.create({
                data: {
                    technicianId,
                    authorId: req.auth.userId,
                    author: author.name,
                    rating,
                    comment: comment.trim(),
                },
            });
            const reviewStats = yield tx.review.aggregate({
                where: { technicianId },
                _avg: { rating: true },
                _count: { _all: true },
            });
            yield tx.technician.update({
                where: { id: technicianId },
                data: {
                    rating: reviewStats._avg.rating || 0,
                    totalReviews: reviewStats._count._all,
                },
            });
            return createdReview;
        }), {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        });
        res.status(201).json(review);
    }
    catch (error) {
        if (error instanceof ReviewAuthorizationError) {
            return res.status(403).json({ message: 'Solo clientes con un servicio completado pueden dejar una reseña' });
        }
        if (error instanceof DuplicateReviewError) {
            return res.status(409).json({ message: 'Ya publicaste una reseña para este técnico' });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
            return res.status(409).json({ message: 'La reseña cambió al mismo tiempo; intenta nuevamente' });
        }
        console.error('Error adding technician review:', error);
        res.status(500).json({ message: 'Error al publicar la reseña' });
    }
});
exports.addTechnicianReview = addTechnicianReview;
