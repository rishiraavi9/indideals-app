import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getEmailPreferences,
  updateEmailPreferences,
} from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Profile
router.get('/', getProfile);
router.patch('/', updateProfile);

// Password
router.post('/change-password', changePassword);

// Email preferences
router.get('/email-preferences', getEmailPreferences);
router.patch('/email-preferences', updateEmailPreferences);

export default router;
