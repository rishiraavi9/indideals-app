import { Router } from 'express';
import {
  exportUserData,
  deleteUserAccount,
  getDataProcessingInfo,
} from '../controllers/gdpr.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All GDPR routes require authentication
router.get('/export', authenticate, exportUserData);
router.delete('/delete-account', authenticate, deleteUserAccount);
router.get('/data-processing-info', authenticate, getDataProcessingInfo);

export default router;
