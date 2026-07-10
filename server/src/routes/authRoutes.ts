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
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const standardAuthLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const strictAuthLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post('/register', strictAuthLimit, register);
router.post('/login', standardAuthLimit, login);
router.get('/verify', verifyEmail);
router.post('/resend-verification', standardAuthLimit, resendVerification);
router.get('/verification-status', requireAuth, checkVerificationStatus);

// Password reset routes
router.post('/forgot-password', standardAuthLimit, forgotPassword);
router.post('/reset-password', standardAuthLimit, resetPassword);
router.get('/verify-reset-token', verifyResetToken);

export default router;
