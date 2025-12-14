import { apiClient } from './client';
import type { Deal } from '../types';
import { mockDeals } from '../data/mockDeals';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export type GetDealsParams = {
  tab?: 'frontpage' | 'popular' | 'new' | 'personalized';
  category?: string;
  search?: string;
  merchant?: string;
  festive?: boolean;
  userId?: string; // Filter deals by user ID
  limit?: number;
  offset?: number;
  preferredCategories?: string; // Comma-separated category IDs for anonymous users
};

export type GetDealsResponse = {
  deals: Deal[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export const dealsApi = {
  getDeals: async (params: GetDealsParams = {}): Promise<GetDealsResponse> => {
    // Demo mode - return mock data
    if (isDemoMode) {
      let filteredDeals = [...mockDeals];

      if (params.category) {
        filteredDeals = filteredDeals.filter(d => d.categoryId === params.category);
      }
      if (params.festive) {
        filteredDeals = filteredDeals.filter(d => d.festive);
      }
      if (params.merchant) {
        filteredDeals = filteredDeals.filter(d => d.merchant === params.merchant);
      }

      return {
        deals: filteredDeals,
        pagination: {
          limit: params.limit || 20,
          offset: params.offset || 0,
          hasMore: false,
        },
      };
    }

    // Real API mode
    const queryParams = new URLSearchParams();

    if (params.tab) queryParams.append('tab', params.tab);
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.merchant) queryParams.append('merchant', params.merchant);
    if (params.festive) queryParams.append('festive', 'true');
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.preferredCategories) queryParams.append('preferredCategories', params.preferredCategories);

    const query = queryParams.toString();
    return apiClient.get<GetDealsResponse>(`/deals${query ? `?${query}` : ''}`);
  },

  getDeal: async (id: string): Promise<Deal> => {
    if (isDemoMode) {
      const deal = mockDeals.find(d => d.id === id);
      if (!deal) throw new Error('Deal not found');
      return deal;
    }
    return apiClient.get<Deal>(`/deals/${id}`);
  },

  createDeal: async (deal: {
    title: string;
    description?: string;
    price: number;
    originalPrice?: number;
    merchant: string;
    url?: string;
    imageUrl?: string;
    categoryId?: string;
    expiresAt?: string;
  }): Promise<Deal> => {
    if (isDemoMode) {
      throw new Error('Demo mode: Cannot create deals');
    }
    return apiClient.post<Deal>('/deals', deal);
  },

  voteDeal: async (
    id: string,
    voteType: number
  ): Promise<{ upvotes: number; downvotes: number; score: number; userVote: number }> => {
    if (isDemoMode) {
      // Simulate voting in demo mode
      return { upvotes: 100, downvotes: 5, score: 95, userVote: voteType };
    }
    return apiClient.post(`/deals/${id}/vote`, { voteType });
  },

  trackActivity: async (
    id: string,
    activityType: 'view' | 'click' | 'vote' | 'comment'
  ): Promise<{ success: boolean }> => {
    if (isDemoMode) {
      return { success: true };
    }
    return apiClient.post(`/deals/${id}/activity`, { activityType });
  },
};
