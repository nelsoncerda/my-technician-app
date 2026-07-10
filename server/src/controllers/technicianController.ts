import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prisma';

class ReviewAuthorizationError extends Error {}
class DuplicateReviewError extends Error {}

export const getTechnicians = async (req: Request, res: Response) => {
    try {
        const technicians = await prisma.technician.findMany({
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
    } catch (error) {
        res.status(500).json({ message: 'Error fetching technicians', error });
    }
};

export const registerTechnician = async (req: Request, res: Response) => {
    try {
        const { specializations, location, phone, companyName } = req.body;
        const userId = req.auth!.userId;

        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations
                .filter((value): value is string => typeof value === 'string')
                .map((value) => value.trim())
                .filter(Boolean)
            : [];

        if (normalizedSpecializations.length === 0 || normalizedSpecializations.length > 10) {
            return res.status(400).json({ message: 'Selecciona entre 1 y 10 especialidades' });
        }
        if (typeof location !== 'string' || !location.trim()) {
            return res.status(400).json({ message: 'La ubicación es requerida' });
        }

        const technician = await prisma.$transaction(async (tx) => {
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
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { role: 'technician' },
            });

            return createdTechnician;
        });

        res.status(201).json(technician);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ message: 'Este usuario ya tiene un perfil técnico' });
        }
        res.status(500).json({ message: 'Error registering technician', error });
    }
};

export const verifyTechnician = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const technician = await prisma.technician.update({
            where: { id },
            data: { verified: true },
        });
        res.json(technician);
    } catch (error) {
        res.status(500).json({ message: 'Error verifying technician', error });
    }
};

export const deleteTechnician = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.technician.delete({ where: { id } });
        res.json({ message: 'Technician deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting technician', error });
    }
};

export const addTechnicianReview = async (req: Request, res: Response) => {
    try {
        const { id: technicianId } = req.params;
        const { rating, comment } = req.body;

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'La calificación debe ser un entero entre 1 y 5' });
        }
        if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1000) {
            return res.status(400).json({ message: 'La reseña debe tener entre 1 y 1000 caracteres' });
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
