import { api, API_BASE_URL, STORAGE_KEYS } from '../services/api';
import type { PageResponse } from '../services/api';
import type {
  CompanyMonitoringAssignmentRequest,
  CompanyMonitoringUpdateRequest,
  CompanyMonitoringReviewRequest,
  CompanyMonitoringAssignmentResponse,
  CompanyMonitoringReviewResponse,
  CompanyProfileUpdateProposalResponse,
  RelationshipChangeProposalRequest,
  RelationshipChangeProposalResponse,
  RelationshipChangeReviewRequest,
  RelationshipHistoryResponse
} from '../types/domain';

export const companyMonitoringApi = {
  assignMonitor: async (
    data: CompanyMonitoringAssignmentRequest
  ): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.post<CompanyMonitoringAssignmentResponse>('/company-monitoring', data);
    return response.data;
  },

  updateAssignment: async (
    id: number,
    data: CompanyMonitoringUpdateRequest
  ): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.put<CompanyMonitoringAssignmentResponse>(`/company-monitoring/${id}`, data);
    return response.data;
  },

  pauseAssignment: async (id: number): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.patch<CompanyMonitoringAssignmentResponse>(`/company-monitoring/${id}/pause`);
    return response.data;
  },

  resumeAssignment: async (id: number): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.patch<CompanyMonitoringAssignmentResponse>(`/company-monitoring/${id}/resume`);
    return response.data;
  },

  submitReview: async (
    id: number,
    data: CompanyMonitoringReviewRequest
  ): Promise<CompanyMonitoringReviewResponse> => {
    const response = await api.post<CompanyMonitoringReviewResponse>(`/company-monitoring/${id}/reviews`, data);
    return response.data;
  },

  getMonitoringHistory: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CompanyMonitoringReviewResponse>> => {
    const response = await api.get<PageResponse<CompanyMonitoringReviewResponse>>('/company-monitoring/reviews', { params });
    return response.data;
  },

  uploadEvidenceImage: async (file: File): Promise<{ evidenceImageId: string; originalFileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ evidenceImageId: string; originalFileName: string }>(
      '/profile-update-proposals/monitoring/evidence/upload', 
      formData
    );
    return response.data;
  },

  getMonitoringEvidenceBlob: async (imageId: string): Promise<Blob> => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/profile-update-proposals/monitoring/evidence/${imageId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = new Error(`Failed to load evidence image: ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.blob();
  },

  createMonitoringProposal: async (companyProfileId: string, changeSummary: string, changedFieldPaths?: string[], fieldEvidence?: any[], proposedIdentity?: any, proposedContact?: any, proposedBusiness?: any, proposedCompanySize?: any, proposedInsights?: any, proposedCompanyMembers?: any[]): Promise<{ id: string }> => {
    const response = await api.post<{ id: string }>('/profile-update-proposals/monitoring', {
      companyProfileId,
      changeSummary,
      changedFieldPaths,
      fieldEvidence,
      proposedIdentity,
      proposedContact,
      proposedBusiness,
      proposedCompanySize,
      proposedInsights,
      proposedCompanyMembers
    });
    return response.data;
  },

  getProfileUpdateProposal: async (
    id: string
  ): Promise<CompanyProfileUpdateProposalResponse> => {
    const response = await api.get<CompanyProfileUpdateProposalResponse>(`/profile-update-proposals/${id}`);
    return response.data;
  },

  getPendingProfileUpdateProposals: async (
    companyProfileId: string
  ): Promise<CompanyProfileUpdateProposalResponse[]> => {
    const response = await api.get<CompanyProfileUpdateProposalResponse[]>(
      `/company-profiles/${companyProfileId}/pending-proposals`
    );
    return response.data;
  },

  approveProfileUpdateProposal: async (
    id: string,
    reviewComment?: string
  ): Promise<CompanyProfileUpdateProposalResponse> => {
    const response = await api.patch<CompanyProfileUpdateProposalResponse>(`/profile-update-proposals/${id}/approve`, { reviewComment });
    return response.data;
  },

  rejectProfileUpdateProposal: async (
    id: string,
    reviewComment?: string
  ): Promise<CompanyProfileUpdateProposalResponse> => {
    const response = await api.patch<CompanyProfileUpdateProposalResponse>(`/profile-update-proposals/${id}/reject`, { reviewComment });
    return response.data;
  },

  withdrawProfileUpdateProposal: async (
    id: string
  ): Promise<CompanyProfileUpdateProposalResponse> => {
    const response = await api.patch<CompanyProfileUpdateProposalResponse>(`/profile-update-proposals/${id}/withdraw`);
    return response.data;
  },

  getAllAssignments: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CompanyMonitoringAssignmentResponse>> => {
    const response = await api.get<PageResponse<CompanyMonitoringAssignmentResponse>>('/company-monitoring', { params });
    return response.data;
  },

  getMyAssignments: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CompanyMonitoringAssignmentResponse>> => {
    const response = await api.get<PageResponse<CompanyMonitoringAssignmentResponse>>('/company-monitoring/my', { params });
    return response.data;
  },

  getDueOrOverdueAssignments: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CompanyMonitoringAssignmentResponse>> => {
    const response = await api.get<PageResponse<CompanyMonitoringAssignmentResponse>>('/company-monitoring/due', { params });
    return response.data;
  },

  getAssignment: async (id: number): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.get<CompanyMonitoringAssignmentResponse>(`/company-monitoring/${id}`);
    return response.data;
  },

  getAssignmentByCompany: async (
    companyProfileId: string
  ): Promise<CompanyMonitoringAssignmentResponse | null> => {
    const response = await api.get<CompanyMonitoringAssignmentResponse | null>(`/company-monitoring/company/${companyProfileId}`);
    return response.data;
  },

  proposeRelationshipChange: async (
    assignmentId: number,
    data: RelationshipChangeProposalRequest
  ): Promise<RelationshipChangeProposalResponse> => {
    const response = await api.post<RelationshipChangeProposalResponse>(`/company-monitoring/${assignmentId}/relationship-changes`, data);
    return response.data;
  },

  getPendingProposals: async (
    companyProfileId: string
  ): Promise<RelationshipChangeProposalResponse[]> => {
    const response = await api.get<RelationshipChangeProposalResponse[]>(`/company-profiles/${companyProfileId}/relationship-changes/pending`);
    return response.data;
  },

  approveProposal: async (
    id: number
  ): Promise<RelationshipChangeProposalResponse> => {
    const response = await api.patch<RelationshipChangeProposalResponse>(`/relationship-changes/${id}/approve`);
    return response.data;
  },

  rejectProposal: async (
    id: number,
    data: RelationshipChangeReviewRequest
  ): Promise<RelationshipChangeProposalResponse> => {
    const response = await api.patch<RelationshipChangeProposalResponse>(`/relationship-changes/${id}/reject`, data);
    return response.data;
  },

  getRelationshipHistory: async (
    companyProfileId: string
  ): Promise<RelationshipHistoryResponse[]> => {
    const response = await api.get<RelationshipHistoryResponse[]>(`/company-profiles/${companyProfileId}/relationship-history`);
    return response.data;
  },
};
