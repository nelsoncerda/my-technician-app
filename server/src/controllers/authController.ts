import { Request, Response } from 'express';
import prisma from '../prisma';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || 'https://nelsoncerda.com';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, accountType, specialization, location } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Determine the role based on account type
        const role = accountType === 'technician' ? 'technician' : 'user';

        // Create user with transaction to also create technician if needed
        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password, // Note: In production, hash this password!
                    phone,
                    role,
                    verificationToken,
                },
            });

            // If the user is a technician, also create a technician record
            // Technicians are also users, so they can book services from other technicians
            if (accountType === 'technician' && specialization && location) {
                await tx.technician.create({
                    data: {
                        userId: user.id,
                        specialization,
                        location,
                        verified: false,
                    },
                });
            }

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

            return user;
        });

        // Send verification email
        const previewUrl = await sendVerificationEmail(email, verificationToken, name);

        res.status(201).json({ ...result, previewUrl });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).send(getVerificationPage('error', 'Token invalido'));
        }

        const user = await prisma.user.findFirst({ where: { verificationToken: token } });

        if (!user) {
            return res.status(400).send(getVerificationPage('error', 'El token es invalido o ya fue utilizado'));
        }

        if (user.emailVerified) {
            return res.send(getVerificationPage('already', 'Tu cuenta ya estaba verificada'));
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, verificationToken: null },
        });

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

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'Si el correo existe, se enviara un nuevo enlace de verificacion' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ message: 'El correo ya esta verificado' });
        }

        // Generate new token
        const newToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: newToken },
        });

        // Send new verification email
        const previewUrl = await sendVerificationEmail(email, newToken, user.name);

        res.json({
            message: 'Se ha enviado un nuevo enlace de verificacion a tu correo',
            previewUrl
        });
    } catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).json({ message: 'Error al reenviar la verificacion' });
    }
};

export const checkVerificationStatus = async (req: Request, res: Response) => {
    try {
        const { email } = req.query;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { emailVerified: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ emailVerified: user.emailVerified });
    } catch (error) {
        console.error('Error checking verification status:', error);
        res.status(500).json({ message: 'Error al verificar el estado' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Admin check (hardcoded for demo)
        if (email === 'admin@tech.com' && password === 'admin123') {
            return res.json({
                id: 'admin-1',
                name: 'Administrador',
                email: email,
                role: 'admin',
                emailVerified: true,
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};

// Helper function to generate verification result page
function getVerificationPage(status: 'success' | 'error' | 'already', message: string): string {
    const statusConfig = {
        success: {
            icon: '✓',
            iconBg: '#10B981',
            title: 'Cuenta Verificada!',
            buttonText: 'Ir a Santiago Tech RD',
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
            buttonText: 'Ir a Santiago Tech RD',
        },
    };

    const config = statusConfig[status];

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title} - Santiago Tech RD</title>
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
        <p class="logo">Santiago Tech RD</p>
    </div>
</body>
</html>
    `;
}
