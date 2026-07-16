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
exports.addTechnicianReview = exports.deleteTechnician = exports.verifyTechnician = exports.registerTechnician = exports.getTechnicians = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
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
        const { specializations, location, phone, companyName } = req.body;
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
        if (typeof location !== 'string' || !location.trim()) {
            return res.status(400).json({ message: 'La ubicación es requerida' });
        }
        const technician = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (typeof phone === 'string' && phone.trim()) {
                yield tx.user.update({
                    where: { id: userId },
                    data: { phone: phone.trim() },
                });
            }
            const createdTechnician = yield tx.technician.create({
                data: {
                    userId,
                    specializations: normalizedSpecializations,
                    location: location.trim(),
                    companyName: typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null,
                },
            });
            yield tx.user.update({
                where: { id: userId },
                data: { role: 'technician' },
            });
            return createdTechnician;
        }));
        res.status(201).json(technician);
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ message: 'Este usuario ya tiene un perfil técnico' });
        }
        res.status(500).json({ message: 'Error registering technician', error });
    }
});
exports.registerTechnician = registerTechnician;
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
