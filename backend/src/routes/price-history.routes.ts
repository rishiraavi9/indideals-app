import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireFeature } from '../config/features.js';
import {
  getPriceHistory,
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert,
  updatePriceAlert,
  recordPrice,
} from '../controllers/price-history.controller.js';

const router = express.Router();

/**
 * @route   GET /api/price-history/deals/:dealId
 * @desc    Get price history for a deal
 * @access  Public
 */
router.get(
  '/deals/:dealId',
  requireFeature('PRICE_HISTORY_API'),
  getPriceHistory
);

/**
 * @route   POST /api/price-history/deals/:dealId
 * @desc    Manually record price (admin/system)
 * @access  Private
 */
router.post(
  '/deals/:dealId',
  authenticate,
  requireFeature('PRICE_HISTORY_API'),
  recordPrice
);

/**
 * @route   POST /api/price-alerts/deals/:dealId
 * @desc    Create price alert
 * @access  Private
 */
router.post(
  '/deals/:dealId/alerts',
  authenticate,
  requireFeature('PRICE_ALERTS_API'),
  createPriceAlert
);

/**
 * @route   GET /api/price-alerts
 * @desc    Get user's price alerts
 * @access  Private
 */
router.get(
  '/alerts',
  authenticate,
  requireFeature('PRICE_ALERTS_API'),
  getPriceAlerts
);

/**
 * @route   DELETE /api/price-alerts/:alertId
 * @desc    Delete price alert
 * @access  Private
 */
router.delete(
  '/alerts/:alertId',
  authenticate,
  requireFeature('PRICE_ALERTS_API'),
  deletePriceAlert
);

/**
 * @route   PATCH /api/price-alerts/:alertId
 * @desc    Update price alert
 * @access  Private
 */
router.patch(
  '/alerts/:alertId',
  authenticate,
  requireFeature('PRICE_ALERTS_API'),
  updatePriceAlert
);

export default router;
