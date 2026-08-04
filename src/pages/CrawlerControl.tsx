import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Globe,
  Newspaper,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  externalDataApi,
  type CrawlRejectionSummary,
  type CrawlRunStats,
  type ExternalDataCategory,
  type ExternalDataItem,
  type TrustedSource,
} from '../API/externalDataApi';
import { ROLES, useUser } from '../context/UserContext';

const PAGE_SIZE = 9;

const CATEGORY_TABS: { value: ExternalDataCategory; label: string }[] = [
  { value: 'NEWS', label: 'News' },
  { value: 'OPPORTUNITY', label: 'Opportunities' },
  { value: 'RISK', label: 'Risks' },
];

const categoryClass = (category?: ExternalDataCategory | null) => {
  if (category === 'RISK') return 'danger';
  if (category === 'OPPORTUNITY') return 'success';
  return 'info';
};

const levelClass = (level?: string | null) => {
  const value = String(level || '').toUpperCase();
  if (value === 'HIGH') return 'danger';
  if (value === 'MEDIUM') return 'warning';
  if (value === 'LOW') return 'success';
  return 'neutral';
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const cardSummary = (item: ExternalDataItem) =>
  item.summary?.trim() || 'No summary is available for this item yet.';

export const CrawlerControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExternalDataCategory>('NEWS');
  const [items, setItems] = useState<ExternalDataItem[]>([]);
  const [counts, setCounts] = useState<Record<ExternalDataCategory, number>>({
    NEWS: 0,
    OPPORTUNITY: 0,
    RISK: 0,
  });
  const [sources, setSources] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningFetch, setRunningFetch] = useState(false);
  const [runningAnalyze, setRunningAnalyze] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  const [trustedSources, setTrustedSources] = useState<TrustedSource[]>([]);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRunStats[]>([]);
  const [rejectionSummary, setRejectionSummary] = useState<CrawlRejectionSummary>({
    totalRuns: 0,
    rejectedUntrusted: 0,
    rejectedUnknownDomain: 0,
    rejectedNoCompany: 0,
  });
  const [sourceDraft, setSourceDraft] = useState({ domain: '', sourceName: '', category: '' });
  const [savingSource, setSavingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === ROLES.ADMIN;

  const activeProjectId = localStorage.getItem('apms-active-project') || '';

  const loadTrustedSources = useCallback(async () => {
    try {
      setTrustedSources(await externalDataApi.listTrustedSources());
    } catch {
      // whitelist may be unavailable to the current role; keep whatever we had
    }
  }, []);

  const loadCrawlStats = useCallback(async () => {
    try {
      const [runs, summary] = await Promise.all([
        externalDataApi.getCrawlRuns(),
        externalDataApi.getRejectionSummary(),
      ]);
      setCrawlRuns(runs);
      setRejectionSummary(summary);
    } catch {
      // non-critical
    }
  }, []);

  const loadCounts = useCallback(async () => {
    const [news, opp, risk] = await Promise.all([
      externalDataApi.getCount('NEWS'),
      externalDataApi.getCount('OPPORTUNITY'),
      externalDataApi.getCount('RISK'),
    ]);
    setCounts({ NEWS: news, OPPORTUNITY: opp, RISK: risk });
  }, []);

  const loadItems = useCallback(async (tab: ExternalDataCategory, p: number, kw: string, src: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await externalDataApi.getItems(tab, {
        page: p,
        size: PAGE_SIZE,
        keyword: kw.trim() || undefined,
        source: src || undefined,
      });
      setItems(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(Math.max(Number(data?.totalPages || 1), 1));
      setTotalElements(Number(data?.totalElements ?? data?.content?.length ?? 0));
      setSources((prev) => Array.from(new Set([
        ...prev,
        ...(data?.content || []).map((item) => item.source || '').filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b)));
    } catch (err: unknown) {
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
      setError(err instanceof Error ? err.message : 'Cannot load crawler data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadCounts();
    loadItems(activeTab, page, keyword, selectedSource);
    loadTrustedSources();
    loadCrawlStats();
  }, [loadCounts, loadItems, activeTab, page, keyword, selectedSource, loadTrustedSources, loadCrawlStats]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadItems(activeTab, page, keyword, selectedSource);
  }, [activeTab, page, keyword, selectedSource, loadItems]);

  useEffect(() => {
    loadTrustedSources();
    loadCrawlStats();
  }, [loadTrustedSources, loadCrawlStats]);

  useEffect(() => {
    const interval = window.setInterval(() => refreshAll(), 30000);
    return () => window.clearInterval(interval);
  }, [refreshAll]);

  const runCrawl = async () => {
    setRunningFetch(true);
    setActionMessage(null);
    try {
      const message = await externalDataApi.runFetch({
        projectId: activeProjectId || undefined,
        forceRefresh,
      });
      setActionMessage({ kind: 'success', text: message });
      await loadCounts();
      await loadItems(activeTab, page, keyword, selectedSource);
      await loadCrawlStats();
    } catch (err: unknown) {
      setActionMessage({
        kind: 'danger',
        text: err instanceof Error ? err.message : 'Failed to run crawl.',
      });
    } finally {
      setRunningFetch(false);
    }
  };

  const runAnalyze = async () => {
    setRunningAnalyze(true);
    setActionMessage(null);
    try {
      const message = await externalDataApi.runAnalyze({
        projectId: activeProjectId || undefined,
      });
      setActionMessage({ kind: 'success', text: message });
      await loadCounts();
      await loadItems(activeTab, page, keyword, selectedSource);
      await loadCrawlStats();
    } catch (err: unknown) {
      setActionMessage({
        kind: 'danger',
        text: err instanceof Error ? err.message : 'Failed to run analysis.',
      });
    } finally {
      setRunningAnalyze(false);
    }
  };

  const addTrustedSource = async () => {
    if (!sourceDraft.domain.trim() || !sourceDraft.sourceName.trim()) {
      setSourceError('Domain and source name are required.');
      return;
    }
    setSavingSource(true);
    setSourceError(null);
    try {
      await externalDataApi.addTrustedSource({
        domain: sourceDraft.domain.trim(),
        sourceName: sourceDraft.sourceName.trim(),
        category: sourceDraft.category.trim() || undefined,
      });
      setSourceDraft({ domain: '', sourceName: '', category: '' });
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : 'Failed to add trusted source.');
    } finally {
      setSavingSource(false);
    }
  };

  const toggleTrustedSource = async (source: TrustedSource) => {
    try {
      await externalDataApi.setTrustedSourceActive(source.id, !source.active);
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : 'Failed to toggle trusted source.');
    }
  };

  const removeTrustedSource = async (source: TrustedSource) => {
    try {
      await externalDataApi.deleteTrustedSource(source.id);
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : 'Failed to remove trusted source.');
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedSource('');
    setPage(0);
  };

  const totalItems = counts.NEWS + counts.OPPORTUNITY + counts.RISK;

  const statCards = [
    { label: 'Total items', value: totalItems },
    { label: 'News', value: counts.NEWS },
    { label: 'Opportunities', value: counts.OPPORTUNITY },
    { label: 'Risks', value: counts.RISK },
  ];

  return (
    <section className="workspace-page crawler-news-page" id="page-crawler-control">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Intelligence <span>/</span> Crawler Control</div>

          <div className="workspace-page-head crawler-news-head compact-hero">
            <div>
              <h1>Crawler Intelligence Control</h1>
            </div>
            <div className="workspace-head-actions" style={{ gap: 8 }}>
              <label
                className="btn btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                title="Ignore the per-company crawl cooldown and re-fetch everything"
              >
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(event) => setForceRefresh(event.target.checked)}
                />
                Force refresh
              </label>
              <button
                className="btn btn-primary"
                onClick={runCrawl}
                disabled={runningFetch}
              >
                {runningFetch ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
                {runningFetch ? 'Crawling…' : 'Run Crawl'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={runAnalyze}
                disabled={runningAnalyze}
              >
                {runningAnalyze ? <RefreshCw size={15} className="spin" /> : <BrainCircuit size={15} />}
                {runningAnalyze ? 'Analyzing…' : 'Run Analysis'}
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className={`workspace-alert ${actionMessage.kind}`}>
              {actionMessage.text}
            </div>
          )}

          <div className="workspace-stats crawler-news-stats compact-stats">
            {statCards.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <nav className="tabs" aria-label="Crawler category tabs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`tab ${activeTab === tab.value ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.value);
                  setPage(0);
                }}
              >
                {tab.label}
                <span className="workspace-badge neutral" style={{ marginLeft: 8 }}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </nav>

          <div className="workspace-panel crawler-news-filter-panel">
            <div className="crawler-news-search">
              <Search size={18} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search title or summary..."
              />
            </div>

            <label className="crawler-news-select">
              <Building2 size={16} />
              <select
                value={selectedSource}
                onChange={(event) => {
                  setSelectedSource(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">All sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>

            <button className="btn btn-ghost" onClick={resetFilters}>Reset</button>
          </div>

          {error && <div className="workspace-alert danger">{error}</div>}

          {loading ? (
            <div className="crawler-news-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <article key={index} className="crawler-news-card crawler-news-card-loading" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="workspace-panel">
              <div className="workspace-empty">
                No items found in this category. Run a crawl to collect data.
              </div>
            </div>
          ) : (
            <div className="crawler-news-grid">
              {items.map((item) => (
                <article key={item.id} className="crawler-news-card">
                  <div className="crawler-news-thumb">
                    {item.category === 'RISK' ? (
                      <AlertTriangle size={30} />
                    ) : item.category === 'OPPORTUNITY' ? (
                      <TrendingUp size={30} />
                    ) : (
                      <Newspaper size={30} />
                    )}
                    <span className={`workspace-badge ${categoryClass(item.category)}`}>
                      {item.category || 'NEWS'}
                    </span>
                  </div>

                  <div className="crawler-news-card-body">
                    <div className="crawler-news-company-row">
                      <span className="crawler-company-pill">
                        {item.relatedCompanyName || 'No company match'}
                      </span>
                      {item.sentiment && (
                        <span className="crawler-company-pill muted">{item.sentiment}</span>
                      )}
                    </div>

                    <h3>{item.title || 'Untitled item'}</h3>
                    <p>{cardSummary(item)}</p>

                    <div className="crawler-news-meta">
                      <span><CalendarDays size={14} /> {formatDate(item.publishedAt)}</span>
                      <span><FileText size={14} /> {item.source || 'Unknown source'}{item.sourceDomain ? ` · ${item.sourceDomain}` : ''}</span>
                    </div>

                    <div className="crawler-news-footer">
                      <span>
                        {item.riskLevel && (
                          <span className={`workspace-badge ${levelClass(item.riskLevel)}`}>
                            Risk {item.riskLevel}
                          </span>
                        )}
                        {item.opportunityLevel && (
                          <span className={`workspace-badge ${levelClass(item.opportunityLevel)}`}>
                            Opportunity {item.opportunityLevel}
                          </span>
                        )}
                        {!item.riskLevel && !item.opportunityLevel && (
                          <span className="workspace-badge neutral">GENERAL</span>
                        )}
                      </span>
                      <div className="crawler-news-actions">
                        {item.url && (
                          <a className="btn btn-primary btn-sm" href={item.url} target="_blank" rel="noreferrer">
                            Original
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="workspace-pagination crawler-news-pagination">
            <span>
              Showing {items.length} of {totalElements} items
            </span>
            <div>
              <button
                className="btn btn-secondary"
                disabled={page === 0 || loading}
                onClick={() => setPage((value) => Math.max(value - 1, 0))}
              >
                Previous
              </button>
              <strong>Page {page + 1} / {totalPages}</strong>
              <button
                className="btn btn-secondary"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </div>

          <div className="workspace-panel" style={{ marginTop: 28 }}>
            <div className="workspace-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} />
                <div>
                  <h3>Trusted press whitelist</h3>
                  <p>
                    Only articles whose original publisher is an approved domain are kept during a crawl.
                    Aggregator links with no resolvable publisher are dropped. Changes apply on the next crawl.
                  </p>
                </div>
              </div>
              <span className="workspace-badge neutral">
                {trustedSources.filter((source) => source.active).length} active of {trustedSources.length}
              </span>
            </div>

            {isAdmin ? (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <input
                  value={sourceDraft.domain}
                  onChange={(event) => setSourceDraft({ ...sourceDraft, domain: event.target.value })}
                  placeholder="domain e.g. vnexpress.net"
                  style={{ flex: '1 1 220px', minWidth: 0 }}
                  className="crawler-news-search"
                />
                <input
                  value={sourceDraft.sourceName}
                  onChange={(event) => setSourceDraft({ ...sourceDraft, sourceName: event.target.value })}
                  placeholder="Source name e.g. VnExpress"
                  style={{ flex: '1 1 180px', minWidth: 0 }}
                  className="crawler-news-search"
                />
                <input
                  value={sourceDraft.category}
                  onChange={(event) => setSourceDraft({ ...sourceDraft, category: event.target.value })}
                  placeholder="Category (optional)"
                  style={{ flex: '1 1 140px', minWidth: 0 }}
                  className="crawler-news-search"
                />
                <button className="btn btn-primary" onClick={addTrustedSource} disabled={savingSource}>
                  {savingSource ? <RefreshCw size={15} className="spin" /> : <Plus size={15} />}
                  Add source
                </button>
              </div>
            ) : (
              <div className="workspace-alert" style={{ margin: '12px 0' }}>
                Only administrators can manage the trusted-source whitelist.
              </div>
            )}

            {sourceError && <div className="workspace-alert danger" style={{ marginTop: 12 }}>{sourceError}</div>}

            <div className="workspace-table" style={{ marginTop: 12 }}>
              <div className="workspace-table-row workspace-table-head">
                <span>Domain</span>
                <span>Source name</span>
                <span>Category</span>
                <span>Status</span>
                {isAdmin && <span>Actions</span>}
              </div>
              {trustedSources.length === 0 ? (
                <div className="workspace-empty">No trusted sources configured.</div>
              ) : (
                trustedSources.map((source) => (
                  <div key={source.id} className="workspace-table-row">
                    <div>
                      <strong><Globe size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{source.domain}</strong>
                    </div>
                    <span>{source.sourceName}</span>
                    <span>{source.category || '—'}</span>
                    <span>
                      <span className={`workspace-badge ${source.active ? 'success' : 'danger'}`}>
                        {source.active ? 'Active' : 'Disabled'}
                      </span>
                    </span>
                    {isAdmin && (
                      <span className="workspace-table-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          title={source.active ? 'Disable' : 'Enable'}
                          onClick={() => toggleTrustedSource(source)}
                        >
                          {source.active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Remove from whitelist"
                          onClick={() => removeTrustedSource(source)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="workspace-side">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Crawler engine</span>
            <h3>Run summary</h3>
            <div className="admin-side-metrics" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Collected</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#3B82F6' }}>{totalItems} items</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Crawl scope</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#3B82F6' }}>
                  {activeProjectId ? `Project ${activeProjectId} companies` : 'All project companies'}
                </strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto refresh</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#22C55E' }}>Every 30 seconds</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trigger access</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F59E0B' }}>Admin, Owner, BD Manager</strong>
              </div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Source quality</span>
            <h3>Rejected by crawler ({rejectionSummary.totalRuns} runs)</h3>
            <div className="admin-side-metrics" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not in trusted whitelist</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F59E0B' }}>{rejectionSummary.rejectedUntrusted}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aggregator / unknown publisher</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#EF4444' }}>{rejectionSummary.rejectedUnknownDomain}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trusted domain, no company mention</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#6B7280' }}>{rejectionSummary.rejectedNoCompany}</strong>
              </div>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Recent runs</span>
            <h3>Crawl history</h3>
            <div className="admin-side-metrics" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {crawlRuns.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No crawl runs recorded yet.</div>
              ) : (
                crawlRuns.slice(0, 5).map((run) => (
                  <div key={run.id} style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatDate(run.runAt)} · {run.trigger || 'manual'}
                    </span>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#3B82F6' }}>
                      {run.saved} saved / {run.totalFetched} fetched
                    </strong>
                    <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {run.duplicates} dup, {run.skippedCooldown} cooldown, {run.sourcesFailed} failed sources · reject: {run.rejectedUntrusted} untrusted, {run.rejectedUnknownDomain} unknown, {run.rejectedNoCompany} no-company
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CrawlerControl;
