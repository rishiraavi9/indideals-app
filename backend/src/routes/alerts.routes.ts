import { Router } from 'express';
import {
  createAlert,
  getMyAlerts,
  updateAlert,
  deleteAlert,
  getAlertNotifications,
  testAlert,
} from '../controllers/alerts.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All alert routes require authentication
router.post('/', authenticate, createAlert);
router.get('/', authenticate, getMyAlerts);
router.put('/:alertId', authenticate, updateAlert);
router.delete('/:alertId', authenticate, deleteAlert);
router.get('/:alertId/notifications', authenticate, getAlertNotifications);
router.get('/:alertId/test', authenticate, testAlert);

export default router;
