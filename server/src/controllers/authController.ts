import { Request, Response } from 'express';
import prisma from '../prisma';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../security/password';
import { createAuthToken, normalizeAuthRole } from '../security/token';
import { accountIdentityDigest } from '../security/accountIdentity';
import { safeUserSelect } from '../utils/safeUser';
import {
    normalizeServiceAreaInput,
    ServiceAreaValidationError,
    toPublicMapLocation,
} from '../utils/serviceArea';
import { publicTextRejection } from '../utils/contentModeration';
import {
    CURRENT_UGC_TERMS_VERSION,
    hasInlineCurrentTermsConsent,
    recordCurrentTermsConsent,
    termsRequiredPayload,
} from '../services/moderationService';

const APP_URL = process.env.APP_URL || 'https://api.tecnicosenrd.com';

export const register = async (req: Request, res: Response) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            accountType,
            specializations,
            location,
            photoBase64,
            companyName,
            serviceArea,
            mapVisible,
        } = req.body;

        if (
            typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100 ||
            typeof email !== 'string' || !email.trim() ||
            typeof password !== 'string' || password.length < 8
        ) {
            return res.status(400).json({ message: 'Nombre, correo y contraseña válida son requeridos' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: 'El correo no tiene un formato válido' });
        }
        if (accountType !== 'user' && accountType !== 'technician') {
            return res.status(400).json({ message: 'El tipo de cuenta no es válido' });
        }

        const acceptsCurrentTerms = hasInlineCurrentTermsConsent(req.body);
        if (!acceptsCurrentTerms) {
            return res.status(428).json(termsRequiredPayload());
        }

        const normalizedSpecializations = Array.isArray(specializations)
            ? specializations
                .filter((value: unknown): value is string => typeof value === 'string')
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [];
        const normalizedLocation = typeof location === 'string' ? location.trim() : '';

        if (accountType === 'technician' && (normalizedSpecializations.length === 0 || !normalizedLocation)) {
            return res.status(400).json({ message: 'Los técnicos deben indicar especialidades y ubicación' });
        }
        if (normalizedLocation.length > 160) {
            return res.status(400).json({ message: 'La ubicación no es válida' });
        }
        if (normalizedSpecializations.length > 10) {
            return res.status(400).json({ message: 'Puedes seleccionar hasta 10 especialidades' });
        }
        if (mapVisible !== undefined && typeof mapVisible !== 'boolean') {
            return res.status(400).json({ message: 'La visibilidad en el mapa no es válida' });
        }
        if (photoBase64 && (typeof photoBase64 !== 'string' || photoBase64.length > 2.8 * 1024 * 1024)) {
            return res.status(400).json({ message: 'La foto de perfil es demasiado grande' });
        }
        if (photoBase64 && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoBase64)) {
            return res.status(400).json({ message: 'La foto debe ser JPEG, PNG o WebP' });
        }
        if (companyName !== undefined && companyName !== null && (
            typeof companyName !== 'string' || companyName.trim().length > 120
        )) {
            return res.status(400).json({ message: 'El nombre de la empresa no es válido' });
        }
        const nameRejection = publicTextRejection('El nombre', name.trim());
        const companyRejection = publicTextRejection(
            'El nombre de la empresa',
            typeof companyName === 'string' ? companyName.trim() : null
        );
        if (nameRejection || companyRejection) {
            return res.status(400).json({
                code: 'OBJECTIONABLE_PUBLIC_TEXT',
                message: nameRejection || companyRejection,
            });
        }

        const normalizedServiceArea = serviceArea === undefined
            ? undefined
            : normalizeServiceAreaInput(serviceArea);

        // Check both the live identity and privacy-safe deletion markers. A
        // sanctioned account cannot evade an active safety decision by deleting
        // itself and immediately registering the same email again.
        const deletionIdentityDigest = accountIdentityDigest(normalizedEmail);
        const [existingUser, restrictedDeletionMarker] = await Promise.all([
            prisma.user.findFirst({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' }, deletedAt: null },
                select: { id: true },
            }),
            prisma.user.findFirst({
                where: {
                    deletedAt: { not: null },
                    deletionIdentityDigest,
                    moderationStatus: 'SUSPENDED',
                },
                select: { id: true },
            }),
        ]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        if (restrictedDeletionMarker) {
            return res.status(403).json({
                code: 'ACCOUNT_RECREATION_RESTRICTED',
                message: 'Esta cuenta no se puede volver a crear mientras exista una medida de seguridad. Contacta a soporte para apelar.',
                supportUrl: '/support',
            });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const passwordHash = await hashPassword(password);

        // Determine the role based on account type
        const role = accountType === 'technician' ? 'technician' : 'user';

        // Create user with transaction to also create technician if needed
        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: normalizedEmail,
                    password: passwordHash,
                    phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
                    role,
                    verificationToken,
                    verificationTokenExpires,
                    // Candidate photos are never public before human approval.
                    photoUrl: null,
                },
                select: safeUserSelect,
            });

            // If the user is a technician, also create a technician record
            // Technicians are also users, so they can book services from other technicians
            if (accountType === 'technician') {
                await tx.technician.create({
                    data: {
                        userId: user.id,
                        specializations: normalizedSpecializations,
                        location: normalizedLocation,
                        companyName: typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null,
                        ...(normalizedServiceArea !== undefined && {
                            serviceAreaLatitude: normalizedServiceArea?.latitude ?? null,
                            serviceAreaLongitude: normalizedServiceArea?.longitude ?? null,
                            serviceAreaRadiusKm: normalizedServiceArea?.radiusKm ?? 5,
                        }),
                        ...(mapVisible !== undefined && { mapVisible }),
                        verified: false,
                        moderationStatus: 'PENDING',
                        moderationSubmittedAt: new Date(),
                    },
                });
            }

            if (acceptsCurrentTerms) {
                await recordCurrentTermsConsent({
                    userId: user.id,
                    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
                    userAgent: req.headers['user-agent'] || null,
                    db: tx,
                });
            }

            const pendingPhoto = photoBase64
                ? await tx.profilePhotoSubmission.create({
                    data: {
                        userId: user.id,
                        imageData: photoBase64,
                        pendingKey: user.id,
                    },
                    select: { id: true, status: true, submittedAt: true },
                })
                : null;

            // Initialize gamification points for the new user
            await tx.userPoints.create({
                data: {
                    userId: user.id,
                    totalPoints: 0,
                    currentLevel: 1,
                    levelProgress: 0,
                    lifetimePoints: 0,
                },
            });

            return { user, pendingPhoto };
        });

        // Send verification email
        await sendVerificationEmail(normalizedEmail, verificationToken, name.trim());

        const {
            moderationStatus: accountModerationStatus,
            moderationReason: accountModerationReason,
            ...registrationUser
        } = result.user;
        res.status(201).json({
            ...registrationUser,
            accountModerationStatus,
            accountModerationReason,
            ugcTermsAccepted: acceptsCurrentTerms,
            ugcTermsVersion: acceptsCurrentTerms ? CURRENT_UGC_TERMS_VERSION : null,
            ...(result.pendingPhoto && {
                pendingPhotoSubmissionId: result.pendingPhoto.id,
                photoModerationStatus: result.pendingPhoto.status,
                photoSubmittedAt: result.pendingPhoto.submittedAt,
            }),
            ...(accountType === 'technician' && {
                technicianModerationStatus: 'PENDING',
                technicianModerationReason: null,
            }),
        });
    } catch (error) {
        if (error instanceof ServiceAreaValidationError) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).send(getVerificationPage('error', 'Token invalido'));
        }

        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationTokenExpires: { gt: new Date() },
            },
            select: { id: true, email: true, name: true, emailVerified: true },
        });

        if (!user) {
            return res.status(400).send(getVerificationPage('error', 'El token es invalido o ya fue utilizado'));
        }

        if (user.emailVerified) {
            return res.send(getVerificationPage('already', 'Tu cuenta ya estaba verificada'));
        }

        const verification = await prisma.user.updateMany({
            where: {
                id: user.id,
                emailVerified: false,
                verificationToken: token,
                verificationTokenExpires: { gt: new Date() },
            },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpires: null,
            },
        });

        if (verification.count !== 1) {
            return res.send(getVerificationPage('already', 'El enlace ya fue utilizado'));
        }

        // Send welcome email
        await sendWelcomeEmail(user.email, user.name);

        res.send(getVerificationPage('success', 'Tu cuenta ha sido verificada exitosamente'));
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).send(getVerificationPage('error', 'Error al verificar el correo'));
    }
};

