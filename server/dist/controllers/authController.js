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
exports.login = exports.verifyResetToken = exports.resetPassword = exports.forgotPassword = exports.checkVerificationStatus = exports.resendVerification = exports.verifyEmail = exports.register = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const emailService_1 = require("../services/emailService");
const crypto_1 = __importDefault(require("crypto"));
const APP_URL = process.env.APP_URL || 'https://tecnicosenrd.com';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, phone, accountType, specializations, location, photoBase64, companyName } = req.body;
        // Check if user exists
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        // Determine the role based on account type
        const role = accountType === 'technician' ? 'technician' : 'user';
        // Create user with transaction to also create technician if needed
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    name,
                    email,
                    password, // Note: In production, hash this password!
                    phone,
                    role,
                    verificationToken,
                    photoUrl: photoBase64 || null, // Save profile photo if provided
                },
            });
            // If the user is a technician, also create a technician record
            // Technicians are also users, so they can book services from other technicians
            if (accountType === 'technician' && specializations && specializations.length > 0 && location) {
                yield tx.technician.create({
                    data: {
                        userId: user.id,
                        specializations, // Array of specializations/services
                        location,
                        companyName: companyName || null, // Optional company name
                        verified: false,
                    },
                });
            }
            // Initialize gamification points for the new user
            yield tx.userPoints.create({
                data: {
                    userId: user.id,
                    totalPoints: 0,
                    currentLevel: 1,
                    levelProgress: 0,
                    lifetimePoints: 0,
                },
            });
            return user;
        }));
        // Send verification email
        const previewUrl = yield (0, emailService_1.sendVerificationEmail)(email, verificationToken, name);
        res.status(201).json(Object.assign(Object.assign({}, result), { previewUrl }));
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error });
    }
});
exports.register = register;
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).send(getVerificationPage('error', 'Token invalido'));
        }
        const user = yield prisma_1.default.user.findFirst({ where: { verificationToken: token } });
        if (!user) {
            return res.status(400).send(getVerificationPage('error', 'El token es invalido o ya fue utilizado'));
        }
        if (user.emailVerified) {
            return res.send(getVerificationPage('already', 'Tu cuenta ya estaba verificada'));
        }
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: { emailVerified: true, verificationToken: null },
        });
        // Send welcome email
        yield (0, emailService_1.sendWelcomeEmail)(user.email, user.name);
        res.send(getVerificationPage('success', 'Tu cuenta ha sido verificada exitosamente'));
    }
    catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).send(getVerificationPage('error', 'Error al verificar el correo'));
    }
});
exports.verifyEmail = verifyEmail;
const resendVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = yield prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'Si el correo existe, se enviara un nuevo enlace de verificacion' });
        }
        if (user.emailVerified) {
            return res.status(400).json({ message: 'El correo ya esta verificado' });
        }
        // Generate new token
        const newToken = crypto_1.default.randomBytes(32).toString('hex');
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: { verificationToken: newToken },
        });
        // Send new verification email
        const previewUrl = yield (0, emailService_1.sendVerificationEmail)(email, newToken, user.name);
        res.json({
            message: 'Se ha enviado un nuevo enlace de verificacion a tu correo',
            previewUrl
        });
    }
    catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).json({ message: 'Error al reenviar la verificacion' });
    }
});
exports.resendVerification = resendVerification;
const checkVerificationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { email },
            select: { emailVerified: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ emailVerified: user.emailVerified });
    }
    catch (error) {
        console.error('Error checking verification status:', error);
        res.status(500).json({ message: 'Error al verificar el estado' });
    }
});
exports.checkVerificationStatus = checkVerificationStatus;
// Request password reset
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'El correo es requerido' });
        }
        const user = yield prisma_1.default.user.findUnique({ where: { email } });
        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetExpires,
            },
        });
        // Send reset email
        yield (0, emailService_1.sendPasswordResetEmail)(email, resetToken, user.name);
        res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña' });
    }
    catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
});
exports.forgotPassword = forgotPassword;
// Reset password with token
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const user = yield prisma_1.default.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(), // Token must not be expired
                },
            },
        });
        if (!user) {
            return res.status(400).json({ message: 'El enlace es inválido o ha expirado' });
        }
        // Update password and clear reset token
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                password: newPassword, // Note: In production, hash this!
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        res.json({ message: 'Tu contraseña ha sido actualizada exitosamente' });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error al restablecer la contraseña' });
    }
});
exports.resetPassword = resetPassword;
// Verify reset token (check if valid before showing reset form)
const verifyResetToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ valid: false, message: 'Token inválido' });
        }
        const user = yield prisma_1.default.user.findFirst({
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
    }
    catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({ valid: false, message: 'Error al verificar el token' });
    }
});
exports.verifyResetToken = verifyResetToken;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Get user with technician data if applicable
        const user = yield prisma_1.default.user.findUnique({
            where: { email },
            include: { technician: true }
        });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Return user with technician fields if applicable
        const responseData = Object.assign({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, photoUrl: user.photoUrl, emailVerified: user.emailVerified }, (user.technician && {
            technicianId: user.technician.id,
            specializations: user.technician.specializations,
            location: user.technician.location,
            companyName: user.technician.companyName,
        }));
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});
exports.login = login;
// Helper function to generate verification result page
function getVerificationPage(status, message) {
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
