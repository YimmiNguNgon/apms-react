import { api } from '../services/api';
import type { CompanyMemberResearchDraftResponse, CompanyMemberResearchItem } from '../types/domain';

export const companyMemberResearchApi = {
  getDraft: (projectId: number, taskId: number) =>
    api.get<CompanyMemberResearchDraftResponse>(`/projects/${projectId}/tasks/${taskId}/company-members/draft`),

  saveDraft: (projectId: number, taskId: number, members: CompanyMemberResearchItem[]) =>
    api.post<CompanyMemberResearchDraftResponse>(`/projects/${projectId}/tasks/${taskId}/company-members/draft`, {
      members,
    }),

  uploadImage: (projectId: number, taskId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ imageUrl: string; filename: string }>(
      `/projects/${projectId}/tasks/${taskId}/company-members/images`,
      formData
    );
  },

  submitDraft: (projectId: number, taskId: number) =>
    api.post<void>(`/projects/${projectId}/tasks/${taskId}/company-members/submit`, {}),
};
