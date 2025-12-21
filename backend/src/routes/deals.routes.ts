import { Router } from 'express';
import { createDeal, getDeals, getDeal, voteDeal, trackActivity, getImageFallback } from '../controllers/deals.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createDeal);
router.get('/', optionalAuth, getDeals);
router.get('/:id', optionalAuth, getDeal);
router.post('/:id/vote', authenticate, voteDeal);
router.post('/:id/activity', authenticate, trackActivity);
router.get('/:id/image-fallback', getImageFallback);

export default router;
