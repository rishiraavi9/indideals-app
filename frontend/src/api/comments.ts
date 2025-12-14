import { apiClient } from './client';
import type { Comment } from '../types';

export const commentsApi = {
  getComments: async (dealId: string): Promise<Comment[]> => {
    return apiClient.get<Comment[]>(`/deals/${dealId}/comments`);
  },

  createComment: async (
    dealId: string,
    content: string,
    parentId?: string
  ): Promise<Comment> => {
    return apiClient.post<Comment>(`/deals/${dealId}/comments`, {
      content,
      parentId,
    });
  },

  createReply: async (
    dealId: string,
    parentId: string,
    content: string
  ): Promise<Comment> => {
    return apiClient.post<Comment>(`/deals/${dealId}/comments`, {
      content,
      parentId,
    });
  },

  voteComment: async (commentId: string, voteType: number): Promise<Comment> => {
    return apiClient.post<Comment>(`/comments/${commentId}/vote`, { voteType });
  },
};
