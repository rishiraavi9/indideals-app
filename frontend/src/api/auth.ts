import { apiClient } from './client';
import type { User, AuthResponse } from '../types';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const authApi = {
  signup: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    if (isDemoMode) {
      throw new Error('Demo mode: Authentication not available');
    }
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email,
      username,
      password,
    });
    apiClient.setToken(response.accessToken);
    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (isDemoMode) {
      throw new Error('Demo mode: Authentication not available');
    }
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    apiClient.setToken(response.accessToken);
    return response;
  },

  logout: () => {
    apiClient.setToken(null);
  },

  getMe: async (): Promise<{ user: User }> => {
    if (isDemoMode) {
      // Return null user in demo mode - user is not authenticated
      throw new Error('Demo mode: Not authenticated');
    }
    return apiClient.get<{ user: User }>('/auth/me');
  },

  isAuthenticated: (): boolean => {
    if (isDemoMode) {
      return false; // No authentication in demo mode
    }
    return !!apiClient.getToken();
  },
};
