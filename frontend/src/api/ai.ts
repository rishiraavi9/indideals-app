import { apiClient } from './apiClient';

export interface QualityScoreBreakdown {
  discount: number;
  priceHistory: number;
  merchant: number;
  engagement: number;
  freshness: number;
}

export interface QualityScoreResult {
  totalScore: number;
  breakdown: QualityScoreBreakdown;
  badges: string[];
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
  const response = await apiClient.get(`/ai/quality-score/${dealId}`);
  return response.data;
};

/**
 * Get quality scores for multiple deals (batch)
 */
export const getBatchQualityScores = async (dealIds: string[]): Promise<Record<string, number>> => {
  const response = await apiClient.post('/ai/quality-scores', { dealIds });
  return response.data.scores;
};

/**
 * Get top quality deals recommended by AI
 */
export const getTopQualityDeals = async (limit: number = 20): Promise<any[]> => {
  const response = await apiClient.get('/ai/top-deals', { params: { limit } });
  return response.data.deals;
};

/**
 * Manually recalculate quality score for a deal
 */
export const recalculateDealScore = async (dealId: string): Promise<QualityScoreResult> => {
  const response = await apiClient.post(`/ai/recalculate-score/${dealId}`);
  return response.data;
};

/**
 * Get AI system statistics
 */
export const getAIStats = async (): Promise<AIStats> => {
  const response = await apiClient.get('/ai/stats');
  return response.data.stats;
};
