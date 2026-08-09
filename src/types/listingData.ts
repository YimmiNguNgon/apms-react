export interface ListingTabResponse<T> {
  hasData: boolean;
  crawledAt: string | null;
  data: T | null;
}

export interface ListingPageResponse<T> {
  hasData: boolean;
  crawledAt: string | null;
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface CompanyListingInfo {
  id?: number;
  companyId?: string;
  stockTicker?: string | null;
  stockExchange?: string | null;
  companyName?: string | null;
  englishName?: string | null;
  legalRepresentative?: string | null;
  businessLine?: string | null;
  address?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  charterCapital?: number | null;
  auditorCompany?: string | null;
  legalAdvisor?: string | null;
  establishedDate?: string | null;
  listedDate?: string | null;
  introduction?: string | null;
  sourceUrl?: string | null;
  crawledAt?: string | null;
}

export interface CompanyBoardMember {
  id?: number;
  companyId?: string;
  name?: string | null;
  position?: string | null;
  positionGroup?: number | null;
  personType?: string | null;
  education?: string | null;
  profileUrl?: string | null;
  imageUrl?: string | null;
  crawledAt?: string | null;
}

export interface CompanyOwnership {
  id?: number;
  companyId?: string;
  shareholderName?: string | null;
  holderName?: string | null;
  representedBy?: string | null;
  ownershipPercentage?: number | null;
  ownershipPercent?: number | null;
  ownershipType?: string | null;
  sourceUrl?: string | null;
  crawledAt?: string | null;
}

export interface CompanyFinancial {
  id?: number;
  companyId?: string;
  reportType?: string | null;
  periodType?: string | null;
  reportYear?: number | null;
  reportPeriod?: string | null;
  itemsJson?: string | null;
  sourceUrl?: string | null;
  crawledAt?: string | null;
}

export interface CompanyNews {
  id?: number;
  companyId?: string;
  newsType?: number | null;
  category?: string | null;
  sourceName?: string | null;
  title?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  crawledAt?: string | null;
}

export type CompanyNewsSearchStatus = 'SAVED_NEW' | 'ALREADY_EXISTED' | 'REJECTED';
export type CompanyNewsSearchRejection = 'UNTRUSTED_DOMAIN' | 'UNKNOWN_DOMAIN' | 'NO_COMPANY_MENTION';

export interface CompanyNewsSearchItem {
  id?: string | null;
  title?: string | null;
  summary?: string | null;
  source?: string | null;
  sourceDomain?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  category?: string | null;
  relatedCompanyId?: string | null;
  relatedCompanyName?: string | null;
  lastCheckedAt?: string | null;
}

export interface CompanyNewsSearchResult {
  item: CompanyNewsSearchItem;
  status: CompanyNewsSearchStatus;
  rejection?: CompanyNewsSearchRejection | null;
}

export interface CompanyNewsSearchResponse {
  companyId: string;
  companyName: string;
  searchedAt: string;
  savedNew: number;
  alreadyExisting: number;
  rejected: number;
  results: CompanyNewsSearchResult[];
}

export interface CompanyDocument {
  id?: number;
  companyId?: string;
  docType?: number | null | string;
  docTitle?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  reportYear?: number | null;
  publishedAt?: string | null;
  crawledAt?: string | null;
}
