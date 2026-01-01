import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  requestPasswordReset,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
} from '../controllers/password-reset.controller.js';
import { authenticate } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

// Rate limiting for password reset (stricter than general API)
const IS_PRODUCTION = env.NODE_ENV === 'production';
const ENABLE_RATE_LIMIT = IS_PRODUCTION || env.ENABLE_RATE_LIMIT === 'true';

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour per IP
  message: { error: 'Too many password reset attempts. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !ENABLE_RATE_LIMIT,
});

const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour per IP
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !ENABLE_RATE_LIMIT,
});

// Public routes with rate limiting
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/verify-email', emailVerificationLimiter, verifyEmail);

// Protected routes with rate limiting
router.post('/send-verification', authenticate, emailVerificationLimiter, sendEmailVerification);

export default router;
