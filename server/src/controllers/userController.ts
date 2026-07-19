import { Request, Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { safeUserSelect } from '../utils/safeUser';
import {
    normalizeServiceAreaInput,
    ServiceAreaValidationError,
    toPublicMapLocation,
} from '../utils/serviceArea';
import { publicTextRejection } from '../utils/contentModeration';
import { hasCurrentTermsConsent, termsRequiredPayload } from '../services/moderationService';
import { accountIdentityDigest } from '../security/accountIdentity';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                ...safeUserSelect,
                technician: {
                    select: {
                        id: true,
                        moderationStatus: true,
                        moderationReason: true,
                    },
                },
            },
        });
        res.json(users.map(({ technician, moderationStatus, moderationReason, ...user }) => ({
            ...user,
            accountModerationStatus: moderationStatus,
            accountModerationReason: moderationReason,
            technicianId: technician?.id,
            technicianModerationStatus: technician?.moderationStatus,
            technicianModerationReason: technician?.moderationReason,
        })));
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

        const nameRejection = publicTextRejection('El nombre', name);
        if (nameRejection) {
            return res.status(400).json({ code: 'OBJECTIONABLE_PUBLIC_TEXT', message: nameRejection });
        }

        const existingAccount = await prisma.user.findUnique({
            where: { id },
            select: { technician: { select: { id: true } } },
        });
        if (!existingAccount) return res.status(404).json({ message: 'Usuario no encontrado' });
        if (existingAccount.technician && !await hasCurrentTermsConsent(id)) {
            return res.status(428).json(termsRequiredPayload());
        }

        const user = await prisma.$transaction(async (tx) => {
            const current = await tx.user.findUnique({
                where: { id },
                select: { technician: { select: { id: true, moderationStatus: true } } },
            });
            if (!current) return null;

            const updated = await tx.user.update({
                where: { id },
                data: { name: name.trim(), phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null },
                select: safeUserSelect,
            });
            if (current.technician && current.technician.moderationStatus !== 'SUSPENDED') {
                await tx.technician.update({
                    where: { id: current.technician.id },
                    data: {
                        moderationStatus: 'PENDING',
                        moderationReason: null,
                        moderationSubmittedAt: new Date(),
                        moderatedAt: null,
                        moderatedById: null,
                    },
                });
            }
            return updated;
        });

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const { moderationStatus, moderationReason, ...safeUser } = user;
        res.json({
            ...safeUser,
            accountModerationStatus: moderationStatus,
            accountModerationReason: moderationReason,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
};

// Update user profile with history tracking
export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            phone,
            photoUrl,
            specializations,
            location,
            companyName,
            serviceArea,
            mapVisible,
        } = req.body;
        const hasServiceArea = Object.prototype.hasOwnProperty.call(req.body, 'serviceArea');
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
        if (photoUrl !== undefined) {
            return res.status(400).json({
                code: 'PHOTO_MODERATION_REQUIRED',
                message: 'Las fotos deben enviarse mediante el flujo de moderación de fotos',
            });
        }
        if (specializations !== undefined && (
            !Array.isArray(specializations) ||
            specializations.length === 0 ||
            specializations.length > 10 ||
            specializations.some((value: unknown) => typeof value !== 'string' || !value.trim())
        )) {
            return res.status(400).json({ message: 'Las especialidades no son válidas' });
        }
        if (location !== undefined && (
            typeof location !== 'string' || !location.trim() || location.trim().length > 160
        )) {
            return res.status(400).json({ message: 'La ubicación no es válida' });
        }
        if (companyName !== undefined && companyName !== null && (
            typeof companyName !== 'string' || companyName.trim().length > 120
        )) {
            return res.status(400).json({ message: 'El nombre de la empresa no es válido' });
        }
        if (mapVisible !== undefined && typeof mapVisible !== 'boolean') {
            return res.status(400).json({ message: 'La visibilidad en el mapa no es válida' });
        }

        const normalizedName = typeof name === 'string' ? name.trim() : undefined;
        const normalizedPhone = typeof phone === 'string' ? phone.trim() || null : undefined;
        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations.map((value: string) => value.trim())
            : undefined;
        const normalizedLocation = typeof location === 'string' ? location.trim() : undefined;
        const normalizedCompanyName = companyName === null
            ? null
            : typeof companyName === 'string'
                ? companyName.trim() || null
                : undefined;
        const normalizedServiceArea = hasServiceArea
            ? normalizeServiceAreaInput(serviceArea)
            : undefined;

        const nameRejection = publicTextRejection('El nombre', normalizedName);
        const companyRejection = publicTextRejection('El nombre de la empresa', normalizedCompanyName);
        if (nameRejection || companyRejection) {
            return res.status(400).json({
                code: 'OBJECTIONABLE_PUBLIC_TEXT',
                message: nameRejection || companyRejection,
            });
        }

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
        if (
            !currentUser.technician &&
            (
                normalizedSpecializations !== undefined ||
                normalizedLocation !== undefined ||
                normalizedCompanyName !== undefined ||
                normalizedServiceArea !== undefined ||
                mapVisible !== undefined
            )
        ) {
            return res.status(400).json({ message: 'Este usuario no tiene un perfil técnico' });
        }

        // Track changes
        const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = [];

        if (normalizedName !== undefined && normalizedName !== currentUser.name) {
            changes.push({ fieldName: 'name', oldValue: currentUser.name, newValue: normalizedName });
        }
        if (normalizedPhone !== undefined && normalizedPhone !== currentUser.phone) {
            changes.push({ fieldName: 'phone', oldValue: currentUser.phone, newValue: normalizedPhone });
        }
        // Track specializations changes for technicians
        if (normalizedSpecializations !== undefined && currentUser.technician) {
            const oldSpecs = currentUser.technician.specializations.join(', ');
            const newSpecs = normalizedSpecializations.join(', ');
            if (oldSpecs !== newSpecs) {
                changes.push({ fieldName: 'specializations', oldValue: oldSpecs, newValue: newSpecs });
            }
        }
        if (normalizedLocation !== undefined && currentUser.technician && normalizedLocation !== currentUser.technician.location) {
            changes.push({
                fieldName: 'location',
                oldValue: currentUser.technician.location,
                newValue: normalizedLocation,
            });
        }
        if (
            normalizedCompanyName !== undefined &&
            currentUser.technician &&
            normalizedCompanyName !== currentUser.technician.companyName
        ) {
            changes.push({
                fieldName: 'companyName',
                oldValue: currentUser.technician.companyName,
                newValue: normalizedCompanyName,
            });
        }
        if (mapVisible !== undefined && currentUser.technician && mapVisible !== currentUser.technician.mapVisible) {
            changes.push({
                fieldName: 'mapVisible',
                oldValue: String(currentUser.technician.mapVisible),
                newValue: String(mapVisible),
            });
        }
        if (normalizedServiceArea !== undefined && currentUser.technician) {
            const oldArea = currentUser.technician.serviceAreaLatitude === null
                ? null
                : JSON.stringify({
                    latitude: currentUser.technician.serviceAreaLatitude,
                    longitude: currentUser.technician.serviceAreaLongitude,
                    radiusKm: currentUser.technician.serviceAreaRadiusKm,
                });
            const newArea = normalizedServiceArea === null ? null : JSON.stringify(normalizedServiceArea);
            if (oldArea !== newArea) {
                changes.push({ fieldName: 'serviceArea', oldValue: oldArea, newValue: newArea });
            }
        }

        const hasModeratedProfileChanges = Boolean(
            currentUser.technician &&
            changes.some((change) => [
                'name',
                'specializations',
                'location',
                'companyName',
                'serviceArea',
            ].includes(change.fieldName))
        );
        const requiresProfileReview = Boolean(
            hasModeratedProfileChanges && currentUser.technician?.moderationStatus !== 'SUSPENDED'
        );
        if (hasModeratedProfileChanges && !await hasCurrentTermsConsent(id)) {
            return res.status(428).json(termsRequiredPayload());
        }

        // If no changes, return current user with technician data
        if (changes.length === 0) {
            const {
                technician: currentTechnician,
                moderationStatus: accountModerationStatus,
                moderationReason: accountModerationReason,
                ...safeCurrentUser
            } = currentUser;
            return res.json({
                ...safeCurrentUser,
                accountModerationStatus,
                accountModerationReason,
                technicianId: currentTechnician?.id,
                specializations: currentTechnician?.specializations,
                location: currentTechnician?.location,
                companyName: currentTechnician?.companyName,
                technicianModerationStatus: currentTechnician?.moderationStatus,
                technicianModerationReason: currentTechnician?.moderationReason,
                mapVisible: currentTechnician?.mapVisible,
                mapLocation: currentTechnician
                    ? toPublicMapLocation(currentTechnician)
                    : undefined,
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
                },
                select: safeUserSelect,
            });

            // Update technician profile fields if applicable
            let technician = currentUser.technician;
            if (technician && (
                normalizedSpecializations !== undefined ||
                normalizedLocation !== undefined ||
                normalizedCompanyName !== undefined ||
                normalizedServiceArea !== undefined ||
                mapVisible !== undefined ||
                requiresProfileReview
            )) {
                technician = await tx.technician.update({
                    where: { userId: id },
                    data: {
                        ...(normalizedSpecializations !== undefined && { specializations: normalizedSpecializations }),
                        ...(normalizedLocation !== undefined && { location: normalizedLocation }),
                        ...(normalizedCompanyName !== undefined && { companyName: normalizedCompanyName }),
                        ...(mapVisible !== undefined && { mapVisible }),
                        ...(normalizedServiceArea !== undefined && {
                            serviceAreaLatitude: normalizedServiceArea?.latitude ?? null,
                            serviceAreaLongitude: normalizedServiceArea?.longitude ?? null,
                            serviceAreaRadiusKm: normalizedServiceArea?.radiusKm ?? 5,
                        }),
                        ...(requiresProfileReview && {
                            moderationStatus: 'PENDING',
                            moderationReason: null,
                            moderationSubmittedAt: new Date(),
                            moderatedAt: null,
                            moderatedById: null,
                        }),
                    },
                });
            }

            return { updatedUser, technician };
        });

        // Return combined user + technician data
        const {
            moderationStatus: accountModerationStatus,
            moderationReason: accountModerationReason,
            ...updatedUser
        } = result.updatedUser;
        res.json({
            ...updatedUser,
            accountModerationStatus,
            accountModerationReason,
            technicianId: result.technician?.id,
            specializations: result.technician?.specializations,
            location: result.technician?.location,
            companyName: result.technician?.companyName,
            technicianModerationStatus: result.technician?.moderationStatus,
            technicianModerationReason: result.technician?.moderationReason,
            mapVisible: result.technician?.mapVisible,
            mapLocation: result.technician
                ? toPublicMapLocation(result.technician)
                : undefined,
        });
    } catch (error) {
        if (error instanceof ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
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

        if (typeof photoBase64 !== 'string' || !photoBase64) {
            return res.status(400).json({ message: 'No se proporcionó una foto' });
        }

        // In a real app, you would upload to S3, Cloudinary, etc.
        // For now, we'll store the base64 string directly (not recommended for production)
        // Maximum size check (roughly 2MB in base64)
        if (photoBase64.length > 2 * 1024 * 1024 * 1.37) {
            return res.status(400).json({ message: 'La foto supera el máximo de 2 MB' });
        }
        if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoBase64)) {
            return res.status(400).json({ message: 'La foto debe ser JPEG, PNG o WebP' });
        }
        if (!await hasCurrentTermsConsent(id)) {
            return res.status(428).json(termsRequiredPayload());
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

        // Get current user to track old photo
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true, photoUrl: true },
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Stage the candidate. The currently-approved public image remains
        // unchanged until an administrator approves this submission.
        const result = await prisma.$transaction(async (tx) => {
            await tx.profilePhotoSubmission.updateMany({
                where: { userId: id, status: 'PENDING' },
                data: {
                    imageData: '',
                    pendingKey: null,
                    status: 'REJECTED',
                    reviewedAt: new Date(),
                    reviewNote: 'Reemplazada por una entrega más reciente',
                },
            });

            await tx.profileChangeHistory.create({
                data: {
                    userId: id,
                    fieldName: 'pendingPhotoUrl',
                    oldValue: null,
                    newValue: '[photo submitted for moderation]',
                    changedBy: req.auth!.userId,
                    ipAddress,
                },
            });

            return tx.profilePhotoSubmission.create({
                data: {
                    userId: id,
                    imageData: photoBase64,
                    pendingKey: id,
                },
                select: { id: true, status: true, submittedAt: true },
            });
        }, { isolationLevel: 'Serializable' });

        res.status(202).json({
            message: 'Foto enviada para revisión',
            submissionId: result.id,
            photoModerationStatus: result.status,
            submittedAt: result.submittedAt,
            photoUrl: currentUser.photoUrl,
        });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ message: 'Error uploading photo', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedAt = new Date();

        const result = await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    moderationStatus: true,
                    deletedAt: true,
                    deletionIdentityDigest: true,
                    technician: {
                        select: { id: true, moderationStatus: true, moderationReason: true },
                    },
                },
            });

            if (!target || target.deletedAt) return { outcome: 'not_found' as const };

            // Administrative accounts are protected targets. An administrator
            // may close only their own account, and never the last live admin.
            if (target.role === 'admin' && req.auth!.userId !== target.id) {
                return { outcome: 'protected_admin' as const };
            }
            if (target.role === 'admin') {
                const liveAdminCount = await tx.user.count({
                    where: { role: 'admin', deletedAt: null },
                });
                if (liveAdminCount <= 1) return { outcome: 'last_admin' as const };
            }

            const deletionIdentityDigest = accountIdentityDigest(target.email);
            const sanctionedAtDeletion = target.moderationStatus === 'SUSPENDED'
                || target.technician?.moderationStatus === 'SUSPENDED';

            // Preserve reports and their minimum necessary evidence. We retain
            // keyed identity digests rather than raw emails. Database triggers
            // make these snapshots immutable once written.
            const affectedReports = await tx.contentReport.findMany({
                where: {
                    OR: [{ reporterId: id }, { targetUserId: id }],
                },
                select: {
                    id: true,
                    reporterIdentitySnapshot: true,
                    targetIdentitySnapshot: true,
                    technicianIdSnapshot: true,
                    profilePhotoIdSnapshot: true,
                    technicianId: true,
                    profilePhotoSubmissionId: true,
                    reporter: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            deletedAt: true,
                            deletionIdentityDigest: true,
                        },
                    },
                    targetUser: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            deletedAt: true,
                            deletionIdentityDigest: true,
                        },
                    },
                },
            });

            for (const report of affectedReports) {
                const data: Prisma.ContentReportUpdateInput = {};
                if (!report.reporterIdentitySnapshot) {
                    data.reporterIdentitySnapshot = {
                        accountReference: report.reporter.id,
                        displayName: report.reporter.deletedAt ? 'Cuenta eliminada' : report.reporter.name,
                        role: report.reporter.role,
                        identityDigest: report.reporter.deletionIdentityDigest
                            || accountIdentityDigest(report.reporter.email),
                        capturedAt: deletedAt.toISOString(),
                    };
                }
                if (!report.targetIdentitySnapshot) {
                    data.targetIdentitySnapshot = {
                        accountReference: report.targetUser.id,
                        displayName: report.targetUser.deletedAt ? 'Cuenta eliminada' : report.targetUser.name,
                        role: report.targetUser.role,
                        identityDigest: report.targetUser.deletionIdentityDigest
                            || accountIdentityDigest(report.targetUser.email),
                        capturedAt: deletedAt.toISOString(),
                    };
                }
                if (!report.technicianIdSnapshot && report.technicianId) {
                    data.technicianIdSnapshot = report.technicianId;
                }
                if (!report.profilePhotoIdSnapshot && report.profilePhotoSubmissionId) {
                    data.profilePhotoIdSnapshot = report.profilePhotoSubmissionId;
                }
                if (Object.keys(data).length > 0) {
                    await tx.contentReport.update({ where: { id: report.id }, data });
                }
            }

            const bookingIds = await tx.booking.findMany({
                where: {
                    OR: [
                        { customerId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
                select: { id: true },
            });
            if (bookingIds.length > 0) {
                await tx.bookingReminder.deleteMany({
                    where: { bookingId: { in: bookingIds.map((booking) => booking.id) } },
                });
            }

            await tx.userPoints.deleteMany({ where: { userId: id } });
            await tx.pointTransaction.deleteMany({ where: { userId: id } });
            await tx.userAchievement.deleteMany({ where: { userId: id } });
            await tx.rewardRedemption.deleteMany({ where: { userId: id } });
            await tx.leaderboardEntry.deleteMany({ where: { userId: id } });
            await tx.profileChangeHistory.deleteMany({ where: { userId: id } });
            await tx.ugcTermsConsent.deleteMany({ where: { userId: id } });
            await tx.userBlock.deleteMany({
                where: { OR: [{ blockerId: id }, { blockedUserId: id }] },
            });
            await tx.profilePhotoSubmission.deleteMany({ where: { userId: id } });
            await tx.booking.deleteMany({
                where: {
                    OR: [
                        { customerId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
            });
            await tx.review.deleteMany({
                where: {
                    OR: [
                        { authorId: id },
                        ...(target.technician ? [{ technicianId: target.technician.id }] : []),
                    ],
                },
            });

            if (target.technician) {
                await tx.availabilitySlot.deleteMany({ where: { technicianId: target.technician.id } });
                await tx.timeOff.deleteMany({ where: { technicianId: target.technician.id } });
                await tx.technician.delete({ where: { id: target.technician.id } });
            }

            // Keep only a pseudonymous tombstone so trust-and-safety evidence,
            // reviewer references, and a sanctioned-account marker survive.
            await tx.user.update({
                where: { id },
                data: {
                    email: `deleted+${id}@accounts.invalid`,
                    password: `deleted:${crypto.randomBytes(32).toString('hex')}`,
                    name: 'Cuenta eliminada',
                    phone: null,
                    photoUrl: null,
                    role: 'user',
                    emailVerified: false,
                    verificationToken: null,
                    verificationTokenExpires: null,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                    deletedAt,
                    deletionIdentityDigest,
                    sanctionedAtDeletion,
                    moderationStatus: sanctionedAtDeletion ? 'SUSPENDED' : target.moderationStatus,
                    moderationReason: target.moderationStatus === 'SUSPENDED'
                        ? undefined
                        : target.technician?.moderationReason || null,
                },
            });

            return { outcome: 'deleted' as const };
        }, { isolationLevel: 'Serializable' });

        if (result.outcome === 'not_found') {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (result.outcome === 'protected_admin') {
            return res.status(403).json({ message: 'No se puede eliminar otra cuenta administrativa' });
        }
        if (result.outcome === 'last_admin') {
            return res.status(409).json({ message: 'No se puede eliminar la última cuenta administrativa activa' });
        }

        res.json({
            message: 'Cuenta eliminada. Los registros mínimos de seguridad se conservaron de forma seudonimizada.',
        });
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

        const { moderationStatus, moderationReason, ...safeUser } = user;
        res.json({
            ...safeUser,
            accountModerationStatus: moderationStatus,
            accountModerationReason: moderationReason,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
};

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        // Get counts
        const [totalUsers, totalTechnicians, totalBookings, bookings, technicians] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
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
            where: { deletedAt: null },
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
