import { api, API_BASE_URL, STORAGE_KEYS, type PageResponse } from '../services/api';
import type { CompanyDocumentResponse } from '../types/domain';

export const companyDocumentApi = {
  getCompanyDocuments: (
    companyProfileId: string,
    params?: Record<string, string | number | boolean | null>,
    stepUpToken?: string,
  ) =>
    api.get<PageResponse<CompanyDocumentResponse>>(`/company-profiles/${companyProfileId}/documents`, {
      params,
      headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
    }),

  reconcileCompanyDocuments: (companyProfileId: string, stepUpToken?: string) =>
    api.post<{ companyProfileId: string; reconciled: number }>(
      `/company-profiles/${companyProfileId}/documents/reconcile`,
      {},
      { headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined },
    ),

  downloadCompanyDocument: async (
    companyProfileId: string,
    documentId: string,
    download = true,
    stepUpToken?: string,
  ): Promise<Blob> => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (stepUpToken) {
      headers.set('X-Step-Up-Token', stepUpToken);
    }

    const response = await fetch(`${API_BASE_URL}/company-profiles/${companyProfileId}/documents/${documentId}/download?download=${download}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = new Error(`Failed to download document: ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.blob();
  },
};
