import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { requireFeature } from '../config/features.js';
import {
  getCoupons,
  searchCoupons,
  createCoupon,
  verifyCoupon,
  getCouponStats,
  deleteCoupon,
} from '../controllers/coupons.controller.js';

const router = express.Router();

// All coupon routes require feature flag
router.use(requireFeature('COUPONS_API'));

/**
 * @route   GET /api/coupons
 * @desc    Get coupons with filters
 * @access  Public
 */
router.get('/', getCoupons);

/**
 * @route   GET /api/coupons/search
 * @desc    Search coupons by merchant
 * @access  Public
 */
router.get('/search', searchCoupons);

/**
 * @route   POST /api/coupons
 * @desc    Submit new coupon
 * @access  Public/Private (optional auth)
 */
router.post('/', optionalAuth, createCoupon);

/**
 * @route   PUT /api/coupons/:couponId/verify
 * @desc    Verify coupon (mark as working/not working)
 * @access  Public/Private (optional auth)
 */
router.put('/:couponId/verify', optionalAuth, verifyCoupon);

/**
 * @route   GET /api/coupons/:couponId/stats
 * @desc    Get coupon usage statistics
 * @access  Public
 */
router.get('/:couponId/stats', getCouponStats);

/**
 * @route   DELETE /api/coupons/:couponId
 * @desc    Delete coupon
 * @access  Private (creator or admin)
 */
router.delete('/:couponId', optionalAuth, deleteCoupon);

export default router;
