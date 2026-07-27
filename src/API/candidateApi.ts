import { api } from "../services/api";
import type { ApproveCandidateRequest, CandidateResponse, PageResult, RejectCandidateRequest, UpdateCandidateRequest } from "../types/domain";

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

  updateCandidate: async (candidateId: string, data: UpdateCandidateRequest) => {
    return api.patch<CandidateResponse>(
      `/candidates/${candidateId}`,
      data
    );
  },

  deleteCandidate: async (candidateId: string) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<void>(response);
  },

  submitCandidate: async (candidateId: string) => {
    return api.post<CandidateResponse>(
      `/candidates/${candidateId}/submit`
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
};
