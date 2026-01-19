import { Request, Response } from 'express';
import prisma from '../prisma';

export const getTechnicians = async (req: Request, res: Response) => {
    try {
        const technicians = await prisma.technician.findMany({
            include: {
                reviews: true,
            },
        });

        // Transform to match frontend interface if needed, or update frontend
        // Flattening the structure a bit for easier consumption
        const formattedTechnicians = await Promise.all(technicians.map(async (tech) => {
            const user = await prisma.user.findUnique({ where: { id: tech.userId } });
            return {
                id: tech.id,
                name: user?.name || 'Unknown',
                email: user?.email || '',
                phone: user?.phone || '',
                photoUrl: user?.photoUrl || null,
                specialization: tech.specializations.join(', '), // For backwards compatibility
                specializations: tech.specializations, // New array format
                location: tech.location,
                companyName: tech.companyName || null,
                rating: tech.rating,
                verified: tech.verified,
                reviews: tech.reviews,
            };
        }));

        res.json(formattedTechnicians);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching technicians', error });
    }
};

export const registerTechnician = async (req: Request, res: Response) => {
    try {
        const { userId, specializations, location, phone, companyName } = req.body;

        // Update user phone if provided
        if (phone) {
            await prisma.user.update({
                where: { id: userId },
                data: { phone },
            });
        }

        // Create technician profile
        const technician = await prisma.technician.create({
            data: {
                userId,
                specializations: Array.isArray(specializations) ? specializations : [specializations],
                location,
                companyName: companyName || null,
            },
        });

        // Update user role
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'technician' },
        });

        res.status(201).json(technician);
    } catch (error) {
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
