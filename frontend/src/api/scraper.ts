import { apiClient } from './client';

export const scraperApi = {
  fetchImageFromUrl: async (url: string): Promise<{ imageUrl: string }> => {
    return apiClient.post<{ imageUrl: string }>('/scraper/fetch-image', { url });
  },
};
