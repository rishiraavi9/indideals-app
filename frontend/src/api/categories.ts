import { apiClient } from './client';
import type { Category } from '../types';

export const categoriesApi = {
  getCategories: async (): Promise<Category[]> => {
    return apiClient.get<Category[]>('/categories');
  },

  createCategory: async (category: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  }): Promise<Category> => {
    return apiClient.post<Category>('/categories', category);
  },
};
