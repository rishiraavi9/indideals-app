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
    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
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
    return apiClient.get<{ user: User }>('/auth/me');
  },

  isAuthenticated: (): boolean => {
    return !!apiClient.getToken();
  },
};
