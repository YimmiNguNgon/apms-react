/* eslint-disable @typescript-eslint/no-explicit-any */
// Crawler Intelligence Control — IBM Carbon Monitoring Center Redesign
// Real-time crawler operations center with multi-tab feeds, live system metrics, and right monitoring sidebar.
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  externalDataApi,
  type ArticleAiStats,
  type CrawlRejectionSummary,
  type CrawlRunStats,
  type ExternalDataCategory,
  type ExternalDataItem,
  type TrustedSource,
} from '../API/externalDataApi';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  EmptyState,
  StatusBadge,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';
import { projectApi } from '../API/projectApi';
import type { ProjectResponse } from '../types/domain';

// ─── Extended Tab Definitions ────────────────────────────────────────────────
type CrawlerTab = 'NEWS' | 'JOBS' | 'FINANCIAL' | 'PRESS_RELEASE' | 'GOVERNMENT' | 'SOCIAL';

const TABS = [
  { id: 'NEWS',          label: 'News' },
  { id: 'JOBS',          label: 'Jobs' },
  { id: 'FINANCIAL',     label: 'Financial' },
  { id: 'PRESS_RELEASE', label: 'Press Release' },
  { id: 'GOVERNMENT',    label: 'Government' },
  { id: 'SOCIAL',        label: 'Social' },
];

