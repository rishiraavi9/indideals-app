import { Router } from 'express';
import { trackClick, markConversion, getAffiliateStats } from '../controllers/affiliate.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Track affiliate click (public - can be used by logged-in or anonymous users)
router.post('/track-click', trackClick);

// Mark a conversion (requires authentication - for admin/webhook use)
router.post('/mark-conversion', authenticate, markConversion);

// Get affiliate statistics (requires authentication)
router.get('/stats', authenticate, getAffiliateStats);

export default router;
