import { api } from '../services/api';
import type { ApiResponse } from '../services/api';

export type AiApiKeyStatus = 'ACTIVE' | 'EXHAUSTED' | 'INVALID' | 'DISABLED';

export interface AiApiKeyDto {
  id: string;
  provider: string;
  label?: string | null;
  maskedKey: string;
  status: AiApiKeyStatus;
  lastUsedAt?: string | null;
  lastFailureAt?: string | null;
  lastErrorCode?: number | null;
  lastError?: string | null;
  createdAt?: string | null;
  orderIndex?: number;
}

export interface AddAiApiKeyRequest {
  apiKey: string;
  label?: string;
}

export interface SetAiApiKeyStatusRequest {
  enabled: boolean;
}

export interface TestAiApiKeyResponse {
  success: boolean;
  status: AiApiKeyStatus;
  message: string;
}

export interface RevealAiApiKeyResponse {
  id: string;
  fullApiKey: string;
}

export const adminAiKeyApi = {
  getAiApiKeys: async () => {
    return api.get<AiApiKeyDto[]>('/admin/ai-keys');
  },

  addAiApiKey: async (data: AddAiApiKeyRequest) => {
    return api.post<AiApiKeyDto>('/admin/ai-keys', data);
  },

  deleteAiApiKey: async (id: string) => {
    return api.delete<{ id: string; deleted: boolean }>(`/admin/ai-keys/${id}`);
  },

  reloadAiApiKeys: async () => {
    return api.post<{ activeCount: number; keys: AiApiKeyDto[] }>('/admin/ai-keys/reload');
  },

  setAiApiKeyEnabled: async (id: string, enabled: boolean) => {
    return api.patch<AiApiKeyDto>(`/admin/ai-keys/${id}/status`, { enabled });
  },

  testAiApiKey: async (id: string) => {
    return api.post<TestAiApiKeyResponse>(`/admin/ai-keys/${id}/test`);
  },

  revealAiApiKey: async (id: string) => {
    return api.get<RevealAiApiKeyResponse>(`/admin/ai-keys/${id}/reveal`);
  },
};
