import { api, type PageResponse } from '../services/api';

export type ExternalDataCategory = 'NEWS' | 'OPPORTUNITY' | 'RISK';

export interface ExternalDataItem {
  id: string;
  title?: string | null;
  summary?: string | null;
  source?: string | null;
  sourceDomain?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  category?: ExternalDataCategory | null;
  sentiment?: string | null;
  riskLevel?: string | null;
  opportunityLevel?: string | null;
  relatedCompanyName?: string | null;
  relatedCompanyId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrustedSource {
  id: string;
  domain: string;
  sourceName: string;
  category?: string | null;
  active: boolean;
  addedAt?: string | null;
  addedBy?: number | null;
}

export interface TrustedSourceInput {
  domain: string;
  sourceName: string;
  category?: string;
  active?: boolean;
}

export interface CrawlRunStats {
  id: string;
  runAt?: string | null;
  trigger?: string | null;
  projectId?: string | null;
  companiesCrawled: number;
  totalFetched: number;
  saved: number;
  duplicates: number;
  skippedCooldown: number;
  sourcesFailed: number;
  rejectedUntrusted: number;
  rejectedUnknownDomain: number;
  rejectedNoCompany: number;
}

export interface CrawlRejectionSummary {
  totalRuns: number;
  rejectedUntrusted: number;
  rejectedUnknownDomain: number;
  rejectedNoCompany: number;
}

export interface ExternalDataQuery {
  keyword?: string;
  source?: string;
  page?: number;
  size?: number;
}

const CATEGORY_PATH: Record<ExternalDataCategory, string> = {
  NEWS: 'news',
  OPPORTUNITY: 'opportunities',
  RISK: 'risks',
};

export const externalDataApi = {
  getItems: async (category: ExternalDataCategory, query: ExternalDataQuery = {}): Promise<PageResponse<ExternalDataItem>> => {
    const response = await api.get<PageResponse<ExternalDataItem>>(`/external-data/${CATEGORY_PATH[category]}`, {
      params: {
        page: query.page ?? 0,
        size: query.size ?? 20,
        keyword: query.keyword || undefined,
        source: query.source || undefined,
      },
    });
    return response.data ?? { content: [], pageNumber: 0, pageSize: 0, totalElements: 0, totalPages: 0, last: true };
  },

  getCount: async (category: ExternalDataCategory): Promise<number> => {
    try {
      const page = await externalDataApi.getItems(category, { page: 0, size: 0 });
      return Number(page.totalElements ?? 0);
    } catch {
      return 0;
    }
  },

  runFetch: async (params?: { projectId?: string; forceRefresh?: boolean }): Promise<string> => {
    const response = await api.post<{ message?: string } | string>('/external-data/fetch', undefined, {
      params: {
        projectId: params?.projectId || undefined,
        forceRefresh: params?.forceRefresh ?? false,
      },
    });
    const data = response.data as unknown;
    if (typeof data === 'string') return data;
    return (data as { message?: string } | null)?.message || 'Crawl run finished.';
  },

  runAnalyze: async (params?: { projectId?: string }): Promise<string> => {
    const response = await api.post<{ message?: string } | string>('/external-data/analyze', undefined, {
      params: {
        projectId: params?.projectId || undefined,
      },
    });
    const data = response.data as unknown;
    if (typeof data === 'string') return data;
    return (data as { message?: string } | null)?.message || 'Analysis run finished.';
  },

  listTrustedSources: async (): Promise<TrustedSource[]> => {
    const response = await api.get<TrustedSource[]>('/external-data/trusted-sources');
    return Array.isArray(response.data) ? response.data : [];
  },

  addTrustedSource: async (input: TrustedSourceInput): Promise<TrustedSource> => {
    const response = await api.post<TrustedSource>('/external-data/trusted-sources', input);
    return response.data;
  },

  updateTrustedSource: async (id: string, input: TrustedSourceInput): Promise<TrustedSource> => {
    const response = await api.put<TrustedSource>(`/external-data/trusted-sources/${id}`, input);
    return response.data;
  },

  setTrustedSourceActive: async (id: string, active: boolean): Promise<TrustedSource> => {
    const response = await api.patch<TrustedSource>(`/external-data/trusted-sources/${id}/active`, undefined, {
      params: { active },
    });
    return response.data;
  },

  deleteTrustedSource: async (id: string): Promise<void> => {
    await api.delete<void>(`/external-data/trusted-sources/${id}`);
  },

  getCrawlRuns: async (): Promise<CrawlRunStats[]> => {
    const response = await api.get<CrawlRunStats[]>('/external-data/stats/runs');
    return Array.isArray(response.data) ? response.data : [];
  },

  getRejectionSummary: async (): Promise<CrawlRejectionSummary> => {
    const response = await api.get<CrawlRejectionSummary>('/external-data/stats/rejections');
    return (
      response.data ?? { totalRuns: 0, rejectedUntrusted: 0, rejectedUnknownDomain: 0, rejectedNoCompany: 0 }
    );
  },
};
