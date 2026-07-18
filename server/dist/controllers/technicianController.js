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
exports.addTechnicianReview = exports.deleteTechnician = exports.verifyTechnician = exports.updateTechnicianServiceArea = exports.registerTechnician = exports.getTechnicians = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
const serviceArea_1 = require("../utils/serviceArea");
class ReviewAuthorizationError extends Error {
}
class DuplicateReviewError extends Error {
}
const getTechnicians = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.view === 'ratings') {
            const technicians = yield prisma_1.default.technician.findMany({
                include: {
                    user: {
                        select: { name: true, photoUrl: true },
                    },
                    _count: {
                        select: { reviews: true },
                    },
                },
            });
            const formattedTechnicians = technicians.map((tech) => ({
                id: tech.id,
                name: tech.user.name,
                photoUrl: tech.user.photoUrl,
                specialization: tech.specializations.join(', '),
                specializations: tech.specializations,
                location: tech.location,
                companyName: tech.companyName || null,
                rating: tech.rating,
                ratingCount: tech._count.reviews,
                verified: tech.verified,
                mapLocation: (0, serviceArea_1.toPublicMapLocation)(tech),
            }));
            return res.json(formattedTechnicians);
        }
        const technicians = yield prisma_1.default.technician.findMany({
            include: {
                user: {
                    select: { name: true, photoUrl: true },
                },
                reviews: {
                    select: { id: true, author: true, comment: true, rating: true, date: true },
                    orderBy: { date: 'desc' },
                },
            },
        });
        const formattedTechnicians = technicians.map((tech) => ({
            id: tech.id,
            name: tech.user.name,
            photoUrl: tech.user.photoUrl,
            specialization: tech.specializations.join(', '), // For backwards compatibility
            specializations: tech.specializations, // New array format
            location: tech.location,
            companyName: tech.companyName || null,
            rating: tech.rating,
            verified: tech.verified,
            reviews: tech.reviews,
            mapLocation: (0, serviceArea_1.toPublicMapLocation)(tech),
        }));
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
        const normalizedServiceArea = serviceArea === undefined
            ? undefined
            : (0, serviceArea_1.normalizeServiceAreaInput)(serviceArea);
        const technician = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            if (typeof phone === 'string' && phone.trim()) {
                yield tx.user.update({
                    where: { id: userId },
                    data: { phone: phone.trim() },
                });
            }
            const createdTechnician = yield tx.technician.create({
                data: Object.assign(Object.assign({ userId, specializations: normalizedSpecializations, location: location.trim(), companyName: typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null }, (normalizedServiceArea !== undefined && {
                    serviceAreaLatitude: (_a = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.latitude) !== null && _a !== void 0 ? _a : null,
                    serviceAreaLongitude: (_b = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.longitude) !== null && _b !== void 0 ? _b : null,
                    serviceAreaRadiusKm: (_c = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.radiusKm) !== null && _c !== void 0 ? _c : 5,
                })), (mapVisible !== undefined && { mapVisible })),
            });
            yield tx.user.update({
                where: { id: userId },
                data: { role: 'technician' },
            });
            return createdTechnician;
        }));
        res.status(201).json(Object.assign(Object.assign({}, technician), { mapLocation: (0, serviceArea_1.toPublicMapLocation)(technician) }));
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
    var _a, _b, _c;
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
        const technician = yield prisma_1.default.technician.update({
            where: { id: req.params.id },
            data: Object.assign(Object.assign(Object.assign({}, (hasLocation && { location: req.body.location.trim() })), (hasMapVisible && { mapVisible: req.body.mapVisible })), (normalizedServiceArea !== undefined && {
                serviceAreaLatitude: (_a = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.latitude) !== null && _a !== void 0 ? _a : null,
                serviceAreaLongitude: (_b = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.longitude) !== null && _b !== void 0 ? _b : null,
                serviceAreaRadiusKm: (_c = normalizedServiceArea === null || normalizedServiceArea === void 0 ? void 0 : normalizedServiceArea.radiusKm) !== null && _c !== void 0 ? _c : 5,
            })),
        });
        res.json({
            id: technician.id,
            location: technician.location,
            mapVisible: technician.mapVisible,
            mapLocation: (0, serviceArea_1.toPublicMapLocation)(technician),
        });
    }
    catch (error) {
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
        res.json(technician);
    }
    catch (error) {
        res.status(500).json({ message: 'Error verifying technician', error });
    }
});
exports.verifyTechnician = verifyTechnician;
const deleteTechnician = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.technician.delete({ where: { id } });
        res.json({ message: 'Technician deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting technician', error });
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
        if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1000) {
            return res.status(400).json({ message: 'La reseña debe tener entre 1 y 1000 caracteres' });
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
