import { api } from '../services/api';
import type {
  CompanyBoardMember,
  CompanyDocument,
  CompanyFinancial,
  CompanyListingInfo,
  CompanyNews,
  CompanyNewsSearchResponse,
  ListingPageResponse,
  ListingTabResponse,
} from '../types/listingData';

export interface DocumentQuery {
  year?: number | null;
  type?: number | null;
  page?: number;
  size?: number;
}

const unwrap = <T>(promise: Promise<import('../services/api').ApiResponse<T>>) =>
  promise.then((res) => res.data);

export const listingDataApi = {
  getListingInfo: (companyId: string) =>
    unwrap(api.get<ListingTabResponse<CompanyListingInfo>>(
      `/companies/${companyId}/listing-info`)),

  getBoardMembers: (companyId: string) =>
    unwrap(api.get<ListingTabResponse<CompanyBoardMember[]>>(
      `/companies/${companyId}/board-members`)),

  getFinancials: (companyId: string) =>
    unwrap(api.get<ListingTabResponse<CompanyFinancial[]>>(
      `/companies/${companyId}/financials`)),

  getNews: (companyId: string) =>
    unwrap(api.get<ListingTabResponse<CompanyNews[]>>(
      `/companies/${companyId}/news`)),

  searchCompanyNews: (companyId: string) =>
    unwrap(api.post<CompanyNewsSearchResponse>(
      `/companies/${companyId}/search-news`)),

  getDocuments: (companyId: string, query?: DocumentQuery) => {
    const params: Record<string, string | number | boolean | null | undefined> = {};
    if (query?.year != null) params.year = query.year;
    if (query?.type != null) params.type = query.type;
    if (query?.page != null) params.page = query.page;
    if (query?.size != null) params.size = query.size;
    return unwrap(api.get<ListingPageResponse<CompanyDocument>>(
      `/companies/${companyId}/documents`, { params }));
  },

  getDocumentYears: (companyId: string) =>
    unwrap(api.get<number[]>(`/companies/${companyId}/document-years`)),
};
