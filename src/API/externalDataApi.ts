import { api, API_BASE_URL, type PageResponse } from '../services/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type ExternalDataCategory = 'NEWS' | 'OPPORTUNITY' | 'RISK';

export type ArticleAiStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface CompanySentiment {
  companyId?: string | null;
  companyName?: string | null;
  sentiment?: string | null;
  confidence?: number | null;
}

export interface ExternalDataItem {
  id: string;
  title?: string | null;
  summary?: string | null;
  source?: string | null;
  sourceDomain?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  category?: ExternalDataCategory | null;
  imageUrl?: string | null;
  sentiment?: string | null;
  riskLevel?: string | null;
  opportunityLevel?: string | null;
  relatedCompanyName?: string | null;
  relatedCompanyId?: string | null;
  projectId?: number | null;
  companyProfileId?: string | null;
  createdAt?: string | null;
  crawledAt?: string | null;
  updatedAt?: string | null;
  aiStatus?: ArticleAiStatus | null;
  aiError?: string | null;
  aiSummary?: string | null;
  content?: string | null;
  summaryGeneratedAt?: string | null;
  topics?: string[] | null;
  topicLabels?: string[] | null;
  keywords?: string[] | null;
  sentimentConfidence?: number | null;
  riskReason?: string | null;
  duplicateOf?: string | null;
  duplicateGroupId?: string | null;
  mergedSourceNames?: string[] | null;
  companySentiments?: CompanySentiment[] | null;
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

export interface ArticleAiStats {
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  articlesPending: number;
  articlesCompleted: number;
  articlesFailed: number;
  totalArticles: number;
  duplicateArticles: number;
  uniqueArticles: number;
}

export interface ExternalDataQuery {
  keyword?: string;
  source?: string;
  companyName?: string;
  sentiment?: string;
  importance?: string;
  page?: number;
  size?: number;
  projectId?: number;
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
        companyName: query.companyName || undefined,
        sentiment: query.sentiment || undefined,
        importance: query.importance || undefined,
      },
    });
    return response.data ?? { content: [], pageNumber: 0, pageSize: 0, totalElements: 0, totalPages: 0, last: true };
  },

  getItemById: async (id: string): Promise<ExternalDataItem | null> => {
    try {
      const response = await api.get<ExternalDataItem>(`/external-data/news/${id}`);
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  getNewsByCompanyId: async (companyId: string, page: number = 0, size: number = 20): Promise<PageResponse<ExternalDataItem>> => {
    const response = await api.get<PageResponse<ExternalDataItem>>(`/companies/${companyId}/articles`, {
      params: { page, size },
    });
    return response.data ?? { content: [], pageNumber: 0, pageSize: 0, totalElements: 0, totalPages: 0, last: true };
  },

  triggerCompanyCrawl: async (companyId: string): Promise<string> => {
    const response = await api.post<{ message?: string }>(`/crawler/companies/${companyId}/trigger`);
    return response.data?.message || 'Company news crawler triggered.';
  },

  getCompanyCrawlStatus: async (companyId: string): Promise<{ companyId: string; status: string }> => {
    const response = await api.get<{ companyId: string; status: string }>(`/crawler/companies/${companyId}/status`);
    return response.data ?? { companyId, status: 'IDLE' };
  },

  getTrackedCompanies: async (activeOnly: boolean = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracked-companies?activeOnly=${activeOnly}`, {
        headers: { ...getAuthHeader() } as Record<string, string>,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error('Failed to fetch tracked companies');
      }
      return payload; // Returns List<TrackedCompanyResponse> directly, not wrapped in ApiResponse!
    } catch (error) {
      console.error('Error fetching tracked companies:', error);
      throw error;
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

  runApprovedProfilesFetch: async (): Promise<string> => {
    const response = await api.post<{ message?: string } | string>('/external-data/fetch-approved-profiles');
    const data = response.data as unknown;
    if (typeof data === 'string') return data;
    return (data as { message?: string } | null)?.message || 'Approved company profiles refreshed.';
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

  getArticleAiStats: async (): Promise<ArticleAiStats | null> => {
    try {
      const response = await api.get<ArticleAiStats>('/article-ai/stats');
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  runArticleAiProcessPending: async (): Promise<string> => {
    const response = await api.post<{ message?: string } | string>('/article-ai/process-pending');
    const data = response.data as unknown;
    if (typeof data === 'string') return data;
    return (data as { message?: string } | null)?.message || 'Article AI queue processed.';
  },

  runArticleAiEnqueueAll: async (): Promise<string> => {
    const response = await api.post<{ message?: string } | string>('/article-ai/enqueue-all');
    const data = response.data as unknown;
    if (typeof data === 'string') return data;
    return (data as { message?: string } | null)?.message || 'All articles enqueued for AI analysis.';
  },
};
