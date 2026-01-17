import { Router } from 'express';
import { register, login, verifyEmail, resendVerification, checkVerificationStatus } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/verification-status', checkVerificationStatus);

export default router;
