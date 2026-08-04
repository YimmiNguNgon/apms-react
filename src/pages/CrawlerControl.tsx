import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  externalDataApi,
  type ArticleAiStats,
  type CrawlRejectionSummary,
  type CrawlRunStats,
  type ExternalDataCategory,
  type ExternalDataItem,
  type TrustedSource,
  type TrustedSourceInput,
} from '../API/externalDataApi';
import { ROLES, useUser } from '../context/UserContext';
import i18n from '../i18n';
import { Check, Pencil, X } from 'lucide-react';
import { formatDate as formatDateUtil } from '../utils/format';
import styles from './CrawlerControl.module.css';

const PAGE_SIZE = 8;

const CATEGORY_TABS: { value: ExternalDataCategory; label: string }[] = [
  { value: 'NEWS', label: i18n.t('crawler-control:categories.news') },
  { value: 'OPPORTUNITY', label: i18n.t('crawler-control:categories.opportunity') },
  { value: 'RISK', label: i18n.t('crawler-control:categories.risk') },
];

const categoryPillClass = (category?: ExternalDataCategory | null) => {
  if (category === 'RISK') return styles.ccPillDanger;
  if (category === 'OPPORTUNITY') return styles.ccPillSuccess;
  return styles.ccPillInfo;
};

const levelPillClass = (level?: string | null) => {
  const value = String(level || '').toUpperCase();
  if (value === 'HIGH') return styles.ccPillDanger;
  if (value === 'MEDIUM') return styles.ccPillInfo;
  if (value === 'LOW') return styles.ccPillSuccess;
  return styles.ccPillMuted;
};

const formatDate = (value?: string | null) => {
  if (!value) return i18n.t('crawler-control:common.noDate');
  const formatted = formatDateUtil(value);
  return formatted || value;
};

const cardSummary = (item: ExternalDataItem) =>
  item.summary?.trim() || i18n.t('crawler-control:table.noSummary');

