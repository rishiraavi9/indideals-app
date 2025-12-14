import { Router } from 'express';
import {
  requestPasswordReset,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
} from '../controllers/password-reset.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

// Protected routes
router.post('/send-verification', authenticate, sendEmailVerification);

export default router;
