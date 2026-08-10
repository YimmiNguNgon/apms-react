import { api } from '../services/api';
import type {
  CompanyNewsResearchDraft,
  CreateNewsResearchDraftRequest,
  UpdateNewsResearchDraftRequest,
} from '../types/domain';

const BASE = (projectId: number, taskId: number) =>
  `/projects/${projectId}/tasks/${taskId}/company-news`;

export const companyNewsResearchApi = {
  getDrafts: (projectId: number, taskId: number) =>
    api.get<CompanyNewsResearchDraft[]>(`${BASE(projectId, taskId)}/drafts`),

  getDraft: (projectId: number, taskId: number, draftId: string) =>
    api.get<CompanyNewsResearchDraft>(`${BASE(projectId, taskId)}/drafts/${draftId}`),

  createDraft: (projectId: number, taskId: number, request: CreateNewsResearchDraftRequest) =>
    api.post<CompanyNewsResearchDraft>(`${BASE(projectId, taskId)}/drafts`, request),

  updateDraft: (projectId: number, taskId: number, draftId: string, request: UpdateNewsResearchDraftRequest) =>
    api.patch<CompanyNewsResearchDraft>(`${BASE(projectId, taskId)}/drafts/${draftId}`, request),

  deleteDraft: (projectId: number, taskId: number, draftId: string) =>
    api.delete<void>(`${BASE(projectId, taskId)}/drafts/${draftId}`),

  uploadImage: (projectId: number, taskId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ storageKey: string }>(`${BASE(projectId, taskId)}/images`, formData);
  },

  submitResearch: (projectId: number, taskId: number, newsDraftIds: string[]) =>
    api.post<void>(`${BASE(projectId, taskId)}/submit`, { newsDraftIds }),
};
