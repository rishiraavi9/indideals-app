import { apiClient } from './client';

export interface TrackClickResponse {
  success: boolean;
  url: string;
  clickId: string;
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalCommission: number;
  byMerchant: Array<{
    merchant: string;
    clicks: number;
    conversions: number;
    commission: number;
  }>;
}

export const affiliateApi = {
  trackClick: async (dealId: string): Promise<TrackClickResponse> => {
    return apiClient.post<TrackClickResponse>('/affiliate/track-click', { dealId });
  },

  markConversion: async (clickId: string, commissionAmount?: number): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>('/affiliate/mark-conversion', {
      clickId,
      commissionAmount,
    });
  },

  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
    merchant?: string;
  }): Promise<AffiliateStats> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.merchant) queryParams.append('merchant', params.merchant);

    const query = queryParams.toString();
    return apiClient.get<AffiliateStats>(`/affiliate/stats${query ? `?${query}` : ''}`);
  },
};
