import { api, API_BASE_URL, STORAGE_KEYS, type PageResponse } from '../services/api';
import type { CompanyDocumentResponse } from '../types/domain';

export const companyDocumentApi = {
  getCompanyDocuments: (companyProfileId: string, params?: Record<string, string | number | boolean | null>) =>
    api.get<PageResponse<CompanyDocumentResponse>>(`/company-profiles/${companyProfileId}/documents`, { params }),

  reconcileCompanyDocuments: (companyProfileId: string) =>
    api.post<{ companyProfileId: string; reconciled: number }>(`/company-profiles/${companyProfileId}/documents/reconcile`, {}),

  downloadCompanyDocument: async (companyProfileId: string, documentId: string, download = true): Promise<Blob> => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/company-profiles/${companyProfileId}/documents/${documentId}/download?download=${download}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    return response.blob();
  },
};
