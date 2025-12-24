import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  // Quality Score
  getDealQualityScore,
  getBatchQualityScores,
  getTopQualityDeals,
  recalculateDealScore,
  getAIStats,
  // Fraud Detection
  getFraudAnalysis,
  getHighRiskDeals,
  // Price Prediction
  getPricePrediction,
  getBestBuyTime,
  getDroppingPrices,
  // Smart Alerts
  getSmartAlertSuggestion,
  createSmartAlert,
  // Deal Summarizer
  getDealSummary,
  getBatchSummaries,
  // Personalization
  getPersonalizedDeals,
  getUserProfile,
  getSimilarUsers,
  explainRecommendation,
} from '../controllers/ai.controller.js';

const router = Router();

// ============================================
// QUALITY SCORE ROUTES (existing)
// ============================================

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

// ============================================
// FRAUD DETECTION ROUTES
// ============================================

// Get fraud analysis for a specific deal
router.get('/fraud-analysis/:dealId', getFraudAnalysis);

// Get deals with high fraud risk scores
router.get('/high-risk-deals', getHighRiskDeals);

// ============================================
// PRICE PREDICTION ROUTES
// ============================================

// Get price prediction for a deal
router.get('/price-prediction/:dealId', getPricePrediction);

// Get best time to buy for a deal
router.get('/best-buy-time/:dealId', getBestBuyTime);

// Get deals with prices likely to drop
router.get('/dropping-prices', getDroppingPrices);

// ============================================
// SMART ALERTS ROUTES
// ============================================

// Get smart alert suggestion (public)
router.post('/smart-alert/suggest', getSmartAlertSuggestion);

// Create a smart price alert (requires auth)
router.post('/smart-alert/create', authenticate, createSmartAlert);

// ============================================
// DEAL SUMMARIZER ROUTES
// ============================================

// Get AI-generated summary for a deal
router.get('/summary/:dealId', getDealSummary);

// Get summaries for multiple deals (batch)
router.post('/summaries', getBatchSummaries);

// ============================================
// PERSONALIZATION ROUTES (all require auth)
// ============================================

// Get personalized deal recommendations
router.get('/personalized-deals', authenticate, getPersonalizedDeals);

// Get user's preference profile
router.get('/user-profile', authenticate, getUserProfile);

// Get users with similar preferences
router.get('/similar-users', authenticate, getSimilarUsers);

// Explain why a deal was recommended
router.get('/explain-recommendation/:dealId', authenticate, explainRecommendation);

export default router;
