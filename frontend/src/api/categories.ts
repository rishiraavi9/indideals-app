import { apiClient } from './client';
import type { Category } from '../types';
import { mockCategories } from '../data/mockDeals';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const categoriesApi = {
  getCategories: async (): Promise<Category[]> => {
    if (isDemoMode) {
      return mockCategories.map(c => ({
        ...c,
        description: null,
        createdAt: new Date().toISOString(),
      }));
    }
    return apiClient.get<Category[]>('/categories');
  },

  createCategory: async (category: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  }): Promise<Category> => {
    if (isDemoMode) {
      throw new Error('Demo mode: Cannot create categories');
    }
    return apiClient.post<Category>('/categories', category);
  },
};
