import { api } from '../services/api';
import { externalDataApi } from './externalDataApi';
import type { CompanyProfileFinancialReport, ProfileResponse } from '../types/domain';
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

export const OWNER_COMPANY_ID = '6a31a0000000000000000001';

interface LeadershipLikeMember {
  name?: string | null;
  fullName?: string | null;
  position?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  profileUrl?: string | null;
  notes?: string | null;
  education?: string | null;
  researchedAt?: string | null;
  crawledAt?: string | null;
}

type ProfileWithLeadershipFallbacks = ProfileResponse & {
  boardMembers?: LeadershipLikeMember[];
  leadership?: LeadershipLikeMember[];
};

const safeApiGet = <T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T | null> => api.get<T>(url, { params }).then((res) => res.data ?? null).catch(() => null);

const fetchProfile = async (companyId: string): Promise<ProfileResponse | null> => {
  return safeApiGet<ProfileResponse>(`/profiles/${companyId}`);
};

export const updateProfileVisibility = async (companyId: string, visibility: 'PUBLISHED' | 'HIDDEN'): Promise<ProfileResponse> => {
  const response = await api.patch<ProfileResponse>(`/company-profiles/${companyId}/visibility`, { visibility });
  return response.data;
};

interface FinancialValue { code?: string; value?: number | null; }
interface FinancialPeriod { time?: string; data?: FinancialValue[]; }
interface FinancialRow { code?: string; name?: string; }
interface FinancialDocument { unit?: string | null; templace?: FinancialRow[]; data?: Array<{ data?: FinancialPeriod[] }>; }

const parseFinancialDocument = (itemsJson?: string | null): FinancialDocument | null => {
  try { return itemsJson ? JSON.parse(itemsJson) as FinancialDocument : null; } catch { return null; }
};

/**
 * Merges the Owner's per-year financial reports (embedded on the CompanyProfile)
 * into one CompanyFinancial per report type, with periods sorted ascending by year.
 * This keeps the shared FinancialsTab view/table unchanged while the Owner and
 * SYSTEM_ADMIN both read from the same data source.
 */
const buildFinancialReportsFromProfile = (profile: ProfileResponse, companyId: string): CompanyFinancial[] => {
  const reports = profile.financialReports ?? [];
  if (reports.length === 0) return [];

  const byType = new Map<string, CompanyProfileFinancialReport[]>();
  reports.forEach((report) => {
    const key = (report.reportType ?? 'OTHER').toUpperCase();
    byType.set(key, [...(byType.get(key) ?? []), report]);
  });

  let index = 0;
  const merged: CompanyFinancial[] = [];
  for (const [reportType, group] of byType.entries()) {
    group.sort((a, b) => (a.reportYear ?? 0) - (b.reportYear ?? 0));
    const docs = group
      .map((report) => parseFinancialDocument(report.itemsJson))
      .filter((doc): doc is FinancialDocument => doc !== null);

    const templace = new Map<string, FinancialRow>();
    const periods = new Map<string, FinancialPeriod>();
    docs.forEach((doc) => {
      doc.templace?.forEach((row) => { if (row.code) templace.set(row.code, row); });
      doc.data?.[0]?.data?.forEach((period) => {
        if (period.time && !periods.has(period.time)) periods.set(period.time, period);
      });
    });

    if (templace.size === 0 || periods.size === 0) continue;

    const latest = group[group.length - 1];
    const itemsJson = JSON.stringify({
      unit: latest ? (parseFinancialDocument(latest.itemsJson)?.unit ?? null) : null,
      templace: [...templace.values()],
      data: [{
        code: reportType,
        name: reportType,
        data: [...periods.values()].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
      }],
    });

    merged.push({
      id: ++index,
      companyId,
      reportType,
      periodType: latest?.periodType ?? 'YEAR',
      reportYear: latest?.reportYear ?? null,
      reportPeriod: latest?.reportPeriod ?? null,
      itemsJson,
      sourceUrl: latest?.sourceUrl ?? null,
      crawledAt: profile.metadata?.updatedAt ?? null,
    });
  }
  return merged;
};

