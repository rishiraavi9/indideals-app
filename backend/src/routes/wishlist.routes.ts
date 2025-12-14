import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireFeature } from '../config/features.js';
import {
  saveDeal,
  getWishlist,
  removeDeal,
  updateNotes,
  checkWishlist,
} from '../controllers/wishlist.controller.js';

const router = express.Router();

// All wishlist routes require authentication and feature flag
router.use(authenticate);
router.use(requireFeature('WISHLIST_API'));

/**
 * @route   POST /api/wishlist
 * @desc    Save deal to wishlist
 * @access  Private
 */
router.post('/', saveDeal);

/**
 * @route   GET /api/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/', getWishlist);

/**
 * @route   DELETE /api/wishlist/:dealId
 * @desc    Remove deal from wishlist
 * @access  Private
 */
router.delete('/:dealId', removeDeal);

/**
 * @route   PATCH /api/wishlist/:dealId
 * @desc    Update wishlist notes
 * @access  Private
 */
router.patch('/:dealId', updateNotes);

/**
 * @route   GET /api/wishlist/check/:dealId
 * @desc    Check if deal is in wishlist
 * @access  Private
 */
router.get('/check/:dealId', checkWishlist);

export default router;
