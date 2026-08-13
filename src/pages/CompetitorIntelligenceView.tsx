/* eslint-disable @typescript-eslint/no-explicit-any */
// Enterprise Competitor Intelligence Center â€” Microsoft Dynamics / Carbon Design System
// Executive layout with interactive charts, multi-tab drawer, advanced filters, and zero popups.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../services/api';
import { ExternalLink } from 'lucide-react';
import { externalDataApi } from '../API/externalDataApi';
import type { ProfileResponse, ProjectResponse, ScoreSnapshotDto } from '../types/domain';
import type { PageResponse } from '../services/api';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  EmptyState,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';

// â”€â”€â”€ Domain Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface TimelineEvent {
  id: string;
  icon: string;
  category: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  sourceUrl?: string | null;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence?: number | null;
  rawDate?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  snippet: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  url?: string;
  topics: string[];
  relatedCompany: string | null;
  businessImpact: string | null;
  confidence: number | null;
  rawDate?: string;
}

export interface MarketExpansionItem {
  region: string;
  details: string;
  status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
  impact: string;
  source: string;
  sourceUrl: string | null;
  date?: string | null;
}

export interface HiringItem {
  role: string;
  count: number | null;
  location: string;
  focusArea: string;
  date: string;
  source: string;
  sourceUrl: string | null;
}

export interface FinancialSignal {
  type: string;
  value: string;
  date: string;
  details: string;
}

export interface TechInvestment {
  area: string;
  details: string;
  patentsCount: number;
  techStack: string[];
}

export interface StrategicAction {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTo?: string;
}

export interface EnterpriseCompetitor {
  id: string;
  name: string;
  industry: string;
  country: string;
  threatScore: number;
  threatTrend: 'UP' | 'DOWN' | 'STABLE' | null;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  latestActivity: string;
  marketShare: number | null;
  aiConfidence: number | null;
  lastUpdated: string;
  isWatchlist: boolean;
  overview: string | null;
  timeline: TimelineEvent[];
  news: NewsItem[];
  marketExpansion: MarketExpansionItem[];
  hiringActivity: HiringItem[];
  financialSignals: FinancialSignal[];
  techInvestments: TechInvestment[];
  strengths: string[];
  weaknesses: string[];
  aiRecommendation: string | null;
  aiSummaryStatus: 'AVAILABLE' | 'NO_DATA';
  strategicActions: StrategicAction[];
  relationship: 'PARTNER' | 'COMPETITOR' | 'SUPPLIER' | 'CUSTOM' | null;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  strategicRelevance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  impactTrend: 'INCREASING' | 'STABLE' | 'DECREASING' | null;
  whyItMatters: string[];
  signalsCount: number;
  marketExpansionCount: number;
  hiringCount: number;
  techInvestmentsCount: number;
  businessImpactOrder: number;
  strategicRelevanceOrder: number;
  lastUpdatedTime: number;
  
  // Expanded backend-driven metadata
  employeeCount: number | null;
  legalName: string | null;
  ticker: string | null;
  website: string | null;
  headquarters: string | null;
  markets: string[] | null;
  businessModel: string | null;
  leadership: { name: string; position: string; sourceUrl: string | null; researchedAt: string }[];
  products: { name: string; category: string; description: string }[];
}

const repairMojibake = (value: string) => {
  if (!/[\u00c2\u00c3\u00e2]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
};

const toSafeText = (value?: string | null) => {
  if (!value) return null;
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  return text ? repairMojibake(text) : null;
};

const safeUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

const normalizeSource = (value?: string | null, fallbackUrl?: string | null) => {
  if (!value) return { name: 'Source not available', url: safeUrl(fallbackUrl) };
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
  const publisher = toSafeText(doc.querySelector('font')?.textContent);
  const anchor = doc.querySelector('a[href]');
  return {
    name: publisher || toSafeText(value) || 'Source not available',
    url: safeUrl(fallbackUrl) || safeUrl(anchor?.getAttribute('href')),
  };
};

const normalizeCategory = (cat?: string | null): string => {
  if (!cat) return 'NEWS';
  const c = cat.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (['NEWS', 'COMPANY_NEWS', 'ARTICLE'].includes(c)) return 'NEWS';
  if (['TECHNOLOGY', 'TECH', 'INNOVATION'].includes(c)) return 'TECHNOLOGY';
  if (['PARTNERSHIP', 'PARTNERSHIPS', 'COLLABORATION'].includes(c)) return 'PARTNERSHIP';
  if (['MARKET_EXPANSION', 'EXPANSION', 'INFRASTRUCTURE'].includes(c)) return 'MARKET_EXPANSION';
  if (['FINANCIAL', 'FINANCIALS', 'REVENUE', 'PROFIT'].includes(c)) return 'FINANCIAL';
  if (['LEADERSHIP', 'EXECUTIVE', 'BOARD', 'MEMBER', 'PEOPLE'].includes(c)) return 'LEADERSHIP';
  if (['HIRING', 'RECRUITMENT', 'JOB', 'JOBS'].includes(c)) return 'HIRING';
  if (['LEGAL', 'REGULATORY', 'COMPLIANCE', 'LAW'].includes(c)) return 'LEGAL';
  if (['PRODUCT', 'SERVICE', 'PRODUCTS'].includes(c)) return 'PRODUCT';
  if (['INVESTMENT', 'FUNDING', 'CAPITAL'].includes(c)) return 'INVESTMENT';
  
  if (c.includes('TECH')) return 'TECHNOLOGY';
  if (c.includes('PARTNER')) return 'PARTNERSHIP';
  if (c.includes('EXPAN')) return 'MARKET_EXPANSION';
  if (c.includes('FINANC')) return 'FINANCIAL';
  if (c.includes('LEADER') || c.includes('EXEC')) return 'LEADERSHIP';
  if (c.includes('HIRE') || c.includes('RECRUIT')) return 'HIRING';
  if (c.includes('LEG') || c.includes('REGUL')) return 'LEGAL';
  if (c.includes('PROD')) return 'PRODUCT';
  if (c.includes('INVEST')) return 'INVESTMENT';
  
  return 'NEWS';
};

const normalizeConfidence = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const percentage = value >= 0 && value <= 1 ? value * 100 : value;
  return percentage >= 0 && percentage <= 100 ? Math.round(percentage) : null;
};

const normalizeRelationship = (value?: string | null): EnterpriseCompetitor['relationship'] => {
  const relationship = value?.toUpperCase();
  return relationship === 'PARTNER' || relationship === 'COMPETITOR' || relationship === 'SUPPLIER' || relationship === 'CUSTOM' ? relationship : null;
};

const normalizeImpact = (value?: string | null): EnterpriseCompetitor['businessImpact'] => {
  const impact = value?.toUpperCase();
  return impact === 'LOW' || impact === 'MEDIUM' || impact === 'HIGH' || impact === 'CRITICAL' ? impact : null;
};

const formatBackendDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatAmount = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return null;
  return new Intl.NumberFormat(undefined, {
    style: currency ? 'currency' : 'decimal',
    currency: currency || undefined,
    maximumFractionDigits: 0,
  }).format(amount);
};

const normalizeCompanyName = (value?: string | null) =>
  (value || '').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const buildOverview = (profile?: ProfileResponse, fallback?: string) => {
  if (!profile) return toSafeText(fallback);

  const parts = [
    profile.business?.businessModel,
    profile.business?.industries?.length ? `Industries: ${profile.business.industries.join(', ')}` : undefined,
    profile.business?.markets?.length ? `Markets: ${profile.business.markets.join(', ')}` : undefined,
    profile.insights?.strengths?.[0],
  ].filter(Boolean);

  return parts.join('. ') || toSafeText(fallback) || null;
};

const toFinancialSignals = (profile?: ProfileResponse): FinancialSignal[] => {
  const financial = profile?.financial;
  if (!financial) return [];
  const reportedAt = formatBackendDate(profile?.metadata?.updatedAt || profile?.metadata?.createdAt);
  const signals: FinancialSignal[] = [];
  const add = (type: string, value: string | null | undefined, details: string) => {
    if (value) signals.push({ type, value, date: reportedAt, details });
  };
  add('Revenue', formatAmount(financial.revenue, financial.revenueCurrency), 'Revenue recorded in the approved company profile.');
  add('Revenue growth', financial.revenueGrowth === undefined ? null : `${financial.revenueGrowth}%`, 'Growth recorded in the approved company profile.');
  add('Profit margin', financial.profitMargin === undefined ? null : `${financial.profitMargin}%`, 'Margin recorded in the approved company profile.');
  add('Debt ratio', financial.debtRatio === undefined ? null : `${financial.debtRatio}%`, 'Debt ratio recorded in the approved company profile.');
  add('Charter capital', formatAmount(financial.charterCapital, financial.revenueCurrency), 'Charter capital recorded in the approved company profile.');
  add('Funding stage', financial.fundingStage, 'Funding stage recorded in the approved company profile.');
  add('Profitability', financial.profitability, 'Profitability recorded in the approved company profile.');
  return signals;
};

