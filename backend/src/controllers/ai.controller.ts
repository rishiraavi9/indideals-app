import { Request, Response } from 'express';
import { DealQualityService } from '../services/ai/deal-quality.service.js';
import { FraudDetectionService } from '../services/ai/fraud-detection.service.js';
import { PricePredictionService } from '../services/ai/price-prediction.service.js';
import { SmartAlertsService } from '../services/ai/smart-alerts.service.js';
import { DealSummarizerService } from '../services/ai/deal-summarizer.service.js';
import { PersonalizationService } from '../services/ai/personalization.service.js';
import { logger } from '../utils/logger.js';

/**
 * AI Controller - Endpoints for AI-powered features
 * All features are cost-free (no external API calls)
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

// ============================================
// FRAUD DETECTION ENDPOINTS
// ============================================

/**
 * GET /api/ai/fraud-analysis/:dealId
 * Get fraud analysis for a specific deal
 */
export const getFraudAnalysis = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    const analysis = await FraudDetectionService.analyzeDeal(dealId);

    return res.json({
      success: true,
      dealId,
      ...analysis,
    });
  } catch (error: any) {
    logger.error('Error getting fraud analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze deal for fraud',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/high-risk-deals
 * Get deals with high fraud risk scores
 */
export const getHighRiskDeals = async (req: Request, res: Response) => {
  try {
    const minRisk = parseInt(req.query.minRisk as string) || 60;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const deals = await FraudDetectionService.getHighRiskDeals(minRisk, limit);

    return res.json({
      success: true,
      count: deals.length,
      minRiskThreshold: minRisk,
      deals,
    });
  } catch (error: any) {
    logger.error('Error getting high-risk deals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get high-risk deals',
      message: error.message,
    });
  }
};

// ============================================
// PRICE PREDICTION ENDPOINTS
// ============================================

/**
 * GET /api/ai/price-prediction/:dealId
 * Get price prediction for a specific deal
 */
export const getPricePrediction = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    const prediction = await PricePredictionService.predictPrice(dealId);

    return res.json({
      success: true,
      dealId,
      ...prediction,
    });
  } catch (error: any) {
    logger.error('Error getting price prediction:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to predict price',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/best-buy-time/:dealId
 * Get the best time to buy for a deal
 */
export const getBestBuyTime = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    const prediction = await PricePredictionService.predictPrice(dealId);

    return res.json({
      success: true,
      dealId,
      currentPrice: prediction.currentPrice,
      predictedPrice: prediction.predictedPrice,
      trend: prediction.trend,
      bestBuyDay: prediction.bestBuyDay,
      flashSalePattern: prediction.flashSalePattern,
      nextFlashSaleDate: prediction.nextFlashSaleDate,
      recommendation: prediction.recommendation,
      confidence: prediction.confidence,
    });
  } catch (error: any) {
    logger.error('Error getting best buy time:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get best buy time',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/dropping-prices
 * Get deals with prices likely to drop
 */
export const getDroppingPrices = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const deals = await SmartAlertsService.getDealsLikelyToDrop(70, limit);

    return res.json({
      success: true,
      count: deals.length,
      deals,
    });
  } catch (error: any) {
    logger.error('Error getting dropping prices:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get deals with dropping prices',
      message: error.message,
    });
  }
};

// ============================================
// SMART ALERTS ENDPOINTS
// ============================================

/**
 * POST /api/ai/smart-alert/suggest
 * Get smart alert suggestion for a deal
 */
export const getSmartAlertSuggestion = async (req: Request, res: Response) => {
  try {
    const { dealId, targetPrice } = req.body;

    if (!dealId || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'dealId and targetPrice are required',
      });
    }

    const suggestion = await SmartAlertsService.suggestAlertStrategy(dealId, targetPrice);

    return res.json({
      success: true,
      ...suggestion,
    });
  } catch (error: any) {
    logger.error('Error getting smart alert suggestion:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get smart alert suggestion',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/smart-alert/create
 * Create a smart price alert
 */
export const createSmartAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { dealId, targetPrice } = req.body;

    if (!dealId || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'dealId and targetPrice are required',
      });
    }

    const result = await SmartAlertsService.createSmartAlert(userId, dealId, targetPrice);

    return res.status(201).json({
      success: true,
      message: 'Smart alert created',
      ...result,
    });
  } catch (error: any) {
    logger.error('Error creating smart alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create smart alert',
      message: error.message,
    });
  }
};

// ============================================
// DEAL SUMMARIZER ENDPOINTS
// ============================================

/**
 * GET /api/ai/summary/:dealId
 * Get AI-generated summary for a deal
 */
export const getDealSummary = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    const summary = await DealSummarizerService.generateSummary(dealId);

    return res.json({
      success: true,
      dealId,
      ...summary,
    });
  } catch (error: any) {
    logger.error('Error getting deal summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate deal summary',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/summaries
 * Get summaries for multiple deals (batch)
 */
export const getBatchSummaries = async (req: Request, res: Response) => {
  try {
    const { dealIds } = req.body;

    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'dealIds must be a non-empty array',
      });
    }

    if (dealIds.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 deals can be summarized at once',
      });
    }

    const summaries: Record<string, any> = {};

    await Promise.all(
      dealIds.map(async (dealId: string) => {
        try {
          summaries[dealId] = await DealSummarizerService.generateSummary(dealId);
        } catch (error) {
          summaries[dealId] = { error: 'Failed to generate summary' };
        }
      })
    );

    return res.json({
      success: true,
      summaries,
    });
  } catch (error: any) {
    logger.error('Error getting batch summaries:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate summaries',
      message: error.message,
    });
  }
};

// ============================================
// PERSONALIZATION ENDPOINTS
// ============================================

/**
 * GET /api/ai/personalized-deals
 * Get personalized deal recommendations for the user
 */
export const getPersonalizedDeals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for personalized recommendations',
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
    const categoryId = req.query.categoryId as string | undefined;

    const recommendations = await PersonalizationService.getPersonalizedDeals(userId, {
      limit,
      categoryId,
    });

    return res.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    logger.error('Error getting personalized deals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get personalized recommendations',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/user-profile
 * Get user's preference profile
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const profile = await PersonalizationService.buildUserProfile(userId);

    return res.json({
      success: true,
      profile: {
        preferredCategories: profile.preferredCategories,
        preferredMerchants: profile.preferredMerchants,
        preferredPriceRange: profile.preferredPriceRange,
        avgLikedDiscount: profile.avgLikedDiscount,
        totalInteractions: profile.totalInteractions,
      },
    });
  } catch (error: any) {
    logger.error('Error getting user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/similar-users
 * Get users with similar preferences
 */
export const getSimilarUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    const similarUsers = await PersonalizationService.findSimilarUsers(userId, limit);

    return res.json({
      success: true,
      count: similarUsers.length,
      similarUsers: similarUsers.map(u => ({
        similarity: Math.round(u.similarity * 100),
      })),
    });
  } catch (error: any) {
    logger.error('Error getting similar users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find similar users',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai/explain-recommendation/:dealId
 * Explain why a deal was recommended
 */
export const explainRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { dealId } = req.params;

    const explanation = await PersonalizationService.explainRecommendation(userId, dealId);

    return res.json({
      success: true,
      dealId,
      ...explanation,
    });
  } catch (error: any) {
    logger.error('Error explaining recommendation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to explain recommendation',
      message: error.message,
    });
  }
};
