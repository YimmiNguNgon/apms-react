import { api, type PageResponse } from '../services/api';
import type { ProfileResponse, UpdateCompanyProfileRequest, CompanyProfileVersionResponse } from '../types/domain';

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
};
