import { apiClient } from './client';

export interface Alert {
  id: string;
  userId: string;
  keyword: string;
  categoryId: string | null;
  minDiscount: number | null;
  maxPrice: number | null;
  merchant: string | null;
  isActive: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  lastNotified: string | null;
  notificationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertParams {
  keyword: string;
  categoryId?: string;
  minDiscount?: number;
  maxPrice?: number;
  merchant?: string;
  frequency?: 'instant' | 'daily' | 'weekly';
}

export interface UpdateAlertParams {
  isActive?: boolean;
  frequency?: 'instant' | 'daily' | 'weekly';
  minDiscount?: number;
  maxPrice?: number;
  merchant?: string;
}

/**
 * Create a keyword alert
 */
export const createAlert = async (params: CreateAlertParams): Promise<{ alert: Alert }> => {
  return await apiClient.post<{ alert: Alert }>('/alerts', params);
};

/**
 * Get user's alerts
 */
export const getAlerts = async (): Promise<{ alerts: Alert[] }> => {
  return await apiClient.get<{ alerts: Alert[] }>('/alerts');
};

/**
 * Update an alert
 */
export const updateAlert = async (alertId: string, updates: UpdateAlertParams): Promise<{ alert: Alert }> => {
  return await apiClient.patch<{ alert: Alert }>(`/alerts/${alertId}`, updates);
};

/**
 * Delete an alert
 */
export const deleteAlert = async (alertId: string): Promise<void> => {
  await apiClient.delete(`/alerts/${alertId}`);
};

/**
 * Test an alert (preview matching deals)
 */
export const testAlert = async (alertId: string): Promise<{ alert: Alert; matchingDeals: any[]; message: string }> => {
  return await apiClient.get<{ alert: Alert; matchingDeals: any[]; message: string }>(`/alerts/${alertId}/test`);
};
