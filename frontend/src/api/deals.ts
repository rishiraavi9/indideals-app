import { apiClient } from './client';
import type { Deal } from '../types';

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
    return apiClient.post<Deal>('/deals', deal);
  },

  voteDeal: async (
    id: string,
    voteType: number
  ): Promise<{ upvotes: number; downvotes: number; score: number; userVote: number }> => {
    return apiClient.post(`/deals/${id}/vote`, { voteType });
  },

  trackActivity: async (
    id: string,
    activityType: 'view' | 'click' | 'vote' | 'comment'
  ): Promise<{ success: boolean }> => {
    return apiClient.post(`/deals/${id}/activity`, { activityType });
  },
};
