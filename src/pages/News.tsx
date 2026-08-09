import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  externalDataApi,
  type ExternalDataItem,
} from '../API/externalDataApi';
import i18n from '../i18n';
import { formatDate } from '../utils/format';
import styles from './News.module.css';

const PAGE_SIZE = 8;

const priorityPillClass = (item: ExternalDataItem) => {
  const level = String(item.riskLevel || item.opportunityLevel || '').toUpperCase();
  if (level === 'HIGH') return styles.newsPillDanger;
  if (level === 'MEDIUM') return styles.newsPillInfo;
  if (level === 'LOW') return styles.newsPillSuccess;
  return styles.newsPillMuted;
};

const categoryPillClass = (category?: string | null) => {
  const value = String(category || '').toUpperCase();
  if (value === 'RISK') return styles.newsPillDanger;
  if (value === 'OPPORTUNITY') return styles.newsPillSuccess;
  return styles.newsPillInfo;
};

const formatDateLabel = (value?: string | null) => {
  const formatted = formatDate(value);
  return formatted || i18n.t('news:date.noDate');
};

const articleSummary = (item: ExternalDataItem) =>
  item.summary?.trim() || i18n.t('news:summary.empty');

const companyNames = (item: ExternalDataItem) => {
  const name = item.relatedCompanyName?.trim();
  return name ? [name] : [i18n.t('news:company.noMatch')];
};

const topicsWithLabels = (item: ExternalDataItem) =>
  (item.topics || []).map((code, index) => (item.topicLabels && item.topicLabels[index]) || code);

const isDuplicate = (item: ExternalDataItem) =>
  Boolean(item.duplicateOf) && item.duplicateOf !== item.id;

const aiStateLabel = (item: ExternalDataItem) => {
  if (item.aiStatus === 'COMPLETED') return i18n.t('news:aiState.completed');
  if (item.aiStatus === 'FAILED') return i18n.t('news:aiState.failed');
  return i18n.t('news:aiState.inProgress');
};

const sentimentPillClass = (sentiment?: string | null) => {
  const value = String(sentiment || '').toLowerCase();
  if (value.includes('posit')) return styles.newsPillSuccess;
  if (value.includes('negat')) return styles.newsPillDanger;
  return styles.newsPillMuted;
};

