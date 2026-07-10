import { Request, Response } from 'express';
import prisma from '../prisma';
import { safeUserSelect } from '../utils/safeUser';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({ select: safeUserSelect });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;

        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: 'El nombre no es válido' });
        }
        if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
            return res.status(400).json({ message: 'El teléfono no es válido' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { name: name.trim(), phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null },
            select: safeUserSelect,
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
};

// Update user profile with history tracking
export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, photoUrl, specializations } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

        if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
            return res.status(400).json({ message: 'El nombre no es válido' });
        }
        if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
            return res.status(400).json({ message: 'El teléfono no es válido' });
        }
        if (photoUrl !== undefined && (typeof photoUrl !== 'string' || photoUrl.length > 2.8 * 1024 * 1024)) {
            return res.status(400).json({ message: 'La foto de perfil es demasiado grande' });
        }
        if (specializations !== undefined && (
            !Array.isArray(specializations) ||
            specializations.length === 0 ||
            specializations.length > 10 ||
            specializations.some((value: unknown) => typeof value !== 'string' || !value.trim())
        )) {
            return res.status(400).json({ message: 'Las especialidades no son válidas' });
        }

        const normalizedName = typeof name === 'string' ? name.trim() : undefined;
        const normalizedPhone = typeof phone === 'string' ? phone.trim() || null : undefined;
        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations.map((value: string) => value.trim())
            : undefined;

        // Get current user data with technician info
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: {
                ...safeUserSelect,
                technician: true,
            },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Track changes
        const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = [];

        if (normalizedName !== undefined && normalizedName !== currentUser.name) {
            changes.push({ fieldName: 'name', oldValue: currentUser.name, newValue: normalizedName });
        }
        if (normalizedPhone !== undefined && normalizedPhone !== currentUser.phone) {
            changes.push({ fieldName: 'phone', oldValue: currentUser.phone, newValue: normalizedPhone });
        }
        if (photoUrl !== undefined && photoUrl !== currentUser.photoUrl) {
            changes.push({ fieldName: 'photoUrl', oldValue: currentUser.photoUrl, newValue: photoUrl });
        }

        // Track specializations changes for technicians
        if (normalizedSpecializations !== undefined && currentUser.technician) {
            const oldSpecs = currentUser.technician.specializations.join(', ');
            const newSpecs = normalizedSpecializations.join(', ');
            if (oldSpecs !== newSpecs) {
                changes.push({ fieldName: 'specializations', oldValue: oldSpecs, newValue: newSpecs });
            }
        }

        // If no changes, return current user with technician data
        if (changes.length === 0) {
            return res.json({
                ...currentUser,
                technicianId: currentUser.technician?.id,
                specializations: currentUser.technician?.specializations,
                location: currentUser.technician?.location,
                companyName: currentUser.technician?.companyName,
            });
        }

        // Update user and create history records in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create history records for each change
            await tx.profileChangeHistory.createMany({
                data: changes.map(change => ({
                    userId: id,
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    changedBy: req.auth!.userId,
                    ipAddress,
                })),
            });

            // Update user
            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    ...(normalizedName !== undefined && { name: normalizedName }),
                    ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
                    ...(photoUrl !== undefined && { photoUrl }),
                },
                select: safeUserSelect,
            });

            // Update technician specializations if applicable
            let technician = currentUser.technician;
            if (normalizedSpecializations !== undefined && technician) {
                technician = await tx.technician.update({
                    where: { userId: id },
                    data: { specializations: normalizedSpecializations },
                });
            }

            return { updatedUser, technician };
        });

        // Return combined user + technician data
        res.json({
            ...result.updatedUser,
            technicianId: result.technician?.id,
            specializations: result.technician?.specializations,
            location: result.technician?.location,
            companyName: result.technician?.companyName,
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile', error });
    }
};

// Get user profile change history
export const getUserProfileHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const history = await prisma.profileChangeHistory.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 50, // Last 50 changes
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching profile history:', error);
        res.status(500).json({ message: 'Error fetching profile history', error });
    }
};

// Upload profile photo (base64)
export const uploadProfilePhoto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { photoBase64 } = req.body;

        if (!photoBase64) {
            return res.status(400).json({ message: 'No photo provided' });
        }

        // In a real app, you would upload to S3, Cloudinary, etc.
        // For now, we'll store the base64 string directly (not recommended for production)
        // Maximum size check (roughly 2MB in base64)
        if (photoBase64.length > 2 * 1024 * 1024 * 1.37) {
            return res.status(400).json({ message: 'Photo too large. Maximum size is 2MB' });
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

        // Get current user to track old photo
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { photoUrl: true },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Update in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create history record
            await tx.profileChangeHistory.create({
                data: {
                    userId: id,
                    fieldName: 'photoUrl',
                    oldValue: currentUser.photoUrl ? '[previous photo]' : null,
                    newValue: '[new photo uploaded]',
                    changedBy: req.auth!.userId,
                    ipAddress,
                },
            });

            // Update user photo
            const updatedUser = await tx.user.update({
                where: { id },
                data: { photoUrl: photoBase64 },
                select: { photoUrl: true },
            });

            return updatedUser;
        });

        res.json({ message: 'Photo uploaded successfully', photoUrl: result.photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ message: 'Error uploading photo', error });
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

        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { role: true, technician: { select: { id: true } } },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (role === 'technician' && !currentUser.technician) {
            return res.status(400).json({ message: 'Crea primero el perfil técnico del usuario' });
        }
        if (currentUser.technician && role !== 'technician') {
            return res.status(400).json({ message: 'No se puede cambiar el rol mientras exista un perfil técnico' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: safeUserSelect,
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