export const CrawlerControl: React.FC = () => {
  const { t } = useTranslation('crawler-control');
  const [mainTab, setMainTab] = useState<'data' | 'settings'>('data');
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
  const [editingSource, setEditingSource] = useState<{ id: string; field: 'sourceName' | 'category'; value: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [aiStats, setAiStats] = useState<ArticleAiStats | null>(null);
  const [runningProcess, setRunningProcess] = useState(false);
  const [runningEnqueue, setRunningEnqueue] = useState(false);

  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === ROLES.ADMIN;
  const isOwner = currentUser?.role === ROLES.OWNER;
  const canEditSourceFields = isAdmin || isOwner;

  const activeProjectId = localStorage.getItem('apms-active-project') || '';

  const loadTrustedSources = useCallback(async () => {
    try {
      setTrustedSources(await externalDataApi.listTrustedSources());
      setSourceError(null);
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : t('errors.loadSourceFailed'));
    }
  }, [t]);

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

  const loadAiStats = useCallback(async () => {
    setAiStats(await externalDataApi.getArticleAiStats());
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
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const refreshAll = useCallback(() => {
    loadCounts();
    loadItems(activeTab, page, keyword, selectedSource);
    loadTrustedSources();
    loadCrawlStats();
    loadAiStats();
  }, [loadCounts, loadItems, activeTab, page, keyword, selectedSource, loadTrustedSources, loadCrawlStats, loadAiStats]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadItems(activeTab, page, keyword, selectedSource); }, [activeTab, page, keyword, selectedSource, loadItems]);
  useEffect(() => { loadTrustedSources(); loadCrawlStats(); }, [loadTrustedSources, loadCrawlStats]);
  useEffect(() => { loadAiStats(); }, [loadAiStats]);

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
        text: err instanceof Error ? err.message : t('errors.crawlFailed'),
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
        text: err instanceof Error ? err.message : t('errors.analyzeFailed'),
      });
    } finally {
      setRunningAnalyze(false);
    }
  };

  const addTrustedSource = async () => {
    if (!sourceDraft.domain.trim() || !sourceDraft.sourceName.trim()) {
      setSourceError(t('errors.sourceFieldsRequired'));
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
      setSourceError(err instanceof Error ? err.message : t('errors.addSourceFailed'));
    } finally {
      setSavingSource(false);
    }
  };

  const toggleTrustedSource = async (source: TrustedSource) => {
    try {
      await externalDataApi.setTrustedSourceActive(source.id, !source.active);
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : t('errors.toggleSourceFailed'));
    }
  };

  const startEditSourceField = (source: TrustedSource, field: 'sourceName' | 'category') => {
    setEditingSource({
      id: source.id,
      field,
      value: field === 'sourceName' ? source.sourceName : (source.category || ''),
    });
    setSourceError(null);
  };

  const cancelEditSourceField = () => {
    if (!savingEdit) {
      setEditingSource(null);
    }
  };

  const saveEditSourceField = async () => {
    if (!editingSource) return;
    const { id, field, value } = editingSource;
    setSavingEdit(true);
    try {
      const current = trustedSources.find((source) => source.id === id);
      if (!current) return;
      const input: TrustedSourceInput = {
        domain: current.domain,
        sourceName: field === 'sourceName' ? value.trim() : current.sourceName,
        category: field === 'category' ? value.trim() : (current.category || undefined),
        active: current.active,
      };
      await externalDataApi.updateTrustedSource(id, input);
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : t('errors.updateSourceFailed'));
    } finally {
      setSavingEdit(false);
      setEditingSource(null);
    }
  };

  const removeTrustedSource = async (source: TrustedSource) => {
    try {
      await externalDataApi.deleteTrustedSource(source.id);
      await loadTrustedSources();
    } catch (err: unknown) {
      setSourceError(err instanceof Error ? err.message : t('errors.removeSourceFailed'));
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedSource('');
    setPage(0);
  };

  const runProcessPending = async () => {
    setRunningProcess(true);
    setActionMessage(null);
    try {
      const message = await externalDataApi.runArticleAiProcessPending();
      setActionMessage({ kind: 'success', text: message });
      await loadAiStats();
      await loadItems(activeTab, page, keyword, selectedSource);
    } catch (err: unknown) {
      setActionMessage({
        kind: 'danger',
        text: err instanceof Error ? err.message : t('errors.processQueueFailed'),
      });
    } finally {
      setRunningProcess(false);
    }
  };

  const runEnqueueAll = async () => {
    setRunningEnqueue(true);
    setActionMessage(null);
    try {
      const message = await externalDataApi.runArticleAiEnqueueAll();
      setActionMessage({ kind: 'success', text: message });
      await loadAiStats();
      await loadItems(activeTab, page, keyword, selectedSource);
    } catch (err: unknown) {
      setActionMessage({
        kind: 'danger',
        text: err instanceof Error ? err.message : t('errors.enqueueFailed'),
      });
    } finally {
      setRunningEnqueue(false);
    }
  };

  const totalItems = counts.NEWS + counts.OPPORTUNITY + counts.RISK;

  const statCards = [
    { label: t('stats.totalArticles'), value: totalItems },
    { label: t('stats.news'), value: counts.NEWS },
    { label: t('stats.opportunity'), value: counts.OPPORTUNITY },
    { label: t('stats.risk'), value: counts.RISK },
    {
      label: t('stats.uniqueEvents'),
      value: aiStats?.uniqueArticles ?? 0,
      note: t('stats.duplicateNote', { count: aiStats?.duplicateArticles ?? 0 }),
    },
  ];

  return (
    <div className={styles.ccPage}>
      {/* ── Header ── */}
      <header className={styles.ccHeader}>
        <div className={styles.ccHeaderLeft}>
          <h1 className={styles.ccTitle}>{t('title')}</h1>
          <span className={styles.ccSub}>{t('subtitle')}</span>
        </div>
        <div className={styles.ccHeaderActions}>
          <label className={styles.ccForceLabel} title={t('header.forceRefreshTitle')}>
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(event) => setForceRefresh(event.target.checked)}
            />
            {t('header.forceRefresh')}
          </label>
          <button
            className={`${styles.ccBtn} ${styles.ccBtnPrimary}`}
            onClick={runCrawl}
            disabled={runningFetch}
          >
            {runningFetch ? t('header.runCrawlRunning') : t('header.runCrawl')}
          </button>
          <button
            className={`${styles.ccBtn} ${styles.ccBtnSecondary}`}
            onClick={runAnalyze}
            disabled={runningAnalyze}
          >
            {runningAnalyze ? t('header.runAnalyzeRunning') : t('header.runAnalyze')}
          </button>
        </div>
      </header>

      {/* ── Action Message ── */}
      {actionMessage && (
        <div className={`${styles.ccAlert} ${actionMessage.kind === 'success' ? styles.ccAlertSuccess : styles.ccAlertDanger}`}>
          {actionMessage.text}
        </div>
      )}

      {/* ── KPI Row ── */}
      <section className={styles.ccStatsGrid}>
        {statCards.map((item) => (
          <div key={item.label} className={styles.ccStatCard}>
            <div className={styles.ccStatLabel}>{item.label}</div>
            <div className={styles.ccStatValRow}>
              <span className={styles.ccStatValue}>{item.value}</span>
              {item.note && <span className={styles.ccStatNote}>{item.note}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ── Main Navigation Tabs ── */}
      <nav className={styles.ccMainTabs} aria-label={t('tabs.ariaLabel')}>
        <button
          className={`${styles.ccTabBtn} ${mainTab === 'data' ? styles.ccTabBtnActive : ''}`}
          onClick={() => setMainTab('data')}
        >
          {t('tabs.dataLabel', { total: totalElements })}
        </button>
        <button
          className={`${styles.ccTabBtn} ${mainTab === 'settings' ? styles.ccTabBtnActive : ''}`}
          onClick={() => setMainTab('settings')}
        >
          {t('tabs.settingsLabel')}
        </button>
      </nav>

      {/* ── TAB 1: Dữ liệu thu thập ── */}
      {mainTab === 'data' && (
        <div className={styles.ccMainGrid}>
          <main className={styles.ccPanel}>
            {/* Filter Bar */}
            <div className={styles.ccFilterBar}>
              <div className={styles.ccSubTabs}>
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    className={`${styles.ccSubTab} ${activeTab === tab.value ? styles.ccSubTabActive : ''}`}
                    onClick={() => {
                      setActiveTab(tab.value);
                      setPage(0);
                    }}
                  >
                    {tab.label}
                    <span className={styles.ccSubTabCount}>({counts[tab.value]})</span>
                  </button>
                ))}
              </div>

              <input
                className={styles.ccSearchInput}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t('filters.searchPlaceholder')}
              />

              <select
                className={styles.ccSelect}
                value={selectedSource}
                onChange={(event) => {
                  setSelectedSource(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">{t('filters.allSources')}</option>
                {sources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>

              <button className={`${styles.ccBtn} ${styles.ccBtnGhost} ${styles.ccBtnSm}`} onClick={resetFilters}>
                {t('filters.reset')}
              </button>
            </div>

            {error && <div className={`${styles.ccAlert} ${styles.ccAlertDanger}`}>{error}</div>}

            {/* Items Table */}
            <div className={styles.ccTableWrap}>
              {loading ? (
                <div className={styles.ccEmpty}>{t('table.loading')}</div>
              ) : items.length === 0 ? (
                <div className={styles.ccEmpty}>{t('table.empty')}</div>
              ) : (
                <table className={styles.ccTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>{t('table.headers.type')}</th>
                      <th>{t('table.headers.titleSummary')}</th>
                      <th style={{ width: 140 }}>{t('table.headers.company')}</th>
                      <th style={{ width: 140 }}>{t('table.headers.sourceDate')}</th>
                      <th style={{ width: 90 }}>{t('table.headers.rating')}</th>
                      <th style={{ width: 70, textAlign: 'right' }}>{t('table.headers.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`${styles.ccPill} ${categoryPillClass(item.category)}`}>
                            {item.category || 'NEWS'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.ccItemTitle}>{item.title || t('table.noTitle')}</div>
                          <div className={styles.ccItemSummary}>{cardSummary(item)}</div>
                        </td>
                        <td>
                          <span className={`${styles.ccPill} ${styles.ccPillCompany}`}>
                            {item.relatedCompanyName || t('table.noMatch')}
                          </span>
                          {item.sentiment && (
                            <span className={`${styles.ccPill} ${styles.ccPillMuted}`} style={{ marginLeft: 4 }}>
                              {item.sentiment}
                            </span>
                          )}
                        </td>
                        <td>
                          <div><strong>{item.source || t('table.unknownSource')}</strong></div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatDate(item.publishedAt)}</div>
                        </td>
                        <td>
                          {item.riskLevel && (
                            <span className={`${styles.ccPill} ${levelPillClass(item.riskLevel)}`}>
                              {t('table.riskLevel', { level: item.riskLevel })}
                            </span>
                          )}
                          {item.opportunityLevel && (
                            <span className={`${styles.ccPill} ${levelPillClass(item.opportunityLevel)}`}>
                              {t('table.opportunityLevel', { level: item.opportunityLevel })}
                            </span>
                          )}
                          {!item.riskLevel && !item.opportunityLevel && (
                            <span className={`${styles.ccPill} ${styles.ccPillMuted}`}>{t('table.genericLevel')}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {item.url && (
                            <a
                              className={`${styles.ccBtn} ${styles.ccBtnSecondary} ${styles.ccBtnSm}`}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t('table.sourceLink')}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className={styles.ccPagination}>
              <span>{t('pagination.showing', { shown: items.length, total: totalElements })}</span>
              <div className={styles.ccPaginationBtns}>
                <button
                  className={`${styles.ccBtn} ${styles.ccBtnSecondary} ${styles.ccBtnSm}`}
                  disabled={page === 0 || loading}
                  onClick={() => setPage((value) => Math.max(value - 1, 0))}
                >
                  {t('pagination.previous')}
                </button>
                <strong>{t('pagination.page', { current: page + 1, total: totalPages })}</strong>
                <button
                  className={`${styles.ccBtn} ${styles.ccBtnSecondary} ${styles.ccBtnSm}`}
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className={styles.ccSide}>
            <div className={styles.ccSideCard}>
              <div className={styles.ccSideTitle}>{t('sidebar.crawlerInfo')}</div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.crawled')}</span>
                <span className={styles.ccSideVal} style={{ color: '#2563eb' }}>{t('sidebar.articleCount', { count: totalItems })}</span>
              </div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.scope')}</span>
                <span className={styles.ccSideVal}>
                  {activeProjectId ? t('sidebar.projectScope', { id: activeProjectId }) : t('sidebar.allCompanies')}
                </span>
              </div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.autoRefresh')}</span>
                <span className={styles.ccSideVal} style={{ color: '#10b981' }}>{t('sidebar.refreshInterval')}</span>
              </div>
            </div>

            <div className={styles.ccSideCard}>
              <div className={styles.ccSideTitle}>{t('sidebar.rejectionsTitle', { count: rejectionSummary.totalRuns })}</div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.rejectedUntrusted')}</span>
                <span className={styles.ccSideVal} style={{ color: '#f59e0b' }}>{rejectionSummary.rejectedUntrusted}</span>
              </div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.rejectedUnknownDomain')}</span>
                <span className={styles.ccSideVal} style={{ color: '#ef4444' }}>{rejectionSummary.rejectedUnknownDomain}</span>
              </div>
              <div className={styles.ccSideItem}>
                <span className={styles.ccSideLabel}>{t('sidebar.rejectedNoCompany')}</span>
                <span className={styles.ccSideVal} style={{ color: '#6b7280' }}>{rejectionSummary.rejectedNoCompany}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── TAB 2: Cấu hình AI & Nguồn tin uy tín ── */}
      {mainTab === 'settings' && (
        <div className={styles.ccMainGrid}>
          <main>
            {/* AI Pipeline Section */}
            <div className={styles.ccPanel}>
              <div className={styles.ccSectionHead}>
                <h3>{t('aiProcessing.title')}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`${styles.ccBtn} ${styles.ccBtnSecondary} ${styles.ccBtnSm}`}
                    onClick={runEnqueueAll}
                    disabled={runningEnqueue}
                  >
                    {runningEnqueue ? t('aiProcessing.enqueueing') : t('aiProcessing.enqueueAll')}
                  </button>
                  <button
                    className={`${styles.ccBtn} ${styles.ccBtnPrimary} ${styles.ccBtnSm}`}
                    onClick={runProcessPending}
                    disabled={runningProcess}
                  >
                    {runningProcess ? t('aiProcessing.processing') : t('aiProcessing.processQueue')}
                  </button>
                </div>
              </div>

              <div className={styles.ccAiGrid}>
                <div className={styles.ccAiBox}>
                  <span className={styles.ccAiLabel}>{t('aiProcessing.analyzed')}</span>
                  <div className={styles.ccAiValue}>{aiStats?.articlesCompleted ?? 0}</div>
                  <span className={styles.ccAiSub}>{t('aiProcessing.ofTotal', { count: aiStats?.totalArticles ?? 0 })}</span>
                </div>
                <div className={styles.ccAiBox}>
                  <span className={styles.ccAiLabel}>{t('aiProcessing.queue')}</span>
                  <div className={styles.ccAiValue}>{aiStats?.pendingJobs ?? 0}</div>
                  <span className={styles.ccAiSub}>{t('aiProcessing.runningJobs', { count: aiStats?.runningJobs ?? 0 })}</span>
                </div>
                <div className={styles.ccAiBox}>
                  <span className={styles.ccAiLabel}>{t('aiProcessing.uniqueEvents')}</span>
                  <div className={styles.ccAiValue}>{aiStats?.uniqueArticles ?? 0}</div>
                  <span className={styles.ccAiSub}>{t('aiProcessing.duplicates', { count: aiStats?.duplicateArticles ?? 0 })}</span>
                </div>
                <div className={styles.ccAiBox}>
                  <span className={styles.ccAiLabel}>{t('aiProcessing.failed')}</span>
                  <div className={styles.ccAiValue} style={{ color: (aiStats?.articlesFailed ?? 0) > 0 ? '#ef4444' : undefined }}>
                    {aiStats?.articlesFailed ?? 0}
                  </div>
                  <span className={styles.ccAiSub}>{t('aiProcessing.failedJobs', { count: aiStats?.failedJobs ?? 0 })}</span>
                </div>
              </div>
            </div>

            {/* Trusted Whitelist Section */}
            <div className={styles.ccPanel}>
              <div className={styles.ccSectionHead}>
                <h3>{t('whitelist.title')}</h3>
                <span className={`${styles.ccPill} ${styles.ccPillInfo}`}>
                  {t('whitelist.activeSummary', { active: trustedSources.filter((source) => source.active).length, total: trustedSources.length })}
                </span>
              </div>

              {isAdmin ? (
                <div className={styles.ccFormRow}>
                  <input
                    value={sourceDraft.domain}
                    onChange={(event) => setSourceDraft({ ...sourceDraft, domain: event.target.value })}
                    placeholder={t('whitelist.domainPlaceholder')}
                    className={styles.ccFormInput}
                  />
                  <input
                    value={sourceDraft.sourceName}
                    onChange={(event) => setSourceDraft({ ...sourceDraft, sourceName: event.target.value })}
                    placeholder={t('whitelist.sourceNamePlaceholder')}
                    className={styles.ccFormInput}
                  />
                  <input
                    value={sourceDraft.category}
                    onChange={(event) => setSourceDraft({ ...sourceDraft, category: event.target.value })}
                    placeholder={t('whitelist.categoryPlaceholder')}
                    className={styles.ccFormInput}
                  />
                  <button className={`${styles.ccBtn} ${styles.ccBtnPrimary} ${styles.ccBtnSm}`} onClick={addTrustedSource} disabled={savingSource}>
                    {savingSource ? t('whitelist.adding') : t('whitelist.addSource')}
                  </button>
                </div>
              ) : isOwner ? (
                <div className={`${styles.ccAlert} ${styles.ccAlertInfo}`}>
                  {t('whitelist.ownerNotice')}
                </div>
              ) : (
                <div className={`${styles.ccAlert} ${styles.ccAlertDanger}`}>
                  {t('whitelist.adminOnly')}
                </div>
              )}

              {sourceError && (
                <div className={`${styles.ccAlert} ${styles.ccAlertDanger}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{sourceError}</span>
                  <button
                    type="button"
                    className={`${styles.ccBtn} ${styles.ccBtnGhost} ${styles.ccBtnSm}`}
                    onClick={() => { setSourceError(null); loadTrustedSources(); }}
                    style={{ flexShrink: 0 }}
                  >
                    {t('whitelist.retry')}
                  </button>
                </div>
              )}

              <div className={styles.ccTableWrap} style={{ maxHeight: 220, minHeight: 'auto' }}>
                <table className={styles.ccTable}>
                  <thead>
                    <tr>
                      <th>{t('whitelist.headers.domain')}</th>
                      <th>{t('whitelist.headers.sourceName')}</th>
                      <th>{t('whitelist.headers.category')}</th>
                      <th>{t('whitelist.headers.status')}</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>{t('whitelist.headers.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {trustedSources.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.ccEmpty}>{t('whitelist.empty')}</td>
                      </tr>
                    ) : (
                      trustedSources.map((source) => (
                        <tr key={source.id}>
                          <td style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {source.domain}
                          </td>
                          <td style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {canEditSourceFields && editingSource?.id === source.id && editingSource.field === 'sourceName' ? (
                              <div className={styles.ccInlineEdit}>
                                <input
                                  autoFocus
                                  className={styles.ccFormInput}
                                  value={editingSource.value}
                                  onChange={(event) => setEditingSource({ ...editingSource, value: event.target.value })}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') saveEditSourceField();
                                    if (event.key === 'Escape') cancelEditSourceField();
                                  }}
                                  onBlur={saveEditSourceField}
                                  disabled={savingEdit}
                                  style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                                />
                                <button
                                  type="button"
                                  className={styles.ccIconBtn}
                                  title={t('whitelist.save')}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={saveEditSourceField}
                                  disabled={savingEdit}
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.ccIconBtn}
                                  title={t('whitelist.cancel')}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={cancelEditSourceField}
                                  disabled={savingEdit}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={styles.ccEditField}
                                title={canEditSourceFields ? t('whitelist.editHint') : undefined}
                                onClick={() => canEditSourceFields && startEditSourceField(source, 'sourceName')}
                                disabled={!canEditSourceFields}
                              >
                                {source.sourceName}
                                {canEditSourceFields && <Pencil size={12} className={styles.ccEditIcon} />}
                              </button>
                            )}
                          </td>
                          <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {canEditSourceFields && editingSource?.id === source.id && editingSource.field === 'category' ? (
                              <div className={styles.ccInlineEdit}>
                                <input
                                  autoFocus
                                  className={styles.ccFormInput}
                                  value={editingSource.value}
                                  onChange={(event) => setEditingSource({ ...editingSource, value: event.target.value })}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') saveEditSourceField();
                                    if (event.key === 'Escape') cancelEditSourceField();
                                  }}
                                  onBlur={saveEditSourceField}
                                  disabled={savingEdit}
                                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                />
                                <button
                                  type="button"
                                  className={styles.ccIconBtn}
                                  title={t('whitelist.save')}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={saveEditSourceField}
                                  disabled={savingEdit}
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.ccIconBtn}
                                  title={t('whitelist.cancel')}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={cancelEditSourceField}
                                  disabled={savingEdit}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={styles.ccEditField}
                                title={canEditSourceFields ? t('whitelist.editHint') : undefined}
                                onClick={() => canEditSourceFields && startEditSourceField(source, 'category')}
                                disabled={!canEditSourceFields}
                              >
                                {source.category || '—'}
                                {canEditSourceFields && <Pencil size={12} className={styles.ccEditIcon} />}
                              </button>
                            )}
                          </td>
                          <td>
                            <span className={`${styles.ccPill} ${source.active ? styles.ccPillSuccess : styles.ccPillDanger}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                              {source.active ? t('whitelist.statusActive') : t('whitelist.statusInactive')}
                            </span>
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className={`${styles.ccBtn} ${styles.ccBtnGhost} ${styles.ccBtnSm}`}
                                onClick={() => toggleTrustedSource(source)}
                                style={{ fontSize: '0.72rem', fontWeight: 600 }}
                              >
                                {source.active ? t('whitelist.disable') : t('whitelist.enable')}
                              </button>
                              <button
                                className={`${styles.ccBtn} ${styles.ccBtnGhost} ${styles.ccBtnSm}`}
                                style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}
                                onClick={() => removeTrustedSource(source)}
                              >
                                {t('whitelist.delete')}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          {/* Sidebar - Crawl History */}
          <aside className={styles.ccSide}>
            <div className={styles.ccSideCard}>
              <div className={styles.ccSideTitle}>{t('crawlHistory.title')}</div>
              {crawlRuns.length === 0 ? (
                <div className={styles.ccEmpty}>{t('crawlHistory.empty')}</div>
              ) : (
                crawlRuns.slice(0, 5).map((run) => (
                  <div key={run.id} className={styles.ccSideItem}>
                    <span className={styles.ccSideLabel}>
                      {formatDate(run.runAt)} · {run.trigger || t('crawlHistory.manual')}
                    </span>
                    <span className={styles.ccSideVal} style={{ color: '#2563eb' }}>
                      {t('crawlHistory.savedFetched', { saved: run.saved, fetched: run.totalFetched })}
                    </span>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('crawlHistory.duplicatesRejected', { duplicates: run.duplicates, rejected: run.rejectedUntrusted })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CrawlerControl;
