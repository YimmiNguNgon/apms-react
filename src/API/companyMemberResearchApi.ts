import { api } from '../services/api';
import type { CompanyMemberResearchDraftResponse, CompanyMemberResearchItem } from '../types/domain';

export const companyMemberResearchApi = {
  getDraft: (projectId: number, taskId: number) =>
    api.get<CompanyMemberResearchDraftResponse>(`/projects/${projectId}/tasks/${taskId}/company-members/draft`),

  saveDraft: (projectId: number, taskId: number, members: CompanyMemberResearchItem[]) =>
    api.post<CompanyMemberResearchDraftResponse>(`/projects/${projectId}/tasks/${taskId}/company-members/draft`, {
      members,
    }),

  submitDraft: (projectId: number, taskId: number) =>
    api.post<void>(`/projects/${projectId}/tasks/${taskId}/company-members/submit`, {}),
};
