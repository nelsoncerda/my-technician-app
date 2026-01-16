import { Request, Response } from 'express';
import prisma from '../prisma';
import { sendVerificationEmail } from '../services/emailService';
import crypto from 'crypto';

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
        const previewUrl = await sendVerificationEmail(email, verificationToken);

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
            return res.status(400).send('Invalid token');
        }

        const user = await prisma.user.findFirst({ where: { verificationToken: token } });

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, verificationToken: null },
        });

        // Redirect to frontend with success message (or just a simple HTML page)
        res.send(`
            <h1>¡Cuenta verificada!</h1>
            <p>Tu cuenta ha sido verificada exitosamente. Puedes cerrar esta ventana y volver a la aplicación.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
        `);
    } catch (error) {
        res.status(500).send('Error verifying email');
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
