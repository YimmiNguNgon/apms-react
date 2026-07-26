import { api } from '../services/api';

export class CrawlerNotAvailableError extends Error {
  constructor() {
    super('Crawler backend not available');
    this.name = 'CrawlerNotAvailableError';
  }
}

function isAxios404(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: unknown }).response === 'object' &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}

export interface CompanyMatch {
  companyId?: string | null;
  companyName?: string | null;
  confidenceScore?: number | null;
  matchReason?: string | null;
  matchType?: string | null;
}

export interface CrawledArticle {
  id: string;
  title?: string | null;
  summary?: string | null;
  aiSummary?: string | null;
  content?: string | null;
  url?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  thumbnail?: string | null;
  publishedDate?: string | null;
  language?: string | null;
  sentiment?: string | null;
  informationType?: string | null;
  priorityLevel?: string | null;
  priorityScore?: number | null;
  priorityReason?: string | null;
  matchedCompanies?: CompanyMatch[] | null;
  aiProcessingStatus?: string | null;
  rawAiOutput?: string | null;
  aiProcessingTimeMs?: number | null;
  aiErrorMessage?: string | null;
  crawledAt?: string | null;
  processedAt?: string | null;
  publishedAt?: string | null;
}

export interface TrackedCompany {
  id: string;
  companyName: string;
  aliases?: string[];
  industry?: string | null;
  isActive?: boolean;
}

export interface CrawlerStats {
  totalArticles?: number;
  pendingArticles?: number;
  matchedArticles?: number;
  discardedArticles?: number;
  publishedArticles?: number;
  errorArticles?: number;
  trackedCompanies?: number;
  configuredFeeds?: number;
  lastUpdatedAt?: string | null;
}

export interface CrawlerPage<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  pageNumber?: number;
  pageSize?: number;
  last?: boolean;
  first?: boolean;
}

export interface ArticleQuery {
  page?: number;
  size?: number;
  status?: string;
  company?: string;
  source?: string;
  hot?: boolean;
}

export const crawlerApi = {
  getTrackedCompanies: async (): Promise<TrackedCompany[]> => {
    try {
      const response = await api.get<TrackedCompany[]>('/tracked-companies', {
        params: { activeOnly: true },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      if (isAxios404(err)) throw new CrawlerNotAvailableError();
      return [];
    }
  },

  getArticles: async (query: ArticleQuery): Promise<CrawlerPage<CrawledArticle>> => {
    try {
      const response = await api.get<CrawlerPage<CrawledArticle>>('/crawler/articles', {
        params: { ...query },
      });
      return response.data;
    } catch (err) {
      if (isAxios404(err)) throw new CrawlerNotAvailableError();
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  getArticleById: async (articleId: string): Promise<CrawledArticle | null> => {
    try {
      const response = await api.get<CrawledArticle>(`/crawler/articles/${articleId}`);
      return response.data;
    } catch (err) {
      if (isAxios404(err)) throw new CrawlerNotAvailableError();
      return null;
    }
  },

  getStats: async (): Promise<CrawlerStats | null> => {
    try {
      const response = await api.get<CrawlerStats>('/crawler/stats');
      return response.data;
    } catch (err) {
      if (isAxios404(err)) throw new CrawlerNotAvailableError();
      return null;
    }
  },

};
