/* eslint-disable @typescript-eslint/no-explicit-any */
// Enterprise Competitor Intelligence Center â€” Microsoft Dynamics / Carbon Design System
// Executive layout with interactive charts, multi-tab drawer, advanced filters, and zero popups.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../services/api';
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
  importance: 'HIGH' | 'MEDIUM' | 'LOW' | null;
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
}

export interface MarketExpansionItem {
  region: string;
  details: string;
  status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
  impact: string;
  source: string;
  sourceUrl: string | null;
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
  threatTrend: 'UP' | 'DOWN' | 'STABLE';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  latestActivity: string;
  marketShare: number;
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
  strategicActions: StrategicAction[];
  relationship: 'PARTNER' | 'COMPETITOR' | 'SUPPLIER' | 'CUSTOM' | null;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  strategicRelevance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  impactTrend: 'INCREASING' | 'STABLE' | 'DECREASING' | null;
  whyItMatters: string[];
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
const DRAWER_TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'timeline', label: 'Dòng thời gian hoạt động' },
  { id: 'news', label: 'Tin tức gần đây' },
  { id: 'market', label: 'Mở rộng thị trường' },
  { id: 'hiring', label: 'Hoạt động tuyển dụng' },
];

export const CompetitorIntelligenceView: React.FC = () => {
  const { t } = useTranslation('competitor-intelligence');
  const drawerTabs = DRAWER_TABS;
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
  const [riskLevel, setRiskLevel] = useState('All');
  const [threatScoreFilter, setThreatScoreFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [watchlistFilter, setWatchlistFilter] = useState('All');

  // Operation state (Run AI Scan / Deep AI Analysis)
  const [runningScan, setRunningScan] = useState(false);
  const [runningDeepAnalysis, setRunningDeepAnalysis] = useState(false);
  const [opMessage, setOpMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

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

        const mapped: EnterpriseCompetitor[] = rawComps.filter((c) => c.companyId && c.companyId !== ownerCompanyId).map((c, idx) => {
          const snap = scoreMap.get(c.companyId);
          const profile = profileMap.get(c.companyId) || profileByName.get(normalizeCompanyName(c.name));
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
          const news: NewsItem[] = companyArticles.map((article) => ({
            id: article.id,
            title: toSafeText(article.title) || 'Untitled article',
            source: normalizeSource(article.source || article.sourceDomain, article.url).name,
            date: formatBackendDate(article.publishedAt || article.createdAt),
            snippet: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'Summary not available.',
            sentiment: article.sentiment === 'POSITIVE' || article.sentiment === 'NEGATIVE' ? article.sentiment : 'NEUTRAL',
            url: normalizeSource(article.source || article.sourceDomain, article.url).url || undefined,
            topics: (article.topics || []).filter(Boolean),
            relatedCompany: toSafeText(article.relatedCompanyName),
            businessImpact: normalizeImpact(article.riskLevel || article.opportunityLevel),
            confidence: normalizeConfidence(article.sentimentConfidence),
          }));
          const articleImpact = companyArticles
            .map((article) => normalizeImpact(article.riskLevel || article.opportunityLevel))
            .find((impact): impact is NonNullable<typeof impact> => impact !== null) || null;
          const articleConfidence = companyArticles
            .map((article) => normalizeConfidence(article.sentimentConfidence))
            .find((confidence): confidence is number => confidence !== null) || null;
          const whyItMatters = [
            profile?.business?.markets?.length ? `Active in ${profile.business.markets.join(', ')}.` : null,
            profile?.business?.products?.[0]?.name ? `Offers ${profile.business.products[0].name}.` : null,
            companyArticles[0] ? `Latest verified news: ${toSafeText(companyArticles[0].title) || 'article available'}.` : null,
            profile?.insights?.strengths?.[0] || null,
          ].filter((reason): reason is string => Boolean(reason));
          return {
            id: c.companyId || `comp-${idx}`,
            name: profile?.identity?.tradeName || profile?.identity?.legalName || c.name || 'Not available',
            industry: profile?.business?.industries?.join(', ') || c.industry || 'Not available',
            country: profile?.contact?.addresses?.find((address) => address.country)?.country || c.country || 'Not available',
            threatScore: Number(scoreVal),
            threatTrend: scoreVal >= 70 ? 'UP' : scoreVal >= 40 ? 'STABLE' : 'DOWN',
            riskLevel: scoreVal >= 85 ? 'CRITICAL' : scoreVal >= 70 ? 'HIGH' : scoreVal >= 40 ? 'MEDIUM' : 'LOW',
            latestActivity: news[0]?.title || c.latestActivity || profile?.business?.businessModel || 'No activity recorded',
            marketShare: c.marketShare ? Number(c.marketShare) : 0,
            aiConfidence: articleConfidence,
            lastUpdated: formatBackendDate(profile?.metadata?.updatedAt || snap?.createdAt || profile?.metadata?.createdAt),
            isWatchlist: true,
            overview: buildOverview(profile, c.description),
            timeline: [...companyArticles].sort((left, right) => new Date(right.publishedAt || right.createdAt || 0).getTime() - new Date(left.publishedAt || left.createdAt || 0).getTime()).map((article) => ({
              id: article.id, icon: '•', category: article.category || 'NEWS', title: toSafeText(article.title) || 'Untitled article',
              date: formatBackendDate(article.publishedAt || article.createdAt), summary: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'Summary not available.',
              source: normalizeSource(article.source || article.sourceDomain, article.url).name, sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url,
              importance: article.riskLevel === 'HIGH' || article.riskLevel === 'CRITICAL' ? 'HIGH' : article.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW',
            })),
            news,
            marketExpansion: companyArticles
                .filter((article) => article.topics?.includes('MARKET_EXPANSION'))
                .map((article) => ({ region: toSafeText(article.relatedCompanyName) || c.name, details: toSafeText(article.aiSummary) || toSafeText(article.summary) || toSafeText(article.title) || 'No verified data available.', status: 'ACTIVE' as const, impact: normalizeImpact(article.riskLevel || article.opportunityLevel) || 'No verified data available.', source: normalizeSource(article.source || article.sourceDomain, article.url).name, sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url })),
            hiringActivity: companyArticles
                .filter((article) => article.topics?.includes('HIRING'))
                .map((article) => ({ role: toSafeText(article.title) || 'Hiring signal', count: 1, location: profile?.contact?.addresses?.[0]?.city || 'Not available', focusArea: toSafeText(article.aiSummary) || toSafeText(article.summary) || 'No verified data available.', date: formatBackendDate(article.publishedAt || article.createdAt), source: normalizeSource(article.source || article.sourceDomain, article.url).name, sourceUrl: normalizeSource(article.source || article.sourceDomain, article.url).url })),
            financialSignals: toFinancialSignals(profile),
            techInvestments: (profile?.business?.products ?? []).map((product) => ({ area: product.category || product.name || 'Product', details: product.description || 'No product description recorded.', patentsCount: 0, techStack: [] })),
            strengths: profile?.insights?.strengths ?? [],
            weaknesses: profile?.insights?.weaknesses ?? [],
            aiRecommendation: null,
            strategicActions: [],
            relationship: normalizeRelationship(c.relationshipType || c.relationship),
            businessImpact: articleImpact,
            strategicRelevance: null,
            impactTrend: null,
            whyItMatters,
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
  }, [dataVersion]);

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
          snippet: toSafeText(item.aiSummary) || toSafeText(item.summary) || 'Summary not available.',
          sentiment: item.sentiment === 'POSITIVE' || item.sentiment === 'NEGATIVE' ? item.sentiment : 'NEUTRAL',
          url: safeUrl(item.sourceUrl) || undefined,
          topics: Array.isArray(item.topics) ? item.topics : [],
          relatedCompany: item.companyIds?.[0] || null,
          businessImpact: normalizeImpact(item.businessImpact),
          confidence: normalizeConfidence(intelligence.executiveBrief?.confidence),
        })) : current.news;
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
          whyItMatters: Array.isArray(intelligence.executiveBrief?.whyItMatters) ? intelligence.executiveBrief.whyItMatters : current.whyItMatters,
          aiConfidence: normalizeConfidence(intelligence.executiveBrief?.confidence),
          lastUpdated: formatBackendDate(intelligence.metadata?.lastUpdated),
          news,
          timeline: Array.isArray(intelligence.timeline) ? intelligence.timeline.map((item: any) => ({ id: item.id, icon: '•', category: item.eventType || 'NEWS', title: toSafeText(item.summary) || 'Activity signal', date: formatBackendDate(item.date), summary: toSafeText(item.summary) || 'Summary not available.', source: toSafeText(item.source) || 'Source not available', sourceUrl: safeUrl(item.sourceUrl), importance: normalizeImpact(item.impact) })) : current.timeline,
          marketExpansion: Array.isArray(intelligence.marketExpansion) ? intelligence.marketExpansion.map((item: any) => ({ region: item.market || 'Not available', details: item.description || 'No verified data available.', status: 'ACTIVE', impact: item.businessImpact || 'No verified data available.', source: item.source || 'Source not available', sourceUrl: safeUrl(item.sourceUrl) })) : current.marketExpansion,
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

  // â”€â”€ Computed Filtered Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    return competitors.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase()) ||
        c.latestActivity.toLowerCase().includes(search.toLowerCase());

      const matchIndustry = industry === 'All' || c.industry === industry;
      const matchRisk = riskLevel === 'All' || c.riskLevel === riskLevel;

      let matchThreat = true;
      if (threatScoreFilter === 'CRITICAL') matchThreat = c.threatScore >= 85;
      else if (threatScoreFilter === 'HIGH') matchThreat = c.threatScore >= 70 && c.threatScore < 85;
      else if (threatScoreFilter === 'MEDIUM') matchThreat = c.threatScore >= 50 && c.threatScore < 70;
      else if (threatScoreFilter === 'LOW') matchThreat = c.threatScore < 50;

      const matchCountry = countryFilter === 'All' || c.country.toLowerCase().includes(countryFilter.toLowerCase());

      let matchWatchlist = true;
      if (watchlistFilter === 'WATCHLIST_ONLY') matchWatchlist = c.isWatchlist;
      else if (watchlistFilter === 'NON_WATCHLIST') matchWatchlist = !c.isWatchlist;

      return matchSearch && matchIndustry && matchRisk && matchThreat && matchCountry && matchWatchlist;
    });
  }, [competitors, search, industry, riskLevel, threatScoreFilter, countryFilter, watchlistFilter]);

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
  const columns: ColumnDef<EnterpriseCompetitor>[] = [
    {
      key: 'name',
      header: t('table.company'),
      width: '210px',
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
      header: t('table.industry'),
      width: '150px',
      sortable: true,
    },
    {
      key: 'threatScore',
      header: t('table.threatScore'),
      width: '130px',
      sortable: true,
      render: (_, row) => <ThreatScoreBar score={row.threatScore} />,
    },
    {
      key: 'threatTrend',
      header: t('table.trend'),
      width: '70px',
      align: 'center',
      render: (_, row) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: '15px',
            color: row.threatTrend === 'UP' ? 'var(--cds-support-error)' : row.threatTrend === 'DOWN' ? 'var(--cds-support-success)' : 'var(--cds-text-secondary)',
          }}
        >
          {row.threatTrend === 'UP' ? 'â†‘' : row.threatTrend === 'DOWN' ? 'â†“' : 'â†’'}
        </span>
      ),
    },
    {
      key: 'riskLevel',
      header: t('table.risk'),
      width: '100px',
      sortable: true,
      render: (_, row) => <RiskBadge level={row.riskLevel} />,
    },
    {
      key: 'marketShare',
      header: t('table.marketShare'),
      width: '110px',
      sortable: true,
      align: 'right',
      render: (_, row) => <strong style={{ fontSize: '13px' }}>{row.marketShare}%</strong>,
    },
    {
      key: 'latestActivity',
      header: t('table.latestActivity'),
      width: '260px',
      render: (_, row) => (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--cds-text-secondary)',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
          }}
        >
          {row.latestActivity}
        </span>
      ),
    },
    {
      key: 'aiConfidence',
      header: t('table.aiConfidence'),
      width: '110px',
      align: 'center',
      render: (_, row) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'var(--cds-support-info-bg)',
            color: 'var(--cds-interactive)',
          }}
        >
          {row.aiConfidence == null ? 'Not available' : `${row.aiConfidence}%`}
        </span>
      ),
    },
    {
      key: 'isWatchlist',
      header: t('table.watchlist'),
      width: '80px',
      align: 'center',
      render: (_, row) => (
        <button
          onClick={(e) => toggleWatchlist(row.id, e)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: row.isWatchlist ? '#f59e0b' : 'var(--cds-border-subtle-01)',
          }}
          title={row.isWatchlist ? t('table.removeWatchlist') : t('table.addWatchlist')}
        >
          {row.isWatchlist ? 'â˜…' : 'â˜†'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '110px',
      align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={() => openDrawer(row)}>
          View Intelligence
        </SecondaryButton>
      ),
    },
  ];

  // â”€â”€ Filter Bar Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filters: FilterConfig[] = [
    {
      id: 'industry',
      type: 'select',
      label: t('filters.industry'),
      value: industry,
      onChange: (v) => setIndustry(v as string),
      options: [
        { value: 'All', label: 'All Industries' },
        { value: 'Enterprise Software', label: 'Enterprise Software' },
        { value: 'Cloud Infrastructure', label: 'Cloud Infrastructure' },
        { value: 'Cybersecurity', label: 'Cybersecurity' },
        { value: 'AI / Robotics', label: 'AI / Robotics' },
      ],
    },
    {
      id: 'riskLevel',
      type: 'select',
      label: t('filters.riskLevel'),
      value: riskLevel,
      onChange: (v) => setRiskLevel(v as string),
      options: [
        { value: 'All', label: 'All Risks' },
        { value: 'CRITICAL', label: 'Critical Risk' },
        { value: 'HIGH', label: 'High Risk' },
        { value: 'MEDIUM', label: 'Medium Risk' },
        { value: 'LOW', label: 'Low Risk' },
      ],
    },
    {
      id: 'countryFilter',
      type: 'select',
      label: t('filters.country'),
      value: countryFilter,
      onChange: (v) => setCountryFilter(v as string),
      options: [
        { value: 'All', label: 'All Countries' },
        { value: 'Vietnam', label: 'Vietnam' },
        { value: 'Singapore', label: 'Singapore' },
        { value: 'Japan', label: 'Japan' },
        { value: 'US', label: 'US / Global' },
      ],
    },
    {
      id: 'watchlistFilter',
      type: 'select',
      label: t('filters.watchlist'),
      value: watchlistFilter,
      onChange: (v) => setWatchlistFilter(v as string),
      options: [
        { value: 'All', label: 'All Entities' },
        { value: 'WATCHLIST_ONLY', label: 'Watchlist Only (â˜…)' },
        { value: 'NON_WATCHLIST', label: 'Non-Watchlist' },
      ],
    },
  ];

  // â”€â”€ Render Drawer Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderDrawerTab = () => {
    if (!selected) return null;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px 16px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>AI Executive Brief</strong>
              <p style={{ margin: '8px 0 0' }}>{selected.overview || 'AI analysis is not available.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
              <MetricCard label="Business Impact" value={selected.businessImpact || 'Not available'} />
              <MetricCard label="Strategic Relevance" value={selected.strategicRelevance || 'Not available'} />
              <MetricCard label="Impact Trend" value={selected.impactTrend ? `↑ ${selected.impactTrend}` : 'Not available'} />
              <MetricCard label="AI Radar" value={selected.news.length > 0 ? 'ACTIVE' : 'Not available'} />
            </div>

            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Company intelligence</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Industry:</span> <strong>{selected.industry}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Relationship:</span> <strong>{selected.relationship || 'Not available'}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Headquarters:</span> <strong>{selected.country}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Last updated:</span> <strong>{selected.lastUpdated}</strong></div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Why this company matters</h4>
              {selected.whyItMatters.length > 0 ? selected.whyItMatters.map((reason) => <p key={reason} style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '19px' }}>• {reason}</p>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified data available.</p>}
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selected.timeline.length > 0 ? (
              selected.timeline.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{item.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{item.date}</span>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--cds-interactive)', marginBottom: '5px' }}>{item.category}</div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{item.summary}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                      <span>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)' }}>Open source</a> : `Source: ${item.source}`}</span>
                      <span style={{ color: item.importance === 'HIGH' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)', fontWeight: 600 }}>
                        Impact: {item.importance || 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified activity or trend data available.</p>
            )}
          </div>
        );

      case 'news':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selected.news.length > 0 ? (
              selected.news.map((item) => (
                <div key={item.id} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{item.title}</strong>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: item.sentiment === 'NEGATIVE' ? 'var(--cds-support-error-bg)' : 'var(--cds-layer-01)', color: item.sentiment === 'NEGATIVE' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)', fontWeight: 700 }}>
                      {item.sentiment}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{item.snippet}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {item.topics.map((topic) => <span key={topic} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--cds-border-subtle-00)', color: 'var(--cds-text-secondary)' }}>{topic.replace(/_/g, ' ')}</span>)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{item.source} • {item.date}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '3px' }}>Related company: {item.relatedCompany || 'Not available'} · Business impact: {item.businessImpact || 'Not available'} · AI confidence: {item.confidence == null ? 'Not available' : `${item.confidence}%`}</div>
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: 'var(--cds-interactive)', fontWeight: 600 }}>Open Original Source</a>}
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified news data available.</p>
            )}
          </div>
        );

      case 'market':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selected.marketExpansion.length > 0 ? (
              selected.marketExpansion.map((exp, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{exp.region}</strong>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-interactive)' }}>{exp.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}>Evidence: {exp.details}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}><strong>Business Impact:</strong> {exp.impact === 'No impact assessment recorded.' ? 'No verified data available.' : exp.impact}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>Source: {exp.sourceUrl ? <a href={exp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)' }}>{exp.source}</a> : exp.source}</div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified market activity data available.</p>
            )}
          </div>
        );

      case 'company':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Company profile</h4>
              <div style={{ fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>Industry: {selected.industry}<br />Headquarters: {selected.country}<br />Relationship: {selected.relationship || 'Not available'}</div>
            </div>
            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Financial signals</h4>
              {selected.financialSignals.length > 0 ? selected.financialSignals.map((signal) => <div key={`${signal.type}-${signal.date}`} style={{ fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}><strong>{signal.type}:</strong> {signal.value} <span style={{ color: 'var(--cds-text-helper)' }}>({signal.date})</span></div>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified data available.</p>}
            </div>
            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Products and services</h4>
              {selected.techInvestments.length > 0 ? selected.techInvestments.map((product) => <div key={product.area} style={{ fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}><strong>{product.area}</strong>{product.details ? ` — ${product.details}` : ''}</div>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified data available.</p>}
            </div>
          </div>
        );

      case 'hiring':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selected.hiringActivity.length > 0 ? selected.hiringActivity.map((hire, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{hire.role}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>Location: {hire.location} • Focus: {hire.focusArea}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '3px' }}>Source: {hire.sourceUrl ? <a href={hire.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-interactive)' }}>{hire.source}</a> : hire.source}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cds-interactive)' }}>{hire.count == null ? 'Not available' : hire.count}</div>
                  <div style={{ fontSize: '10px', color: 'var(--cds-text-helper)' }}>Open positions</div>
                </div>
              </div>
            )) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No verified hiring activity is available.</p>
            )}
          </div>
        );

      case 'financial':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selected.financialSignals.map((fin, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{fin.type}</strong>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-support-success)' }}>{fin.value}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{fin.details}</div>
                <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>Date Reported: {fin.date}</div>
              </div>
            ))}
          </div>
        );

      case 'tech':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selected.techInvestments.map((tech, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{tech.area}</strong>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-interactive)' }}>{tech.patentsCount} Patents</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{tech.details}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {tech.techStack.map((stk, i) => (
                    <span key={i} style={{ fontSize: '10px', background: 'var(--cds-border-subtle-00)', color: 'var(--cds-text-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {stk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'swot':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--cds-support-success-bg)', border: '1px solid var(--cds-support-success)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--cds-support-success)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Strengths</strong>
              {selected.strengths.map((str, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '3px' }}>â€¢ {str}</div>
              ))}
            </div>

            <div style={{ background: 'var(--cds-support-error-bg)', border: '1px solid var(--cds-support-error)', borderRadius: 'var(--cds-border-radius)', padding: '12px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--cds-support-error)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Weaknesses</strong>
              {selected.weaknesses.map((wk, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--cds-text-primary)', marginBottom: '3px' }}>â€¢ {wk}</div>
              ))}
            </div>
          </div>
        );

      case 'ai-recommend':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>AI Prescriptive Digest</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)', lineHeight: '22px' }}>
                {selected.aiRecommendation || 'No recommendation is available based on current verified data.'}
              </p>
            </div>
          </div>
        );

      case 'strategic-actions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
              Executive actions to mitigate threat posed by {selected.name}. Click action to cycle status.
            </p>
            {selected.strategicActions.map((sa) => (
              <div
                key={sa.id}
                onClick={() => toggleActionStatus(sa.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  background: 'var(--cds-layer-01)',
                  borderRadius: 'var(--cds-border-radius)',
                  border: '1px solid var(--cds-border-subtle-00)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: sa.priority === 'HIGH' ? 'var(--cds-support-error-bg)' : 'var(--cds-layer-01)',
                    color: sa.priority === 'HIGH' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)',
                    border: `1px solid ${sa.priority === 'HIGH' ? 'var(--cds-support-error)' : 'var(--cds-border-subtle-01)'}`,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {sa.priority}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--cds-text-primary)', lineHeight: '18px' }}>{sa.action}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginTop: '4px' }}>
                    Assigned: {sa.assignedTo || 'Unassigned'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: sa.status === 'COMPLETED' ? 'var(--cds-support-success-bg)' : sa.status === 'IN_PROGRESS' ? 'var(--cds-support-info-bg)' : 'var(--cds-border-subtle-00)',
                    color: sa.status === 'COMPLETED' ? 'var(--cds-support-success)' : sa.status === 'IN_PROGRESS' ? 'var(--cds-interactive)' : 'var(--cds-text-secondary)',
                  }}
                >
                  {sa.status}
                </span>
              </div>
            ))}
          </div>
        );

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

  // â”€â”€ Main Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="cds-page-shell" id="page-competitor-intelligence">
      {/* 1. Page Header */}
      <PageHeader
        title={t('header.title')}
        eyebrow={t('header.eyebrow')}
        description={t('header.description')}
        breadcrumb={[{ label: t('header.dashboard') }, { label: t('header.breadcrumb') }]}
        actions={
          <>
            <SecondaryButton size="md" onClick={exportCompetitorMatrixCsv}>
              {t('actions.exportMatrix')}
            </SecondaryButton>
            <PrimaryButton size="md" loading={runningScan} onClick={() => void handleRunCrawlerScan()}>
              {runningScan ? t('actions.scanning') : t('actions.runScan')}
            </PrimaryButton>
          </>
        }
      />

      {/* Operation Feedback Banner */}
      {opMessage && (
        <div
          style={{
            background: opMessage.tone === 'success' ? 'var(--cds-support-success-bg)' : 'var(--cds-support-error-bg)',
            border: `1px solid ${opMessage.tone === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}`,
            color: opMessage.tone === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)',
            padding: '10px 14px',
            borderRadius: 'var(--cds-border-radius)',
            marginBottom: '14px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {opMessage.text}
        </div>
      )}

      {loadError && (
        <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 14px', border: '1px solid var(--cds-support-error)', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', fontSize: '13px' }}>
          <span>{loadError}</span>
          <SecondaryButton size="sm" onClick={() => setDataVersion((version) => version + 1)}>Retry</SecondaryButton>
        </div>
      )}

      <section aria-label={t('overview.label')} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'end', marginBottom: '12px' }}>
          <div>
            <div style={{ color: 'var(--cds-text-helper)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{t('overview.label')}</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', color: 'var(--cds-text-primary)' }}>{t('header.breadcrumb')}</h2>
          </div>
          <span style={{ color: 'var(--cds-text-helper)', fontSize: '12px' }}>{t('overview.readOnly')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
          <MetricCard label={t('overview.total.label')} value={loading ? '...' : competitors.length || t('overview.noData')} description={t('overview.total.description')} />
          <MetricCard label={t('overview.highImpact.label')} value={loading ? '...' : impactCounts.high || t('overview.noData')} description={t('overview.highImpact.description')} />
          <MetricCard label={t('overview.mediumImpact.label')} value={loading ? '...' : impactCounts.medium || t('overview.noData')} description={t('overview.mediumImpact.description')} />
          <MetricCard label={t('overview.increasing.label')} value={loading ? '...' : impactCounts.increasing || t('overview.noData')} description={t('overview.increasing.description')} />
          <MetricCard label={t('overview.signals.label')} value={loading ? '...' : recentSignals.length || t('overview.noData')} description={t('overview.signals.description')} />
        </div>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: 'var(--cds-text-primary)' }}>{t('overview.attention')}</h3>
        {attentionCompanies.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {attentionCompanies.map((company) => {
            const linkedProjects = projectsForCompany(company);
            const reason = company.whyItMatters[0] || company.news[0]?.snippet || t('overview.noSignals');
            return <div key={company.id} style={{ border: '1px solid var(--cds-border-color)', borderRadius: '6px', padding: '14px', background: 'var(--cds-background)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><strong>{company.name}</strong><RiskBadge level={company.businessImpact || ''} label={company.businessImpact || 'No data'} /></div>
              <div style={{ margin: '6px 0', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{company.relationship || 'COMPETITOR'} · {company.impactTrend || 'Trend not available'}</div>
              <p style={{ margin: '8px 0 12px', fontSize: '12px', lineHeight: '18px', color: 'var(--cds-text-secondary)' }}>{reason}</p>
              <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', marginBottom: '12px' }}>{company.timeline.length} recent signals · {linkedProjects.length} linked projects</div>
              <SecondaryButton size="sm" onClick={() => openDrawer(company)}>{t('overview.viewIntelligence')}</SecondaryButton>
            </div>;
          })}
        </div> : <EmptyState title={t('overview.noAttention')} body={t('overview.noSignals')} />}
      </section>

      <div style={{ marginBottom: '24px' }}>
        <section aria-hidden="true" style={{ display: 'none' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: 'var(--cds-text-primary)' }}>{'To\u00e0n c\u1ea3nh c\u1ea1nh tranh'}</h3>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((impact) => {
            const companies = competitors.filter((company) => company.businessImpact === impact);
            return <div key={impact} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}><strong style={{ minWidth: '78px', fontSize: '12px' }}>{impact} IMPACT</strong><span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{companies.length ? companies.map((company) => <button key={company.id} type="button" onClick={() => openDrawer(company)} style={{ border: 0, background: 'transparent', color: 'var(--cds-interactive)', padding: '0 8px 0 0', cursor: 'pointer' }}>{company.name} {company.impactTrend === 'INCREASING' ? '↑' : company.impactTrend === 'STABLE' ? '→' : company.impactTrend === 'DECREASING' ? '↓' : ''}</button>) : 'No data available'}</span></div>;
          })}
        </section>
        <section style={{ borderTop: '2px solid var(--cds-border-color)', paddingTop: '12px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: 'var(--cds-text-primary)' }}>{t('overview.recentSignals')}</h3>
          {recentSignals.length ? recentSignals.map(({ company, signal }) => <div key={`${company.id}-${signal.id}`} style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.date}</span><div><button type="button" onClick={() => openDrawer(company)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--cds-interactive)', fontWeight: 600, cursor: 'pointer' }}>{company.name}</button><div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.category}</div><div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{signal.title}</div></div><span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{signal.importance || t('overview.noData')}</span></div>) : <p style={{ color: 'var(--cds-text-helper)', fontSize: '12px' }}>{t('overview.noSignals')}</p>}
        </section>
      </div>

      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: 'var(--cds-text-primary)' }}>{t('overview.list')}</h3>
        <div style={{ overflowX: 'auto', border: '1px solid var(--cds-border-color)', borderRadius: '6px' }}><table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '12px' }}><thead><tr style={{ textAlign: 'left', background: 'var(--cds-layer-01)' }}>{[t('table.company'), t('overview.relationship'), t('overview.businessImpact'), t('overview.impactTrend'), t('overview.recentSignalsColumn'), t('overview.marketActivity'), t('overview.hiringActivity'), t('overview.lastUpdated'), ''].map((label) => <th key={label} style={{ padding: '10px', color: 'var(--cds-text-secondary)' }}>{label}</th>)}</tr></thead><tbody>{competitors.map((company) => <tr key={company.id} style={{ borderTop: '1px solid var(--cds-border-subtle-00)' }}><td style={{ padding: '10px', fontWeight: 600 }}>{company.name}</td><td style={{ padding: '10px' }}>{company.relationship || t('overview.noData')}</td><td style={{ padding: '10px' }}>{company.businessImpact || t('overview.noData')}</td><td style={{ padding: '10px' }}>{company.impactTrend || t('overview.noData')}</td><td style={{ padding: '10px' }}>{company.timeline.length}</td><td style={{ padding: '10px' }}>{company.marketExpansion.length ? t('overview.verifiedSignal') : t('overview.noData')}</td><td style={{ padding: '10px' }}>{company.hiringActivity.length ? t('overview.verifiedSignal') : t('overview.noData')}</td><td style={{ padding: '10px' }}>{company.lastUpdated}</td><td style={{ padding: '10px' }}><SecondaryButton size="sm" onClick={() => openDrawer(company)}>{t('overview.viewIntelligence')}</SecondaryButton></td></tr>)}</tbody></table></div>
      </section>

      {/* 2. Top Executive KPI Cards */}
      <div style={{ display: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard label={t('metrics.competitors.label')} value={totalCompetitors} description={t('metrics.competitors.description')} trend={1} trendLabel={t('metrics.thisMonth')} />
        <MetricCard label={t('metrics.watchlist.label')} value={watchlistCount} description={t('metrics.watchlist.description')} />
        <MetricCard label={t('metrics.alerts.label')} value={newAlertsCount} description={t('metrics.alerts.description')} />
      </div>

      {/* 3. Distribution Charts & Recent Activity Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', marginBottom: '16px' }}>
        {/* Threat Distribution Chart */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('charts.threatDistribution')}
          </h3>
          <ThreatDistributionDonut
            critical={threatCounts.critical}
            high={threatCounts.high}
            medium={threatCounts.medium}
            low={threatCounts.low}
          />
        </div>

        {/* Industry Distribution Chart */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('charts.industryConcentration')}
          </h3>
          <IndustryBarChart data={industryCounts} />
        </div>

        {/* Recent Competitor Activities Feed */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('charts.recentActivities')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px' }}>
            {recentActivitiesFeed.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: idx < recentActivitiesFeed.length - 1 ? '1px solid var(--cds-border-subtle-00)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <strong style={{ color: 'var(--cds-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.competitorName}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--cds-text-helper)', whiteSpace: 'nowrap', marginLeft: '6px' }}>{item.event.date}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.event.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Advanced Filters Bar */}
      <FilterBar
        searchValue={search}
        searchPlaceholder={t('filters.search')}
        onSearchChange={setSearch}
        filters={filters}
      />

      {/* 5. Enterprise Table */}
      <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px' }}>
        <DataTable<EnterpriseCompetitor>
          columns={columns}
          data={filtered}
          rowKey={(row) => row.id}
          onRowClick={openDrawer}
          pageSize={10}
          exportFilename="competitor-intelligence-matrix"
          loading={loading}
          emptyState={
            <EmptyState
              title={t('emptyState.title')}
              body={t('emptyState.body')}
              action={
                <PrimaryButton
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setIndustry('All');
                    setRiskLevel('All');
                    setThreatScoreFilter('All');
                    setCountryFilter('All');
                    setWatchlistFilter('All');
                  }}
                >
                  {t('filters.reset')}
                </PrimaryButton>
              }
            />
          }
        />
      </div>

      </div>

      {/* 6. Right Side Intelligence Drawer (Zero Popups) */}
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
              <RiskBadge level={selected.businessImpact || ''} label={`Business Impact: ${selected.businessImpact || 'Not available'}`} showDot />
              <RiskBadge level={selected.strategicRelevance || ''} label={`Strategic Relevance: ${selected.strategicRelevance || 'Not available'}`} />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Relationship: <strong>{selected.relationship || 'Not available'}</strong></span>
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Impact Trend: <strong>{selected.impactTrend ? `↑ ${selected.impactTrend}` : 'Not available'}</strong></span>
              <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)', marginLeft: '8px' }}>
                {t('drawer.synced')} {selected.lastUpdated}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-support-success)', fontWeight: 600 }}>
                {selected.news.length > 0 ? '• AI Radar Active' : 'AI Radar — Not available'}
              </span>
            </div>

            <div style={{ position: 'sticky', top: '-24px', zIndex: 2, background: 'var(--cds-background)', padding: '10px 0 8px' }}>
              <Tabs items={drawerTabs} activeId={drawerTab} onChange={setDrawerTab} />
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
