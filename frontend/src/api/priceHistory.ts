import { apiClient } from './client';

export interface PriceHistoryPoint {
  id: string;
  dealId: string;
  price: number;
  originalPrice: number | null;
  merchant: string;
  scrapedAt: string;
  source: string;
}

export interface PriceStats {
  current: number;
  lowest: number;
  highest: number;
  average: number;
  dataPoints: number;
}

export interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
  stats: PriceStats;
  period: string;
}

export interface PriceAlert {
  id: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
  notifiedAt: string | null;
  deal?: any;
}

/**
 * Get price history for a deal
 */
export const getPriceHistory = async (dealId: string, days: number = 30): Promise<PriceHistoryResponse> => {
  return await apiClient.get<PriceHistoryResponse>(`/price-history/deals/${dealId}?days=${days}`);
};

/**
 * Create a price alert for a deal
 */
export const createPriceAlert = async (dealId: string, targetPrice: number): Promise<{ alert: PriceAlert }> => {
  return await apiClient.post<{ alert: PriceAlert }>(`/deals/${dealId}/price-alerts`, { targetPrice });
};

/**
 * Get user's price alerts
 */
export const getPriceAlerts = async (activeOnly: boolean = true): Promise<{ alerts: PriceAlert[] }> => {
  return await apiClient.get<{ alerts: PriceAlert[] }>(`/price-alerts?active=${activeOnly}`);
};

/**
 * Delete a price alert
 */
export const deletePriceAlert = async (alertId: string): Promise<void> => {
  await apiClient.delete(`/price-alerts/${alertId}`);
};

/**
 * Update a price alert
 */
export const updatePriceAlert = async (alertId: string, updates: { targetPrice?: number; isActive?: boolean }): Promise<{ alert: PriceAlert }> => {
  return await apiClient.patch<{ alert: PriceAlert }>(`/price-alerts/${alertId}`, updates);
};
