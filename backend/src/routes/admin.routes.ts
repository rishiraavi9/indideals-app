import { Router } from 'express';
import { getAdminStats, adminAuth } from '../controllers/admin.controller';

const router = Router();

// All admin routes require admin authentication
router.use(adminAuth);

// Get comprehensive admin stats
router.get('/stats', getAdminStats);

export default router;
