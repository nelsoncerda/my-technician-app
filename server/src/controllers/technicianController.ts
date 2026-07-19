import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prisma';
import {
    normalizeServiceAreaInput,
    ServiceAreaValidationError,
    toPublicMapLocation,
} from '../utils/serviceArea';
import { publicTextRejection } from '../utils/contentModeration';
import {
    hasCurrentTermsConsent,
    hasInlineCurrentTermsConsent,
    recordCurrentTermsConsent,
    termsRequiredPayload,
} from '../services/moderationService';

class ReviewAuthorizationError extends Error {}
class DuplicateReviewError extends Error {}
class TermsConsentRequiredError extends Error {}

export const getTechnicians = async (req: Request, res: Response) => {
    try {
        let hiddenUserIds: string[] = [];
        if (req.auth) {
            const blocks = await prisma.userBlock.findMany({
                where: {
                    OR: [
                        { blockerId: req.auth.userId },
                        { blockedUserId: req.auth.userId },
                    ],
                },
                select: { blockerId: true, blockedUserId: true },
            });
            hiddenUserIds = Array.from(new Set(blocks.map((block) => (
                block.blockerId === req.auth!.userId ? block.blockedUserId : block.blockerId
            ))));
        }

        // Written review text is intentionally never returned publicly. Both
        // the legacy and ratings views expose only aggregate rating information.
        const technicians = await prisma.technician.findMany({
            where: {
                moderationStatus: 'APPROVED',
                user: { moderationStatus: 'ACTIVE' },
                ...(hiddenUserIds.length > 0 && { userId: { notIn: hiddenUserIds } }),
            },
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
                ...(tech.userId && { userId: tech.userId }),
                name: tech.user.name,
                photoUrl: tech.user.photoUrl,
                specialization: tech.specializations.join(', '), // For backwards compatibility
                specializations: tech.specializations, // New array format
                location: tech.location,
                companyName: tech.companyName || null,
                rating: tech.rating,
                ratingCount: tech._count.reviews,
                verified: tech.verified,
                mapLocation: toPublicMapLocation(tech),
            }));

        res.json(formattedTechnicians);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching technicians', error });
    }
};

export const registerTechnician = async (req: Request, res: Response) => {
    try {
        const { specializations, location, phone, companyName, serviceArea, mapVisible } = req.body;
        const userId = req.auth!.userId;

        const alreadyAcceptedTerms = await hasCurrentTermsConsent(userId);
        const acceptsTermsNow = hasInlineCurrentTermsConsent(req.body);
        if (!alreadyAcceptedTerms && !acceptsTermsNow) {
            return res.status(428).json(termsRequiredPayload());
        }
        const account = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        if (!account) return res.status(404).json({ message: 'Usuario no encontrado' });
        const nameRejection = publicTextRejection('El nombre', account.name);
        if (nameRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: nameRejection });
        }

        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations
                .filter((value): value is string => typeof value === 'string')
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
        const companyRejection = publicTextRejection(
            'El nombre de la empresa',
            typeof companyName === 'string' ? companyName : null
        );
        if (companyRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: companyRejection });
        }

        const normalizedServiceArea = serviceArea === undefined
            ? undefined
            : normalizeServiceAreaInput(serviceArea);

        const technician = await prisma.$transaction(async (tx) => {
            if (acceptsTermsNow) {
                await recordCurrentTermsConsent({
                    userId,
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
                    userAgent: req.headers['user-agent'] || null,
                    db: tx,
                });
            }
            if (typeof phone === 'string' && phone.trim()) {
                await tx.user.update({
                    where: { id: userId },
                    data: { phone: phone.trim() },
                });
            }

            const createdTechnician = await tx.technician.create({
                data: {
                    userId,
                    specializations: normalizedSpecializations,
                    location: location.trim(),
                    companyName: typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null,
                    ...(normalizedServiceArea !== undefined && {
                        serviceAreaLatitude: normalizedServiceArea?.latitude ?? null,
                        serviceAreaLongitude: normalizedServiceArea?.longitude ?? null,
                        serviceAreaRadiusKm: normalizedServiceArea?.radiusKm ?? 5,
                    }),
                    ...(mapVisible !== undefined && { mapVisible }),
                    moderationStatus: 'PENDING',
                    moderationSubmittedAt: new Date(),
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { role: 'technician' },
            });

            return createdTechnician;
        });

        const {
            moderationStatus,
            moderationReason,
            moderatedById: _moderatedById,
            moderatedAt: _moderatedAt,
            ...safeTechnician
        } = technician;
        res.status(201).json({
            ...safeTechnician,
            technicianModerationStatus: moderationStatus,
            technicianModerationReason: moderationReason,
            mapLocation: toPublicMapLocation(technician),
        });
    } catch (error) {
        if (error instanceof ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ message: 'Este usuario ya tiene un perfil técnico' });
        }
        res.status(500).json({ message: 'Error registering technician', error });
    }
};

