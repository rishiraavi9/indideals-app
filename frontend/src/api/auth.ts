import { apiClient } from './client';
import type { User, AuthResponse } from '../types';

export const authApi = {
  signup: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email,
      username,
      password,
    });
    apiClient.setToken(response.accessToken);
    apiClient.setRefreshToken(response.refreshToken);
    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    apiClient.setToken(response.accessToken);
    apiClient.setRefreshToken(response.refreshToken);
    return response;
  },

  logout: async () => {
    const refreshToken = apiClient.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    apiClient.setToken(null);
    apiClient.setRefreshToken(null);
  },

  getMe: async (): Promise<{ user: User }> => {
    return apiClient.get<{ user: User }>('/auth/me');
  },

  isAuthenticated: (): boolean => {
    return !!apiClient.getToken();
  },
};
