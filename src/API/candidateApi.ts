import { api } from "../services/api";
import type { ApproveCandidateRequest, CandidateResponse, CandidateWorkflowResponse, PageResult, RejectCandidateRequest, UpdateCandidateRequest } from "../types/domain";

export const candidateApi = {
  getProjectCandidates: async (projectId: number) => {
    return api.get<PageResult<CandidateResponse>>(
      `/projects/${projectId}/candidates`,
      { params: { page: 0, size: 100 } }
    );
  },

  getCandidateById: async (candidateId: string) => {
    return api.get<CandidateResponse>(`/candidates/${candidateId}`);
  },

  createCandidateFromExtraction: async (extractionId: string) => {
    return api.post<CandidateResponse>(
      `/ai-extractions/${extractionId}/candidate`
    );
  },

  createManualCandidate: async (projectId: number, taskId: number) => {
    return api.post<CandidateResponse>(
      `/projects/${projectId}/tasks/${taskId}/candidates/manual`
    );
  },

  updateCandidate: async (candidateId: string, data: UpdateCandidateRequest) => {
    return api.patch<CandidateResponse>(
      `/candidates/${candidateId}`,
      data
    );
  },

  renameCandidateDraft: async (candidateId: string, draftName: string) => {
    return api.patch<CandidateResponse>(
      `/candidates/${candidateId}/rename`,
      { draftName }
    );
  },

  deleteCandidate: async (candidateId: string) => {
    return api.delete<void>(`/candidates/${candidateId}`);
  },

  submitCandidate: async (candidateId: string) => {
    return api.post<CandidateResponse>(
      `/candidates/${candidateId}/submit`
    );
  },

  submitCandidateWorkflow: async (candidateId: string, taskId: number) => {
    return api.post<CandidateWorkflowResponse>(
      `/candidates/${candidateId}/workflow/submit?taskId=${taskId}`
    );
  },

  rejectCandidateWorkflow: async (candidateId: string, comment?: string) => {
    return api.post<CandidateWorkflowResponse>(
      `/candidates/${candidateId}/workflow/manager-reject`,
      undefined,
      { params: { comment } }
    );
  },

  approveCandidateWorkflow: async (candidateId: string, comment?: string) => {
    return api.post<CandidateWorkflowResponse>(
      `/candidates/${candidateId}/workflow/manager-approve`,
      undefined,
      { params: { comment } }
    );
  },

  approveCandidate: async (candidateId: string, data: ApproveCandidateRequest = {}) => {
    return api.post<CandidateResponse>(
      `/candidates/${candidateId}/approve`,
      data
    );
  },

  rejectCandidate: async (candidateId: string, data: RejectCandidateRequest) => {
    return api.post<CandidateResponse>(
      `/candidates/${candidateId}/reject`,
      data
    );
  },

  reviewCandidateFields: async (projectId: number | string, candidateId: string, fields: Record<string, unknown>) => {
    return api.patch<CandidateResponse>(
      `/projects/${projectId}/candidates/${candidateId}/review`,
      { fields }
    );
  },

  completeFieldReview: async (projectId: number | string, candidateId: string) => {
    return api.post<CandidateResponse>(
      `/projects/${projectId}/candidates/${candidateId}/review/complete`
    );
  },

  sendBackCandidate: async (projectId: number | string, candidateId: string) => {
    return api.post<CandidateResponse>(
      `/projects/${projectId}/candidates/${candidateId}/send-back`
    );
  },
};
