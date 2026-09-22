import { api, API_BASE_URL, STORAGE_KEYS, type PageResponse } from '../services/api';
import type { CompanyDocumentResponse } from '../types/domain';

export const companyDocumentApi = {
  getCompanyDocuments: (
    companyProfileId: string,
    params?: Record<string, string | number | boolean | null>,
  ) =>
    api.get<PageResponse<CompanyDocumentResponse>>(`/company-profiles/${companyProfileId}/documents`, {
      params,
    }),

  reconcileCompanyDocuments: (companyProfileId: string) =>
    api.post<{ companyProfileId: string; reconciled: number }>(
      `/company-profiles/${companyProfileId}/documents/reconcile`,
      {},
    ),

  downloadCompanyDocument: async (
    companyProfileId: string,
    documentId: string,
    download = true,
    projectId?: number | null,
  ): Promise<Blob> => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const projectQuery = projectId ? `&projectId=${projectId}` : '';
    const response = await fetch(
      `${API_BASE_URL}/company-profiles/${companyProfileId}/documents/${documentId}/download?download=${download}${projectQuery}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = new Error(`Failed to download document: ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.blob();
  },
};
