import { apiClient } from './client';

export interface QualityScoreBreakdown {
  valueProp: number;      // Value Proposition (40%)
  authenticity: number;   // Deal Authenticity (25%)
  urgency: number;        // Urgency & Scarcity (20%)
  socialProof: number;    // Social Proof (15%)
}

export interface QualityScoreResult {
  totalScore: number;
  breakdown: QualityScoreBreakdown;
  badges: string[];
  reasoning: string;      // Human-readable explanation
}


export interface AIStats {
  queues: {
    scraperQueue: {
      waiting: number;
      active: number;
    };
    priceTrackerQueue: {
      waiting: number;
      active: number;
    };
    dealVerifierQueue: {
      waiting: number;
      active: number;
    };
  } | null;
  timestamp: string;
}

/**
 * Get AI quality score for a specific deal
 */
export const getDealQualityScore = async (dealId: string): Promise<QualityScoreResult> => {
  const response = await apiClient.get<any>(`/ai/quality-score/${dealId}`);
  // Backend returns { success, dealId, totalScore, breakdown, badges, reasoning }
  return {
    totalScore: response.totalScore,
    breakdown: response.breakdown,
    badges: response.badges,
    reasoning: response.reasoning,
  };
};

/**
 * Get quality scores for multiple deals (batch)
 */
export const getBatchQualityScores = async (dealIds: string[]): Promise<Record<string, number>> => {
  const response = await apiClient.post<{ scores: Record<string, number> }>('/ai/quality-scores', { dealIds });
  return response.scores;
};

/**
 * Get top quality deals recommended by AI
 */
export const getTopQualityDeals = async (limit: number = 20): Promise<any[]> => {
  const response = await apiClient.get<{ deals: any[] }>(`/ai/top-deals?limit=${limit}`);
  return response.deals;
};

/**
 * Manually recalculate quality score for a deal
 */
export const recalculateDealScore = async (dealId: string): Promise<QualityScoreResult> => {
  const response = await apiClient.post<any>(`/ai/recalculate-score/${dealId}`);
  return {
    totalScore: response.totalScore,
    breakdown: response.breakdown,
    badges: response.badges,
    reasoning: response.reasoning,
  };
};

/**
 * Get AI system statistics
 */
export const getAIStats = async (): Promise<AIStats> => {
  const response = await apiClient.get<{ stats: AIStats }>('/ai/stats');
  return response.stats;
};

// ============================================
// FRAUD DETECTION
// ============================================

export interface FraudAnalysis {
  overallRiskScore: number;
  priceAnomalyScore: number;
  titleSuspicionScore: number;
  velocityScore: number;
  merchantRiskScore: number;
  flags: string[];
  autoAction: 'none' | 'flag' | 'hide' | 'delete';
  recommendation: string;
}

/**
 * Get fraud analysis for a deal
 */
export const getFraudAnalysis = async (dealId: string): Promise<FraudAnalysis> => {
  const response = await apiClient.get<FraudAnalysis & { success: boolean }>(`/ai/fraud-analysis/${dealId}`);
  return response;
};

/**
 * Get deals with high fraud risk
 */
export const getHighRiskDeals = async (minRisk: number = 60, limit: number = 20): Promise<any[]> => {
  const response = await apiClient.get<{ deals: any[] }>(`/ai/high-risk-deals?minRisk=${minRisk}&limit=${limit}`);
  return response.deals;
};

// ============================================
// PRICE PREDICTION
// ============================================

export interface PricePrediction {
  currentPrice: number;
  predictedPrice: number | null;
  trend: 'up' | 'down' | 'stable';
  trendStrength: number;
  confidence: number;
  bestBuyDay: string | null;
  flashSalePattern: boolean;
  nextFlashSaleDate: string | null;
  priceVolatility: number;
  lowestPriceLast30Days: number | null;
  highestPriceLast30Days: number | null;
  recommendation: 'buy_now' | 'wait' | 'skip';
}

/**
 * Get price prediction for a deal
 */
export const getPricePrediction = async (dealId: string): Promise<PricePrediction> => {
  const response = await apiClient.get<PricePrediction & { success: boolean }>(`/ai/price-prediction/${dealId}`);
  return response;
};

/**
 * Get best buy time recommendation
 */
export const getBestBuyTime = async (dealId: string): Promise<{
  currentPrice: number;
  predictedPrice: number | null;
  trend: string;
  bestBuyDay: string | null;
  flashSalePattern: boolean;
  nextFlashSaleDate: string | null;
  recommendation: string;
  confidence: number;
}> => {
  const response = await apiClient.get<any>(`/ai/best-buy-time/${dealId}`);
  return response;
};

/**
 * Get deals with prices likely to drop
 */
export const getDroppingPrices = async (limit: number = 20): Promise<any[]> => {
  const response = await apiClient.get<{ deals: any[] }>(`/ai/dropping-prices?limit=${limit}`);
  return response.deals;
};

// ============================================
// SMART ALERTS
// ============================================

