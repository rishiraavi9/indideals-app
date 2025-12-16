import { Request, Response } from 'express';
import { DealQualityService } from '../services/ai/deal-quality.service';
import { logger } from '../utils/logger';

/**
 * AI Controller - Endpoints for AI-powered features
 */

/**
 * GET /api/ai/quality-score/:dealId
 * Get AI quality score for a specific deal
 */
export const getDealQualityScore = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    const result = await DealQualityService.calculateScore(dealId);

    return res.json({
      success: true,
      dealId,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error getting deal quality score:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate quality score',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/quality-scores
 * Get quality scores for multiple deals (batch)
 */
export const getBatchQualityScores = async (req: Request, res: Response) => {
  try {
    const { dealIds } = req.body;

    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'dealIds must be a non-empty array',
      });
    }

    if (dealIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 deals can be scored at once',
      });
    }

    const scores = await DealQualityService.calculateBatchScores(dealIds);

    // Convert Map to object
    const scoresObj: Record<string, number> = {};
    scores.forEach((score, dealId) => {
      scoresObj[dealId] = score;
    });

    return res.json({
      success: true,
      scores: scoresObj,
    });
  } catch (error: any) {
    logger.error('Error getting batch quality scores:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate quality scores',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/top-deals
 * Get top quality deals recommended by AI
 */
export const getTopQualityDeals = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const deals = await DealQualityService.getTopQualityDeals(limit);

    return res.json({
      success: true,
      count: deals.length,
      deals,
    });
  } catch (error: any) {
    logger.error('Error getting top quality deals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get top quality deals',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/recalculate-score/:dealId
 * Manually recalculate quality score for a deal
 */
export const recalculateDealScore = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    await DealQualityService.recalculateScore(dealId);

    const result = await DealQualityService.calculateScore(dealId);

    return res.json({
      success: true,
      message: 'Score recalculated successfully',
      dealId,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error recalculating deal score:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to recalculate score',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/stats
 * Get AI system statistics
 */
export const getAIStats = async (req: Request, res: Response) => {
  try {
    // Get queue stats (if queue service is available)
    let queueStats = null;
    try {
      const { scraperQueue, priceTrackerQueue, dealVerifierQueue } = await import('../services/queue.service');

      const [scraperWaiting, scraperActive, priceWaiting, priceActive, verifierWaiting, verifierActive] = await Promise.all([
        scraperQueue.getWaitingCount(),
        scraperQueue.getActiveCount(),
        priceTrackerQueue.getWaitingCount(),
        priceTrackerQueue.getActiveCount(),
        dealVerifierQueue.getWaitingCount(),
        dealVerifierQueue.getActiveCount(),
      ]);

      queueStats = {
        scraperQueue: {
          waiting: scraperWaiting,
          active: scraperActive,
        },
        priceTrackerQueue: {
          waiting: priceWaiting,
          active: priceActive,
        },
        dealVerifierQueue: {
          waiting: verifierWaiting,
          active: verifierActive,
        },
      };
    } catch (error) {
      logger.warn('Queue stats not available:', error);
    }

    return res.json({
      success: true,
      stats: {
        queues: queueStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting AI stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get AI stats',
      message: error.message,
    });
  }
};
