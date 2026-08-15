/* eslint-disable @typescript-eslint/no-explicit-any */
// Partner Ecosystem — IBM Carbon Enterprise Redesign
// Business logic: all API endpoints preserved from EcosystemOverview.tsx
// Layout: Page Header → KPI Cards → Charts → AI Rec → FilterBar → DataTable → Drawer
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { externalDataApi, type ExternalDataItem } from '../API/externalDataApi';
import type { PageResponse } from '../services/api';
import type { ProfileResponse, ProjectResponse } from '../types/domain';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';

import { ExternalLink } from 'lucide-react';

// ─── Domain types ────────────────────────────────────────────────────────────
export interface GraphCompany {
  companyId: string;
  name: string;
  industry?: string;
  createdAt?: string;
  updatedAt?: string;
  relationships?: Array<{ relationshipType: string; targetCompanyId: string }>;
}

export interface ScoreSnapshot {
  scoreSnapshotId: number;
  companyId: string;
  companyName?: string;
  partnerFitScore?: number | null;
  competitionLevel?: number | null;
  riskLevel?: number | null;
  totalScore?: number | null;
  overallScore?: number | null;
  evaluatedRole?: string | null;
  generatedBy?: string | null;
  createdAt?: string;
}

// ─── Enriched row for the table ──────────────────────────────────────────────
interface PartnerRow {
  id: string;
  name: string;
  industry: string;
  relationship: string;
  status: string;
  projects: ProjectResponse[];
  latestActivity: { title: string; date: string } | null;
  lastUpdated: string | null;
  importance: 'Cao' | 'Trung bình' | 'Thấp' | 'Chưa có dữ liệu';
}

type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
type ImpactTrend = 'UP' | 'STABLE' | 'DOWN' | null;

interface EcosystemSignal {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  category: string;
  date: string | null;
  businessImpact: ImpactLevel;
  source: string | null;
  sourceUrl: string | null;
}

interface CompanyIntelligenceSummary {
  businessImpact: ImpactLevel;
  strategicRelevance: ImpactLevel;
  impactTrend: ImpactTrend;
  whyItMatters: string | null;
  lastUpdated: string | null;
  signals: EcosystemSignal[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanText(value?: string | null): string {
  if (!value) return '';
  const decoded = value
    .replace(/â€¢/g, '•')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€™/g, '’')
    .replace(/Â\s/g, ' ');
  if (typeof DOMParser === 'undefined') return decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const document = new DOMParser().parseFromString(decoded, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed').forEach((element) => element.remove());
  return (document.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function formatDate(value?: string | null): string {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleDateString('vi-VN');
}

function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeSource(value?: string | null, fallbackUrl?: string | null): { name: string | null; url: string | null } {
  if (!value) return { name: null, url: safeUrl(fallbackUrl) };
  const document = new DOMParser().parseFromString(value, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed, form').forEach((element) => element.remove());
  const publisher = cleanText(document.querySelector('font')?.textContent || document.querySelector('[data-source]')?.textContent);
  const anchorUrl = document.querySelector('a[href]')?.getAttribute('href');
  return { name: publisher || cleanText(value) || null, url: safeUrl(fallbackUrl) || safeUrl(anchorUrl) };
}

function normalizeImpact(value?: unknown): ImpactLevel {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH' || normalized === 'CRITICAL' ? normalized : null;
}

function normalizeTrend(value?: unknown): ImpactTrend {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  if (normalized === 'INCREASING' || normalized === 'UP') return 'UP';
  if (normalized === 'DECREASING' || normalized === 'DOWN') return 'DOWN';
  return normalized === 'STABLE' ? 'STABLE' : null;
}

function displayImpact(value: ImpactLevel): string {
  return value ?? 'N/A';
}

function displayTrend(value: ImpactTrend): string {
  return value === 'UP' ? '↑ UP' : value === 'DOWN' ? '↓ DOWN' : value === 'STABLE' ? '→ STABLE' : 'N/A';
}

function impactColor(value: ImpactLevel): string {
  return value === 'CRITICAL' || value === 'HIGH' ? 'var(--cds-support-error)' : value === 'MEDIUM' ? '#92400e' : value === 'LOW' ? 'var(--cds-support-success)' : 'var(--cds-text-helper)';
}

function canonicalRelationship(value?: string | null): string {
  const relationship = value?.toUpperCase() || '';
  if (relationship.includes('COMPETITOR')) return 'Competitor';
  if (relationship.includes('SUPPLIER')) return 'Supplier';
  if (relationship.includes('CUSTOMER')) return 'Customer';
  if (relationship.includes('POTENTIAL')) return 'Custom';
  if (relationship.includes('PARTNER')) return 'Partner';
  return 'Custom';
}

const viRelationship = (value: string) => ({ Partner: 'Đối tác', Supplier: 'Nhà cung cấp', Customer: 'Khách hàng', Competitor: 'Đối thủ', Custom: 'Tùy chỉnh' }[value] ?? 'Chưa xác định');

const DRAWER_TABS = [
  { id: 'relationship-overview',  label: 'Tổng quan quan hệ' },
  { id: 'activity-and-news',      label: 'Dòng thời gian & Tin tức' },
  { id: 'partner-opportunities',  label: 'Cơ hội hợp tác' },
];

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider: React.FC = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--cds-border-subtle-00)', margin: '8px 0' }} />
);

// ─── InfoRow for Drawer ───────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
    <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', minWidth: '120px' }}>{label}</span>
    <span style={{ fontSize: '13px', color: 'var(--cds-text-primary)', fontWeight: 500, textAlign: 'right', flex: 1 }}>{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface PartnerEcosystemViewProps {
  setActivePage?: (page: string) => void;
}

export const PartnerEcosystemView: React.FC<PartnerEcosystemViewProps> = ({ setActivePage }) => {
  const { t } = useTranslation('ecosystem');
  // ── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [partners, setPartners]       = useState<GraphCompany[]>([]);
  const [suppliers, setSuppliers]     = useState<GraphCompany[]>([]);
  const [customers, setCustomers]     = useState<GraphCompany[]>([]);
  const [potentials, setPotentials]   = useState<GraphCompany[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreSnapshot[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [news, setNews] = useState<ExternalDataItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [intelligenceById, setIntelligenceById] = useState<Record<string, CompanyIntelligenceSummary>>({});
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState('attention');

  // Drawer state
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerTab, setDrawerTab]     = useState('overview');
  const [selectedRow, setSelectedRow] = useState<PartnerRow | null>(null);
  const [companyProfile, setCompanyProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [syncingPartnerId, setSyncingPartnerId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch]         = useState('');
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [filterRel, setFilterRel]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterImportance, setFilterImportance] = useState('All');

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    const fetch = async () => {
      setLoading(true);
      const [p, s, c, pp, scores, projectResult, newsResult, profilesResult] = await Promise.allSettled([
        api.get<GraphCompany[]>('/dashboard/partners', { signal: ctrl.signal }),
        api.get<GraphCompany[]>('/dashboard/suppliers', { signal: ctrl.signal }),
        api.get<GraphCompany[]>('/graph/customers', { signal: ctrl.signal }),
        api.get<GraphCompany[]>('/dashboard/potential-partners', { signal: ctrl.signal }),
        api.get<ScoreSnapshot[]>('/dashboard/recent-scores', { signal: ctrl.signal }),
        api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 }, signal: ctrl.signal }),
        externalDataApi.getItems('NEWS', { page: 0, size: 200 }),
        api.get<PageResponse<ProfileResponse>>('/profiles', { params: { page: 0, size: 200 }, signal: ctrl.signal }),
      ]);
      if (ctrl.signal.aborted) return;
      const coreResults = [p, s, c, pp, projectResult, profilesResult];
      if (coreResults.every((result) => result.status === 'rejected')) setLoadError('Không thể tải dữ liệu. Thử lại.');
      if (p.status === 'fulfilled' && Array.isArray(p.value?.data)) setPartners(p.value.data);
      if (s.status === 'fulfilled' && Array.isArray(s.value?.data)) setSuppliers(s.value.data);
      if (c.status === 'fulfilled' && Array.isArray(c.value?.data)) setCustomers(c.value.data);
      if (pp.status === 'fulfilled' && Array.isArray(pp.value?.data)) setPotentials(pp.value.data);
      if (scores.status === 'fulfilled' && Array.isArray(scores.value?.data)) setRecentScores(scores.value.data);
      if (projectResult.status === 'fulfilled') setProjects(projectResult.value.data?.content ?? []);
      if (newsResult.status === 'fulfilled') setNews(newsResult.value.content ?? []);
      if (profilesResult.status === 'fulfilled') setProfiles(profilesResult.value.data?.content ?? []);
      setLoading(false);
    };
    void fetch();
    return () => ctrl.abort();
  }, []);

