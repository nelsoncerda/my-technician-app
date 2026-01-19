import { Router } from 'express';
import {
    register,
    login,
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
    forgotPassword,
    resetPassword,
    verifyResetToken
} from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/verification-status', checkVerificationStatus);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token', verifyResetToken);

export default router;