// ─── Helper Badge Functions ──────────────────────────────────────────────────
const SentimentBadge: React.FC<{ sentiment?: string | null }> = ({ sentiment }) => {
  const value = String(sentiment || 'NEUTRAL').toUpperCase();
  const colors = {
    POSITIVE: { bg: 'var(--cds-support-success-bg)', color: 'var(--cds-support-success)', label: 'Positive' },
    NEGATIVE: { bg: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', label: 'Negative' },
    NEUTRAL:  { bg: 'var(--cds-layer-01)', color: 'var(--cds-text-secondary)', label: 'Neutral' },
  };
  const theme = colors[value as keyof typeof colors] || colors.NEUTRAL;
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: theme.bg, color: theme.color, whiteSpace: 'nowrap' }}>
      {theme.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ level?: string | null }> = ({ level }) => {
  const value = String(level || 'MEDIUM').toUpperCase();
  if (value === 'HIGH' || value === 'CRITICAL') return <RiskBadge level="HIGH" />;
  if (value === 'LOW') return <RiskBadge level="LOW" />;
  return <RiskBadge level="MEDIUM" />;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const CrawlerControl: React.FC = () => {
  const { t } = useTranslation('crawler-control');
  // ── State ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CrawlerTab>('NEWS');
  const [items, setItems] = useState<ExternalDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Backend System State
  const [trustedSources, setTrustedSources] = useState<TrustedSource[]>([]);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRunStats[]>([]);
  const [rejectionSummary, setRejectionSummary] = useState<CrawlRejectionSummary>({
    totalRuns: 0,
    rejectedUntrusted: 0,
    rejectedUnknownDomain: 0,
    rejectedNoCompany: 0,
  });
  const [aiStats, setAiStats] = useState<ArticleAiStats | null>(null);

  // Operation triggers
  const [runningFetch, setRunningFetch] = useState(false);
  const [runningAnalyze, setRunningAnalyze] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Drawer detail state
  const [selectedItem, setSelectedItem] = useState<ExternalDataItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Map tab to API category
      const categoryMap: Record<CrawlerTab, ExternalDataCategory> = {
        NEWS: 'NEWS',
        JOBS: 'OPPORTUNITY',
        FINANCIAL: 'NEWS',
        PRESS_RELEASE: 'NEWS',
        GOVERNMENT: 'RISK',
        SOCIAL: 'NEWS',
      };

      const [resData, sourcesRes, runsRes, rejectRes, statsRes] = await Promise.allSettled([
        externalDataApi.getItems(categoryMap[activeTab], { page: 0, size: 50, projectId: activeProjectId ?? undefined }),
        externalDataApi.listTrustedSources(),
        externalDataApi.getCrawlRuns(),
        externalDataApi.getRejectionSummary(),
        externalDataApi.getArticleAiStats(),
      ]);

      if (resData.status === 'fulfilled' && Array.isArray(resData.value?.content)) {
        setItems(resData.value.content);
      } else {
        setItems([]);
      }

      if (sourcesRes.status === 'fulfilled' && Array.isArray(sourcesRes.value)) setTrustedSources(sourcesRes.value);
      if (runsRes.status === 'fulfilled' && Array.isArray(runsRes.value)) setCrawlRuns(runsRes.value);
      if (rejectRes.status === 'fulfilled' && rejectRes.value) setRejectionSummary(rejectRes.value);
      if (statsRes.status === 'fulfilled' && statsRes.value) setAiStats(statsRes.value);
    } catch {
      // fallback handling
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeProjectId]);

  useEffect(() => {
    void projectApi.getAllProjects().then((response) => {
      const available = response.data?.content?.filter((project) => Boolean(project.targetCompanyProfileId)) || [];
      setProjects(available);
      setActiveProjectId((current) => current ?? available[0]?.id ?? null);
    }).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    void loadData();
    const timer = setInterval(() => void loadData(), 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleTriggerCrawl = async () => {
    setRunningFetch(true);
    setScanMessage('Initiating crawler scan across active trusted sources...');
    try {
      if (!activeProjectId) throw new Error('Select a project with a company profile before running the crawler.');
      const msg = await externalDataApi.runFetch({ projectId: String(activeProjectId) });
      setScanMessage(msg || 'Crawler scan executed successfully.');
      await loadData();
    } catch (err) {
      setScanMessage(`Crawl failed: ${err instanceof Error ? err.message : 'Connection error'}`);
    } finally {
      setRunningFetch(false);
      setTimeout(() => setScanMessage(null), 4000);
    }
  };

  const handleRunAiAnalysis = async () => {
    setRunningAnalyze(true);
    setScanMessage('Running AI NLP Sentiment & Entity Extraction pipeline...');
    try {
      if (!activeProjectId) throw new Error('Select a project with a company profile before running AI analysis.');
      const msg = await externalDataApi.runAnalyze({ projectId: String(activeProjectId) });
      setScanMessage(msg || 'AI analysis completed across unparsed items.');
      await loadData();
    } catch (err) {
      setScanMessage(`AI analysis error: ${err instanceof Error ? err.message : 'API error'}`);
    } finally {
      setRunningAnalyze(false);
      setTimeout(() => setScanMessage(null), 4000);
    }
  };

  const openItemDrawer = (item: ExternalDataItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const displayItems: ExternalDataItem[] = items;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return displayItems.filter((item) => {
      const matchSearch =
        !search ||
        (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.relatedCompanyName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.source || '').toLowerCase().includes(search.toLowerCase());

      const matchSource = sourceFilter === 'All' || item.source === sourceFilter;
      const matchSentiment = sentimentFilter === 'All' || (item.sentiment || 'NEUTRAL').toUpperCase() === sentimentFilter;
      const matchPriority = priorityFilter === 'All' || (item.riskLevel || 'MEDIUM').toUpperCase() === priorityFilter;

      return matchSearch && matchSource && matchSentiment && matchPriority;
    });
  }, [displayItems, search, sourceFilter, sentimentFilter, priorityFilter]);

  // Unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set(displayItems.map((i) => i.source).filter(Boolean) as string[]);
    return [{ value: 'All', label: 'All Sources' }, ...Array.from(set).map((s) => ({ value: s, label: s }))];
  }, [displayItems]);

  // ── Metrics Computation ────────────────────────────────────────────────────
  const totalArticles = aiStats?.totalArticles || items.length;
  const referencedCompanies = aiStats?.uniqueArticles || new Set(items.map((item) => item.companyProfileId).filter(Boolean)).size;
  const crawlerHealth = crawlRuns.length > 0 ? 'Active' : 'Idle';
  const crawlerErrors = rejectionSummary.rejectedUntrusted + rejectionSummary.rejectedUnknownDomain;
  const newRisksCount = displayItems.filter((i) => i.riskLevel === 'HIGH' || i.riskLevel === 'CRITICAL').length;
  const lastCrawlRunAt = crawlRuns.length > 0 ? crawlRuns[0].runAt : null;
  const lastCrawlTime = lastCrawlRunAt && !Number.isNaN(new Date(lastCrawlRunAt).getTime())
    ? new Date(lastCrawlRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (lastCrawlRunAt || 'Never');

  // ── Table Column Definitions ───────────────────────────────────────────────
  const columns: ColumnDef<ExternalDataItem>[] = [
    {
      key: 'source',
      header: 'Source',
      width: '150px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-01)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>
            {(row.source || row.sourceDomain || 'WEB').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>{row.source || 'Web Source'}</div>
            <div style={{ fontSize: '10px', color: 'var(--cds-text-helper)' }}>{row.sourceDomain || 'crawler'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title & Digest',
      width: '280px',
      render: (_, row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', lineHeight: '18px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {row.title || 'Untitled Article'}
          </div>
          {row.summary && (
            <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '270px' }}>
              {row.summary}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'relatedCompanyName',
      header: 'Company',
      width: '140px',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: row.relatedCompanyName ? 'var(--cds-text-primary)' : 'var(--cds-text-helper)' }}>
          {row.relatedCompanyName || '—'}
        </span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Date',
      width: '110px',
      render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{row.publishedAt || 'Recent'}</span>,
    },
    {
      key: 'sentiment',
      header: 'Sentiment',
      width: '100px',
      sortable: true,
      render: (_, row) => <SentimentBadge sentiment={row.sentiment} />,
    },
    {
      key: 'sentimentConfidence',
      header: 'Confidence',
      width: '100px',
      align: 'center',
      render: (_, row) => (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cds-support-info-bg)', color: 'var(--cds-interactive)' }}>
          {row.sentimentConfidence ? `${Math.round(row.sentimentConfidence * (row.sentimentConfidence <= 1 ? 100 : 1))}%` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'AI Category',
      width: '110px',
      render: (_, row) => (
        <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--cds-layer-01)', color: 'var(--cds-text-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--cds-border-subtle-00)' }}>
          {row.category || activeTab}
        </span>
      ),
    },
    {
      key: 'riskLevel',
      header: 'Priority',
      width: '90px',
      sortable: true,
      render: (_, row) => <PriorityBadge level={row.riskLevel || row.opportunityLevel} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={() => openItemDrawer(row)}>
          Details
        </SecondaryButton>
      ),
    },
  ];

  // ── Filter Configurations ─────────────────────────────────────────────────
  const filters: FilterConfig[] = [
    { id: 'source', type: 'select', label: 'Source', value: sourceFilter, onChange: (v) => setSourceFilter(v as string), options: uniqueSources },
    {
      id: 'sentiment',
      type: 'select',
      label: 'Sentiment',
      value: sentimentFilter,
      onChange: (v) => setSentimentFilter(v as string),
      options: [
        { value: 'All', label: 'All Sentiments' },
        { value: 'POSITIVE', label: 'Positive' },
        { value: 'NEUTRAL', label: 'Neutral' },
        { value: 'NEGATIVE', label: 'Negative' },
      ],
    },
    {
      id: 'priority',
      type: 'select',
      label: 'Priority',
      value: priorityFilter,
      onChange: (v) => setPriorityFilter(v as string),
      options: [
        { value: 'All', label: 'All Priorities' },
        { value: 'HIGH', label: 'High Priority' },
        { value: 'MEDIUM', label: 'Medium Priority' },
        { value: 'LOW', label: 'Low Priority' },
      ],
    },
  ];

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="cds-page-shell" id="page-crawler-control">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        eyebrow="Business Ecosystem Intelligence • Data Ingestion Engine"
        description={t('description')}
        breadcrumb={[{ label: t('breadcrumb.dashboard') }, { label: t('breadcrumb.operations') }]}
        actions={
          <>
            <select
              aria-label={t('projectScope.ariaLabel')}
              value={activeProjectId ?? ''}
              onChange={(event) => setActiveProjectId(event.target.value ? Number(event.target.value) : null)}
              style={{ minWidth: '220px', height: '40px', border: '1px solid var(--cds-border-color)', background: 'var(--cds-background)', color: 'var(--cds-text-primary)', padding: '0 10px' }}
            >
              <option value="">{t('projectScope.select')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.projectName} - {project.targetCompanyName}</option>
              ))}
            </select>
            <SecondaryButton size="md" disabled={runningAnalyze || !activeProjectId} onClick={handleRunAiAnalysis}>
              {t('actions.runNlp')}
            </SecondaryButton>
            <PrimaryButton size="md" loading={runningFetch} disabled={!activeProjectId} onClick={handleTriggerCrawl}>
              Trigger Market Crawl
            </PrimaryButton>
          </>
        }
      />

      {/* Operation Feedback Message */}
      {scanMessage && (
        <div style={{ background: 'var(--cds-support-info-bg)', border: '1px solid var(--cds-interactive)', color: 'var(--cds-interactive)', padding: '10px 14px', borderRadius: 'var(--cds-border-radius)', marginBottom: '14px', fontSize: '13px', fontWeight: 600 }}>
          {scanMessage}
        </div>
      )}

      {/* Top Executive KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard label="Articles" value={totalArticles} description="Total ingested items" trend={12} trendLabel="today" />
        <MetricCard label="Companies" value={referencedCompanies} description="Entities extracted" />
        <MetricCard label="New Risks" value={newRisksCount} description="High risk signals" valueColor={newRisksCount > 5 ? 'var(--cds-support-error)' : undefined} />
      </div>

      {/* 2-Column Main Operations Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '16px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Tabs, Filters & Main Data Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Main Feed Category Tabs */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px 0 16px' }}>
            <Tabs items={TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as CrawlerTab)} />
          </div>

          {/* Filter Bar */}
          <FilterBar
            searchValue={search}
            searchPlaceholder="Search article title, company, or source..."
            onSearchChange={setSearch}
            filters={filters}
          />

          {/* Data Table */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px' }}>
            <DataTable<ExternalDataItem>
              columns={columns}
              data={filteredItems}
              rowKey={(row) => row.id}
              onRowClick={openItemDrawer}
              pageSize={10}
              exportFilename={`crawler-feed-${activeTab.toLowerCase()}`}
              loading={loading}
              emptyState={
                <EmptyState
                  title="No articles match your criteria"
                  body="Try clearing filters or trigger a fresh market crawl scan."
                  action={
                    <PrimaryButton size="sm" onClick={() => { setSearch(''); setSourceFilter('All'); setSentimentFilter('All'); setPriorityFilter('All'); }}>
                      Reset Filters
                    </PrimaryButton>
                  }
                />
              }
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR: Monitoring Controls & Pipeline Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 1. Crawler Status Card */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                Crawler System Status
              </h3>
              <StatusBadge status="VERIFIED" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Workers Active:</span>
                <strong style={{ color: 'var(--cds-text-primary)' }}>{runningFetch ? 'Running' : 'Idle'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Rate Limit:</span>
                <strong style={{ color: 'var(--cds-text-primary)' }}>Source controlled</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Trusted Sources:</span>
                <strong style={{ color: 'var(--cds-interactive)' }}>{trustedSources.length} Domains</strong>
              </div>
            </div>
          </div>

          {/* 2. Pipeline Processing Queue */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
              Pipeline Queue
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>Pending AI Summaries</span>
                  <span style={{ fontWeight: 700, color: 'var(--cds-interactive)' }}>{aiStats?.articlesPending || 0} items</span>
                </div>
                <div style={{ height: '5px', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: 'var(--cds-interactive)', borderRadius: '3px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>Entity Linking Queue</span>
                  <span style={{ fontWeight: 700, color: 'var(--cds-support-success)' }}>0 items</span>
                </div>
                <div style={{ height: '5px', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: 'var(--cds-support-success)', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Rejected Sources Summary */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
              Rejected Sources Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Untrusted Domain</span>
                <strong style={{ color: 'var(--cds-support-error)' }}>{rejectionSummary.rejectedUntrusted}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Unknown Host</span>
                <strong style={{ color: '#92400e' }}>{rejectionSummary.rejectedUnknownDomain}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Unmatched Entity</span>
                <strong style={{ color: 'var(--cds-text-primary)' }}>{rejectionSummary.rejectedNoCompany}</strong>
              </div>
            </div>
          </div>

          {/* 4. Recent Scan Execution Log */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
              Recent Scan Runs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {crawlRuns.slice(0, 3).map((run, i) => (
                <div key={run.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px 0' }}>
                  <span style={{ color: 'var(--cds-text-primary)', fontWeight: 600 }}>Run #{run.id} · {run.totalFetched || 0} items</span>
                  <span style={{ color: 'var(--cds-text-helper)' }}>
                    {run.runAt && !Number.isNaN(new Date(run.runAt).getTime())
                      ? new Date(run.runAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : (run.runAt || 'Recent')}
                  </span>
                </div>
              ))}
              {crawlRuns.length === 0 && <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>No crawl runs yet.</span>}
            </div>
          </div>

          {/* 5. Upcoming Jobs Timetable */}
          <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
              Upcoming Jobs (Cron)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-primary)' }}>News & Financial Crawl</span>
                <span style={{ color: 'var(--cds-text-helper)', fontWeight: 600 }}>Not scheduled</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-primary)' }}>Patent & Regulatory Sync</span>
                <span style={{ color: 'var(--cds-text-helper)' }}>Not scheduled</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-primary)' }}>Full AI Re-indexing</span>
                <span style={{ color: 'var(--cds-text-helper)' }}>Not scheduled</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Article Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem?.title || 'Article Intelligence'}
        subtitle={selectedItem ? `${selectedItem.source || 'Web Source'} • ${selectedItem.publishedAt || 'Ingested'}` : ''}
        width={680}
        footerActions={
          <>
            {selectedItem?.url && (
              <SecondaryButton size="sm" onClick={() => window.open(selectedItem.url || '', '_blank')}>
                Open External Source ↗
              </SecondaryButton>
            )}
            <PrimaryButton size="sm" onClick={() => handleRunAiAnalysis()}>
              Re-analyze with AI
            </PrimaryButton>
          </>
        }
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <SentimentBadge sentiment={selectedItem.sentiment} />
              <PriorityBadge level={selectedItem.riskLevel || selectedItem.opportunityLevel} />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginLeft: 'auto' }}>
                Confidence: <strong>{selectedItem.sentimentConfidence ? `${Math.round(selectedItem.sentimentConfidence * (selectedItem.sentimentConfidence <= 1 ? 100 : 1))}%` : 'N/A'}</strong>
              </span>
            </div>

            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '12px 14px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>AI Executive Summary:</strong> {selectedItem.summary || selectedItem.aiSummary || 'No summary generated yet for this item.'}
            </div>

            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Article Metadata</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Associated Company:</span> <strong>{selectedItem.relatedCompanyName || 'None'}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Category:</span> <strong>{selectedItem.category || activeTab}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Source Domain:</span> <strong>{selectedItem.sourceDomain || selectedItem.source || 'Unknown'}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Ingested At:</span> <strong>{selectedItem.createdAt || 'Recent'}</strong></div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
