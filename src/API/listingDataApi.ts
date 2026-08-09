import { api } from '../services/api';
import { externalDataApi } from './externalDataApi';
import type { ProfileResponse } from '../types/domain';
import type {
  CompanyBoardMember,
  CompanyDocument,
  CompanyFinancial,
  CompanyListingInfo,
  CompanyNews,
  CompanyOwnership,
  CompanyNewsSearchResponse,
  ListingPageResponse,
  ListingTabResponse,
} from '../types/listingData';

export interface DocumentQuery {
  year?: number | null;
  type?: string | number | null;
  page?: number;
  size?: number;
}

interface ConfidentialNewsRecord {
  id?: string;
  title?: string;
  summary?: string;
  content?: string;
  sourceUrl?: string;
  externalImageUrl?: string;
  publishedAt?: string;
  createdAt?: string;
}

interface ContractRecord {
  id?: number;
  contractTitle?: string;
  contractNumber?: string;
  contractType?: string;
  signedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ContractPage {
  content?: ContractRecord[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
}

interface ConfidentialNewsPage {
  content?: ConfidentialNewsRecord[];
}

interface OwnerProfileSnapshot {
  companyProfileId: string;
  summary?: string | null;
  fetchedAt?: string | null;
  boardMembers?: Array<{ fullName?: string; position?: string; role?: string; notes?: string; imageUrl?: string; sourceUrl?: string; researchedAt?: string }>;
  ownership?: Array<{ holderName?: string; representedBy?: string; ownershipPercent?: number; ownershipType?: string; sourceUrl?: string }>;
  financialReports?: Array<{ reportType?: string; periodType?: string; reportYear?: number; reportPeriod?: string; itemsJson?: string; sourceUrl?: string }>;
  news?: Array<{ title?: string; summary?: string; category?: string; sourceName?: string; sourceUrl?: string; publishedAt?: string }>;
  documents?: Array<{ docType?: string; docTitle?: string; fileUrl?: string; reportYear?: number; reportPeriod?: string; publishedAt?: string }>;
}

const OWNER_COMPANY_ID = '6a31a0000000000000000001';

const safeApiGet = <T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T | null> => api.get<T>(url, { params }).then((res) => res.data ?? null).catch(() => null);

const fetchProfile = async (companyId: string): Promise<ProfileResponse | null> => {
  const profile = await safeApiGet<ProfileResponse>(`/company-profiles/${companyId}`)
    ?? await safeApiGet<ProfileResponse>(`/profiles/${companyId}`);

  if (profile || companyId !== '6a31a0000000000000000001') return profile;
  return safeApiGet<ProfileResponse>('/owner/company-profile');
};

const fetchOwnerSnapshot = async (companyId: string): Promise<OwnerProfileSnapshot | null> => {
  if (!companyId || companyId.toLowerCase() !== OWNER_COMPANY_ID.toLowerCase()) return null;
  return safeApiGet<OwnerProfileSnapshot>('/owner/company-profile/snapshot');
};

const classifyBoardGroup = (position?: string, role?: string): number => {
  const value = `${position ?? ''} ${role ?? ''}`.toLowerCase();
  if (value.includes('kiem soat') || value.includes('kiem toan') || value.includes('shareholder')) return 3;
  if (value.includes('giam doc') || value.includes('ceo') || value.includes('cfo') || value.includes('cto') || value.includes('coo')) return 2;
  return 1;
};

export const listingDataApi = {
  getListingInfo: async (companyId: string): Promise<ListingTabResponse<CompanyListingInfo>> => {
    const profile = await fetchProfile(companyId);
    if (!profile) return { hasData: false, crawledAt: null, data: null };

    return {
      hasData: true,
      crawledAt: profile.metadata?.updatedAt ?? null,
      data: {
        companyId,
        stockTicker: profile.stockTicker ?? profile.identity?.stockTicker ?? null,
        stockExchange: profile.stockExchange ?? profile.identity?.stockExchange ?? null,
        companyName: profile.identity?.legalName ?? profile.identity?.tradeName ?? null,
        businessLine: profile.business?.industries?.join(', ') ?? null,
        charterCapital: profile.financial?.charterCapital ?? profile.financials?.charterCapital ?? null,
        website: profile.contact?.website ?? null,
        email: profile.contact?.emails?.[0] ?? null,
        phone: profile.contact?.phones?.[0] ?? null,
        address: profile.contact?.addresses?.[0]?.fullAddress ?? null,
      },
    };
  },

  getBoardMembers: async (companyId: string): Promise<ListingTabResponse<CompanyBoardMember[]>> => {
    const snapshot = await fetchOwnerSnapshot(companyId);
    if (snapshot) {
      const members = (snapshot.boardMembers ?? []).map((member, index) => ({
        id: index + 1,
        companyId,
        name: member.fullName ?? null,
        position: member.position ?? null,
        positionGroup: classifyBoardGroup(member.position),
        imageUrl: member.imageUrl ?? null,
        profileUrl: member.sourceUrl ?? null,
        education: member.notes ?? null,
        personType: member.role ?? member.notes ?? null,
        crawledAt: member.researchedAt ?? snapshot.fetchedAt ?? null,
      }));
      return { hasData: members.length > 0, crawledAt: snapshot.fetchedAt ?? null, data: members };
    }
    const profile = await fetchProfile(companyId);
    const members = (profile?.companyMembers ?? []).map((member, index) => ({
      id: index + 1,
      companyId,
      name: member.name ?? member.fullName ?? null,
      position: member.position ?? member.role ?? null,
      positionGroup: classifyBoardGroup(member.position, member.role),
      personType: member.role ?? null,
      education: member.notes ?? (member.email ? `Email: ${member.email}` : null),
      imageUrl: member.imageUrl ?? null,
      profileUrl: member.sourceUrl ?? null,
      crawledAt: member.researchedAt ?? null,
    }));

    return {
      hasData: members.length > 0,
      crawledAt: profile?.metadata?.updatedAt ?? null,
      data: members,
    };
  },

  getOwnershipStructure: async (companyId: string): Promise<ListingTabResponse<CompanyOwnership[]>> => {
    const snapshot = await fetchOwnerSnapshot(companyId);
    const ownership = (snapshot?.ownership ?? []).map((item, index) => ({
      id: index + 1, companyId, holderName: item.holderName ?? null, representedBy: item.representedBy ?? null,
      ownershipPercent: item.ownershipPercent ?? null, ownershipType: item.ownershipType ?? null,
      sourceUrl: item.sourceUrl ?? null, crawledAt: snapshot?.fetchedAt ?? null,
    }));
    return { hasData: ownership.length > 0, crawledAt: snapshot?.fetchedAt ?? null, data: ownership };
  },

  getFinancials: async (companyId: string): Promise<ListingTabResponse<CompanyFinancial[]>> => {
    const snapshot = await fetchOwnerSnapshot(companyId);
    if (snapshot) {
      const reports = (snapshot.financialReports ?? []).map((report, index) => ({
        id: index + 1, companyId, reportType: report.reportType ?? null, periodType: report.periodType ?? null,
        reportYear: report.reportYear ?? null, reportPeriod: report.reportPeriod ?? null,
        itemsJson: report.itemsJson ?? null, sourceUrl: report.sourceUrl ?? null, crawledAt: snapshot.fetchedAt ?? null,
      }));
      return { hasData: reports.length > 0, crawledAt: snapshot.fetchedAt ?? null, data: reports };
    }
    const profile = await fetchProfile(companyId);
    if (!profile) return { hasData: false, crawledAt: null, data: [] };

    const financial = profile.financial;
    const values = [
      { code: 'REVENUE', name: 'Revenue', value: financial?.revenue },
      { code: 'REVENUE_GROWTH', name: 'Revenue growth (%)', value: financial?.revenueGrowth },
      { code: 'PROFIT_MARGIN', name: 'Profit margin (%)', value: financial?.profitMargin },
      { code: 'DEBT_RATIO', name: 'Debt ratio', value: financial?.debtRatio },
      { code: 'CHARTER_CAPITAL', name: 'Charter capital', value: financial?.charterCapital ?? profile.financials?.charterCapital },
    ].filter((value): value is { code: string; name: string; value: number } => typeof value.value === 'number');

    if (values.length === 0) {
      return { hasData: false, crawledAt: profile.metadata?.updatedAt ?? null, data: [] };
    }

    const reportYear = Number(profile.metadata?.updatedAt?.slice(0, 4)) || undefined;
    const report = {
      unit: financial?.revenueCurrency ?? null,
      templace: values.map(({ code, name }) => ({ code, name, lever: 1 })),
      data: [{
        code: 'PROFILE_FINANCIALS',
        name: 'Profile financial information',
        data: [{
          time: reportYear ? String(reportYear) : 'Current',
          data: values.map(({ code, value }) => ({ code, value })),
        }],
      }],
    };

    return {
      hasData: true,
      crawledAt: profile.metadata?.updatedAt ?? null,
      data: [{
        id: 1,
        companyId,
        reportYear,
        reportType: 'CHISO',
        periodType: 'YEAR',
        itemsJson: JSON.stringify(report),
        crawledAt: profile.metadata?.updatedAt ?? null,
      }],
    };
  },

  getNews: async (companyId: string): Promise<ListingTabResponse<CompanyNews[]>> => {
    const snapshot = await fetchOwnerSnapshot(companyId);
    if (snapshot) {
      const news = (snapshot.news ?? []).map((item, index) => ({
        id: index + 1, companyId, title: item.title ?? null, summary: item.summary ?? null,
        category: item.category ?? null, sourceName: item.sourceName ?? null, sourceUrl: item.sourceUrl ?? null,
        publishedAt: item.publishedAt ?? null, crawledAt: snapshot.fetchedAt ?? null,
      }));
      return { hasData: news.length > 0, crawledAt: snapshot.fetchedAt ?? null, data: news };
    }
    const response = await externalDataApi.getItems('NEWS', { page: 0, size: 100 });
    const news = response.content
      .filter((article) => article.companyProfileId === companyId || article.relatedCompanyId === companyId)
      .map((article, index) => ({
      id: Number(article.id) || index + 1,
      companyId,
      title: article.title ?? null,
      summary: article.aiSummary ?? article.summary ?? null,
      category: article.category ?? 'NEWS',
      sourceName: article.source ?? article.sourceDomain ?? null,
      sourceUrl: article.url ?? null,
      imageUrl: null,
      publishedAt: article.publishedAt ?? article.createdAt ?? null,
      crawledAt: article.updatedAt ?? article.createdAt ?? null,
    }));

    return { hasData: news.length > 0, crawledAt: news[0]?.crawledAt ?? null, data: news };
  },

  searchCompanyNews: async (): Promise<CompanyNewsSearchResponse> => {
    throw new Error('Backend does not provide company news search on this screen.');
  },

  getDocuments: async (companyId: string, query?: DocumentQuery): Promise<ListingPageResponse<CompanyDocument>> => {
    const page = query?.page ?? 0;
    const size = query?.size ?? 20;
    const snapshot = await fetchOwnerSnapshot(companyId);
    if (snapshot) {
      const content = (snapshot.documents ?? [])
        .map((item, index) => ({ id: index + 1, companyId, docType: item.docType ?? null, docTitle: item.docTitle ?? null,
          fileUrl: item.fileUrl ?? null, reportYear: item.reportYear ?? null, publishedAt: item.publishedAt ?? null, crawledAt: snapshot.fetchedAt ?? null }))
        .filter((document) => !query?.year || document.reportYear === query.year)
        .filter((document) => !query?.type || document.docType === query.type);
      return { hasData: content.length > 0, crawledAt: snapshot.fetchedAt ?? null, content, pageNumber: page, pageSize: size, totalElements: content.length, totalPages: content.length ? 1 : 0 };
    }
    const contracts = await safeApiGet<ContractPage>(`/company-profiles/${companyId}/partner-contracts`, { page, size });
    const profile = await fetchProfile(companyId);
    const listingDocument = profile?.stockTicker && profile?.stockExchange && profile.stockExchange !== 'NONE'
      ? [{
          id: 0,
          companyId,
          docTitle: `Tài liệu công bố thông tin ${profile.stockTicker} (${profile.stockExchange})`,
          docType: 'Công bố thông tin',
          fileUrl: `https://cafef.vn/du-lieu/${profile.stockExchange.toLowerCase()}/${profile.stockTicker.toLowerCase()}-tai-lieu.chn`,
          reportYear: new Date().getFullYear(),
          publishedAt: profile.metadata?.updatedAt ?? null,
          crawledAt: profile.metadata?.updatedAt ?? null,
        }] : [];
    const content = [...listingDocument, ...(contracts?.content ?? [])
      .map((contract) => ({
        id: contract.id,
        companyId,
        docTitle: contract.contractTitle ?? contract.contractNumber ?? null,
        docType: contract.contractType ?? 'Contract',
        fileUrl: null,
        publishedAt: contract.signedDate ?? contract.updatedAt ?? contract.createdAt ?? null,
        crawledAt: null,
      }))]
      .filter((document) => !query?.year || document.publishedAt?.startsWith(String(query.year)))
      .filter((document) => !query?.type || document.docType === query.type);

    return {
      hasData: content.length > 0,
      crawledAt: null,
      content,
      pageNumber: contracts?.pageNumber ?? page,
      pageSize: contracts?.pageSize ?? size,
      totalElements: contracts?.totalElements ?? content.length,
      totalPages: contracts?.totalPages ?? (content.length > 0 ? 1 : 0),
    };
  },

  getDocumentYears: async (companyId: string): Promise<number[]> => {
    const snapshot = await fetchOwnerSnapshot(companyId);
    if (snapshot) return [...new Set((snapshot.documents ?? []).map((item) => item.reportYear).filter((year): year is number => typeof year === 'number'))].sort((a, b) => b - a);
    return [];
  },
};
