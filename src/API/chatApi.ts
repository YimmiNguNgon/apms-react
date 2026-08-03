import { api } from '../services/api';
import type { PageResponse } from '../services/api';

export interface ChatMessageResponse {
  id: string;
  projectId: number;
  senderId: number;
  senderName?: string | null;
  content: string;
  replyToMessageId?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  eventType?: 'MESSAGE_CREATED' | 'MESSAGE_UPDATED' | 'MESSAGE_DELETED' | string | null;
}

export interface ChatMessageRequest {
  content: string;
  replyToMessageId?: string | null;
}

export const chatApi = {
  getHistory: (projectId: number, page = 0, size = 100) =>
    api.get<PageResponse<ChatMessageResponse>>(`/projects/${projectId}/chat/messages`, {
      params: {
        page,
        size,
        sort: 'createdAt,desc',
      },
    }),

  sendMessage: (projectId: number, request: ChatMessageRequest) =>
    api.post<ChatMessageResponse>(`/projects/${projectId}/chat/messages`, request),

  editMessage: (projectId: number, messageId: string, request: ChatMessageRequest) =>
    api.patch<ChatMessageResponse>(`/projects/${projectId}/chat/messages/${messageId}`, request),

  deleteMessage: (projectId: number, messageId: string) =>
    api.delete<void>(`/projects/${projectId}/chat/messages/${messageId}`),
};