export const updateTechnicianServiceArea = async (req: Request, res: Response) => {
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
        if (
            hasLocation &&
            (typeof req.body.location !== 'string' || !req.body.location.trim() || req.body.location.trim().length > 160)
        ) {
            return res.status(400).json({ message: 'La ubicación no es válida' });
        }

        const normalizedServiceArea = hasServiceArea
            ? normalizeServiceAreaInput(req.body.serviceArea)
            : undefined;

        const changesPublicServiceArea = hasLocation || normalizedServiceArea !== undefined;
        const technician = await prisma.$transaction(async (tx) => {
            const current = await tx.technician.findUnique({
                where: { id: req.params.id },
                select: { id: true, userId: true, moderationStatus: true },
            });
            if (!current) return null;
            if (changesPublicServiceArea && !await hasCurrentTermsConsent(current.userId, tx)) {
                throw new TermsConsentRequiredError();
            }

            // The public fields and their return-to-review transition are one
            // write, so unreviewed coordinates can never remain APPROVED after
            // a partial failure. A suspension is deliberately preserved.
            return tx.technician.update({
                where: { id: current.id },
                data: {
                    ...(hasLocation && { location: req.body.location.trim() }),
                    ...(hasMapVisible && { mapVisible: req.body.mapVisible }),
                    ...(normalizedServiceArea !== undefined && {
                        serviceAreaLatitude: normalizedServiceArea?.latitude ?? null,
                        serviceAreaLongitude: normalizedServiceArea?.longitude ?? null,
                        serviceAreaRadiusKm: normalizedServiceArea?.radiusKm ?? 5,
                    }),
                    ...(changesPublicServiceArea && current.moderationStatus !== 'SUSPENDED' && {
                        moderationStatus: 'PENDING',
                        moderationReason: null,
                        moderationSubmittedAt: new Date(),
                        moderatedAt: null,
                        moderatedById: null,
                    }),
                },
            });
        });
        if (!technician) {
            return res.status(404).json({ message: 'Técnico no encontrado' });
        }

        res.json({
            id: technician.id,
            location: technician.location,
            mapVisible: technician.mapVisible,
            technicianModerationStatus: technician.moderationStatus,
            mapLocation: toPublicMapLocation(technician),
        });
    } catch (error) {
        if (error instanceof TermsConsentRequiredError) {
            return res.status(428).json(termsRequiredPayload());
        }
        if (error instanceof ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: 'Técnico no encontrado' });
        }
        console.error('Error updating technician service area:', error);
        res.status(500).json({ message: 'Error al actualizar el área de servicio' });
    }
};

export const verifyTechnician = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const technician = await prisma.technician.update({
            where: { id },
            data: { verified: true },
        });
        const {
            moderationStatus,
            moderationReason,
            moderatedById: _moderatedById,
            ...safeTechnician
        } = technician;
        res.json({
            ...safeTechnician,
            technicianModerationStatus: moderationStatus,
            technicianModerationReason: moderationReason,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying technician', error });
    }
};

export const deleteTechnician = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await prisma.$transaction(async (tx) => {
            const technician = await tx.technician.findUnique({
                where: { id },
                select: { userId: true, moderationStatus: true },
            });

            if (!technician) {
                return { outcome: 'not_found' as const };
            }
            if (technician.moderationStatus === 'SUSPENDED') {
                return { outcome: 'suspended' as const };
            }

            await tx.technician.delete({ where: { id } });
            const user = await tx.user.update({
                where: { id: technician.userId },
                data: { role: 'user' },
                select: { id: true, role: true },
            });

            return { outcome: 'deleted' as const, user };
        });

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
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
};

export const addTechnicianReview = async (req: Request, res: Response) => {
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
        if (!await hasCurrentTermsConsent(req.auth!.userId)) {
            return res.status(428).json(termsRequiredPayload());
        }

        const review = await prisma.$transaction(async (tx) => {
            const [author, completedBooking, existingReview] = await Promise.all([
                tx.user.findUnique({
                    where: { id: req.auth!.userId },
                    select: { name: true },
                }),
                tx.booking.findFirst({
                    where: {
                        customerId: req.auth!.userId,
                        technicianId,
                        status: 'COMPLETED',
                    },
                    select: { id: true },
                }),
                tx.review.findFirst({
                    where: {
                        technicianId,
                        authorId: req.auth!.userId,
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

            const createdReview = await tx.review.create({
                data: {
                    technicianId,
                    authorId: req.auth!.userId,
                    author: author.name,
                    rating,
                    comment: comment.trim(),
                },
            });

            const reviewStats = await tx.review.aggregate({
                where: { technicianId },
                _avg: { rating: true },
                _count: { _all: true },
            });

            await tx.technician.update({
                where: { id: technicianId },
                data: {
                    rating: reviewStats._avg.rating || 0,
                    totalReviews: reviewStats._count._all,
                },
            });

            return createdReview;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        res.status(201).json(review);
    } catch (error) {
        if (error instanceof ReviewAuthorizationError) {
            return res.status(403).json({ message: 'Solo clientes con un servicio completado pueden dejar una reseña' });
        }
        if (error instanceof DuplicateReviewError) {
            return res.status(409).json({ message: 'Ya publicaste una reseña para este técnico' });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
            return res.status(409).json({ message: 'La reseña cambió al mismo tiempo; intenta nuevamente' });
        }

        console.error('Error adding technician review:', error);
        res.status(500).json({ message: 'Error al publicar la reseña' });
    }
};
