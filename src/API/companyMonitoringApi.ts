import { api } from '../services/api';
import type { PageResponse } from '../services/api';
import type {
  CompanyMonitoringAssignmentRequest,
  CompanyMonitoringUpdateRequest,
  CompanyMonitoringReviewRequest,
  CompanyMonitoringAssignmentResponse,
  CompanyMonitoringReviewResponse,
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

  createMonitoringProposal: async (companyProfileId: string, changeSummary: string): Promise<{ id: string }> => {
    const response = await api.post<{ id: string }>('/profile-update-proposals/monitoring', {
      companyProfileId,
      changeSummary
    });
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
  ): Promise<CompanyMonitoringAssignmentResponse> => {
    const response = await api.get<CompanyMonitoringAssignmentResponse>(`/company-monitoring/company/${companyProfileId}`);
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