export interface SmartAlertSuggestion {
  dealId: string;
  currentPrice: number;
  targetPrice: number;
  alertType: 'fixed' | 'smart' | 'flash_sale';
  dropProbability: number;
  suggestedWaitDays: number | null;
  suggestedTargetPrice: number | null;
  recommendation: 'set_alert' | 'buy_now' | 'wait';
  reasoning: string;
}

/**
 * Get smart alert suggestion for a deal
 */
export const getSmartAlertSuggestion = async (dealId: string, targetPrice: number): Promise<SmartAlertSuggestion> => {
  const response = await apiClient.post<SmartAlertSuggestion & { success: boolean }>('/ai/smart-alert/suggest', {
    dealId,
    targetPrice,
  });
  return response;
};

/**
 * Create a smart price alert
 */
export const createSmartAlert = async (dealId: string, targetPrice: number): Promise<{
  alertId: string;
  suggestion: SmartAlertSuggestion;
}> => {
  const response = await apiClient.post<any>('/ai/smart-alert/create', {
    dealId,
    targetPrice,
  });
  return response;
};

// ============================================
// DEAL SUMMARIZER
// ============================================

export interface DealSummary {
  headline: string;
  productName: string;
  valuePoints: string[];
  priceAnalysis: {
    currentPrice: number;
    savings: number | null;
    discountPercent: number | null;
    priceStatus: string;
  };
  buyRecommendation: {
    action: 'buy' | 'wait' | 'skip';
    confidence: number;
    reasoning: string;
  };
  qualityTier: 'excellent' | 'good' | 'average' | 'below_average';
}

/**
 * Get AI-generated summary for a deal
 */
export const getDealSummary = async (dealId: string): Promise<DealSummary> => {
  const response = await apiClient.get<any>(`/ai/summary/${dealId}`);

  // Transform backend response to match frontend interface
  return {
    headline: response.headline || '',
    productName: response.productName || response.headline || '',
    valuePoints: response.valuePoints || response.highlights || [],
    priceAnalysis: {
      currentPrice: response.priceAnalysis?.currentPrice || 0,
      savings: response.priceAnalysis?.savings || null,
      discountPercent: response.priceAnalysis?.discountPercent || null,
      priceStatus: response.priceAnalysis?.priceStatus || response.priceAnalysis?.message || 'Price information unavailable',
    },
    buyRecommendation: {
      action: (typeof response.buyRecommendation === 'string'
        ? (response.buyRecommendation === 'buy_now' ? 'buy' : response.buyRecommendation as 'wait' | 'skip')
        : response.buyRecommendation?.action) || 'buy',
      confidence: response.buyRecommendation?.confidence || 75,
      reasoning: response.buyRecommendation?.reasoning || response.recommendationReason || 'Based on price analysis',
    },
    qualityTier: response.qualityTier || 'good',
  };
};

/**
 * Get summaries for multiple deals (batch)
 */
export const getBatchSummaries = async (dealIds: string[]): Promise<Record<string, DealSummary>> => {
  const response = await apiClient.post<{ summaries: Record<string, DealSummary> }>('/ai/summaries', { dealIds });
  return response.summaries;
};

// ============================================
// PERSONALIZATION
// ============================================

export interface PersonalizedDeal {
  dealId: string;
  contentScore: number;
  collaborativeScore: number;
  hybridScore: number;
  matchReasons: string[];
}

export interface UserPreferenceProfile {
  preferredCategories: { categoryId: string; weight: number }[];
  preferredMerchants: { merchant: string; weight: number }[];
  preferredPriceRange: { min: number; max: number; avg: number };
  avgLikedDiscount: number;
  totalInteractions: number;
}

/**
 * Get personalized deal recommendations
 */
export const getPersonalizedDeals = async (limit: number = 30, categoryId?: string): Promise<PersonalizedDeal[]> => {
  let url = `/ai/personalized-deals?limit=${limit}`;
  if (categoryId) url += `&categoryId=${categoryId}`;
  const response = await apiClient.get<{ recommendations: PersonalizedDeal[] }>(url);
  return response.recommendations;
};

/**
 * Get user's preference profile
 */
export const getUserProfile = async (): Promise<UserPreferenceProfile> => {
  const response = await apiClient.get<{ profile: UserPreferenceProfile }>('/ai/user-profile');
  return response.profile;
};

/**
 * Get users with similar preferences (count only, no user IDs)
 */
export const getSimilarUsers = async (limit: number = 10): Promise<{ similarity: number }[]> => {
  const response = await apiClient.get<{ similarUsers: { similarity: number }[] }>(`/ai/similar-users?limit=${limit}`);
  return response.similarUsers;
};

/**
 * Explain why a deal was recommended
 */
export const explainRecommendation = async (dealId: string): Promise<{
  reasons: string[];
  contentScore: number;
  collaborativeScore: number;
}> => {
  const response = await apiClient.get<any>(`/ai/explain-recommendation/${dealId}`);
  return response;
};