export const News: React.FC = () => {
  const { t } = useTranslation('news');
  const [articles, setArticles] = useState<ExternalDataItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ExternalDataItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackedCompanies, setTrackedCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companies = await externalDataApi.getTrackedCompanies(true);
        setTrackedCompanies(companies || []);
      } catch (err) {
        console.error('Failed to load tracked companies', err);
      }
    };
    fetchCompanies();
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await externalDataApi.getItems('NEWS', {
        page,
        size: PAGE_SIZE,
        keyword: searchTerm.trim() || undefined,
        source: selectedSource || undefined,
        companyName: selectedCompany || undefined,
      });
      setArticles(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(Math.max(Number(data?.totalPages || 1), 1));
      setTotalElements(Number(data?.totalElements ?? data?.content?.length ?? 0));
      setSources((prev) => Array.from(new Set([
        ...prev,
        ...(data?.content || []).map((item) => item.source || '').filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b)));
    } catch (err: unknown) {
      setArticles([]);
      setTotalPages(1);
      setTotalElements(0);
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, selectedSource, searchTerm, selectedCompany, t]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadArticles();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadArticles]);

  const openDetail = (article: ExternalDataItem) => {
    setSelectedArticle(article);
  };

  const resetFilters = () => {
    setSelectedSource('');
    setSelectedCompany('');
    setSearchTerm('');
    setPage(0);
  };

  const statCards = [
    { label: t('stats.articles'), value: totalElements, note: t('stats.articlesNote') },
    { label: t('stats.sources'), value: sources.length, note: t('stats.sourcesNote') },
    { label: t('company.related'), value: trackedCompanies.length, note: t('stats.companiesNote') },
  ];

  return (
    <div className={styles.newsPage}>
      {/* ── Header ── */}
      <header className={styles.newsHeader}>
        <div className={styles.newsHeaderLeft}>
          <h1 className={styles.newsTitle}>{t('title')}</h1>
          <span className={styles.newsSub}>{t('subtitle')}</span>
        </div>
        <div>
          <span className={styles.newsSyncBadge}>{t('syncBadge')}</span>
        </div>
      </header>

      {/* ── KPI Row ── */}
      <section className={styles.newsStatsGrid}>
        {statCards.map((item) => (
          <div key={item.label} className={styles.newsStatCard}>
            <div className={styles.newsStatLabel}>{item.label}</div>
            <div className={styles.newsStatValRow}>
              <span className={styles.newsStatValue}>{item.value}</span>
              <span className={styles.newsStatNote}>{item.note}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Main Panel ── */}
      <main className={styles.newsPanel}>
        {/* Filter Bar */}
        <div className={styles.newsFilterBar}>
          <input
            className={styles.newsSearchInput}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(0);
            }}
            placeholder={t('filters.searchPlaceholder')}
          />

          <select
            className={styles.newsSelect}
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

          <select
            className={styles.newsSelect}
            value={selectedCompany}
            onChange={(event) => {
              setSelectedCompany(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{t('filters.allCompanies', 'All Companies')}</option>
            {trackedCompanies.map((c) => (
              <option key={c.id} value={c.companyName}>{c.companyName}</option>
            ))}
          </select>

          <button className={`${styles.newsBtn} ${styles.newsBtnGhost}`} onClick={resetFilters}>
            {t('filters.reset')}
          </button>
        </div>

        {error && <div className={styles.newsAlertDanger}>{error}</div>}

        {/* Articles Grid */}
        <div className={styles.newsGridWrap}>
          {loading ? (
            <div className={styles.newsEmpty}>{t('empty.loading')}</div>
          ) : articles.length === 0 ? (
            <div className={styles.newsEmpty}>{t('empty.noResults')}</div>
          ) : (
            <div className={styles.newsGrid}>
              {articles.map((article) => {
                const companiesForArticle = companyNames(article);
                const levelLabel = article.riskLevel
                  ? t('level.risk', { level: article.riskLevel })
                  : article.opportunityLevel
                    ? t('level.opportunity', { level: article.opportunityLevel })
                    : t('level.general');
                return (
                  <div key={article.id} className={styles.newsCard}>
                    <div className={styles.newsCardHeader}>
                      <div className={styles.newsCardBadges}>
                        <span className={`${styles.newsPill} ${categoryPillClass(article.category)}`}>
                          {article.category || 'NEWS'}
                        </span>
                        <span className={`${styles.newsPill} ${priorityPillClass(article)}`}>
                          {levelLabel}
                        </span>
                        {isDuplicate(article) && (
                          <span className={`${styles.newsPill} ${styles.newsPillDanger}`}>
                            {t('duplicate')}
                          </span>
                        )}
                      </div>
                    </div>

                    {article.imageUrl ? (
                      <img src={article.imageUrl} className={styles.newsThumb} alt="" />
                    ) : (
                      <div style={{ height: '140px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </div>
                    )}

                    <div className={styles.newsCardTitle} title={article.title || t('article.noTitle')}>
                      {article.title || t('article.noTitle')}
                    </div>
                    
                    <div className={styles.newsCardSummary}>
                      {articleSummary(article)}
                    </div>
                    
                    <div className={styles.newsCardMeta}>
                      <div>
                        <strong>{article.source || t('source.unknown')}</strong>
                        <br />
                        <span style={{ fontSize: '0.85em' }}>{formatDateLabel(article.publishedAt)}</span>
                      </div>
                      <div className={styles.newsCardCompanies}>
                        {companiesForArticle.slice(0, 2).map((name) => (
                          <span key={name} className={`${styles.newsPill} ${styles.newsPillCompany}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className={styles.newsCardActions}>
                      <button
                        className={`${styles.newsBtn} ${styles.newsBtnSecondary} ${styles.newsBtnSm}`}
                        onClick={() => openDetail(article)}
                      >
                        {t('actions.details')}
                      </button>
                      {article.url && (
                        <a
                          className={`${styles.newsBtn} ${styles.newsBtnPrimary} ${styles.newsBtnSm}`}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('actions.original', 'Đọc bài báo')}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className={styles.newsPagination}>
          <span>{t('pagination.showing', { count: articles.length, total: totalElements })}</span>
          <div className={styles.newsPaginationBtns}>
            <button
              className={`${styles.newsBtn} ${styles.newsBtnSecondary} ${styles.newsBtnSm}`}
              disabled={page === 0 || loading}
              onClick={() => setPage((value) => Math.max(value - 1, 0))}
            >
              {t('pagination.previous')}
            </button>
            <strong>{t('pagination.page', { page: page + 1, total: totalPages })}</strong>
            <button
              className={`${styles.newsBtn} ${styles.newsBtnSecondary} ${styles.newsBtnSm}`}
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </main>

      {/* ── Article Detail Modal ── */}
      {selectedArticle && (
        <div className={styles.newsModalBackdrop} onClick={() => setSelectedArticle(null)}>
          <div className={styles.newsModal} onClick={(event) => event.stopPropagation()}>
            <button
              className={styles.newsModalClose}
              onClick={() => setSelectedArticle(null)}
              aria-label={t('modal.close')}
            >
              &times;
            </button>

            <h2 className={styles.newsModalTitle}>{selectedArticle.title || t('article.noTitle')}</h2>
            <div className={styles.newsModalMeta}>
              {t('modal.sourceLabel')}: <strong>{selectedArticle.source || t('source.unknown')}</strong> · {t('modal.dateLabel')}: {formatDateLabel(selectedArticle.publishedAt)}
            </div>

            {selectedArticle.url && (
              <div style={{ marginBottom: 12 }}>
                <a
                  className={`${styles.newsBtn} ${styles.newsBtnPrimary} ${styles.newsBtnSm}`}
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('modal.openOriginal')}
                </a>
              </div>
            )}

            <div className={styles.newsModalSection}>
              <div className={styles.newsModalSectionTitle}>{t('company.related')}</div>
              <div>
                {selectedArticle.relatedCompanyName ? (
                  <span className={`${styles.newsPill} ${styles.newsPillCompany}`}>
                    {selectedArticle.relatedCompanyName}
                  </span>
                ) : (
                  <span className={`${styles.newsPill} ${styles.newsPillMuted}`}>{t('company.noMatch')}</span>
                )}
              </div>
            </div>

            <div className={styles.newsModalSection}>
              <div className={styles.newsModalSectionTitle}>{t('modal.aiSummaryTitle')}</div>
              <p className={styles.newsModalText}>
                {selectedArticle.aiSummary || selectedArticle.summary || t('modal.aiSummaryEmpty')}
              </p>
              <div style={{ marginTop: 4 }}>
                <span className={`${styles.newsPill} ${styles.newsPillMuted}`}>
                  {aiStateLabel(selectedArticle)}
                </span>
              </div>
            </div>

            <div className={styles.newsModalSection}>
              <div className={styles.newsModalSectionTitle}>{t('modal.assessmentTitle')}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span className={`${styles.newsPill} ${priorityPillClass(selectedArticle)}`}>
                  {selectedArticle.riskLevel
                    ? t('level.risk', { level: selectedArticle.riskLevel })
                    : selectedArticle.opportunityLevel
                      ? t('level.opportunity', { level: selectedArticle.opportunityLevel })
                      : t('level.general')}
                </span>
                {selectedArticle.sentiment && (
                  <span className={`${styles.newsPill} ${sentimentPillClass(selectedArticle.sentiment)}`}>
                    {selectedArticle.sentiment}
                  </span>
                )}
              </div>
              {selectedArticle.riskReason && (
                <p className={styles.newsModalText} style={{ marginTop: 4, color: '#ef4444' }}>
                  {t('modal.riskReason', { reason: selectedArticle.riskReason })}
                </p>
              )}
            </div>

            {topicsWithLabels(selectedArticle).length > 0 && (
              <div className={styles.newsModalSection}>
                <div className={styles.newsModalSectionTitle}>{t('modal.topics')}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {topicsWithLabels(selectedArticle).map((topic) => (
                    <span key={topic} className={`${styles.newsPill} ${styles.newsPillInfo}`}>{topic}</span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.newsModalSection}>
              <div className={styles.newsModalSectionTitle}>{t('modal.collectedContent')}</div>
              <p className={styles.newsModalText}>
                {selectedArticle.summary || t('modal.noContent')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
