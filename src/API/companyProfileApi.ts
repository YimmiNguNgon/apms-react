import { api, type PageResponse } from '../services/api';
import type {
  ProfileResponse,
  UpdateCompanyProfileRequest,
  CompanyProfileVersionResponse,
  AdminUpdateEnterpriseBasicInfoRequest,
  AdminUpdateEnterpriseBusinessFieldsRequest,
  AdminUpdateEnterpriseLeadershipRequest,
  CompanyProfileManagerHistoryDto,
  EligibleManagerDto,
  TransferResponsibilityRequest,
  CreateOwnerEnterpriseRequest,
} from '../types/domain';

export const companyProfileApi = {
  getCompanyProfile: async (companyIdOrProfileId: string) => {
    const res = await api.get<ProfileResponse>(`/company-profiles/${companyIdOrProfileId}`);
    return res.data;
  },

  updateCompanyProfile: async (companyIdOrProfileId: string, payload: UpdateCompanyProfileRequest) => {
    const res = await api.patch<ProfileResponse>(`/company-profiles/${companyIdOrProfileId}`, payload);
    return res.data;
  },

  getCompanyProfileVersions: async (companyIdOrProfileId: string, page = 0, size = 20) => {
    const res = await api.get<PageResponse<CompanyProfileVersionResponse>>(
      `/company-profiles/${companyIdOrProfileId}/versions?page=${page}&size=${size}`
    );
    return res.data;
  },

  getCompanyProfileVersionDetail: async (companyIdOrProfileId: string, version: string) => {
    const res = await api.get<CompanyProfileVersionResponse>(
      `/company-profiles/${companyIdOrProfileId}/versions/${encodeURIComponent(version)}`
    );
    return res.data;
  },

  updateProfileVisibility: async (companyIdOrProfileId: string, visibility: 'PUBLISHED' | 'HIDDEN') => {
    const res = await api.patch<ProfileResponse>(`/company-profiles/${companyIdOrProfileId}/visibility`, { visibility });
    return res.data;
  },

  getVisibilityManagementProfiles: async (params?: {
    keyword?: string;
    visibility?: 'PUBLISHED' | 'HIDDEN';
    eligibility?: 'ALL' | 'ELIGIBLE' | 'BLOCKED';
    page?: number;
    size?: number;
  }) => {
    const res = await api.get<PageResponse<ProfileResponse>>('/profiles/visibility-management', {
      params: {
        keyword: params?.keyword?.trim() || undefined,
        visibility: params?.visibility || undefined,
        eligibility: params?.eligibility || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    });
    return res.data;
  },

  getVisibilityManagementSummary: async () => {
    const res = await api.get<import('../types/domain').ProfileVisibilitySummaryDto>(
      '/profiles/visibility-management/summary'
    );
    return res.data;
  },

  getAdminMyEnterprise: async () => {
    const res = await api.get<ProfileResponse>('/admin/my-enterprise');
    return res.data;
  },

  createAdminMyEnterprise: async (payload: CreateOwnerEnterpriseRequest) => {
    const res = await api.post<ProfileResponse>('/admin/my-enterprise', payload);
    return res.data;
  },

  updateAdminEnterpriseBasicInfo: async (payload: AdminUpdateEnterpriseBasicInfoRequest) => {
    const res = await api.patch<ProfileResponse>('/admin/my-enterprise/basic-info', payload);
    return res.data;
  },

  updateAdminEnterpriseBusinessFields: async (payload: AdminUpdateEnterpriseBusinessFieldsRequest) => {
    const res = await api.patch<ProfileResponse>('/admin/my-enterprise/business-fields', payload);
    return res.data;
  },

  updateAdminEnterpriseLeadership: async (payload: AdminUpdateEnterpriseLeadershipRequest) => {
    const res = await api.put<ProfileResponse>('/admin/my-enterprise/leadership', payload);
    return res.data;
  },

  uploadLeadershipImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ imageUrl: string; filename: string }>(
      '/admin/my-enterprise/leadership/images',
      formData
    );
    return res.data;
  },

  transferResponsibility: async (companyProfileId: string, payload: TransferResponsibilityRequest) => {
    const res = await api.patch<void>(`/company-profiles/${companyProfileId}/responsible-manager`, payload);
    return res.data;
  },

  getManagementHistory: async (companyProfileId: string) => {
    const res = await api.get<CompanyProfileManagerHistoryDto[]>(
      `/company-profiles/${companyProfileId}/management-history`
    );
    return res.data;
  },

  getEligibleManagers: async (companyProfileId: string) => {
    const res = await api.get<EligibleManagerDto[]>(
      `/company-profiles/${companyProfileId}/eligible-managers`
    );
    return res.data;
  },
};