export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, email: true, name: true, emailVerified: true },
        });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'Si el correo existe, se enviara un nuevo enlace de verificacion' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'Si el correo requiere verificación, se enviará un nuevo enlace' });
        }

        // Generate new token
        const newToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: newToken,
                verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        // Send new verification email
        await sendVerificationEmail(user.email, newToken, user.name);

        res.json({
            message: 'Se ha enviado un nuevo enlace de verificacion a tu correo'
        });
    } catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).json({ message: 'Error al reenviar la verificacion' });
    }
};

export const checkVerificationStatus = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.auth!.userId },
            select: {
                emailVerified: true,
                moderationStatus: true,
                moderationReason: true,
                technician: {
                    select: {
                        moderationStatus: true,
                        moderationReason: true,
                    },
                },
                // Return only the owner's latest moderation decision. The
                // staged image and reviewer identity are deliberately omitted.
                profilePhotoSubmissions: {
                    select: {
                        id: true,
                        status: true,
                        submittedAt: true,
                        reviewedAt: true,
                        reviewNote: true,
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const latestPhoto = user.profilePhotoSubmissions[0];
        res.json({
            emailVerified: user.emailVerified,
            accountModerationStatus: user.moderationStatus,
            accountModerationReason: user.moderationReason,
            limitedAccess: user.moderationStatus === 'SUSPENDED',
            technicianModerationStatus: user.technician?.moderationStatus || null,
            technicianModerationReason: user.technician?.moderationReason || null,
            photoModerationStatus: latestPhoto?.status || null,
            photoModerationReason: latestPhoto?.reviewNote || null,
            photoModerationSubmissionId: latestPhoto?.id || null,
            pendingPhotoSubmissionId: latestPhoto?.status === 'PENDING' ? latestPhoto.id : null,
            photoSubmittedAt: latestPhoto?.submittedAt || null,
            photoModerationReviewedAt: latestPhoto?.reviewedAt || null,
        });
    } catch (error) {
        console.error('Error checking verification status:', error);
        res.status(500).json({ message: 'Error al verificar el estado' });
    }
};

// Request password reset
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ message: 'El correo es requerido' });
        }

        const user = await prisma.user.findFirst({
            where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
            select: { id: true, email: true, name: true },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetExpires,
            },
        });

        // Send reset email
        await sendPasswordResetEmail(user.email, resetToken, user.name);

        res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        const passwordHash = await hashPassword(newPassword);

        // Consume the token and update the password in one conditional write so
        // two concurrent requests cannot reuse the same reset link.
        const reset = await prisma.user.updateMany({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
            data: {
                password: passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        if (reset.count !== 1) {
            return res.status(400).json({ message: 'El enlace es inválido o ha expirado' });
        }

        res.json({ message: 'Tu contraseña ha sido actualizada exitosamente' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error al restablecer la contraseña' });
    }
};

// Verify reset token (check if valid before showing reset form)
export const verifyResetToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ valid: false, message: 'Token inválido' });
        }

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
            select: { email: true, name: true },
        });

        if (!user) {
            return res.json({ valid: false, message: 'El enlace es inválido o ha expirado' });
        }

        res.json({ valid: true, email: user.email, name: user.name });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({ valid: false, message: 'Error al verificar el token' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Get user with technician data if applicable
        const user = await prisma.user.findFirst({
            where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
            select: {
                ...safeUserSelect,
                deletedAt: true,
                password: true,
                technician: true,
                ugcTermsConsents: {
                    where: { termsVersion: CURRENT_UGC_TERMS_VERSION },
                    select: { termsVersion: true, acceptedAt: true },
                    take: 1,
                },
                profilePhotoSubmissions: {
                    select: {
                        id: true,
                        status: true,
                        submittedAt: true,
                        reviewedAt: true,
                        reviewNote: true,
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user || user.deletedAt) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordResult = await verifyPassword(password, user.password);
        if (!passwordResult.valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const accountSuspended = user.moderationStatus === 'SUSPENDED';

        // Transparently migrate accounts created before password hashing was added.
        if (passwordResult.needsRehash) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: await hashPassword(password) },
            });
        }

        const role = normalizeAuthRole(user.role);
        const token = createAuthToken(user.id, role);
        const currentConsent = user.ugcTermsConsents[0];
        const latestPhoto = user.profilePhotoSubmissions[0];

        // Return user with technician fields if applicable
        const responseData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            phone: user.phone,
            photoUrl: user.photoUrl,
            emailVerified: user.emailVerified,
            accountModerationStatus: user.moderationStatus,
            accountModerationReason: user.moderationReason,
            limitedAccess: accountSuspended,
            ...(accountSuspended && {
                suspensionCode: 'ACCOUNT_SUSPENDED',
                suspensionMessage: 'Esta cuenta está suspendida. Puedes contactar a soporte o eliminar tu cuenta.',
                supportUrl: '/support',
            }),
            ugcTermsAccepted: Boolean(currentConsent),
            ugcTermsVersion: currentConsent?.termsVersion || null,
            ugcTermsAcceptedAt: currentConsent?.acceptedAt || null,
            photoModerationStatus: latestPhoto?.status || null,
            photoModerationReason: latestPhoto?.reviewNote || null,
            photoModerationSubmissionId: latestPhoto?.id || null,
            pendingPhotoSubmissionId: latestPhoto?.status === 'PENDING' ? latestPhoto.id : null,
            photoSubmittedAt: latestPhoto?.submittedAt || null,
            photoModerationReviewedAt: latestPhoto?.reviewedAt || null,
            // Include technician-specific fields if user is a technician
            ...(user.technician && {
                technicianId: user.technician.id,
                specializations: user.technician.specializations,
                location: user.technician.location,
                companyName: user.technician.companyName,
                technicianModerationStatus: user.technician.moderationStatus,
                technicianModerationReason: user.technician.moderationReason,
                mapVisible: user.technician.mapVisible,
                mapLocation: toPublicMapLocation(user.technician),
            }),
            token,
        };

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
};

// Helper function to generate verification result page
function getVerificationPage(status: 'success' | 'error' | 'already', message: string): string {
    const statusConfig = {
        success: {
            icon: '✓',
            iconBg: '#10B981',
            title: 'Cuenta Verificada!',
            buttonText: 'Ir a Técnicos en RD',
        },
        error: {
            icon: '✗',
            iconBg: '#EF4444',
            title: 'Error de Verificacion',
            buttonText: 'Volver al inicio',
        },
        already: {
            icon: '✓',
            iconBg: '#3B82F6',
            title: 'Ya Verificado',
            buttonText: 'Ir a Técnicos en RD',
        },
    };

    const config = statusConfig[status];

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title} - Técnicos en RD</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #16a085 0%, #1abc9c 50%, #3498db 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        .icon-wrapper {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: ${config.iconBg};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: scaleIn 0.5s ease-out;
        }
        .icon {
            font-size: 50px;
            color: white;
        }
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 15px;
        }
        p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(22, 160, 133, 0.3);
        }
        .logo {
            font-size: 14px;
            color: #999;
            margin-top: 30px;
        }
        @keyframes scaleIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-wrapper">
            <span class="icon">${config.icon}</span>
        </div>
        <h1>${config.title}</h1>
        <p>${message}</p>
        <a href="${APP_URL}" class="btn">${config.buttonText}</a>
        <p class="logo">Técnicos en RD</p>
    </div>
</body>
</html>
    `;
}
