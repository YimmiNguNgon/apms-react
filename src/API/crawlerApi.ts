import { api } from '../services/api';

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
  getTrackedCompanies: async () => {
    const response = await api.get<TrackedCompany[]>('/tracked-companies', {
      params: { activeOnly: true },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  getArticles: async (query: ArticleQuery) => {
    const response = await api.get<CrawlerPage<CrawledArticle>>('/crawler/articles', {
      params: { ...query },
    });
    return response.data;
  },

  getArticleById: async (articleId: string) => {
    const response = await api.get<CrawledArticle>(`/crawler/articles/${articleId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<CrawlerStats>('/crawler/stats');
    return response.data;
  },

};
