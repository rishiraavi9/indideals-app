import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.post('/mark-all-read', authenticate, markAllAsRead);
router.patch('/:notificationId/read', authenticate, markAsRead);
router.delete('/:notificationId', authenticate, deleteNotification);

export default router;
