import { Router } from 'express';
import {
  getDealQualityScore,
  getBatchQualityScores,
  getTopQualityDeals,
  recalculateDealScore,
  getAIStats,
} from '../controllers/ai.controller';

const router = Router();

/**
 * AI Quality Score Routes
 */

// Get quality score for a single deal
router.get('/quality-score/:dealId', getDealQualityScore);

// Get quality scores for multiple deals (batch)
router.post('/quality-scores', getBatchQualityScores);

// Get top quality deals recommended by AI
router.get('/top-deals', getTopQualityDeals);

// Manually recalculate quality score for a deal
router.post('/recalculate-score/:dealId', recalculateDealScore);

// Get AI system statistics
router.get('/stats', getAIStats);

export default router;
