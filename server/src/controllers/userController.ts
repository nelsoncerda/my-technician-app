import { Request, Response } from 'express';
import prisma from '../prisma';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: { name, phone },
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Delete related records first (due to foreign key constraints)
        await prisma.$transaction(async (tx) => {
            // Delete user points
            await tx.userPoints.deleteMany({ where: { userId: id } });
            // Delete point transactions
            await tx.pointTransaction.deleteMany({ where: { userId: id } });
            // Delete user achievements
            await tx.userAchievement.deleteMany({ where: { userId: id } });
            // Delete reward redemptions
            await tx.rewardRedemption.deleteMany({ where: { userId: id } });
            // Delete bookings where user is customer
            await tx.booking.deleteMany({ where: { customerId: id } });
            // Delete reviews by user
            await tx.review.deleteMany({ where: { authorId: id } });
            // Check if user is a technician and delete technician record
            const technician = await tx.technician.findUnique({ where: { userId: id } });
            if (technician) {
                // Delete technician's bookings
                await tx.booking.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's reviews
                await tx.review.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's availability
                await tx.availabilitySlot.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician's time off
                await tx.timeOff.deleteMany({ where: { technicianId: technician.id } });
                // Delete technician record
                await tx.technician.delete({ where: { userId: id } });
            }
            // Finally delete the user
            await tx.user.delete({ where: { id } });
        });

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error });
    }
};

export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'technician', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
};

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        // Get counts
        const [totalUsers, totalTechnicians, totalBookings, bookings, technicians] = await Promise.all([
            prisma.user.count(),
            prisma.technician.count(),
            prisma.booking.count(),
            prisma.booking.findMany({
                include: {
                    technician: {
                        include: { user: true }
                    },
                    customer: true,
                },
            }),
            prisma.technician.findMany({
                include: { user: true },
            }),
        ]);

        // Calculate stats
        const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
        const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
        const totalRevenue = bookings
            .filter(b => b.status === 'COMPLETED')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        const averageRating = technicians.length > 0
            ? technicians.reduce((sum, t) => sum + (t.rating || 0), 0) / technicians.length
            : 0;

        // Users by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { role: true },
        });

        // Bookings by status
        const bookingsByStatus = await prisma.booking.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        // Top technicians by completed jobs
        const topTechnicians = technicians
            .map(tech => ({
                name: tech.user.name,
                jobs: bookings.filter(b => b.technicianId === tech.id && b.status === 'COMPLETED').length,
                rating: tech.rating || 0,
            }))
            .sort((a, b) => b.jobs - a.jobs)
            .slice(0, 5);

        res.json({
            totalUsers,
            totalTechnicians,
            totalBookings,
            completedBookings,
            pendingBookings,
            totalRevenue,
            averageRating,
            usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count.role })),
            bookingsByStatus: bookingsByStatus.map(b => ({ status: b.status, count: b._count.status })),
            topTechnicians,
            recentActivity: [],
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Error fetching admin stats', error });
    }
};
