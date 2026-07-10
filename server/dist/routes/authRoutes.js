"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
const standardAuthLimit = (0, rateLimit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 10 });
const strictAuthLimit = (0, rateLimit_1.rateLimit)({ windowMs: 60 * 60 * 1000, max: 5 });
router.post('/register', strictAuthLimit, authController_1.register);
router.post('/login', standardAuthLimit, authController_1.login);
router.get('/verify', authController_1.verifyEmail);
router.post('/resend-verification', standardAuthLimit, authController_1.resendVerification);
router.get('/verification-status', auth_1.requireAuth, authController_1.checkVerificationStatus);
// Password reset routes
router.post('/forgot-password', standardAuthLimit, authController_1.forgotPassword);
router.post('/reset-password', standardAuthLimit, authController_1.resetPassword);
router.get('/verify-reset-token', authController_1.verifyResetToken);
exports.default = router;
