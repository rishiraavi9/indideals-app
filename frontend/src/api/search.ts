import { apiClient } from './client';
import type { Deal } from '../types';

export type SearchDealsParams = {
  q?: string;
  categoryIds?: string[]; // Array of category IDs
  merchants?: string[]; // Array of merchant names
  minPrice?: number;
  maxPrice?: number;
  minScore?: number;
  festiveTags?: string[];
  seasonalTag?: string;
  from?: number;
  size?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'score' | 'date';
};

export type SearchDealsResponse = {
  deals: (Deal & { _score: number })[];
  total: number;
  took: number; // Time in milliseconds
};

export type AutocompleteSuggestion = {
  title: string;
  merchant: string;
  categoryName: string;
};

export type SearchAggregations = {
  categories: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
  merchants: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
  priceRanges: {
    buckets: Array<{ key: string; from?: number; to?: number; doc_count: number }>;
  };
  discountRanges: {
    buckets: Array<{ key: string; from?: number; to?: number; doc_count: number }>;
  };
};

export const searchApi = {
  /**
   * Search deals with advanced filters using Elasticsearch
   */
  searchDeals: async (params: SearchDealsParams = {}): Promise<SearchDealsResponse> => {
    const queryParams = new URLSearchParams();

    if (params.q) queryParams.append('q', params.q);
    if (params.categoryIds && params.categoryIds.length > 0) {
      queryParams.append('categoryIds', params.categoryIds.join(','));
    }
    if (params.merchants && params.merchants.length > 0) {
      queryParams.append('merchants', params.merchants.join(','));
    }
    if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.minScore !== undefined) queryParams.append('minScore', params.minScore.toString());
    if (params.festiveTags && params.festiveTags.length > 0) {
      queryParams.append('festiveTags', params.festiveTags.join(','));
    }
    if (params.seasonalTag) queryParams.append('seasonalTag', params.seasonalTag);
    if (params.from !== undefined) queryParams.append('from', params.from.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);

    const query = queryParams.toString();
    return apiClient.get<SearchDealsResponse>(`/search/deals${query ? `?${query}` : ''}`);
  },

  /**
   * Get autocomplete suggestions as user types
   */
  autocomplete: async (query: string, size: number = 10): Promise<AutocompleteSuggestion[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await apiClient.get<{ suggestions: AutocompleteSuggestion[] }>(
      `/search/autocomplete?q=${encodeURIComponent(query)}&size=${size}`
    );

    return response.suggestions;
  },

  /**
   * Get search aggregations (facets) for filtering options
   */
  getAggregations: async (query?: string): Promise<SearchAggregations> => {
    const url = query
      ? `/search/aggregations?q=${encodeURIComponent(query)}`
      : '/search/aggregations';

    return apiClient.get<SearchAggregations>(url);
  },
};
