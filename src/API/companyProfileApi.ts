import { api, type PageResponse } from '../services/api';
import type {
  ProfileResponse,
  UpdateCompanyProfileRequest,
  CompanyProfileVersionResponse,
  AdminUpdateEnterpriseBasicInfoRequest,
  AdminUpdateEnterpriseBusinessFieldsRequest,
  AdminUpdateEnterpriseLeadershipRequest,
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

  getAdminMyEnterprise: async () => {
    const res = await api.get<ProfileResponse>('/admin/my-enterprise');
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
};

