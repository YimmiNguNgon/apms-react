import { api } from '../services/api';
import type { ApiResponse, PageResponse } from '../services/api';
import type { ProfileResponse } from '../types/domain';

export interface AdminCompanyProfileQuery {
  status?: 'ACTIVE' | 'HIDDEN';
  keyword?: string;
  page?: number;
  size?: number;
}

export const adminCompanyProfileApi = {
  getCompanyProfiles: async (query: AdminCompanyProfileQuery): Promise<PageResponse<ProfileResponse>> => {
    const res = await api.get<PageResponse<ProfileResponse>>('/admin/company-profiles', {
      params: {
        status: query.status,
        keyword: query.keyword || undefined,
        page: query.page ?? 0,
        size: query.size ?? 20,
      },
    });
    return res.data;
  },

  getCompanyProfile: async (id: string): Promise<ProfileResponse> => {
    const res = await api.get<ProfileResponse>(`/admin/company-profiles/${encodeURIComponent(id)}`);
    return res.data;
  },

  hideCompanyProfile: async (id: string): Promise<ProfileResponse> => {
    const res = await api.patch<ProfileResponse>(`/admin/company-profiles/${encodeURIComponent(id)}/hide`);
    return res.data;
  },

  restoreCompanyProfile: async (id: string): Promise<ProfileResponse> => {
    const res = await api.patch<ProfileResponse>(`/admin/company-profiles/${encodeURIComponent(id)}/restore`);
    return res.data;
  },

  permanentlyDeleteCompanyProfile: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<void>(`/admin/company-profiles/${encodeURIComponent(id)}`);
  },
};
