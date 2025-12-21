import { apiClient } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: 'price_drop' | 'deal_alert' | 'wishlist' | 'system';
  title: string;
  message: string;
  dealId: string | null;
  imageUrl: string | null;
  read: boolean;
  createdAt: string;
  deal?: {
    id: string;
    title: string;
    price: number;
    originalPrice: number | null;
    imageUrl: string | null;
    merchant: string;
  };
}

/**
 * Get user's notifications
 */
export const getNotifications = async (options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{ notifications: Notification[] }> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.unreadOnly) params.set('unread', 'true');

  const query = params.toString();
  return await apiClient.get<{ notifications: Notification[] }>(
    `/notifications${query ? `?${query}` : ''}`
  );
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<{ count: number }> => {
  return await apiClient.get<{ count: number }>('/notifications/unread-count');
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId: string): Promise<{ notification: Notification }> => {
  return await apiClient.patch<{ notification: Notification }>(
    `/notifications/${notificationId}/read`,
    {}
  );
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<{ message: string }> => {
  return await apiClient.post<{ message: string }>('/notifications/mark-all-read', {});
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await apiClient.delete(`/notifications/${notificationId}`);
};