const normalizeText = (value?: string | null): string =>
  (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const classifyBoardGroup = (position?: string | null, role?: string | null): number => {
  const value = normalizeText(`${position ?? ''} ${role ?? ''}`);
  if (value.includes('kiem soat') || value.includes('kiem toan') || value.includes('shareholder')) return 3;
  if (value.includes('giam doc') || value.includes('ceo') || value.includes('cfo') || value.includes('cto') || value.includes('coo')) return 2;
  return 1;
};

const collectLeadershipMembers = (profile: ProfileResponse | null): LeadershipLikeMember[] => {
  if (!profile) return [];

  const fallbackProfile = profile as ProfileWithLeadershipFallbacks;
  const rawMembers = [
    ...(fallbackProfile.companyMembers ?? []),
    ...(fallbackProfile.boardMembers ?? []),
    ...(fallbackProfile.leadership ?? []),
  ];

  const seen = new Set<string>();
  return rawMembers.filter((member) => {
    const name = member.name ?? member.fullName ?? '';
    const position = member.position ?? member.role ?? '';
    const key = `${normalizeText(name)}|${normalizeText(position)}`;
    if (key === '|' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    const profile = await fetchProfile(companyId);
    const members = collectLeadershipMembers(profile).map((member, index) => ({
      id: index + 1,
      companyId,
      name: member.name ?? member.fullName ?? null,
      position: member.position ?? member.role ?? null,
      positionGroup: classifyBoardGroup(member.position, member.role),
      personType: member.role ?? null,
      education: member.education ?? member.notes ?? (member.email ? `Email: ${member.email}` : null),
      imageUrl: member.imageUrl ?? null,
      profileUrl: member.profileUrl ?? member.sourceUrl ?? null,
      crawledAt: member.crawledAt ?? member.researchedAt ?? null,
    }));

    return {
      hasData: members.length > 0,
      crawledAt: profile?.metadata?.updatedAt ?? null,
      data: members,
    };
  },

  getOwnershipStructure: async (companyId: string): Promise<ListingTabResponse<CompanyOwnership[]>> => {
    const profile = await fetchProfile(companyId);
    return { hasData: false, crawledAt: profile?.metadata?.updatedAt ?? null, data: [] };
  },

  getFinancials: async (companyId: string): Promise<ListingTabResponse<CompanyFinancial[]>> => {
    const profile = await fetchProfile(companyId);
    if (!profile) return { hasData: false, crawledAt: null, data: [] };

    const perYearReports = buildFinancialReportsFromProfile(profile, companyId);
    if (perYearReports.length > 0) {
      return { hasData: true, crawledAt: profile.metadata?.updatedAt ?? null, data: perYearReports };
    }

    const financial = profile.financial;
    const values = [
      { code: 'REVENUE', name: 'Revenue', value: financial?.revenue },
      { code: 'REVENUE_GROWTH', name: 'Revenue growth (%)', value: financial?.revenueGrowth },
      { code: 'PROFIT_MARGIN', name: 'Profit margin (%)', value: financial?.profitMargin },
      { code: 'DEBT_RATIO', name: 'Debt ratio', value: financial?.debtRatio },
      { code: 'CHARTER_CAPITAL', name: 'Charter capital', value: financial?.charterCapital ?? profile.financials?.charterCapital },
    ].map(v => ({ ...v, value: typeof v.value === 'string' ? parseFloat(v.value) : v.value }))
     .filter((value): value is { code: string; name: string; value: number } => typeof value.value === 'number' && !isNaN(value.value));

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

    const response = await externalDataApi.getNewsByCompanyId(companyId, 0, 100);
    const news = (response.content || []).map((article, index) => ({
      id: Number(article.id) || index + 1,
      companyId,
      title: article.title ?? null,
      summary: article.aiSummary ?? article.summary ?? null,
      category: article.category ?? 'NEWS',
      sourceName: article.source ?? article.sourceDomain ?? null,
      sourceUrl: article.url ?? null,
      imageUrl: article.imageUrl ?? null,
      publishedAt: article.publishedAt ?? article.createdAt ?? null,
      crawledAt: article.crawledAt ?? article.createdAt ?? null,
    }));

    return { hasData: news.length > 0, crawledAt: news[0]?.crawledAt ?? null, data: news };
  },

  searchCompanyNews: async (): Promise<CompanyNewsSearchResponse> => {
    throw new Error('Backend does not provide company news search on this screen.');
  },

  getDocuments: async (companyId: string, query?: DocumentQuery): Promise<ListingPageResponse<CompanyDocument>> => {
    const page = query?.page ?? 0;
    const size = query?.size ?? 20;
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

  getReportYears: async (companyId: string): Promise<number[]> => {
    const profile = await fetchProfile(companyId);
    if (!profile) return [];
    
    const years = new Set<number>();
    const updatedAtYear = Number(profile.metadata?.updatedAt?.slice(0, 4));
    if (updatedAtYear && !isNaN(updatedAtYear)) years.add(updatedAtYear);
    
    return Array.from(years).sort((a, b) => b - a);
  },

  /**
   * SYSTEM_ADMIN upserts one financial statement (reportType + reportYear) of the
   * Owner Organization. The backend resolves the Owner Company itself (anti-IDOR).
   */
  upsertOwnerFinancialReport: async (payload: {
    reportType: string;
    reportYear: number;
    periodType?: string;
    reportPeriod?: string;
    itemsJson: string;
    sourceUrl?: string;
  }): Promise<ProfileResponse> => {
    const res = await api.put<ProfileResponse>('/admin/owner-company-profile/financials', payload);
    if (res?.success && res.data) return res.data;
    throw new Error('Không thể lưu báo cáo tài chính.');
  },

  /**
   * SYSTEM_ADMIN deletes one financial statement (reportType + reportYear) of the
   * Owner Organization. The backend resolves the Owner Company itself (anti-IDOR).
   */
  deleteOwnerFinancialReport: async (reportType: string, reportYear: number): Promise<ProfileResponse> => {
    const res = await api.delete<ProfileResponse>(`/admin/owner-company-profile/financials/${encodeURIComponent(reportType)}/${reportYear}`);
    if (res?.success && res.data) return res.data;
    throw new Error('Không thể xóa báo cáo tài chính.');
  },
};
