import { api, API_BASE_URL, STORAGE_KEYS } from '../services/api';
import type {
  StepUpChallengeResponse,
  StepUpVerifyResponse,
  CompanyIntelligenceArticleResponse,
} from '../types/domain';
import type { PageResponse } from '../services/api';

export const confidentialNewsApi = {
  /** Request an OTP challenge for step-up authentication */
  requestChallenge: (purpose: string = 'CONFIDENTIAL_COMPANY_NEWS') =>
    api.post<StepUpChallengeResponse>('/security/step-up/challenges', { purpose }),

  /** Verify OTP and receive a step-up token */
  verifyOtp: (challengeId: number, otp: string) =>
    api.post<StepUpVerifyResponse>(`/security/step-up/challenges/${challengeId}/verify`, { otp }),

  /** List approved confidential articles (requires step-up token) */
  getArticles: async (
    companyProfileId: string,
    stepUpToken: string,
    page: number = 0,
    size: number = 20,
  ): Promise<PageResponse<CompanyIntelligenceArticleResponse>> => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    const res = await fetch(
      `${API_BASE_URL}/company-profiles/${companyProfileId}/confidential-news?page=${page}&size=${size}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Step-Up-Token': stepUpToken,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const error: any = new Error(body?.message || `Failed to fetch confidential news (${res.status})`);
      error.status = res.status;
      error.code = body?.code || body?.message;
      throw error;
    }
    const json = await res.json();
    return json.data as PageResponse<CompanyIntelligenceArticleResponse>;
  },

  /** Get single confidential article (requires step-up token) */
  getArticle: async (
    companyProfileId: string,
    articleId: string,
    stepUpToken: string,
  ): Promise<CompanyIntelligenceArticleResponse> => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    const res = await fetch(
      `${API_BASE_URL}/company-profiles/${companyProfileId}/confidential-news/${articleId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Step-Up-Token': stepUpToken,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const error: any = new Error(body?.message || `Failed to fetch article (${res.status})`);
      error.status = res.status;
      error.code = body?.code || body?.message;
      throw error;
    }
    const json = await res.json();
    return json.data as CompanyIntelligenceArticleResponse;
  },
};