  // Score lookup by companyId
  const scoreMap = useMemo(() => {
    const m = new Map<string, ScoreSnapshot>();
    recentScores.forEach((s) => { if (!m.has(s.companyId)) m.set(s.companyId, s); });
    return m;
  }, [recentScores]);

  const profileById = useMemo(() => new Map(profiles.flatMap((profile) => [
    [profile.id, profile],
    [profile.companyId, profile],
  ] as const)), [profiles]);

  // ── Build unified table rows bound strictly to Backend API ────────────────
  const allRows = useMemo((): PartnerRow[] => {
    const sources: Array<{ company: GraphCompany; defaultRel: string }> = [];
    const seenIds = new Set<string>();

    const addCompany = (c: GraphCompany, rel: string) => {
      const key = c.companyId || c.name;
      if (!key || seenIds.has(key)) return;
      seenIds.add(key);
      sources.push({ company: c, defaultRel: rel });
    };

    const normalizedName = (value?: string | null) => (value || '').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    if (partners.length > 0)  partners.forEach(c => addCompany(c, 'Partner'));
    if (suppliers.length > 0) suppliers.forEach(c => addCompany(c, 'Supplier'));
    if (customers.length > 0) customers.forEach(c => addCompany(c, 'Customer'));
    if (potentials.length > 0) potentials.forEach(c => addCompany(c, 'Custom'));
    projects.forEach((project) => {
      const profile = project.targetCompanyProfileId ? profileById.get(project.targetCompanyProfileId) : undefined;
      const companyName = project.targetCompanyName || profile?.identity?.legalName || profile?.identity?.tradeName;
      if (!companyName) return;
      addCompany({
        companyId: project.targetCompanyProfileId || `project-company-${project.id}`,
        name: companyName,
        industry: profile?.business?.industries?.[0],
      }, canonicalRelationship(project.targetRelationshipType));
    });

    return sources.map((src): PartnerRow => {
      const snap = scoreMap.get(src.company.companyId);
      const relatedProjects = projects.filter((project) => project.targetCompanyProfileId === src.company.companyId || normalizedName(project.targetCompanyName) === normalizedName(src.company.name));
      const relatedNews = news.filter((item) => item.companyProfileId === src.company.companyId || item.relatedCompanyId === src.company.companyId || normalizedName(item.relatedCompanyName) === normalizedName(src.company.name));
      const latestNews = [...relatedNews].sort((left, right) => new Date(right.publishedAt || right.updatedAt || 0).getTime() - new Date(left.publishedAt || left.updatedAt || 0).getTime())[0];
      const latestProject = [...relatedProjects].sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())[0];
      const latestActivity = latestNews
        ? { title: cleanText(latestNews.aiSummary || latestNews.title) || 'Tin tức đã được cập nhật', date: latestNews.publishedAt || latestNews.updatedAt || '' }
        : latestProject
          ? { title: cleanText(latestProject.projectName) || 'Dự án đã được cập nhật', date: latestProject.updatedAt || latestProject.createdAt || '' }
          : null;
      return {
        id: src.company.companyId,
        name: cleanText(src.company.name) || 'Chưa có dữ liệu',
        industry: cleanText(src.company.industry) || 'Chưa có dữ liệu',
        relationship: canonicalRelationship(src.company.relationships?.[0]?.relationshipType || src.defaultRel),
        status: snap?.evaluatedRole ? 'VERIFIED' : 'Not available',
        projects: relatedProjects,
        latestActivity,
        lastUpdated: src.company.updatedAt || latestNews?.updatedAt || latestProject?.updatedAt || latestProject?.createdAt || null,
        importance: 'Chưa có dữ liệu',
      };
    });
  }, [partners, suppliers, customers, potentials, scoreMap, projects, news, profileById]);

  useEffect(() => {
    const controller = new AbortController();
    const companyRows = allRows.filter((row) => !row.id.startsWith('project-company-'));
    const missingRows = companyRows.filter((row) => !intelligenceById[row.id]);
    if (missingRows.length === 0) {
      setIntelligenceLoading(false);
      return () => controller.abort();
    }
    setIntelligenceLoading(true);

    void Promise.allSettled(missingRows.map(async (row) => {
      const response = await api.get<any>(`/owner/company-intelligence/${row.id}`, { signal: controller.signal });
      const payload = response.data;
      const rawSignals = [
        ...(Array.isArray(payload?.timeline) ? payload.timeline : []),
        ...(Array.isArray(payload?.news) ? payload.news : []),
      ];
      const signals = rawSignals.map((item: any, index: number): EcosystemSignal => {
        const source = normalizeSource(item.source || item.sourceName, item.sourceUrl || item.url);
        return {
          id: String(item.id || `${row.id}-${index}`),
          companyId: row.id,
          companyName: cleanText(payload?.company?.name) || row.name,
          title: cleanText(item.summary || item.aiSummary || item.title) || 'Tín hiệu kinh doanh',
          category: cleanText(item.eventType || item.category) || 'NEWS',
          date: item.date || item.publishedAt || item.updatedAt || null,
          businessImpact: normalizeImpact(item.impact || item.businessImpact || item.riskLevel),
          source: source.name,
          sourceUrl: source.url,
        };
      }).filter((signal: EcosystemSignal, index: number, values: EcosystemSignal[]) => values.findIndex((candidate) => candidate.id === signal.id) === index);
      return [row.id, {
        businessImpact: normalizeImpact(payload?.relationship?.businessImpact),
        strategicRelevance: normalizeImpact(payload?.relationship?.strategicRelevance),
        impactTrend: normalizeTrend(payload?.relationship?.impactTrend),
        whyItMatters: cleanText(payload?.executiveBrief?.whyItMatters?.[0] || payload?.executiveBrief?.summary) || null,
        lastUpdated: payload?.metadata?.lastUpdated || null,
        signals,
      } satisfies CompanyIntelligenceSummary] as const;
    })).then((results) => {
      if (controller.signal.aborted) return;
      const updates = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      if (updates.length) setIntelligenceById((current) => ({ ...current, ...Object.fromEntries(updates) }));
      setIntelligenceLoading(false);
    });
    return () => {
      controller.abort();
      setIntelligenceLoading(false);
    };
  }, [allRows, intelligenceById]);

  const intelligenceFor = useCallback((row: PartnerRow): CompanyIntelligenceSummary => {
    const intelligence = intelligenceById[row.id];
    const activeProject = row.projects.some((project) => project.status === 'ACTIVE');
    const verifiedRelationship = ['Partner', 'Supplier', 'Customer', 'Competitor'].includes(row.relationship);

    const baselineStrategicRelevance: ImpactLevel = activeProject && ['Partner', 'Supplier'].includes(row.relationship)
      ? 'HIGH'
      : verifiedRelationship ? 'MEDIUM' : null;
    const baselineBusinessImpact: ImpactLevel = activeProject ? 'HIGH' : verifiedRelationship ? 'MEDIUM' : null;

    return {
      businessImpact: intelligence?.businessImpact ?? baselineBusinessImpact,
      strategicRelevance: intelligence?.strategicRelevance ?? baselineStrategicRelevance,
      impactTrend: intelligence?.impactTrend ?? null,
      whyItMatters: intelligence?.whyItMatters ?? null,
      lastUpdated: intelligence?.lastUpdated ?? null,
      signals: intelligence?.signals ?? [],
    };
  }, [intelligenceById]);

  const attentionPriority = useCallback((row: PartnerRow): 'HIGH' | 'MEDIUM' | 'LOW' => {
    const intelligence = intelligenceFor(row);
    const recentSignal = intelligence.signals.length > 0;
    const activeProject = row.projects.some((project) => project.status === 'ACTIVE');
    if (intelligence.businessImpact === 'HIGH' || intelligence.businessImpact === 'CRITICAL' || (intelligence.strategicRelevance === 'HIGH' && recentSignal) || (activeProject && recentSignal)) return 'HIGH';
    if (intelligence.strategicRelevance === 'HIGH' || intelligence.strategicRelevance === 'MEDIUM' || intelligence.impactTrend === 'UP') return 'MEDIUM';
    if (activeProject || ['Partner', 'Supplier', 'Customer', 'Competitor'].includes(row.relationship)) return 'MEDIUM';
    return 'LOW';
  }, [intelligenceFor]);

  const latestSignalFor = useCallback((row: PartnerRow): EcosystemSignal | null => {
    const signals = intelligenceFor(row).signals;
    return [...signals].sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())[0] ?? null;
  }, [intelligenceFor]);

  const recentSignals = useMemo(() => Object.values(intelligenceById)
     .flatMap((intelligence) => intelligence.signals)
     .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
     .slice(0, 8), [intelligenceById]);

  const displayedSignals = useMemo((): EcosystemSignal[] => {
    if (recentSignals.length > 0) return recentSignals;

    return allRows
      .filter((row) => ['Partner', 'Supplier', 'Customer', 'Competitor'].includes(row.relationship))
      .slice(0, 8)
      .map((row) => ({
        id: `relationship-${row.id}`,
        companyId: row.id,
        companyName: row.name,
        title: `Quan hệ ${viRelationship(row.relationship).toLowerCase()} đã xác minh trong APMS`,
        category: 'RELATIONSHIP',
        date: row.lastUpdated,
        businessImpact: intelligenceFor(row).businessImpact,
        source: 'APMS graph',
        sourceUrl: null,
      }));
  }, [allRows, intelligenceFor, recentSignals]);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.industry.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));
    if (filterIndustry !== 'All') rows = rows.filter(r => r.industry === filterIndustry);
    if (filterRel !== 'All') rows = rows.filter(r => r.relationship === filterRel);
    if (filterStatus !== 'All') rows = rows.filter(r => r.status === filterStatus);
    if (filterImportance !== 'All') rows = rows.filter((row) => intelligenceFor(row).strategicRelevance === filterImportance);
    return [...rows].sort((left, right) => {
      const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDelta = priority[attentionPriority(right)] - priority[attentionPriority(left)];
      if (priorityDelta) return priorityDelta;
      const strategicDelta = (intelligenceFor(right).strategicRelevance === 'HIGH' ? 1 : 0) - (intelligenceFor(left).strategicRelevance === 'HIGH' ? 1 : 0);
      if (strategicDelta) return strategicDelta;
      const trendDelta = (intelligenceFor(right).impactTrend === 'UP' ? 1 : 0) - (intelligenceFor(left).impactTrend === 'UP' ? 1 : 0);
      if (trendDelta) return trendDelta;
      return right.projects.filter((project) => project.status === 'ACTIVE').length - left.projects.filter((project) => project.status === 'ACTIVE').length;
    });
  }, [allRows, search, filterIndustry, filterRel, filterStatus, filterImportance, intelligenceFor, attentionPriority]);

  const attentionRows = useMemo(
    () => filteredRows.filter((row) => attentionPriority(row) !== 'LOW'),
    [filteredRows, attentionPriority],
  );

  // ── KPI metrics ───────────────────────────────────────────────────────────
  const totalPartners    = allRows.length;
  const strategicCount   = allRows.filter((row) => intelligenceFor(row).strategicRelevance === 'HIGH').length;
  const ownerAttentionCount = allRows.filter((row) => attentionPriority(row) !== 'LOW').length;
  const businessImpactHighCount = allRows.filter((row) => { const ib = intelligenceFor(row).businessImpact; return ib === 'HIGH' || ib === 'CRITICAL'; }).length;
  const supplierCount = allRows.filter((row) => row.relationship === 'Supplier').length;
  const customerCount = allRows.filter((row) => row.relationship === 'Customer').length;

  // ── Unique industry options ───────────────────────────────────────────────
  const industryOptions = useMemo(() => {
    const set = new Set(allRows.filter((row) => row.industry !== 'Chưa có dữ liệu').map(r => r.industry));
    return [{ value: 'All', label: 'Tất cả ngành' }, ...Array.from(set).map(v => ({ value: v, label: v }))];
  }, [allRows]);

  // ── Open Drawer ───────────────────────────────────────────────────────────
  const openDrawer = useCallback((row: PartnerRow) => {
    setSelectedRow(row);
    setDrawerTab('relationship-overview');
    setDrawerOpen(true);
    setCompanyProfile(null);
    setProfileLoading(true);
    Promise.allSettled([
      api.get<ProfileResponse>(`/company-profiles/${row.id}`),
    ]).then(([profRes]) => {
      if (profRes.status === 'fulfilled' && profRes.value?.data) {
        setCompanyProfile(profRes.value.data);
      }
    }).finally(() => setProfileLoading(false));
  }, []);

  const openCompanyDetail = useCallback((row: PartnerRow) => {
    openDrawer(row);
  }, [openDrawer]);

  // ── Export selected partner dossier (client-side CSV) ────────────────────
  const exportSelectedPartnerCsv = useCallback(() => {
    if (!selectedRow) return;
    const header = ['Field', 'Value'];
    const rows = [
      ['Company', selectedRow.name],
      ['Industry', selectedRow.industry],
      ['Relationship', selectedRow.relationship],
      ['Importance', selectedRow.importance],
      ['Status', selectedRow.status],
      ['Projects', selectedRow.projects.length],
      ['Latest activity', selectedRow.latestActivity?.title || 'Chưa có dữ liệu'],
      ['Updated', selectedRow.latestActivity?.date || 'Chưa có dữ liệu'],
    ];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-dossier-${(selectedRow.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedRow]);

  const handleSyncPartner = async (partnerId: string) => {
    if (syncingPartnerId) return;
    setSyncingPartnerId(partnerId);
    try {
      await externalDataApi.runApprovedProfilesFetch();
      await externalDataApi.runAnalyze();
      
      const response = await api.get<any>(`/owner/company-intelligence/${partnerId}`);
      const payload = response.data;
      const rawSignals = [
        ...(Array.isArray(payload?.timeline) ? payload.timeline : []),
        ...(Array.isArray(payload?.news) ? payload.news : []),
      ];
      const signals = rawSignals.map((item: any, index: number): EcosystemSignal => {
        const source = normalizeSource(item.source || item.sourceName, item.sourceUrl || item.url);
        return {
          id: String(item.id || `${partnerId}-${index}`),
          companyId: partnerId,
          companyName: cleanText(payload?.company?.name) || selectedRow?.name || 'Partner',
          title: cleanText(item.summary || item.aiSummary || item.title) || 'Tín hiệu kinh doanh',
          category: cleanText(item.eventType || item.category) || 'NEWS',
          date: item.date || item.publishedAt || item.updatedAt || null,
          businessImpact: normalizeImpact(item.impact || item.businessImpact || item.riskLevel),
          source: source.name,
          sourceUrl: source.url,
        };
      }).filter((signal: EcosystemSignal, index: number, values: EcosystemSignal[]) => values.findIndex((candidate) => candidate.id === signal.id) === index);

      setIntelligenceById((current) => ({
        ...current,
        [partnerId]: {
          businessImpact: normalizeImpact(payload?.relationship?.businessImpact),
          strategicRelevance: normalizeImpact(payload?.relationship?.strategicRelevance),
          impactTrend: normalizeTrend(payload?.relationship?.impactTrend),
          whyItMatters: cleanText(payload?.executiveBrief?.whyItMatters?.[0] || payload?.executiveBrief?.summary) || null,
          lastUpdated: payload?.metadata?.lastUpdated || null,
          signals,
        }
      }));
    } catch (err) {
      console.error('Failed to sync partner intelligence', err);
    } finally {
      setSyncingPartnerId(null);
    }
  };

  // ── Filter configs ─────────────────────────────────────────────────────────
  const filters: FilterConfig[] = [
    { id: 'industry', type: 'select', label: 'Ngành', value: filterIndustry, onChange: v => setFilterIndustry(v as string), options: industryOptions },
    { id: 'relationship', type: 'select', label: 'Quan hệ', value: filterRel, onChange: v => setFilterRel(v as string), options: [
      { value: 'All', label: 'Tất cả quan hệ' },
      { value: 'Partner', label: 'Đối tác' },
      { value: 'Supplier', label: 'Nhà cung cấp' },
      { value: 'Customer', label: 'Khách hàng' },
      { value: 'Competitor', label: 'Đối thủ' },
      { value: 'Custom', label: 'Tùy chỉnh' },
    ]},
    { id: 'status', type: 'select', label: 'Trạng thái', value: filterStatus, onChange: v => setFilterStatus(v as string), options: [
      { value: 'All', label: 'Tất cả trạng thái' },
      { value: 'VERIFIED', label: 'Đã xác minh' },
      { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
    ]},
    { id: 'importance', type: 'select', label: 'Quan hệ chiến lược', value: filterImportance, onChange: v => setFilterImportance(v as string), options: [
      { value: 'All', label: 'Tất cả mức độ quan trọng' },
      { value: 'HIGH', label: 'Cao' },
      { value: 'MEDIUM', label: 'Trung bình' },
      { value: 'LOW', label: 'Thấp' },
    ]},
  ];

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: ColumnDef<PartnerRow>[] = [
    {
      key: 'name',
      header: 'Công ty',
      width: '200px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--cds-text-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
        </div>
      ),
    },
    { key: 'industry',     header: 'Ngành',     width: '130px', sortable: true },
    { key: 'relationship', header: 'Quan hệ',  width: '100px', sortable: true,
      render: (_, row) => {
        const colors: Record<string, string> = { Partner: 'var(--cds-interactive)', Supplier: '#b45309', Customer: 'var(--cds-support-success)', Competitor: 'var(--cds-support-error)', Custom: 'var(--cds-text-secondary)' };
        return <span style={{ fontSize: '12px', fontWeight: 600, color: colors[row.relationship] || 'var(--cds-text-secondary)' }}>{viRelationship(row.relationship)}</span>;
      },
    },
    { key: 'importance', header: 'Quan hệ chiến lược', width: '130px', sortable: true,
      render: (_, row) => <span style={{ fontSize: '12px', fontWeight: 600, color: impactColor(intelligenceFor(row).strategicRelevance) }}>{displayImpact(intelligenceFor(row).strategicRelevance)}</span>,
    },
    { key: 'status', header: 'Business Impact', width: '120px',
      render: (_, row) => <span style={{ fontSize: '12px', fontWeight: 600, color: impactColor(intelligenceFor(row).businessImpact) }}>{displayImpact(intelligenceFor(row).businessImpact)}</span>,
    },
    { key: 'lastUpdated', header: 'Cập nhật', width: '105px',
      render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{formatDate(intelligenceFor(row).lastUpdated || row.lastUpdated)}</span>,
    },
    { key: 'id', header: 'Thao tác', width: '80px', align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={(e) => { e.stopPropagation(); openCompanyDetail(row); }}>Xem</SecondaryButton>
      ),
    },
  ];

  // ── Drawer Content ────────────────────────────────────────────────────────
  const renderDrawerTab = () => {
    if (!selectedRow) return null;

    const intelligence = intelligenceFor(selectedRow);
    const activeProj = selectedRow.projects.filter(p => p.status === 'ACTIVE');
    const relStatus = intelligence.businessImpact === 'CRITICAL'
      ? 'AT RISK' 
      : (selectedRow.projects.some(p => p.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE');
    const relTrend = intelligence.impactTrend === 'UP' 
      ? 'IMPROVING' 
      : intelligence.impactTrend === 'DOWN' 
        ? 'DECLINING' 
        : 'STABLE';

    switch (drawerTab) {
      case 'relationship-overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--cds-text-primary)' }}>Relationship Summary</strong>
                <InfoRow label="Relationship Type" value={viRelationship(selectedRow.relationship)} />
                <Divider />
                <InfoRow label="Relationship Status" value={relStatus} />
                <Divider />
                <InfoRow label="Relationship Trend" value={relTrend} />
              </div>
              <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--cds-text-primary)' }}>Strategic Alignment</strong>
                <InfoRow label="Strategic Relevance" value={displayImpact(intelligence.strategicRelevance)} />
                <Divider />
                <InfoRow label="Business Impact" value={displayImpact(intelligence.businessImpact)} />
                <Divider />
                <InfoRow label="Active Projects" value={`${activeProj.length} projects`} />
              </div>
            </div>

            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Relationship Summary Brief</h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--cds-text-secondary)', lineHeight: '20px' }}>
                {intelligence.whyItMatters || 'No relationship overview summary is recorded.'}
              </p>
            </div>
          </div>
        );

      case 'activity-and-news': {
        const normalizedName = (v?: string | null) => (v || '').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        const relatedNews = news.filter((item) => item.companyProfileId === selectedRow.id || item.relatedCompanyId === selectedRow.id || normalizedName(item.relatedCompanyName) === normalizedName(selectedRow.name));
        
        type UnifiedItem = {
          id: string;
          type: 'ACTIVITY' | 'NEWS';
          title: string;
          date: string | null;
          categoryOrSentiment: string | null;
          source: string | null;
          url: string | null;
          summary?: string | null;
        };

        const combinedList: UnifiedItem[] = [
          ...relatedNews.map(n => ({
            id: `news-${n.id}`,
            type: 'NEWS' as const,
            title: cleanText(n.title),
            date: n.publishedAt || n.updatedAt || null,
            categoryOrSentiment: n.sentiment || 'NEUTRAL',
            source: n.source || 'N/A',
            url: n.url ?? null,
            summary: cleanText(n.aiSummary || n.summary)
          })),
          ...intelligence.signals.map(s => ({
            id: `act-${s.id}`,
            type: s.category === 'NEWS' ? ('NEWS' as const) : ('ACTIVITY' as const),
            title: s.title,
            date: s.date,
            categoryOrSentiment: s.category,
            source: s.source,
            url: s.sourceUrl
          }))
        ];

        const seenUrls = new Set<string>();
        const seenTitles = new Set<string>();

        const unifiedList = combinedList.filter(item => {
          if (item.url && item.url.trim() !== '') {
            if (seenUrls.has(item.url)) return false;
            seenUrls.add(item.url);
          }
          if (item.title) {
            const normalizedTitle = item.title.trim().toLowerCase().substring(0, 30);
            if (seenTitles.has(normalizedTitle)) return false;
            seenTitles.add(normalizedTitle);
          }
          return true;
        }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {unifiedList.length > 0 ? (
              unifiedList.map((item) => (
                <div key={item.id} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'flex-start', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{item.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)', whiteSpace: 'nowrap' }}>{formatDate(item.date)}</span>
                  </div>
                  
                  {item.type === 'ACTIVITY' ? (
                    <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: 'var(--cds-interactive)', background: 'var(--cds-support-info-bg)', padding: '2px 6px', borderRadius: '4px', marginBottom: '6px', textTransform: 'uppercase' }}>
                      {item.categoryOrSentiment}
                    </div>
                  ) : (
                    <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: item.categoryOrSentiment === 'NEGATIVE' ? 'var(--cds-support-error-bg)' : 'var(--cds-layer-01)', color: item.categoryOrSentiment === 'NEGATIVE' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
                      NEWS · {item.categoryOrSentiment}
                    </span>
                  )}
                  
                  {item.summary && (
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{item.summary}</p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cds-text-helper)', borderTop: '1px dashed var(--cds-border-subtle-00)', paddingTop: '6px', marginTop: '6px' }}>
                    <span>Source: <strong>{item.source}</strong></span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                        Xem nguồn <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)', textAlign: 'center', padding: '20px' }}>
                Chưa có dữ liệu hoạt động hoặc tin tức.
              </p>
            )}
          </div>
        );
      }

      case 'partner-opportunities': {
        const opportunities = [];
        if (selectedRow.projects.length > 0) {
          opportunities.push({
            opportunity: 'Joint product co-development',
            potentialValue: 'High market impact',
            strategicRelevance: 'HIGH',
            evidence: `Active collaboration on project: ${selectedRow.projects[0].projectName}`,
            nextAction: 'Propose expansion of scope at next strategic meeting.'
          });
        }
        selectedRow.projects.forEach(p => {
          if (p.status === 'COMPLETED') {
            opportunities.push({
              opportunity: 'Strategic partnership expansion',
              potentialValue: 'High value retention',
              strategicRelevance: 'MEDIUM',
              evidence: `Successfully completed project: ${p.projectName}`,
              nextAction: 'Initiate discussions for phase 2 follow-up contract.'
            });
          }
        });
        const expansionSignals = intelligence.signals.filter(s => s.category.toUpperCase().includes('EXPAN'));
        if (expansionSignals.length > 0) {
          opportunities.push({
            opportunity: 'Market expansion alignment',
            potentialValue: 'Entry to new regional market',
            strategicRelevance: 'HIGH',
            evidence: expansionSignals.map(s => `• ${s.title}`).join('\\n'),
            nextAction: `Sync sales teams to evaluate shared opportunities in target market.`
          });
        }

        const techSignals = intelligence.signals.filter(s => s.category.toUpperCase().includes('TECH'));
        if (techSignals.length > 0) {
          opportunities.push({
            opportunity: 'New technology collaboration',
            potentialValue: 'Enhanced tech stack alignment',
            strategicRelevance: 'MEDIUM',
            evidence: techSignals.map(s => `• ${s.title}`).join('\\n'),
            nextAction: `Invite partner tech leads to a joint capability demo workshop.`
          });
        }

        if (opportunities.length === 0) {
          opportunities.push({
            opportunity: 'Joint Go-To-Market Collaboration',
            potentialValue: 'Increased market reach',
            strategicRelevance: 'MEDIUM',
            evidence: 'Established ecosystem relationship',
            nextAction: 'Schedule an introductory partner alignment session.'
          });
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {opportunities.map((opp, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--cds-text-primary)' }}>{opp.opportunity}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginTop: '6px', color: 'var(--cds-text-secondary)' }}>
                  <div>Value: <strong>{opp.potentialValue}</strong></div>
                  <div>Strategic: <strong>{opp.strategicRelevance}</strong></div>
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--cds-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  <strong>Evidence:</strong>
                  <div>{opp.evidence}</div>
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--cds-interactive)' }}>
                  <strong>Next Action:</strong> {opp.nextAction}
                </div>
              </div>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cds-page-shell" id="page-partner-ecosystem">

      {/* Page Header */}
      <PageHeader
        title={t('header.title')}
        actions={
          setActivePage ? (
            <SecondaryButton size="sm" onClick={() => setActivePage('company-detail')}>{t('header.companyDetail')}</SecondaryButton>
          ) : undefined
        }
      />

      {loadError && <div role="alert" style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid var(--cds-support-error)', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', borderRadius: 'var(--cds-border-radius)', fontSize: '13px' }}>{loadError}</div>}

      <div style={{ marginBottom: '16px' }}>
        <Tabs
          items={[
            { id: 'attention', label: 'Cần Owner quan tâm' },
            { id: 'signals', label: 'Tín hiệu kinh doanh gần đây' },
            { id: 'directory', label: t('sections.directory') },
          ]}
          activeId={mainTab}
          onChange={setMainTab}
          contained={true}
        />
      </div>

      {mainTab === 'attention' && (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '88px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', animation: 'cds-pulse 1.2s ease infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginBottom: '16px' }}>
              <MetricCard label="Doanh nghiệp liên quan" value={totalPartners} description="Tổng số doanh nghiệp" />
              <MetricCard label="Đối tác chiến lược" value={strategicCount} description="Strategic Relevance HIGH" />
              <MetricCard label="Cần Owner quan tâm" value={ownerAttentionCount} description="Cảnh báo & Tín hiệu" />
              <MetricCard label="Business Impact HIGH" value={businessImpactHighCount} description="Business Impact HIGH" />
            </div>
          )}

          <section className="ecosystem-attention" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Doanh nghiệp cần Owner quan tâm</h2>
            {attentionRows.slice(0, 5).map((row) => {
              const intelligence = intelligenceFor(row);
              const signal = latestSignalFor(row);
              return (
                <div className="ecosystem-attention-row" key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(110px, 0.6fr) minmax(110px, 0.6fr) minmax(200px, 1.2fr) minmax(110px, 0.6fr) auto', gap: '12px', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--cds-border-subtle-00)' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{row.name}</strong>
                    <div style={{ marginTop: '3px', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                      {row.industry} · {viRelationship(row.relationship)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>Chiến lược</span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: impactColor(intelligence.strategicRelevance) }}>{displayImpact(intelligence.strategicRelevance)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>Business Impact</span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: impactColor(intelligence.businessImpact) }}>{displayImpact(intelligence.businessImpact)}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>Tín hiệu gần đây</span>
                    <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {signal?.title || `Quan hệ ${viRelationship(row.relationship).toLowerCase()} đã xác minh trong APMS`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '2px' }}>
                      {signal?.date ? formatDate(signal.date) : 'Chưa có tín hiệu tin tức được thu thập'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>Cập nhật</span>
                    <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                      {intelligence.lastUpdated || row.lastUpdated
                        ? formatDate(intelligence.lastUpdated || row.lastUpdated)
                        : 'Quan hệ đã xác minh'}
                    </div>
                  </div>
                  <SecondaryButton size="sm" onClick={() => openCompanyDetail(row)}>Xem công ty</SecondaryButton>
                </div>
              );
            })}
            {!intelligenceLoading && attentionRows.length === 0 && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('sections.attentionEmpty')}</p>}
            {intelligenceLoading && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Đang xác minh tín hiệu doanh nghiệp...</p>}
          </section>
        </>
      )}

      {mainTab === 'signals' && (
        <section className="ecosystem-signals" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Tín hiệu kinh doanh gần đây</h2>
          {displayedSignals.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(240px, 1fr) 110px 100px 100px', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--cds-border-subtle-00)', fontWeight: 600, fontSize: '11px', color: 'var(--cds-text-secondary)' }}>
              <div>Doanh nghiệp / Phân loại</div>
              <div>Tín hiệu / Tin tức</div>
              <div>Business Impact</div>
              <div>Ngày ghi nhận</div>
              <div>Nguồn bằng chứng</div>
            </div>
          )}
          {displayedSignals.map((signal) => (
            <div className="ecosystem-signal-row" key={`${signal.companyId}-${signal.id}`} style={{ display: 'grid', gridTemplateColumns: '150px minmax(240px, 1fr) 110px 100px 100px', gap: '12px', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--cds-border-subtle-00)' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--cds-text-primary)' }}>{signal.companyName}</strong>
                <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.category}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={signal.title}>
                  {signal.title}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: impactColor(signal.businessImpact) }}>
                  {displayImpact(signal.businessImpact)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.date ? formatDate(signal.date) : 'Đã xác minh'}</span>
              </div>
              <div>
                {signal.sourceUrl ? (
                  <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--cds-link-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <span>Xem nguồn</span>
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.source || 'N/A'}</span>
                )}
              </div>
            </div>
          ))}
          {displayedSignals.length === 0 && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('sections.signalsEmpty')}</p>}
        </section>
      )}

      {mainTab === 'directory' && (
        <>
          <FilterBar
            searchValue={search}
            searchPlaceholder={t('filters.searchPlaceholder')}
            onSearchChange={setSearch}
            filters={filters}
          />

          {/* ── Enterprise Table ──────────────────────────────────────────────── */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                {t('sections.directory')}
              </h2>
            </div>
            <DataTable<PartnerRow>
              columns={columns}
              data={filteredRows}
              rowKey={(row) => row.id}
              onRowClick={openDrawer}
              pageSize={10}
              exportFilename="partner-ecosystem"
              loading={loading}
              emptyState={
                <EmptyState
                  title={t('sections.noCompanies')}
                  body={t('sections.tryFilters')}
                  action={
                    <PrimaryButton size="sm" onClick={() => { setSearch(''); setFilterIndustry('All'); setFilterRel('All'); setFilterStatus('All'); setFilterImportance('All'); }}>
                      {t('sections.resetFilters')}
                    </PrimaryButton>
                  }
                />
              }
            />
          </div>
        </>
      )}

      {/* ── Right-side Drawer ─────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedRow?.name ?? ''}
        subtitle={selectedRow ? `${selectedRow.relationship} · ${selectedRow.industry}` : ''}
        width={700}
        footerActions={
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <SecondaryButton size="sm" onClick={exportSelectedPartnerCsv}>Xuất CSV</SecondaryButton>
            </div>
            {setActivePage && (
              <PrimaryButton size="sm" onClick={() => {
                if (selectedRow) {
                  localStorage.setItem('apms-selected-company', selectedRow.id);
                  setActivePage('company-detail');
                }
              }}>
                Xem hồ sơ đầy đủ
              </PrimaryButton>
            )}
          </>
        }
      >
        {selectedRow && (() => {
          const intelligence = intelligenceFor(selectedRow);
          return (
            <>
              {/* Partner Intelligence Header Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--cds-border-subtle-00)', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--cds-interactive)', color: '#fff', fontWeight: 700 }}>PARTNER</span>
                <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{viRelationship(selectedRow.relationship)}</span>
                <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>·</span>
                <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{selectedRow.industry}</span>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                    Cập nhật: {intelligence.lastUpdated ? formatDate(intelligence.lastUpdated) : 'Chưa có'}
                  </span>
                  <button
                    onClick={() => void handleSyncPartner(selectedRow.id)}
                    disabled={syncingPartnerId === selectedRow.id}
                    style={{
                      background: 'var(--cds-interactive)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {syncingPartnerId === selectedRow.id ? 'Đang cập nhật...' : '↻ Cập nhật'}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs items={DRAWER_TABS} activeId={drawerTab} onChange={setDrawerTab} wrap={true} />

              {/* Tab content */}
              <div style={{ marginTop: '16px' }}>
                {renderDrawerTab()}
              </div>
            </>
          );
        })()}
      </Drawer>

      <style>{`
        @keyframes cds-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @media (max-width: 1100px) {
          #page-partner-ecosystem > div:nth-child(4) {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .ecosystem-attention-row, .ecosystem-signal-row { grid-template-columns: 1fr !important; gap: 6px !important; }
          #page-partner-ecosystem section > div[style*="minmax(220px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
