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
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';

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

// ─── Mini donut chart (inline, no external dep) ──────────────────────────────
// ─── Mini horizontal bar chart ────────────────────────────────────────────────
// ─── Score ring ───────────────────────────────────────────────────────────────
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
const viStatus = (value: string) => ({ VERIFIED: 'Đã xác minh', PENDING_REVIEW: 'Chờ duyệt', 'Not available': 'Chưa cập nhật' }[value] ?? value);

const DRAWER_TABS = [
  { id: 'overview',   label: 'Tổng quan' },
  { id: 'projects',   label: 'Dự án' },
  { id: 'contacts',   label: 'Liên hệ' },
  { id: 'timeline',   label: 'Dòng thời gian' },
  { id: 'documents',  label: 'Tài liệu' },
  { id: 'ai-summary', label: 'Tóm tắt AI' },
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerTab, setDrawerTab]     = useState('overview');
  const [selectedRow, setSelectedRow] = useState<PartnerRow | null>(null);
  const [companyProfile, setCompanyProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

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
    if (missingRows.length === 0) return () => controller.abort();

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
    });
    return () => controller.abort();
  }, [allRows, intelligenceById]);

  const intelligenceFor = useCallback((row: PartnerRow): CompanyIntelligenceSummary => intelligenceById[row.id] ?? {
    businessImpact: null,
    strategicRelevance: null,
    impactTrend: null,
    whyItMatters: null,
    lastUpdated: null,
    signals: [],
  }, [intelligenceById]);

  const attentionPriority = useCallback((row: PartnerRow): 'HIGH' | 'MEDIUM' | 'LOW' => {
    const intelligence = intelligenceFor(row);
    const recentSignal = intelligence.signals.length > 0;
    const activeProject = row.projects.some((project) => project.status === 'ACTIVE');
    if (intelligence.businessImpact === 'HIGH' || intelligence.businessImpact === 'CRITICAL' || (intelligence.strategicRelevance === 'HIGH' && recentSignal) || (activeProject && recentSignal)) return 'HIGH';
    if (intelligence.strategicRelevance === 'HIGH' || intelligence.impactTrend === 'UP') return 'MEDIUM';
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

  const activeProjectCount = useMemo(() => projects.filter((project) => project.status === 'ACTIVE' && Boolean(project.targetCompanyProfileId || project.targetCompanyName)).length, [projects]);

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

  // ── KPI metrics ───────────────────────────────────────────────────────────
  const totalPartners    = allRows.length;
  const strategicCount   = allRows.filter((row) => intelligenceFor(row).strategicRelevance === 'HIGH').length;
  const ownerAttentionCount = allRows.filter((row) => attentionPriority(row) !== 'LOW').length;
  const supplierCount = allRows.filter((row) => row.relationship === 'Supplier').length;
  const customerCount = allRows.filter((row) => row.relationship === 'Customer').length;

  // ── Distribution data ────────────────────────────────────────────────────
  const distSegments = [
    { value: totalPartners, color: 'var(--cds-interactive)', label: 'Đối tác' },
    { value: supplierCount, color: 'var(--cds-support-success)', label: 'Nhà cung cấp' },
    { value: customerCount, color: '#e67e22', label: 'Khách hàng' },
  ];

  const industryBars = useMemo(() => {
    const map: Record<string, number> = {};
    allRows.filter((row) => row.industry !== 'Chưa có dữ liệu').forEach(r => { map[r.industry] = (map[r.industry] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label: `${label} (${value} · ${Math.round((value / allRows.length) * 100)}%)`, value, max: allRows.length }));
  }, [allRows]);

  // ── Unique industry options ───────────────────────────────────────────────
  const industryOptions = useMemo(() => {
    const set = new Set(allRows.filter((row) => row.industry !== 'Chưa có dữ liệu').map(r => r.industry));
    return [{ value: 'All', label: 'Tất cả ngành' }, ...Array.from(set).map(v => ({ value: v, label: v }))];
  }, [allRows]);

  // ── Open Drawer ───────────────────────────────────────────────────────────
  const openDrawer = useCallback((row: PartnerRow) => {
    setSelectedRow(row);
    setDrawerTab('overview');
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
    if (!setActivePage || row.id.startsWith('project-company-')) {
      openDrawer(row);
      return;
    }
    localStorage.setItem('apms-selected-company', row.id);
    setActivePage('company-detail');
  }, [openDrawer, setActivePage]);

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
    { key: 'projects', header: 'Dự án', width: '70px', sortable: true, align: 'center',
      render: (_, row) => <button type="button" onClick={(event) => { event.stopPropagation(); openDrawer(row); setDrawerTab('projects'); }} style={{ border: 0, background: 'transparent', color: 'var(--cds-interactive)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{row.projects.length}</button>,
    },
    { key: 'latestActivity', header: 'Hoạt động gần đây', width: '180px',
      render: (_, row) => {
        const signal = latestSignalFor(row);
        return <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{signal ? `${signal.title} · ${formatDate(signal.date)}` : 'Chưa ghi nhận tín hiệu mới.'}</span>;
      },
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
    const profile = companyProfile as any;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Summary metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <MetricCard label="Mức độ quan trọng" value={selectedRow.importance} />
              <MetricCard label="Dự án" value={selectedRow.projects.length} />
              <MetricCard label="Hoạt động gần đây" value={selectedRow.latestActivity ? formatDate(selectedRow.latestActivity.date) : 'Chưa có dữ liệu'} />
            </div>
            {/* Profile details */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Thông tin doanh nghiệp</h3>
              {profileLoading ? (
                <p style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>Đang tải hồ sơ...</p>
              ) : (
                <>
                  <InfoRow label="Tên doanh nghiệp" value={selectedRow.name} />
                  <Divider />
                  <InfoRow label="Ngành" value={selectedRow.industry} />
                  <Divider />
                  <InfoRow label="Quan hệ" value={viRelationship(selectedRow.relationship)} />
                  <Divider />
                  <InfoRow label="Trạng thái" value={<StatusBadge status={viStatus(selectedRow.status)} />} />
                  {profile?.contact?.email && (
                    <>
                      <Divider />
                      <InfoRow label="Email" value={profile.contact.email} />
                    </>
                  )}
                  {profile?.contact?.phone && (
                    <>
                      <Divider />
                      <InfoRow label="Phone" value={profile.contact.phone} />
                    </>
                  )}
                  {profile?.business?.website && (
                    <>
                      <Divider />
                      <InfoRow label="Website" value={
                        <a href={profile.business.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-link-primary)', fontSize: '13px' }}>
                          {profile.business.website}
                        </a>
                      } />
                    </>
                  )}
                </>
              )}
            </div>
            {/* Verified recent activity */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Hoạt động đã xác minh</h3>
              {selectedRow.latestActivity ? <><div style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{selectedRow.latestActivity.title}</div><div style={{ fontSize: '12px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>{formatDate(selectedRow.latestActivity.date)}</div></> : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có hoạt động gần đây.</p>}
            </div>
          </div>
        );

      case 'projects':
        return <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedRow.projects.length ? selectedRow.projects.map((project) => <div key={project.id} style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><strong style={{ fontSize: '13px' }}>{cleanText(project.projectName) || 'Chưa có dữ liệu'}</strong><StatusBadge status={project.status} /></div><div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginTop: '5px' }}>Cập nhật: {formatDate(project.updatedAt || project.createdAt)}</div></div>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có dự án đang hoạt động.</p>}
        </div>;

      case 'contacts':
        return profileLoading ? <p style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>Đang tải thông tin liên hệ...</p> : (
          profile?.contact?.email || profile?.contact?.phone ? <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
            {profile?.contact?.email && <InfoRow label="Email" value={cleanText(profile.contact.email)} />}
            {profile?.contact?.email && profile?.contact?.phone && <Divider />}
            {profile?.contact?.phone && <InfoRow label="Điện thoại" value={cleanText(profile.contact.phone)} />}
          </div> : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có dữ liệu đã xác minh.</p>
        );

      case 'timeline':
        return selectedRow.latestActivity ? (
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{selectedRow.latestActivity.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>{formatDate(selectedRow.latestActivity.date)}</div>
          </div>
        ) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có hoạt động đã xác minh.</p>;

      case 'documents':
        return <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có tài liệu đã xác minh.</p>;

      case 'ai-summary':
        return <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có phân tích AI đã xác minh cho doanh nghiệp này.</p>;

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
        eyebrow={t('header.eyebrow')}
        description="Theo dõi các doanh nghiệp liên quan, quan hệ chiến lược và những thay đổi có thể ảnh hưởng đến hoạt động kinh doanh."
        breadcrumb={[{ label: t('header.dashboard') }, { label: t('header.title') }]}
        actions={
          setActivePage ? (
            <SecondaryButton size="sm" onClick={() => setActivePage('company-detail')}>{t('header.companyDetail')}</SecondaryButton>
          ) : undefined
        }
      />

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '88px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderRadius: 'var(--cds-border-radius)', animation: 'cds-pulse 1.2s ease infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <MetricCard label={t('sections.directory')} value={totalPartners} description={t('sections.connections')} />
          <MetricCard label={t('sections.strategicRelevance')} value={strategicCount} description="HIGH" />
          <MetricCard label={t('sections.attention')} value={ownerAttentionCount} description={t('sections.signals')} />
          <MetricCard label={t('sections.connections')} value={activeProjectCount} description={t('sections.activeProject')} />
        </div>
      )}

      {loadError && <div role="alert" style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid var(--cds-support-error)', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', borderRadius: 'var(--cds-border-radius)', fontSize: '13px' }}>{loadError}</div>}

      <section className="ecosystem-attention" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{t('sections.attention')}</h2>
        {filteredRows.filter((row) => attentionPriority(row) !== 'LOW').slice(0, 5).map((row) => {
          const intelligence = intelligenceFor(row);
          const signal = latestSignalFor(row);
          return <div className="ecosystem-attention-row" key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.2fr) repeat(3, minmax(110px, .65fr)) minmax(160px, 1fr) auto', gap: '12px', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--cds-border-subtle-00)' }}>
            <div><strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{row.name}</strong><div style={{ marginTop: '3px', fontSize: '12px', color: 'var(--cds-text-helper)' }}>{viRelationship(row.relationship)} · {row.projects.filter((project) => project.status === 'ACTIVE').length} project active</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{t('sections.strategicRelevance')}</span><div style={{ fontSize: '12px', fontWeight: 700, color: impactColor(intelligence.strategicRelevance) }}>{displayImpact(intelligence.strategicRelevance)}</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{t('sections.businessImpact')}</span><div style={{ fontSize: '12px', fontWeight: 700, color: impactColor(intelligence.businessImpact) }}>{displayImpact(intelligence.businessImpact)}</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{t('sections.impactTrend')}</span><div style={{ fontSize: '12px', fontWeight: 700 }}>{displayTrend(intelligence.impactTrend)}</div></div>
            <div style={{ minWidth: 0 }}><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{t('sections.whyItMatters')}</span><div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{intelligence.whyItMatters || signal?.title || t('sections.notAvailable')}</div><div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '3px' }}>{t('sections.updated')}: {formatDate(intelligence.lastUpdated || signal?.date)}</div></div>
            <SecondaryButton size="sm" onClick={() => openCompanyDetail(row)}>{t('sections.viewCompany')}</SecondaryButton>
          </div>;
        })}
        {filteredRows.every((row) => attentionPriority(row) === 'LOW') && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('sections.attentionEmpty')}</p>}
      </section>

      <section className="ecosystem-signals" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{t('sections.signals')}</h2>
        {recentSignals.map((signal) => <div className="ecosystem-signal-row" key={`${signal.companyId}-${signal.id}`} style={{ display: 'grid', gridTemplateColumns: '150px minmax(240px, 1fr) 110px 100px auto', gap: '12px', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--cds-border-subtle-00)' }}><div><strong style={{ fontSize: '12px' }}>{signal.companyName}</strong><div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.category}</div></div><div style={{ minWidth: 0 }}><div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal.title}</div><div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.source || 'N/A'}</div></div><span style={{ fontSize: '12px', fontWeight: 600, color: impactColor(signal.businessImpact) }}>{displayImpact(signal.businessImpact)}</span><span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{formatDate(signal.date)}</span>{signal.sourceUrl ? <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cds-link-primary)' }}>Xem nguồn</a> : <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>N/A</span>}</div>)}
        {recentSignals.length === 0 && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('sections.signalsEmpty')}</p>}
      </section>

      <section style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', marginBottom: '16px', overflowX: 'auto' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{t('sections.connections')}</h2>
        {projects.filter((project) => project.targetCompanyName).length > 0 ? <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '12px' }}><thead><tr style={{ textAlign: 'left', color: 'var(--cds-text-secondary)', background: 'var(--cds-layer-01)' }}>{[t('sections.project'), t('sections.company'), t('sections.relationship'), t('sections.role'), t('sections.status'), t('sections.businessImpact')].map((label) => <th key={label} style={{ padding: '9px' }}>{label}</th>)}</tr></thead><tbody>{projects.filter((project) => project.targetCompanyName).map((project) => { const row = allRows.find((company) => company.id === project.targetCompanyProfileId || company.name === project.targetCompanyName); const intelligence = row ? intelligenceFor(row) : null; return <tr key={project.id} style={{ borderTop: '1px solid var(--cds-border-subtle-00)' }}><td style={{ padding: '9px', fontWeight: 600 }}>{cleanText(project.projectName) || t('sections.notAvailable')}</td><td style={{ padding: '9px' }}>{cleanText(project.targetCompanyName) || t('sections.notAvailable')}</td><td style={{ padding: '9px' }}>{row ? viRelationship(row.relationship) : t('sections.notAvailable')}</td><td style={{ padding: '9px' }}>{t('sections.notAvailable')}</td><td style={{ padding: '9px' }}>{project.status || t('sections.notAvailable')}</td><td style={{ padding: '9px', color: impactColor(intelligence?.businessImpact ?? null), fontWeight: 600 }}>{displayImpact(intelligence?.businessImpact ?? null)}</td></tr>; })}</tbody></table> : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('sections.connectionsEmpty')}</p>}
      </section>

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
            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 400, color: 'var(--cds-text-helper)' }}>({t('sections.directoryCount', { count: filteredRows.length })})</span>
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
        {selectedRow && (
          <>
            {/* Metadata strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <StatusBadge status={viStatus(selectedRow.status)} />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Mức độ quan trọng:</span>
              <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{selectedRow.importance}</strong>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-text-helper)' }}>Cập nhật: {formatDate(selectedRow.latestActivity?.date)}</span>
            </div>

            {/* Tabs */}
            <Tabs items={DRAWER_TABS} activeId={drawerTab} onChange={setDrawerTab} />

            {/* Tab content */}
            <div style={{ marginTop: '16px' }}>
              {renderDrawerTab()}
            </div>
          </>
        )}
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
