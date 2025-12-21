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
