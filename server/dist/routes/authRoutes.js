"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/verify', authController_1.verifyEmail);
router.post('/resend-verification', authController_1.resendVerification);
router.get('/verification-status', authController_1.checkVerificationStatus);
// Password reset routes
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.get('/verify-reset-token', authController_1.verifyResetToken);
exports.default = router;