// â”€â”€â”€ Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ThreatDistributionDonut: React.FC<{
  critical: number;
  high: number;
  medium: number;
  low: number;
}> = ({ critical, high, medium, low }) => {
  const total = critical + high + medium + low || 1;
  const size = 110;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices = [
    { val: critical, color: 'var(--cds-support-error)', label: 'Critical (â‰¥85)' },
    { val: high, color: 'var(--cds-risk-high)', label: 'High (70-84)' },
    { val: medium, color: 'var(--cds-risk-medium)', label: 'Medium (50-69)' },
    { val: low, color: 'var(--cds-support-success)', label: 'Low (<50)' },
  ];

  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {slices.map((slice, idx) => {
            const percent = slice.val / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{total}</span>
          <span style={{ fontSize: '10px', color: 'var(--cds-text-helper)', textTransform: 'uppercase' }}>Entities</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', width: '100%' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>{s.label.split(' ')[0]}</span>
              <strong style={{ color: 'var(--cds-text-primary)', marginLeft: '6px' }}>{s.val}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// â”€â”€â”€ Inline Horizontal Bar Chart Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const IndustryBarChart: React.FC<{ data: { industry: string; count: number }[] }> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, idx) => {
        const pct = (item.count / maxCount) * 100;
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--cds-text-primary)', fontWeight: 500 }}>{item.industry}</span>
              <span style={{ color: 'var(--cds-text-secondary)', fontWeight: 600 }}>{item.count}</span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--cds-interactive)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// â”€â”€â”€ Inline Progress Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ThreatScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const color =
    score >= 85 ? 'var(--cds-support-error)' :
    score >= 70 ? 'var(--cds-risk-high)' :
    score >= 50 ? 'var(--cds-risk-medium)' :
    'var(--cds-support-success)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 700, fontSize: '13px', color, minWidth: '26px', textAlign: 'right' }}>{score}</span>
      <div style={{ width: '70px', height: '5px', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CompetitorIntelligenceView: React.FC = () => {
  const { t } = useTranslation('competitor-intelligence');
  
  const drawerTabs = useMemo(() => [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'timeline', label: t('tabs.timeline_news') },
    { id: 'market', label: t('tabs.expansion') },
    { id: 'hiring', label: t('tabs.hiring') },
    { id: 'ai-analysis', label: t('tabs.ai-recommend') },
  ], [t]);
  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [competitors, setCompetitors] = useState<EnterpriseCompetitor[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EnterpriseCompetitor | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerLoadError, setDrawerLoadError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [riskLevel, setRiskLevel] = useState('All'); // businessImpact / riskLevel filter
  const [relationshipFilter, setRelationshipFilter] = useState('All');
  const [signalTypeFilter, setSignalTypeFilter] = useState('All');
  const [threatScoreFilter, setThreatScoreFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [watchlistFilter, setWatchlistFilter] = useState('All');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonDays, setComparisonDays] = useState(30);
  const [comparisonSubmitted, setComparisonSubmitted] = useState(false);
  const [comparisonReferenceTime, setComparisonReferenceTime] = useState(0);

  // Dynamic synchronization & freshness state
  const [mainTab, setMainTab] = useState('watchlist');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'updating' | 'success' | 'failed'>('idle');
  const [syncSummary, setSyncSummary] = useState<{
    newSignals: number;
    highImpact: number;
    strategicChanges: number;
    marketExpansion: number;
  } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('apms-last-sync-time');
    return saved ? new Date(saved) : null;
  });
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [existingSignalIds, setExistingSignalIds] = useState<Set<string>>(new Set());

  // Operation state (Run AI Scan / Deep AI Analysis)
  const [runningScan, setRunningScan] = useState(false);
  const [runningDeepAnalysis, setRunningDeepAnalysis] = useState(false);
  const [opMessage, setOpMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    setComparisonIds((current) => {
      const available = new Set(competitors.map((company) => company.id));
      const retained = current.filter((id) => available.has(id));
      return retained.length ? retained : competitors.slice(0, 2).map((company) => company.id);
    });
  }, [competitors]);

  // â”€â”€ Backend API Fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const ctrl = new AbortController();
    const fetchBackend = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [compRes, scoreRes, profileRes, ownerRes, newsRes, projectRes] = await Promise.allSettled([
          api.get<any[]>('/dashboard/competitors', { signal: ctrl.signal }),
          api.get<ScoreSnapshotDto[]>('/dashboard/recent-scores', { signal: ctrl.signal }),
          api.get<{ content?: ProfileResponse[] }>('/profiles', { params: { page: 0, size: 100 }, signal: ctrl.signal }),
          api.get<ProfileResponse>('/owner/company-profile', { signal: ctrl.signal }),
          externalDataApi.getItems('NEWS', { page: 0, size: 100 }),
          api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 }, signal: ctrl.signal }),
        ]);

        if (ctrl.signal.aborted) return;

        const rawComps: any[] = compRes.status === 'fulfilled' && Array.isArray(compRes.value?.data) ? compRes.value.data : [];
        const scores: ScoreSnapshotDto[] = scoreRes.status === 'fulfilled' && Array.isArray(scoreRes.value?.data) ? scoreRes.value.data : [];
        const profiles = profileRes.status === 'fulfilled' ? profileRes.value.data?.content ?? [] : [];
        const ownerCompanyId = ownerRes.status === 'fulfilled' ? ownerRes.value.data?.companyId : undefined;
        const articles = newsRes.status === 'fulfilled' ? newsRes.value.content ?? [] : [];
        const ownerProjects = projectRes.status === 'fulfilled' ? projectRes.value.data?.content ?? [] : [];

        const scoreMap = new Map<string, ScoreSnapshotDto>();
        scores.forEach((s) => { if (s.companyId && !scoreMap.has(s.companyId)) scoreMap.set(s.companyId, s); });
        const profileMap = new Map(profiles.map((profile) => [profile.companyId || profile.id, profile]));
        const profileByName = new Map(
          profiles.flatMap((profile) => [
            [normalizeCompanyName(profile.identity?.tradeName), profile] as const,
            [normalizeCompanyName(profile.identity?.legalName), profile] as const,
          ]).filter(([name]) => Boolean(name)),
        );

        const filteredComps = rawComps.filter((c) => c.companyId && c.companyId !== ownerCompanyId);
        
        // Prefetch intelligence data for all competitors in parallel
        const competitorIntelResponses = await Promise.all(
          filteredComps.map(async (c) => {
            try {
              const res = await api.get<any>(`/owner/company-intelligence/${c.companyId}`, { signal: ctrl.signal });
              return { companyId: c.companyId, intelligence: res.data };
            } catch (err) {
              console.error('Failed to prefetch intelligence for ' + c.name, err);
              return { companyId: c.companyId, intelligence: null };
            }
          })
        );
        const intelMap = new Map(competitorIntelResponses.map((r) => [r.companyId, r.intelligence]));

        const mapped: EnterpriseCompetitor[] = filteredComps.map((c, idx) => {
          const snap = scoreMap.get(c.companyId);
          const profile = profileMap.get(c.companyId) || profileByName.get(normalizeCompanyName(c.name));
          const intelligence = intelMap.get(c.companyId);
          
          const scoreVal = snap?.competitionLevel ?? snap?.riskLevel ?? snap?.totalScore ?? 0;
          const companyNames = new Set([
            normalizeCompanyName(c.name),
            normalizeCompanyName(profile?.identity?.tradeName),
            normalizeCompanyName(profile?.identity?.legalName),
          ].filter(Boolean));
          
          const companyArticles = articles.filter((article) =>
            article.companyProfileId === c.companyId
            || article.companyProfileId === profile?.companyId
            || article.relatedCompanyId === c.companyId
            || article.relatedCompanyId === profile?.companyId
            || companyNames.has(normalizeCompanyName(article.relatedCompanyName))
            || article.companySentiments?.some((sentiment) =>
              sentiment.companyId === c.companyId
              || sentiment.companyId === profile?.companyId
              || companyNames.has(normalizeCompanyName(sentiment.companyName)),
            ),
          );

          const news: NewsItem[] = intelligence?.news && intelligence.news.length > 0 ? intelligence.news.map((item: any) => ({
            id: item.id,
            title: toSafeText(item.title) || 'Untitled article',
            source: toSafeText(item.source) || 'Source not available',
            date: formatBackendDate(item.publishedAt),
            rawDate: item.publishedAt || item.createdAt,
            snippet: toSafeText(item.aiSummary) || toSafeText(item.summary) || 'Summary not available.',
            sentiment: item.sentiment === 'POSITIVE' || item.sentiment === 'NEGATIVE' ? item.sentiment : 'NEUTRAL',
            url: safeUrl(item.sourceUrl) || undefined,
            topics: Array.isArray(item.topics) ? item.topics : [],
            relatedCompany: item.companyIds?.[0] || null,
            businessImpact: normalizeImpact(item.businessImpact),
            confidence: normalizeConfidence(item.sentimentConfidence || intelligence.executiveBrief?.confidence),
          })) : companyArticles.map((article) => ({
            id: article.id,
            title: toSafeText(article.title) || 'Untitled article',
            source: normalizeSource(article.source || article.sourceDomain, article.url).name,
            date: formatBackendDate(article.publishedAt || article.createdAt),
            rawDate: article.publishedAt || article.createdAt,
            snippet: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'Summary not available.',
            sentiment: article.sentiment === 'POSITIVE' || article.sentiment === 'NEGATIVE' ? article.sentiment : 'NEUTRAL',
            url: normalizeSource(article.source || article.sourceDomain, article.url).url || undefined,
            topics: (article.topics || []).filter(Boolean),
            relatedCompany: toSafeText(article.relatedCompanyName),
            businessImpact: normalizeImpact(article.riskLevel || article.opportunityLevel),
            confidence: normalizeConfidence(article.sentimentConfidence),
          }));

          const rawTimeline = intelligence?.timeline && intelligence.timeline.length > 0 ? intelligence.timeline.map((item: any) => ({
            id: item.id,
            icon: '•',
            category: normalizeCategory(item.eventType),
            title: toSafeText(item.summary) || 'Activity signal',
            date: formatBackendDate(item.date),
            rawDate: item.date || item.createdAt,
            summary: toSafeText(item.summary) || 'Summary not available.',
            source: toSafeText(item.source) || 'Source not available',
            sourceUrl: safeUrl(item.sourceUrl),
            importance: normalizeImpact(item.impact),
            sentiment: item.sentiment || 'NEUTRAL',
            confidence: normalizeConfidence(item.confidence ?? intelligence.executiveBrief?.confidence),
          })) : companyArticles.map((article) => ({
            id: article.id,
            icon: '•',
            category: normalizeCategory(article.category),
            title: toSafeText(article.title) || 'Untitled article',
            date: formatBackendDate(article.publishedAt || article.createdAt),
            rawDate: article.publishedAt || article.createdAt,
            summary: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'Summary not available.',
            source: normalizeSource(article.source || article.sourceDomain, article.url).name,
            sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url,
            importance: normalizeImpact(article.riskLevel || article.opportunityLevel),
            sentiment: article.sentiment === 'POSITIVE' || article.sentiment === 'NEGATIVE' ? article.sentiment : 'NEUTRAL',
            confidence: normalizeConfidence(article.sentimentConfidence),
          }));

          const timeline = [...rawTimeline].sort((left, right) => {
            const tLeft = left.rawDate ? new Date(left.rawDate).getTime() : 0;
            const tRight = right.rawDate ? new Date(right.rawDate).getTime() : 0;
            return tRight - tLeft;
          });

          const marketExpansion = intelligence?.marketExpansion && intelligence.marketExpansion.length > 0 ? intelligence.marketExpansion.map((item: any) => ({
            region: item.market || 'Chưa có dữ liệu xác minh',
            details: item.description || 'Chưa có dữ liệu xác minh',
            status: 'ACTIVE' as const,
            impact: item.businessImpact || 'Chưa có dữ liệu xác minh',
            source: item.source || 'Source not available',
            sourceUrl: safeUrl(item.sourceUrl),
            date: item.date || null,
          })) : companyArticles
              .filter((article) => article.topics?.includes('MARKET_EXPANSION'))
              .map((article) => ({
                region: toSafeText(article.relatedCompanyName) || c.name,
                details: toSafeText(article.aiSummary) || toSafeText(article.summary) || toSafeText(article.title) || 'Chưa có dữ liệu xác minh',
                status: 'ACTIVE' as const,
                impact: normalizeImpact(article.riskLevel || article.opportunityLevel) || 'Chưa có dữ liệu xác minh',
                source: normalizeSource(article.source || article.sourceDomain, article.url).name,
                sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url,
                date: article.publishedAt || article.createdAt || null,
              }));

          const hiringActivity = intelligence?.hiring && intelligence.hiring.length > 0 ? intelligence.hiring.map((item: any) => ({
            role: toSafeText(item.title) || 'Hiring signal',
            count: typeof item.openPositions === 'number' ? item.openPositions : null,
            location: toSafeText(item.location) || 'Chưa có dữ liệu xác minh',
            focusArea: toSafeText(item.description) || 'Chưa có dữ liệu xác minh',
            date: formatBackendDate(item.date),
            source: toSafeText(item.source) || 'Source not available',
            sourceUrl: safeUrl(item.sourceUrl)
          })) : companyArticles
              .filter((article) => article.topics?.includes('HIRING'))
              .map((article) => ({
                role: toSafeText(article.title) || 'Hiring signal',
                count: null,
                location: profile?.contact?.addresses?.[0]?.city || 'Chưa có dữ liệu xác minh',
                focusArea: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'Chưa có dữ liệu xác minh',
                date: formatBackendDate(article.publishedAt || article.createdAt),
                source: normalizeSource(article.source || article.sourceDomain, article.url).name,
                sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url
              }));

          const relType = normalizeRelationship(intelligence?.relationship?.type || c.relationshipType || c.relationship);
          const businessImpact = normalizeImpact(intelligence?.relationship?.businessImpact);
          const strategicRelevance = normalizeImpact(intelligence?.relationship?.strategicRelevance || null);
          const impactTrend = intelligence?.relationship?.impactTrend || null;

          const whyItMatters = Array.isArray(intelligence?.executiveBrief?.whyItMatters) ? intelligence.executiveBrief.whyItMatters : [
            profile?.business?.markets?.length ? `Hoạt động tại thị trường: ${profile.business.markets.join(', ')}.` : null,
            profile?.business?.products?.[0]?.name ? `Cung cấp giải pháp: ${profile.business.products[0].name}.` : null,
            companyArticles[0] ? `Tin tức đã xác minh: ${toSafeText(companyArticles[0].title)}.` : null,
            profile?.insights?.strengths?.[0] || null,
          ].filter((reason): reason is string => Boolean(reason));

          const lastUpdatedStr = intelligence?.metadata?.lastUpdated || profile?.metadata?.updatedAt || snap?.createdAt || profile?.metadata?.createdAt;

          const businessImpactOrder = businessImpact === 'CRITICAL' ? 4 : businessImpact === 'HIGH' ? 3 : businessImpact === 'MEDIUM' ? 2 : businessImpact === 'LOW' ? 1 : 0;
          const strategicRelevanceOrder = strategicRelevance === 'CRITICAL' ? 4 : strategicRelevance === 'HIGH' ? 3 : strategicRelevance === 'MEDIUM' ? 2 : strategicRelevance === 'LOW' ? 1 : 0;

          return {
            id: c.companyId || `comp-${idx}`,
            name: profile?.identity?.tradeName || profile?.identity?.legalName || c.name || 'Chưa có dữ liệu xác minh',
            industry: profile?.business?.industries?.join(', ') || c.industry || 'Chưa có dữ liệu xác minh',
            country: profile?.contact?.addresses?.find((address) => address.country)?.country || c.country || 'Chưa có dữ liệu xác minh',
            threatScore: Number(scoreVal),
            threatTrend: null,
            riskLevel: null,
            latestActivity: news[0]?.title || c.latestActivity || profile?.business?.businessModel || 'Chưa có dữ liệu xác minh',
            marketShare: c.marketShare ? Number(c.marketShare) : null,
            aiConfidence: normalizeConfidence(intelligence?.executiveBrief?.confidence),
            lastUpdated: formatBackendDate(lastUpdatedStr),
            isWatchlist: true,
            overview: intelligence?.executiveBrief?.summary || buildOverview(profile, c.description) || 'Chưa có dữ liệu xác minh',
            timeline,
            news,
            marketExpansion,
            hiringActivity,
            financialSignals: toFinancialSignals(profile),
            techInvestments: (profile?.business?.products ?? []).map((product) => ({ area: product.category || product.name || 'Product', details: product.description || 'Chưa có dữ liệu xác minh', patentsCount: 0, techStack: [] })),
            strengths: profile?.insights?.strengths ?? [],
            weaknesses: profile?.insights?.weaknesses ?? [],
            aiRecommendation: intelligence?.executiveBrief?.summary || null,
            aiSummaryStatus: intelligence?.aiSummary?.status === 'AVAILABLE' ? 'AVAILABLE' : 'NO_DATA',
            strategicActions: [],
            relationship: relType,
            businessImpact,
            strategicRelevance,
            impactTrend,
            whyItMatters,
            signalsCount: timeline.length,
            marketExpansionCount: marketExpansion.length,
            hiringCount: hiringActivity.length,
            techInvestmentsCount: (profile?.business?.products ?? []).length,
            businessImpactOrder,
            strategicRelevanceOrder,
            lastUpdatedTime: lastUpdatedStr ? new Date(lastUpdatedStr).getTime() : 0,

            // New company metadata mapping
            employeeCount: intelligence?.company?.employeeCount || profile?.companySize?.employeeCount || null,
            legalName: intelligence?.company?.legalName || profile?.identity?.legalName || null,
            ticker: intelligence?.company?.ticker || profile?.identity?.stockTicker || null,
            website: intelligence?.company?.website || profile?.contact?.website || null,
            headquarters: intelligence?.company?.headquarters || profile?.contact?.addresses?.[0]?.fullAddress || null,
            markets: intelligence?.company?.markets || profile?.business?.markets || [],
            businessModel: intelligence?.company?.businessModel || profile?.business?.businessModel || null,
            leadership: Array.isArray(intelligence?.leadership) ? intelligence.leadership.map((m: any) => ({ name: m.name, position: m.position, sourceUrl: m.sourceUrl || null, researchedAt: formatBackendDate(m.researchedAt) })) : (Array.isArray(profile?.companyMembers) ? profile.companyMembers.map((m: any) => ({ name: m.fullName, position: m.position, sourceUrl: m.sourceUrl || null, researchedAt: formatBackendDate(m.researchedAt) })) : []),
            products: Array.isArray(intelligence?.products) ? intelligence.products : (Array.isArray(profile?.business?.products) ? profile.business.products.map((p: any) => ({ name: p.name, category: p.category, description: p.description })) : [])
          };
        });

        if (compRes.status !== 'fulfilled') {
          const reason = compRes.reason;
          if (reason instanceof ApiError && reason.status === 401) {
            throw new Error('Your Owner session has expired. Please sign in again.');
          }
          throw new Error(reason instanceof Error ? reason.message : 'Unable to load competitors from the backend.');
        }
        setCompetitors(mapped);
        setProjects(ownerProjects);

        if (syncStatus === 'updating') {
          let newSignalsCount = 0;
          let highImpactCount = 0;
          let strategicCount = 0;
          let marketExpansionCount = 0;

          mapped.forEach((c) => {
            c.timeline.forEach((t) => {
              if (t.id && !existingSignalIds.has(t.id)) {
                newSignalsCount++;
                if (t.importance === 'HIGH' || t.importance === 'CRITICAL') {
                  highImpactCount++;
                }
                const cat = (t.category || '').toUpperCase();
                if (['STRATEGIC', 'LEADERSHIP', 'INVESTMENT', 'PARTNERSHIP', 'TECHNOLOGY'].includes(cat)) {
                  strategicCount++;
                }
                if (cat === 'MARKET_EXPANSION') {
                  marketExpansionCount++;
                }
              }
            });
          });

          // Fallback to recent 7-day signals if no absolute database difference is captured
          if (newSignalsCount === 0) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            mapped.forEach((c) => {
              c.timeline.forEach((t) => {
                const itemDate = new Date(t.date);
                if (!isNaN(itemDate.getTime()) && itemDate >= oneWeekAgo) {
                  newSignalsCount++;
                  if (t.importance === 'HIGH' || t.importance === 'CRITICAL') {
                    highImpactCount++;
                  }
                  const cat = (t.category || '').toUpperCase();
                  if (['STRATEGIC', 'LEADERSHIP', 'INVESTMENT', 'PARTNERSHIP', 'TECHNOLOGY'].includes(cat)) {
                    strategicCount++;
                  }
                  if (cat === 'MARKET_EXPANSION') {
                    marketExpansionCount++;
                  }
                }
              });
            });
          }

          setSyncSummary({
            newSignals: newSignalsCount,
            highImpact: highImpactCount,
            strategicChanges: strategicCount,
            marketExpansion: marketExpansionCount,
          });
          setSyncStatus('success');
          setShowSyncSummary(true);
          const now = new Date();
          setLastSyncTime(now);
          localStorage.setItem('apms-last-sync-time', now.toISOString());
        }
      } catch (error) {
        setCompetitors([]);
        setProjects([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load Owner competitor intelligence.');
      } finally {
        setLoading(false);
      }
    };
    void fetchBackend();
    return () => ctrl.abort();
  }, [dataVersion, syncStatus, existingSignalIds]);

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompetitors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isWatchlist: !c.isWatchlist } : c))
    );
  };

  const openDrawer = (comp: EnterpriseCompetitor) => {
    setSelected(comp);
    setDrawerTab('overview');
    setDrawerLoadError(null);
    setDrawerLoading(true);
    setDrawerOpen(true);
    void api.get<any>(`/owner/company-intelligence/${comp.id}`).then((response) => {
      const intelligence = response.data;
      if (!intelligence) return;
      setSelected((current) => {
        if (!current || current.id !== comp.id) return current;
        const news: NewsItem[] = Array.isArray(intelligence.news) ? intelligence.news.map((item: any) => ({
          id: item.id,
          title: toSafeText(item.title) || 'Untitled article',
          source: toSafeText(item.source) || 'Source not available',
          date: formatBackendDate(item.publishedAt),
          rawDate: item.publishedAt || item.createdAt,
          snippet: toSafeText(item.aiSummary) || toSafeText(item.summary) || 'Summary not available.',
          sentiment: item.sentiment === 'POSITIVE' || item.sentiment === 'NEGATIVE' ? item.sentiment : 'NEUTRAL',
          url: safeUrl(item.sourceUrl) || undefined,
          topics: Array.isArray(item.topics) ? item.topics : [],
          relatedCompany: item.companyIds?.[0] || null,
          businessImpact: normalizeImpact(item.businessImpact),
          confidence: normalizeConfidence(intelligence.executiveBrief?.confidence),
        })) : current.news;
        
        const rawTimeline = Array.isArray(intelligence.timeline) ? intelligence.timeline.map((item: any) => ({
          id: item.id,
          icon: '•',
          category: item.eventType || 'NEWS',
          title: toSafeText(item.summary) || 'Activity signal',
          date: formatBackendDate(item.date),
          rawDate: item.date || item.createdAt,
          summary: toSafeText(item.summary) || 'Summary not available.',
          source: toSafeText(item.source) || 'Source not available',
          sourceUrl: safeUrl(item.sourceUrl),
          importance: normalizeImpact(item.impact)
        })) : current.timeline;

        const timeline = [...rawTimeline].sort((left, right) => {
          const tLeft = left.rawDate ? new Date(left.rawDate).getTime() : 0;
          const tRight = right.rawDate ? new Date(right.rawDate).getTime() : 0;
          return tRight - tLeft;
        });

        return {
          ...current,
          name: intelligence.company?.name || current.name,
          industry: intelligence.company?.industries?.join(', ') || current.industry,
          country: intelligence.company?.headquarters || current.country,
          relationship: normalizeRelationship(intelligence.relationship?.type) || current.relationship,
          businessImpact: normalizeImpact(intelligence.relationship?.businessImpact) || current.businessImpact,
          strategicRelevance: normalizeImpact(intelligence.relationship?.strategicRelevance) || current.strategicRelevance,
          impactTrend: intelligence.relationship?.impactTrend || null,
          overview: intelligence.executiveBrief?.summary || current.overview,
          aiRecommendation: intelligence.aiSummary?.content || null,
          aiSummaryStatus: intelligence.aiSummary?.status === 'AVAILABLE' ? 'AVAILABLE' : 'NO_DATA',
          whyItMatters: Array.isArray(intelligence.executiveBrief?.whyItMatters) ? intelligence.executiveBrief.whyItMatters : current.whyItMatters,
          aiConfidence: normalizeConfidence(intelligence.executiveBrief?.confidence),
          lastUpdated: formatBackendDate(intelligence.metadata?.lastUpdated),
          news,
          timeline,
          marketExpansion: Array.isArray(intelligence.marketExpansion) ? intelligence.marketExpansion.map((item: any) => ({ region: item.market || 'Not available', details: item.description || 'No verified data available.', status: 'ACTIVE', impact: item.businessImpact || 'No verified data available.', source: item.source || 'Source not available', sourceUrl: safeUrl(item.sourceUrl), date: item.date || null })) : current.marketExpansion,
          hiringActivity: Array.isArray(intelligence.hiring) ? intelligence.hiring.map((item: any) => ({ role: toSafeText(item.title) || 'Hiring signal', count: typeof item.openPositions === 'number' ? item.openPositions : null, location: toSafeText(item.location) || 'Not available', focusArea: toSafeText(item.description) || 'No verified data available.', date: formatBackendDate(item.date), source: toSafeText(item.source) || 'Source not available', sourceUrl: safeUrl(item.sourceUrl) })) : current.hiringActivity,
        };
      });
    }).catch((error: unknown) => {
      setDrawerLoadError(error instanceof Error ? error.message : 'Unable to load intelligence data. Please try again.');
    }).finally(() => setDrawerLoading(false));
  };

  const toggleActionStatus = (actionId: string) => {
    if (!selected) return;
    const updatedActions = selected.strategicActions.map((sa) => {
      if (sa.id === actionId) {
        const nextStatus: StrategicAction['status'] =
          sa.status === 'OPEN' ? 'IN_PROGRESS' : sa.status === 'IN_PROGRESS' ? 'COMPLETED' : 'OPEN';
        return { ...sa, status: nextStatus };
      }
      return sa;
    });

    const updatedComp = { ...selected, strategicActions: updatedActions };
    setSelected(updatedComp);
    setCompetitors((prev) => prev.map((c) => (c.id === selected.id ? updatedComp : c)));
  };

  // â”€â”€ Export / Operation Handlers (real API where available) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCompetitorMatrixCsv = () => {
    const header = ['Company', 'Country', 'Industry', 'Threat Score', 'Trend', 'Risk Level', 'Market Share', 'Watchlist'];
    const rows = filtered.map((c) => [
      c.name,
      c.country,
      c.industry,
      c.threatScore,
      c.threatTrend,
      c.riskLevel,
      c.marketShare,
      c.isWatchlist ? 'Yes' : 'No',
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadTextFile('competitor-intelligence-matrix.csv', csv);
  };

  const exportSelectedDossierCsv = () => {
    if (!selected) return;
    const header = ['Field', 'Value'];
    const rows = [
      ['Company', selected.name],
      ['Country', selected.country],
      ['Industry', selected.industry],
      ['Threat Score', selected.threatScore],
      ['Trend', selected.threatTrend],
      ['Risk Level', selected.riskLevel],
      ['Market Share', selected.marketShare],
      ['Overview', selected.overview || 'Not available'],
      ['Last Updated', selected.lastUpdated],
    ];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadTextFile(`dossier-${(selected.name || 'competitor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, csv);
  };

  const handleRunCrawlerScan = async () => {
    if (runningScan) return;
    setRunningScan(true);
    setOpMessage(null);
    try {
      const message = await externalDataApi.runApprovedProfilesFetch();
      setOpMessage({ tone: 'success', text: message });
      setDataVersion((version) => version + 1);
    } catch (err) {
      setOpMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Market crawl scan failed. Check backend connectivity.' });
    } finally {
      setRunningScan(false);
    }
  };

  const handleDeepAiAnalysis = async () => {
    if (runningDeepAnalysis) return;
    setRunningDeepAnalysis(true);
    setOpMessage(null);
    try {
      const message = await externalDataApi.runAnalyze();
      setOpMessage({ tone: 'success', text: message });
      setDataVersion((version) => version + 1);
    } catch (err) {
      setOpMessage({ tone: 'error', text: err instanceof Error ? err.message : 'AI deep dive analysis failed. Check backend connectivity.' });
    } finally {
      setRunningDeepAnalysis(false);
    }
  };

  const handleRefreshIntelligence = async () => {
    if (syncStatus === 'updating') return;

    // Capture current timeline signal IDs
    const currentSignalIds = new Set<string>();
    competitors.forEach((c) => {
      c.timeline.forEach((t) => {
        if (t.id) currentSignalIds.add(t.id);
      });
    });
    setExistingSignalIds(currentSignalIds);

    setSyncStatus('updating');
    setOpMessage(null);
    setShowSyncSummary(false);

    try {
      // 1. Fetch latest approved profiles (crawling)
      await externalDataApi.runApprovedProfilesFetch();

      // 2. Re-run AI analysis
      await externalDataApi.runAnalyze();

      // 3. Trigger reload
      setDataVersion((version) => version + 1);
    } catch (err) {
      setSyncStatus('failed');
      setOpMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Market refresh and AI sync failed. Check backend connectivity.',
      });
    }
  };

  // â”€â”€ Computed Filtered Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    return competitors.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase()) ||
        c.latestActivity.toLowerCase().includes(search.toLowerCase());

      const matchIndustry = industry === 'All' || c.industry.includes(industry) || c.industry === industry;
      
      const matchRisk = riskLevel === 'All' || c.businessImpact === riskLevel || c.riskLevel === riskLevel;

      const matchRelationship = relationshipFilter === 'All' || c.relationship === relationshipFilter;

      const matchSignalType = signalTypeFilter === 'All' || c.timeline.some((t) => t.category === signalTypeFilter) || c.news.some((n) => n.topics?.includes(signalTypeFilter));

      const matchCountry = countryFilter === 'All' || c.country.toLowerCase().includes(countryFilter.toLowerCase());

      let matchWatchlist = true;
      if (watchlistFilter === 'WATCHLIST_ONLY') matchWatchlist = c.isWatchlist;
      else if (watchlistFilter === 'NON_WATCHLIST') matchWatchlist = !c.isWatchlist;

      return matchSearch && matchIndustry && matchRisk && matchRelationship && matchSignalType && matchCountry && matchWatchlist;
    });
  }, [competitors, search, industry, riskLevel, relationshipFilter, signalTypeFilter, countryFilter, watchlistFilter]);

  // â”€â”€ Key Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalCompetitors = competitors.length;
  const watchlistCount = competitors.filter((c) => c.isWatchlist).length;
  const newAlertsCount = competitors.reduce((acc, c) => acc + c.timeline.length, 0);

  // Distribution chart data
  const threatCounts = useMemo(() => {
    return {
      critical: competitors.filter((c) => c.threatScore >= 85).length,
      high: competitors.filter((c) => c.threatScore >= 70 && c.threatScore < 85).length,
      medium: competitors.filter((c) => c.threatScore >= 50 && c.threatScore < 70).length,
      low: competitors.filter((c) => c.threatScore < 50).length,
    };
  }, [competitors]);

  const industryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    competitors.forEach((c) => {
      map[c.industry] = (map[c.industry] || 0) + 1;
    });
    return Object.entries(map).map(([ind, count]) => ({ industry: ind, count }));
  }, [competitors]);

  // Flattened recent activities feed across all competitors
  const recentActivitiesFeed = useMemo(() => {
    const feed: Array<{ competitorName: string; riskLevel: EnterpriseCompetitor['riskLevel']; event: TimelineEvent }> = [];
    competitors.forEach((c) => {
      c.timeline.forEach((t) => {
        feed.push({ competitorName: c.name, riskLevel: c.riskLevel, event: t });
      });
    });
    return feed.slice(0, 5);
  }, [competitors]);

  // â”€â”€ Table Column Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Column Definitions for Comparison Matrix
  const columns: ColumnDef<EnterpriseCompetitor>[] = [
    {
      key: 'name',
      header: 'Công ty',
      width: '210px',
      sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--cds-text-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cds-text-primary)' }}>{row.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)' }}>{row.country}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Ngành',
      width: '150px',
      sortable: true,
    },
    {
      key: 'businessImpactOrder',
      header: 'Tác động kinh doanh',
      width: '150px',
      sortable: true,
      render: (_, row) => <RiskBadge level={row.businessImpact || ''} label={row.businessImpact || 'Chưa có dữ liệu xác minh'} />,
    },
    {
      key: 'strategicRelevanceOrder',
      header: 'Mức độ chiến lược',
      width: '150px',
      sortable: true,
      render: (_, row) => <RiskBadge level={row.strategicRelevance || ''} label={row.strategicRelevance || 'Chưa có dữ liệu xác minh'} />,
    },

    {
      key: 'hiringCount',
      header: 'Tuyển dụng',
      width: '120px',
      sortable: true,
      align: 'center',
      render: (_, row) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: row.hiringCount > 0 ? 'var(--cds-support-info-bg)' : 'var(--cds-border-subtle-00)',
            color: row.hiringCount > 0 ? 'var(--cds-interactive)' : 'var(--cds-text-helper)',
          }}
        >
          {row.hiringCount > 0 ? `${row.hiringCount} vị trí` : 'Chưa có dữ liệu xác minh'}
        </span>
      ),
    },
    {
      key: 'techInvestmentsCount',
      header: 'Hoạt động công nghệ',
      width: '150px',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
          {row.techInvestmentsCount > 0 ? `${row.techInvestmentsCount} giải pháp` : 'Chưa có dữ liệu xác minh'}
        </span>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Cập nhật gần nhất',
      width: '130px',
      sortable: true,
      render: (_, row) => <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{row.lastUpdated}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '110px',
      align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={() => openDrawer(row)}>
          Xem thông tin
        </SecondaryButton>
      ),
    },
  ];

  // Dynamic values for filters
  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    competitors.forEach((c) => { if (c.industry) set.add(c.industry); });
    return Array.from(set);
  }, [competitors]);

  const filters: FilterConfig[] = [
    {
      id: 'industry',
      type: 'select',
      label: 'Ngành',
      value: industry,
      onChange: (v) => setIndustry(v as string),
      options: [
        { value: 'All', label: 'Tất cả ngành' },
        ...uniqueIndustries.map((ind) => ({ value: ind, label: ind })),
      ],
    },
    {
      id: 'riskLevel',
      type: 'select',
      label: 'Tác động',
      value: riskLevel,
      onChange: (v) => setRiskLevel(v as string),
      options: [
        { value: 'All', label: 'Tất cả tác động' },
        { value: 'CRITICAL', label: 'CRITICAL' },
        { value: 'HIGH', label: 'HIGH' },
        { value: 'MEDIUM', label: 'MEDIUM' },
        { value: 'LOW', label: 'LOW' },
      ],
    },
    {
      id: 'relationshipFilter',
      type: 'select',
      label: 'Quan hệ',
      value: relationshipFilter,
      onChange: (v) => setRelationshipFilter(v as string),
      options: [
        { value: 'All', label: 'Tất cả quan hệ' },
        { value: 'COMPETITOR', label: 'COMPETITOR' },
        { value: 'PARTNER', label: 'PARTNER' },
        { value: 'SUPPLIER', label: 'SUPPLIER' },
        { value: 'CUSTOM', label: 'CUSTOM' },
      ],
    },
    {
      id: 'signalTypeFilter',
      type: 'select',
      label: 'Loại tín hiệu',
      value: signalTypeFilter,
      onChange: (v) => setSignalTypeFilter(v as string),
      options: [
        { value: 'All', label: 'Tất cả tín hiệu' },
        { value: 'NEWS', label: 'NEWS' },
        { value: 'MARKET_EXPANSION', label: 'MARKET_EXPANSION' },
        { value: 'PARTNERSHIP', label: 'PARTNERSHIP' },
        { value: 'PRODUCT', label: 'PRODUCT' },
        { value: 'HIRING', label: 'HIRING' },
        { value: 'INVESTMENT', label: 'INVESTMENT' },
        { value: 'TECHNOLOGY', label: 'TECHNOLOGY' },
        { value: 'REGULATORY', label: 'REGULATORY' },
      ],
    },
  ];

  const renderField = (
    label: string,
    value: string | number | React.ReactNode,
    fallback: 'no-data' | 'no-activity' | 'needs-verification' | 'updating' | 'verified' | 'unavailable' = 'no-data'
  ) => {
    if (value === null || value === undefined || value === '') {
      let text = 'No verified data available';
      let color = 'var(--cds-text-helper)';
      if (fallback === 'no-activity') {
        text = 'No recent activity detected';
      } else if (fallback === 'needs-verification') {
        text = 'Needs verification';
        color = 'var(--cds-support-warning)';
      } else if (fallback === 'updating') {
        text = 'Updating...';
        color = 'var(--cds-interactive)';
      } else if (fallback === 'unavailable') {
        text = 'Source unavailable';
      }
      return (
        <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
          <span style={{ color: 'var(--cds-text-secondary)' }}>{label}: </span>
          <span style={{ fontStyle: 'italic', color }}>{text}</span>
        </div>
      );
    }
    return (
      <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
        <span style={{ color: 'var(--cds-text-secondary)' }}>{label}: </span>
        <strong style={{ color: 'var(--cds-text-primary)' }}>{value}</strong>
      </div>
    );
  };

  const renderSourceQuality = (item: {
    source: string;
    date: string;
    sourceUrl?: string;
    confidence?: number | null;
  }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--cds-border-subtle-00)', paddingTop: '8px', marginTop: '8px', fontSize: '11px', color: 'var(--cds-text-helper)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span>Source: <strong>{item.source}</strong></span>
          {item.date && <span>Date: {item.date}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          {item.confidence != null && item.confidence > 0 && (
            <span>AI Confidence: <strong>{item.confidence}%</strong></span>
          )}
          <span>Status: <strong style={{ color: 'var(--cds-support-success)' }}>Verified</strong></span>
        </div>
        {item.sourceUrl && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            Open Original Source <ExternalLink size={11} />
          </a>
        )}
      </div>
    );
  };

  const renderDrawerTab = () => {
    if (!selected) return null;

    switch (drawerTab) {
      case 'overview': {
        const hasRadar = selected.news.length > 0;
        
        // Find financial signal fields
        const revenueSignal = selected.financialSignals.find(s => s.type === 'Revenue');
        const revGrowthSignal = selected.financialSignals.find(s => s.type === 'Revenue growth');
        const profitMarginSignal = selected.financialSignals.find(s => s.type === 'Profit margin');
        const debtRatioSignal = selected.financialSignals.find(s => s.type === 'Debt ratio');
        const fundingStageSignal = selected.financialSignals.find(s => s.type === 'Funding stage');
        const profitabilitySignal = selected.financialSignals.find(s => s.type === 'Profitability');

        // Find key leadership
        const chairman = selected.leadership.find(p => p.position.toUpperCase().includes('CHAIRMAN') || p.position.toUpperCase().includes('CHỦ TỊCH'));
        const ceo = selected.leadership.find(p => p.position.toUpperCase().includes('CEO') || p.position.toUpperCase().includes('GIÁM ĐỐC') || p.position.toUpperCase().includes('DIRECTOR'));
        const otherExecutives = selected.leadership.filter(p => p !== chairman && p !== ceo);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* AI Executive Brief */}
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px 16px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>AI Executive Brief</strong>
              <p style={{ margin: '8px 0 0' }}>{selected.overview || 'No verified data available'}</p>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
              <MetricCard label="Business Impact" value={selected.businessImpact || 'No verified data available'} />
              <MetricCard label="Strategic Relevance" value={selected.strategicRelevance || 'No verified data available'} />
              <MetricCard label="Impact Trend" value={selected.impactTrend ? `↑ ${selected.impactTrend}` : 'No verified data available'} />
              <MetricCard label="AI Radar" value={hasRadar ? 'ACTIVE' : 'No verified data available'} />
            </div>

            {/* 1. Core Profile Details */}
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🏢 Company Profile
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                {renderField('Legal Name', selected.legalName)}
                {renderField('Ticker', selected.ticker)}
                {renderField('Industry', selected.industry)}
                {renderField('Relationship', selected.relationship)}
                {renderField('Headquarters', selected.headquarters || selected.country)}
                {renderField('Employees', selected.employeeCount != null ? `${selected.employeeCount} employees` : null)}
                {renderField('Website', selected.website ? <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)' }}>{selected.website}</a> : null)}
                {renderField('Last Updated', selected.lastUpdated)}
              </div>
            </div>

            {/* 2. Financial Intelligence */}
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Financial Intelligence
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                {renderField('Revenue', revenueSignal?.value)}
                {renderField('Revenue Growth', revGrowthSignal?.value)}
                {renderField('Profit Margin', profitMarginSignal?.value)}
                {renderField('Debt Ratio', debtRatioSignal?.value)}
                {renderField('Funding Stage', fundingStageSignal?.value)}
                {renderField('Profitability', profitabilitySignal?.value)}
              </div>
            </div>

            {/* 3. Leadership Intelligence */}
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👥 Leadership & Team
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {renderField('Chairman', chairman?.name)}
                {renderField('CEO / General Director', ceo?.name)}
                {otherExecutives.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--cds-text-secondary)' }}>Key Executives: </span>
                    <strong style={{ color: 'var(--cds-text-primary)' }}>
                      {otherExecutives.map(e => `${e.name} (${e.position})`).join(', ')}
                    </strong>
                  </div>
                )}
                {selected.leadership.length === 0 && renderField('Key Executives', null, 'no-data')}
              </div>
            </div>

            {/* 4. Products & Services */}
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📦 Products & Solutions
              </h4>
              {selected.products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {selected.products.map((p, idx) => (
                    <div key={idx} style={{ borderBottom: idx < selected.products.length - 1 ? '1px solid var(--cds-border-subtle-00)' : 'none', paddingBottom: '6px' }}>
                      <strong style={{ color: 'var(--cds-text-primary)' }}>{p.name}</strong> <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>({p.category})</span>
                      <p style={{ margin: '4px 0 0', color: 'var(--cds-text-secondary)' }}>{p.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                renderField('Key Products', null, 'no-data')
              )}
            </div>

            {/* 5. Partnerships & Projects */}
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🤝 Partnerships & Strategic Projects
              </h4>
              {projectsForCompany(selected).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {projectsForCompany(selected).map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--cds-text-primary)' }}>{p.projectName}</strong>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--cds-support-success-bg)', color: 'var(--cds-support-success)', fontWeight: 600 }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                renderField('Strategic Partnerships', null, 'no-activity')
              )}
            </div>

            {/* 6. Why This Company Matters */}
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Strategic Relevance & Alert Rationale</h4>
              {selected.whyItMatters.length > 0 ? (
                selected.whyItMatters.map((reason, idx) => <p key={idx} style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '19px' }}>• {reason}</p>)
              ) : (
                renderField('Why it matters', null, 'no-data')
              )}
            </div>
          </div>
        );
      }

      case 'timeline': {
        const nonNewsTimeline = selected.timeline.filter(
          (item) => !['NEWS', 'MEDIA', 'PRESS_RELEASE'].includes((item.category || '').toUpperCase())
        );
        const combinedFeed = [
          ...nonNewsTimeline.map((item) => ({ ...item, feedType: 'activity' as const })),
          ...selected.news.map((item) => ({ ...item, feedType: 'news' as const })),
        ].sort((left, right) => {
          const tLeft = left.rawDate ? new Date(left.rawDate).getTime() : 0;
          const tRight = right.rawDate ? new Date(right.rawDate).getTime() : 0;
          return tRight - tLeft;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {combinedFeed.length > 0 ? (
              combinedFeed.map((item) => {
                if (item.feedType === 'activity') {
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{item.title}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{item.date}</span>
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'var(--cds-interactive)',
                            background: 'var(--cds-support-info-bg)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {item.category}
                        </span>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{item.summary}</p>
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                            <span style={{ color: item.importance === 'HIGH' || item.importance === 'CRITICAL' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)', fontWeight: 600 }}>
                              Impact: {item.importance || 'Chưa có dữ liệu'}
                            </span>
                          </div>
                          {renderSourceQuality({
                            source: item.source,
                            date: item.date,
                            sourceUrl: item.sourceUrl || undefined,
                            confidence: item.confidence
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // news item
                  return (
                    <div key={item.id} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{item.title}</strong>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: item.sentiment === 'NEGATIVE' ? 'var(--cds-support-error-bg)' : item.sentiment === 'POSITIVE' ? 'var(--cds-support-success-bg)' : 'var(--cds-layer-01)', color: item.sentiment === 'NEGATIVE' ? 'var(--cds-support-error)' : item.sentiment === 'POSITIVE' ? 'var(--cds-support-success)' : 'var(--cds-text-secondary)', fontWeight: 700 }}>
                          {item.sentiment}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{item.snippet}</p>
                      {item.topics.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          {item.topics.map((topic) => <span key={topic} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--cds-border-subtle-00)', color: 'var(--cds-text-secondary)', borderRadius: '4px' }}>{topic.replace(/_/g, ' ')}</span>)}
                        </div>
                      )}
                      {renderSourceQuality({
                        source: item.source,
                        date: item.date,
                        sourceUrl: item.url || undefined,
                        confidence: item.confidence
                      })}
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>
                        Business impact: <strong>{item.businessImpact || 'Chưa có dữ liệu'}</strong>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)', textAlign: 'center', padding: '20px' }}>
                No recent activity or news detected.
              </p>
            )}
          </div>
        );
      }

      case 'market': {
        const keywords = ['mở rộng', '5g', 'cloud', 'data center', 'sản phẩm', 'thị trường', 'partnership', 'infrastructure', 'expand', 'growth', 'location'];
        const filteredExpansion = selected.marketExpansion.filter((exp) => {
          const detailLower = (exp.details || '').toLowerCase();
          const regionLower = (exp.region || '').toLowerCase();
          return keywords.some((kw) => detailLower.includes(kw) || regionLower.includes(kw));
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredExpansion.length > 0 ? (
              filteredExpansion.map((exp, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{exp.region}</strong>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-interactive)', textTransform: 'uppercase' }}>{exp.status || 'ACTIVE'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}>Evidence: {exp.details}</div>
                  {renderSourceQuality({
                    source: exp.source,
                    date: exp.date ? formatBackendDate(exp.date) : '',
                    sourceUrl: exp.sourceUrl || undefined
                  })}
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>
                    <strong>Business Impact:</strong> {exp.impact || 'Chưa có dữ liệu'}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)', textAlign: 'center', padding: '20px' }}>
                No recent activity detected.
              </p>
            )}
          </div>
        );
      }

      case 'hiring':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selected.hiringActivity.length > 0 ? (
              selected.hiringActivity.map((hire, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{hire.role}</div>
                    <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>Location: {hire.location} • Focus: {hire.focusArea}</div>
                    {renderSourceQuality({
                      source: hire.source,
                      date: hire.date,
                      sourceUrl: hire.sourceUrl || undefined
                    })}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cds-interactive)' }}>{hire.count == null ? '1+' : hire.count}</div>
                    <div style={{ fontSize: '10px', color: 'var(--cds-text-helper)' }}>Open positions</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-helper)' }}>No verified hiring activity available.</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--cds-text-helper)' }}>Last checked: {selected.lastUpdated}</p>
              </div>
            )}
          </div>
        );

      case 'ai-analysis': {
        const hasAiSummary = selected.aiSummaryStatus === 'AVAILABLE' && Boolean(selected.aiRecommendation);
        if (!hasAiSummary) {
          return (
            <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Chưa có dữ liệu tổng hợp AI</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Hệ thống chưa có đủ dữ liệu để tạo phân tích cho doanh nghiệp này.</p>
            </div>
          );
        }
        const potentialOpportunities = selected.marketExpansion.length > 0
          ? `Khai phá cơ hội tăng trưởng tại các thị trường mới: ${selected.marketExpansion.map((e) => e.region).join(', ')}.`
          : 'Chưa xác định cơ hội phát triển đột phá.';
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--cds-support-info-bg)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--cds-interactive)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✨ AI Analysis
              </span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: 'var(--cds-text-primary)' }}>Executive Summary</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)', lineHeight: '20px' }}>
                {selected.aiRecommendation}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--cds-support-success-bg)', border: '1px solid var(--cds-support-success)', borderRadius: '6px', padding: '12px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--cds-support-success)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Strengths</strong>
                {selected.strengths.length > 0 ? selected.strengths.map((str, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '3px' }}>• {str}</div>
                )) : <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có dữ liệu xác minh.</div>}
              </div>

              <div style={{ background: 'var(--cds-support-error-bg)', border: '1px solid var(--cds-support-error)', borderRadius: '6px', padding: '12px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--cds-support-error)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Weaknesses</strong>
                {selected.weaknesses.length > 0 ? selected.weaknesses.map((wk, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '3px' }}>• {wk}</div>
                )) : <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>Chưa có dữ liệu xác minh.</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ border: '1px solid var(--cds-border-color)', borderRadius: '6px', padding: '12px', background: 'var(--cds-background)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--cds-support-info)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Emerging Opportunities</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{potentialOpportunities}</p>
              </div>

              <div style={{ border: '1px solid var(--cds-border-color)', borderRadius: '6px', padding: '12px', background: 'var(--cds-background)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--cds-support-warning)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Threats</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>
                  {selected.businessImpact === 'CRITICAL' || selected.businessImpact === 'HIGH'
                    ? `Mức độ đe dọa lớn đối với doanh nghiệp (Impact: ${selected.businessImpact}). Cần chú ý và giám sát liên tục.`
                    : `Mức độ đe dọa trung bình hoặc thấp (Impact: ${selected.businessImpact || 'Chưa có dữ liệu'}).`}
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid var(--cds-border-color)', borderRadius: '6px', padding: '12px', background: 'var(--cds-background)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--cds-text-primary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Market Direction</strong>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>
                Đang tập trung hoạt động trong lĩnh vực <strong>{selected.industry}</strong> tại thị trường <strong>{selected.country}</strong>. Hoạt động chính: {selected.latestActivity}.
              </p>
            </div>

            <div style={{ border: '1px solid var(--cds-border-color)', borderRadius: '6px', padding: '12px', background: 'var(--cds-background)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--cds-interactive)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Recommended Actions</strong>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>
                {selected.whyItMatters[0]
                  ? `Hành động đề xuất: ${selected.whyItMatters[0]}`
                  : `Theo dõi sát sao động thái cạnh tranh và hoạt động tuyển dụng của đối thủ ${selected.name}.`}
              </p>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };
  const projectsForCompany = (company: EnterpriseCompetitor) => projects.filter((project) =>
    project.targetCompanyProfileId === company.id
    || normalizeCompanyName(project.targetCompanyName) === normalizeCompanyName(company.name),
  );
  const attentionCompanies = competitors.filter((company) =>
    company.businessImpact === 'HIGH'
    || company.businessImpact === 'CRITICAL'
    || company.impactTrend === 'INCREASING'
    || company.marketExpansion.length > 0
    || company.hiringActivity.length > 0
    || company.news.length > 0,
  ).slice(0, 4);
  const recentSignals = competitors.flatMap((company) => company.timeline.map((signal) => ({ company, signal })))
    .sort((left, right) => new Date(right.signal.date).getTime() - new Date(left.signal.date).getTime())
    .slice(0, 8);
  const impactCounts = {
    high: competitors.filter((company) => company.businessImpact === 'HIGH' || company.businessImpact === 'CRITICAL').length,
    medium: competitors.filter((company) => company.businessImpact === 'MEDIUM').length,
    increasing: competitors.filter((company) => company.impactTrend === 'INCREASING').length,
  };

  const topCompetitorsList = useMemo(() => (
    [...competitors]
      .sort((a, b) => b.timeline.length - a.timeline.length)
      .slice(0, 4)
  ), [competitors]);

  const highImpactCount = competitors.filter((c) => c.businessImpact === 'HIGH' || c.businessImpact === 'CRITICAL').length;
  const mediumImpactCount = competitors.filter((c) => c.businessImpact === 'MEDIUM').length;
  const highSignalsCount = competitors.reduce((acc, c) => acc + c.timeline.filter(t => t.importance === 'HIGH').length, 0);
  const expandingCount = competitors.filter(c => c.marketExpansion.length > 0).length;

  const comparisonCompetitors = useMemo(
    () => competitors.filter((company) => comparisonIds.includes(company.id)).slice(0, 4),
    [competitors, comparisonIds],
  );
  const comparisonCategories = useMemo(() => {
    const values = new Set<string>();
    comparisonCompetitors.forEach((company) => company.timeline.forEach((signal) => {
      if (signal.category) values.add(signal.category.toUpperCase());
    }));
    return Array.from(values).sort();
  }, [comparisonCompetitors]);
  const comparisonStats = useMemo(() => {
    const currentStart = comparisonReferenceTime - comparisonDays * 24 * 60 * 60 * 1000;
    const previousStart = currentStart - comparisonDays * 24 * 60 * 60 * 1000;
    return comparisonCompetitors.map((company) => {
      const datedSignals = company.timeline.filter((signal) => {
        const timestamp = signal.rawDate ? new Date(signal.rawDate).getTime() : Number.NaN;
        return !Number.isNaN(timestamp);
      });
      const current = datedSignals.filter((signal) => new Date(signal.rawDate as string).getTime() >= currentStart);
      const previous = datedSignals.filter((signal) => {
        const timestamp = new Date(signal.rawDate as string).getTime();
        return timestamp >= previousStart && timestamp < currentStart;
      });
      const countCategory = (category: string) => current.filter((signal) => signal.category.toUpperCase() === category).length;
      const countImpact = (impact: string) => current.filter((signal) => signal.importance === impact).length;
      const trend = !datedSignals.length || !previous.length
        ? 'NO_DATA'
        : current.length > previous.length ? 'UP'
          : current.length < previous.length ? 'DOWN' : 'STABLE';
      return { company, current, previous, countCategory, countImpact, trend };
    });
  }, [comparisonCompetitors, comparisonDays, comparisonReferenceTime]);

  // —— Main Render ————————————————————————————————————————————————————————
  return (
    <div className="cds-page-shell" id="page-competitor-intelligence">
      {/* 1. Page Header */}
      <PageHeader
        title={t('header.title')}
        actions={
          <>
            <SecondaryButton size="md" onClick={exportCompetitorMatrixCsv}>
              {t('actions.exportMatrix')}
            </SecondaryButton>
            <PrimaryButton 
              size="md" 
              loading={syncStatus === 'updating'} 
              onClick={() => void handleRefreshIntelligence()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {syncStatus === 'updating' ? 'Đang cập nhật...' : '↻ Cập nhật dữ liệu'}
            </PrimaryButton>
          </>
        }
      />


      {loadError && (
        <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 14px', border: '1px solid var(--cds-support-error)', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', fontSize: '13px' }}>
          <span>{loadError}</span>
          <SecondaryButton size="sm" onClick={() => setDataVersion((version) => version + 1)}>Retry</SecondaryButton>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <Tabs
          items={[
            { id: 'watchlist', label: t('overview.attention') },
            { id: 'signals', label: t('overview.recentSignals') },
            { id: 'matrix', label: t('overview.list') },
          ]}
          activeId={mainTab}
          onChange={setMainTab}
          contained={true}
        />
      </div>

      {/* 2. Executive Overview KPIs and 3. Top Competitors Section */}
      {mainTab === 'watchlist' && (
      <>
        <section aria-label={t('overview.label')} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'end', marginBottom: '12px' }}>
            <div>
              <div style={{ color: 'var(--cds-text-helper)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{t('overview.label')}</div>
              <h2 style={{ margin: '4px 0 0', fontSize: '20px', color: 'var(--cds-text-primary)' }}>{t('header.breadcrumb')}</h2>
            </div>
            <span style={{ color: 'var(--cds-text-helper)', fontSize: '12px' }}>{t('overview.readOnly')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            <MetricCard label={t('overview.total.label')} value={loading ? '...' : competitors.length} description={t('overview.total.description')} />
            <MetricCard label={t('overview.highImpact.label')} value={loading ? '...' : highImpactCount} description={t('overview.highImpact.description')} />
            <MetricCard label={t('overview.mediumImpact.label')} value={loading ? '...' : mediumImpactCount} description={t('overview.mediumImpact.description')} />
            <MetricCard label={t('overview.signals.label')} value={loading ? '...' : recentSignals.length} description={t('overview.signals.description')} />
            <MetricCard label={t('overview.highSignals.label')} value={loading ? '...' : highSignalsCount} description={t('overview.highSignals.description')} />
            <MetricCard label={t('overview.expanding.label')} value={loading ? '...' : expandingCount} description={t('overview.expanding.description')} />
          </div>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: 'var(--cds-text-helper)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{t('overview.focusTracking')}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--cds-text-primary)' }}>{t('overview.attention')}</h3>
          </div>
        {topCompetitorsList.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {topCompetitorsList.map((company) => {
              const hasRadar = company.news.length > 0;
              return (
                <div
                  key={company.id}
                  style={{
                    border: '1px solid var(--cds-border-color)',
                    borderRadius: '6px',
                    padding: '16px',
                    background: 'var(--cds-background)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <strong style={{ fontSize: '16px', color: 'var(--cds-text-primary)' }}>{company.name}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          background: hasRadar ? 'var(--cds-support-success-bg)' : 'var(--cds-border-subtle-00)',
                          color: hasRadar ? 'var(--cds-support-success)' : 'var(--cds-text-helper)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {hasRadar && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cds-support-success)', display: 'inline-block' }} />}
                        {hasRadar ? t('drawer.radarActive') : t('overview.noData')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', margin: '4px 0 12px' }}>
                      {company.industry || t('overview.noData')}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                      <div>{t('overview.relationship')}: <strong>{company.relationship || t('overview.noData')}</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t('overview.businessImpact')}:
                        <RiskBadge level={company.businessImpact || ''} label={company.businessImpact || t('overview.noData')} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t('drawer.importance')}:
                        <RiskBadge level={company.strategicRelevance || ''} label={company.strategicRelevance || t('overview.noData')} />
                      </div>
                      <div>{t('overview.recentSignalsColumn')}: <strong>{company.timeline.length}</strong></div>
                      <div>{t('overview.marketActivity')}: <strong>{company.marketExpansion.length}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '10px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                      {t('drawer.synced')}: {company.lastUpdated || t('overview.noData')}
                    </span>
                    <SecondaryButton size="sm" onClick={() => openDrawer(company)}>
                      {t('overview.viewIntelligence')}
                    </SecondaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t('overview.noAttention')} body={t('overview.noSignals')} />
        )}
        </section>
      </>
      )}

      {/* 5. Recent Competitive Signals */}
      {mainTab === 'signals' && (
      <section style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: 'var(--cds-text-helper)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{t('overview.marketActivity')}</div>
          <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--cds-text-primary)' }}>{t('overview.recentSignals')}</h3>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid var(--cds-border-color)', borderRadius: '6px', background: 'var(--cds-background)' }}>
          <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--cds-layer-01)', borderBottom: '1px solid var(--cds-border-color)' }}>
                {[t('drawer.date'), t('watchlist.competitor'), t('drawer.signalType'), t('drawer.titleSummary'), t('drawer.source'), t('overview.businessImpact'), t('drawer.sentimentCol')].map((h) => (
                  <th key={h} style={{ padding: '12px 10px', color: 'var(--cds-text-secondary)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSignals.length ? recentSignals.map(({ company, signal }) => {
                const impactVal = signal.importance;
                const confidenceVal = signal.confidence;
                const sentimentVal = signal.sentiment;
                
                return (
                  <tr key={`${company.id}-${signal.id}`} style={{ borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <td style={{ padding: '12px 10px', color: 'var(--cds-text-helper)', whiteSpace: 'nowrap' }}>{signal.date}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <button
                        type="button"
                        onClick={() => openDrawer(company)}
                        style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--cds-interactive)', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      >
                        {company.name}
                      </button>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--cds-layer-01)',
                          color: 'var(--cds-text-primary)',
                        }}
                      >
                        {signal.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--cds-text-primary)' }}>
                      <div style={{ fontWeight: 600 }}>{signal.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>{signal.summary}</div>
                    </td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                      {signal.sourceUrl ? (
                        <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {signal.source}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--cds-text-secondary)' }}>{signal.source}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {impactVal ? (
                        <RiskBadge level={impactVal} />
                      ) : (
                        <span style={{ color: 'var(--cds-text-helper)', fontStyle: 'italic' }}>{t('overview.noData')}</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 10px' }}>
                      {sentimentVal ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: sentimentVal === 'NEGATIVE' ? 'var(--cds-support-error-bg)' : sentimentVal === 'POSITIVE' ? 'var(--cds-support-success-bg)' : 'var(--cds-layer-01)',
                            color: sentimentVal === 'NEGATIVE' ? 'var(--cds-support-error)' : sentimentVal === 'POSITIVE' ? 'var(--cds-support-success)' : 'var(--cds-text-secondary)',
                          }}
                        >
                          {sentimentVal}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--cds-text-helper)' }}>{t('overview.noData')}</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--cds-text-helper)' }}>
                    {t('overview.noSignals')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* 6. Competitor Comparison Matrix */}
      {mainTab === 'matrix' && (
      <section style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: 'var(--cds-text-helper)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Competitor intelligence comparison</div>
          <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--cds-text-primary)' }}>So sánh đối thủ</h3>
        </div>
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', padding: '16px', borderRadius: 'var(--cds-border-radius)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '320px', flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>Chọn đối thủ (2-4)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {competitors.map((company) => {
                  const checked = comparisonIds.includes(company.id);
                  return <label key={company.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--cds-border-subtle-00)', background: checked ? 'var(--cds-support-info-bg)' : 'var(--cds-layer-01)', borderRadius: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={() => setComparisonIds((current) => checked ? current.filter((id) => id !== company.id) : current.length < 4 ? [...current, company.id] : current)} />
                    {company.name}
                  </label>;
                })}
              </div>
            </div>
            <label style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Khoảng thời gian
              <select value={comparisonDays} onChange={(event) => setComparisonDays(Number(event.target.value))} style={{ display: 'block', marginTop: '7px', minWidth: '160px', padding: '7px', border: '1px solid var(--cds-border-color)', background: 'var(--cds-background)' }}>
                <option value={30}>30 ngày gần đây</option><option value={60}>60 ngày gần đây</option><option value={90}>90 ngày gần đây</option>
              </select>
            </label>
            <PrimaryButton size="sm" onClick={() => { setComparisonReferenceTime(Date.now()); setComparisonSubmitted(true); }}>So sánh</PrimaryButton>
          </div>
        </div>
        {comparisonSubmitted && comparisonStats.length < 2 && <div style={{ padding: '28px', textAlign: 'center', color: 'var(--cds-text-helper)' }}>Chọn ít nhất 2 đối thủ để bắt đầu so sánh.</div>}
        {comparisonSubmitted && comparisonStats.length >= 2 && (() => {
          const maxSignals = Math.max(...comparisonStats.map((stat) => stat.current.length), 1);
          const highest = Math.max(...comparisonStats.map((stat) => stat.current.length));
          const rows: Array<[string, (stat: typeof comparisonStats[number]) => string | number]> = [
            ['Tổng tín hiệu', (stat) => stat.current.length], ['Tín hiệu mới', (stat) => stat.current.length], ['News', (stat) => stat.countCategory('NEWS')],
            ...comparisonCategories.filter((category) => category !== 'NEWS').map((category) => [category.replace(/_/g, ' '), (stat: typeof comparisonStats[number]) => stat.countCategory(category)] as [string, (stat: typeof comparisonStats[number]) => number]),
            ['High Impact', (stat) => stat.countImpact('HIGH')], ['Medium Impact', (stat) => stat.countImpact('MEDIUM')], ['Low Impact', (stat) => stat.countImpact('LOW')],
            ['Xu hướng', (stat) => stat.trend === 'UP' ? 'Tăng' : stat.trend === 'DOWN' ? 'Giảm' : stat.trend === 'STABLE' ? 'Ổn định' : 'Chưa đủ dữ liệu'],
          ];
          const differences = comparisonStats.filter((stat) => stat.current.length === highest && highest > 0).map((stat) => stat.company.name);
          return <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${comparisonStats.length}, minmax(140px, 1fr))`, gap: '8px', overflowX: 'auto' }}>
              <div />{comparisonStats.map((stat) => <MetricCard key={stat.company.id} label={stat.company.name} value={stat.current.length} description={`${comparisonDays} ngày`} />)}
            </div>
            <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: `${180 + comparisonStats.length * 160}px`, borderCollapse: 'collapse', fontSize: '12px' }}><thead><tr style={{ background: 'var(--cds-layer-01)', textAlign: 'left' }}><th style={{ padding: '10px' }}>Chỉ số tình báo</th>{comparisonStats.map((stat) => <th key={stat.company.id} style={{ padding: '10px', textAlign: 'right' }}>{stat.company.name}</th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label} style={{ borderTop: '1px solid var(--cds-border-subtle-00)' }}><td style={{ padding: '9px', fontWeight: 600 }}>{label}</td>{comparisonStats.map((stat) => <td key={stat.company.id} style={{ padding: '9px', textAlign: 'right' }}>{value(stat)}</td>)}</tr>)}</tbody></table>
            </div>
            <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', padding: '16px', borderRadius: 'var(--cds-border-radius)' }}><h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Mức độ hoạt động cạnh tranh</h4>{comparisonStats.map((stat) => <div key={stat.company.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 42px', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}><span>{stat.company.name}</span><div style={{ height: '12px', background: 'var(--cds-layer-01)' }}><div style={{ height: '100%', width: `${(stat.current.length / maxSignals) * 100}%`, background: 'var(--cds-interactive)' }} /></div><strong>{stat.current.length}</strong></div>)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>{comparisonStats.map((stat) => <div key={stat.company.id} style={{ border: '1px solid var(--cds-border-color)', padding: '14px', borderRadius: 'var(--cds-border-radius)' }}><strong>{stat.company.name}</strong><p style={{ margin: '7px 0 0', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{stat.current.length ? `${stat.current.length} tín hiệu trong kỳ. ${stat.trend === 'UP' ? 'Xu hướng tăng.' : stat.trend === 'DOWN' ? 'Xu hướng giảm.' : stat.trend === 'STABLE' ? 'Xu hướng ổn định.' : 'Chưa đủ dữ liệu kỳ trước để kết luận xu hướng.'}` : 'Chưa có tín hiệu trong khoảng thời gian đã chọn.'}</p></div>)}</div>
            {highest > 0 && <div style={{ background: 'var(--cds-support-info-bg)', padding: '14px', borderLeft: '3px solid var(--cds-interactive)' }}><strong>Tổng hợp tình báo</strong><p style={{ margin: '6px 0 0', fontSize: '12px' }}>{differences.join(', ')} có mức độ hoạt động cạnh tranh cao nhất trong {comparisonDays} ngày gần đây ({highest} tín hiệu). Kết luận chỉ dựa trên các tín hiệu đã ghi nhận trong APMS.</p></div>}
          </div>;
        })()}
      </section>
      )}

      {/* 7. Right Side Intelligence Drawer (Zero Popups) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.industry} • ${selected.country}` : ''}
        width={780}
        footerActions={
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <SecondaryButton size="sm" onClick={exportSelectedDossierCsv}>
                {t('actions.exportCsv')}
              </SecondaryButton>
            </div>
            <PrimaryButton size="sm" loading={runningDeepAnalysis} disabled={runningDeepAnalysis} onClick={() => void handleDeepAiAnalysis()}>
              {runningDeepAnalysis ? t('actions.analyzing') : t('actions.deepAnalysis')}
            </PrimaryButton>
          </>
        }
      >
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <RiskBadge level={selected.businessImpact || ''} label={`${t('drawer.businessImpact')}: ${selected.businessImpact || t('overview.noData')}`} showDot />
              <RiskBadge level={selected.strategicRelevance || ''} label={`${t('drawer.importance')}: ${selected.strategicRelevance || t('overview.noData')}`} />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{t('overview.relationship')}: <strong>{selected.relationship || t('overview.noData')}</strong></span>
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{t('overview.impactTrend')}: <strong>{selected.impactTrend ? `↑ ${selected.impactTrend}` : t('overview.noData')}</strong></span>
              <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)', marginLeft: '8px' }}>
                {t('drawer.synced')}: {selected.lastUpdated}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-support-success)', fontWeight: 600 }}>
                {selected.news.length > 0 ? `• ${t('drawer.radarActive')}` : t('drawer.radarNotAvailable')}
              </span>
            </div>

            <div style={{ position: 'sticky', top: '-24px', zIndex: 2, background: 'var(--cds-background)', padding: '10px 0 8px' }}>
              <Tabs items={drawerTabs} activeId={drawerTab} onChange={setDrawerTab} wrap={true} />
            </div>

            <div style={{ marginTop: '16px' }}>
              {drawerLoading && <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Loading company intelligence...</p>}
              {drawerLoadError && <p role="alert" style={{ margin: 0, fontSize: '12px', color: 'var(--cds-support-error)' }}>{drawerLoadError}</p>}
              {!drawerLoading && !drawerLoadError && renderDrawerTab()}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
};
