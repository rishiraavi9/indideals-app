import { apiClient } from './client';
import type { Deal } from '../types';

export interface SavedDeal {
  id: string;
  dealId: string;
  notes: string | null;
  savedAt: string;
  deal: Deal;
}

export interface WishlistResponse {
  wishlist: SavedDeal[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Save a deal to wishlist
 */
export const saveDeal = async (dealId: string, notes?: string): Promise<{ saved: SavedDeal }> => {
  return await apiClient.post<{ saved: SavedDeal }>('/wishlist', { dealId, notes });
};

/**
 * Get user's wishlist
 */
export const getWishlist = async (limit: number = 20, offset: number = 0): Promise<WishlistResponse> => {
  return await apiClient.get<WishlistResponse>(`/wishlist?limit=${limit}&offset=${offset}`);
};

/**
 * Remove deal from wishlist
 */
export const removeDeal = async (dealId: string): Promise<void> => {
  await apiClient.delete(`/wishlist/${dealId}`);
};

/**
 * Update wishlist notes
 */
export const updateNotes = async (dealId: string, notes: string): Promise<{ saved: SavedDeal }> => {
  return await apiClient.patch<{ saved: SavedDeal }>(`/wishlist/${dealId}`, { notes });
};

/**
 * Check if deal is in wishlist
 */
export const checkWishlist = async (dealId: string): Promise<{ inWishlist: boolean; saved: SavedDeal | null }> => {
  return await apiClient.get<{ inWishlist: boolean; saved: SavedDeal | null }>(`/wishlist/check/${dealId}`);
};
