import { apiClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  reputation: number;
  emailVerified: boolean;
  createdAt: string;
}

export interface EmailPreferences {
  dealAlerts: boolean;
  priceDrops: boolean;
  weeklyDigest: boolean;
  promotions: boolean;
}

/**
 * Get user profile
 */
export const getProfile = async (): Promise<{ user: UserProfile }> => {
  return await apiClient.get<{ user: UserProfile }>('/profile');
};

/**
 * Update user profile
 */
export const updateProfile = async (data: {
  username?: string;
  avatarUrl?: string | null;
}): Promise<{ user: UserProfile }> => {
  return await apiClient.patch<{ user: UserProfile }>('/profile', data);
};

/**
 * Change password
 */
export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  return await apiClient.post<{ message: string }>('/profile/change-password', data);
};

/**
 * Get email preferences
 */
export const getEmailPreferences = async (): Promise<{ preferences: EmailPreferences }> => {
  return await apiClient.get<{ preferences: EmailPreferences }>('/profile/email-preferences');
};

/**
 * Update email preferences
 */
export const updateEmailPreferences = async (
  preferences: Partial<EmailPreferences>
): Promise<{ message: string; preferences: EmailPreferences }> => {
  return await apiClient.patch<{ message: string; preferences: EmailPreferences }>(
    '/profile/email-preferences',
    preferences
  );
};
