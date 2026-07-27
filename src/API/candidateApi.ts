import { API_BASE_URL } from "../services/api";
import type { ApiResponse } from "../services/api";
import type { ApproveCandidateRequest, CandidateResponse, PageResult, RejectCandidateRequest, UpdateCandidateRequest } from "../types/domain";

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("apms-token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const readPayload = async <T>(response: Response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Candidate request failed");
  }
  return payload as ApiResponse<T>;
};

export const candidateApi = {
  getProjectCandidates: async (projectId: number) => {
    const url = new URL(`${API_BASE_URL}/projects/${projectId}/candidates`);
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "100");

    const response = await fetch(url.toString(), {
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<PageResult<CandidateResponse>>(response);
  },

  getCandidateById: async (candidateId: string) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<CandidateResponse>(response);
  },

  createCandidateFromExtraction: async (extractionId: string) => {
    const response = await fetch(`${API_BASE_URL}/ai-extractions/${extractionId}/candidate`, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<CandidateResponse>(response);
  },

  updateCandidate: async (candidateId: string, data: UpdateCandidateRequest) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    return readPayload<CandidateResponse>(response);
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
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/submit`, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
    });

    return readPayload<CandidateResponse>(response);
  },

  approveCandidate: async (candidateId: string, data: ApproveCandidateRequest = {}) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    return readPayload<CandidateResponse>(response);
  },

  rejectCandidate: async (candidateId: string, data: RejectCandidateRequest) => {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    return readPayload<CandidateResponse>(response);
  },
};
