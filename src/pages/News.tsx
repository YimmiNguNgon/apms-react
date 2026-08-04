import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  externalDataApi,
  type ExternalDataItem,
} from '../API/externalDataApi';

const PAGE_SIZE = 9;

const priorityClass = (item: ExternalDataItem) => {
  const level = String(item.riskLevel || item.opportunityLevel || '').toUpperCase();
  if (level === 'HIGH') return 'danger';
  if (level === 'MEDIUM') return 'warning';
  if (level === 'LOW') return 'success';
  return 'neutral';
};

const categoryClass = (category?: string | null) => {
  const value = String(category || '').toUpperCase();
  if (value === 'RISK') return 'danger';
  if (value === 'OPPORTUNITY') return 'success';
  return 'info';
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

const articleSummary = (item: ExternalDataItem) =>
  item.summary?.trim() || 'No summary is available for this article yet.';

const companyNames = (item: ExternalDataItem) => {
  const name = item.relatedCompanyName?.trim();
  return name ? [name] : ['No company match'];
};

export const News: React.FC = () => {
  const [articles, setArticles] = useState<ExternalDataItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ExternalDataItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await externalDataApi.getItems('NEWS', {
        page,
        size: PAGE_SIZE,
        keyword: searchTerm.trim() || undefined,
        source: selectedSource || undefined,
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
      setError(err instanceof Error ? err.message : 'Cannot load news articles.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedSource, searchTerm]);

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
    setSearchTerm('');
    setPage(0);
  };

  const companyCount = Array.from(new Set(
    articles.map((item) => item.relatedCompanyName?.trim()).filter(Boolean),
  )).length;

  const statCards = [
    { label: 'News articles', value: totalElements, note: 'Total articles collected by crawler' },
    { label: 'Sources', value: sources.length, note: 'Feeds available for filtering' },
    { label: 'Companies', value: companyCount, note: 'Companies matched on this page' },
  ];

  return (
    <section className="workspace-page crawler-news-page" id="page-news">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Intelligence <span>/</span> Crawler Articles</div>

          <div className="workspace-page-head crawler-news-head compact-hero">
            <div>
              <span className="workspace-side-eyebrow">Crawler feed</span>
              <h1>Company related articles</h1>
            </div>
            <div className="workspace-head-actions">
              <span className="crawler-auto-sync">
                <RefreshCw size={16} />
                Auto updating
              </span>
            </div>
          </div>

          <div className="workspace-stats crawler-news-stats compact-stats">
            {statCards.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-panel crawler-news-filter-panel">
            <div className="crawler-news-search">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(0);
                }}
                placeholder="Search title, summary, source, or company..."
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
          ) : articles.length === 0 ? (
            <div className="workspace-panel">
              <div className="workspace-empty">No articles match the current filters.</div>
            </div>
          ) : (
            <div className="crawler-news-grid">
              {articles.map((article) => {
                const companiesForArticle = companyNames(article);
                const levelLabel = article.riskLevel
                  ? `Risk ${article.riskLevel}`
                  : article.opportunityLevel
                    ? `Opportunity ${article.opportunityLevel}`
                    : 'GENERAL';
                return (
                  <article key={article.id} className="crawler-news-card">
                    <div className="crawler-news-thumb">
                      <Newspaper size={30} />
                      <span className={`workspace-badge ${categoryClass(article.category)}`}>
                        {article.category || 'NEWS'}
                      </span>
                    </div>

                    <div className="crawler-news-card-body">
                      <div className="crawler-news-company-row">
                        {companiesForArticle.slice(0, 3).map((name) => (
                          <span key={name} className="crawler-company-pill">{name}</span>
                        ))}
                        {companiesForArticle.length > 3 && <span className="crawler-company-pill muted">+{companiesForArticle.length - 3}</span>}
                      </div>

                      <h3>{article.title || 'Untitled article'}</h3>
                      <p>{articleSummary(article)}</p>

                      <div className="crawler-news-meta">
                        <span><CalendarDays size={14} /> {formatDate(article.publishedAt)}</span>
                        <span><FileText size={14} /> {article.source || 'Unknown source'}</span>
                      </div>

                      <div className="crawler-news-footer">
                        <span className={`workspace-badge ${priorityClass(article)}`}>
                          {levelLabel}
                        </span>
                        <div className="crawler-news-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetail(article)}>
                            Detail
                          </button>
                          {article.url && (
                            <a className="btn btn-primary btn-sm" href={article.url} target="_blank" rel="noreferrer">
                              Original
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="workspace-pagination crawler-news-pagination">
            <span>
              Showing {articles.length} of {totalElements} articles
            </span>
            <div>
              <button className="btn btn-secondary" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(value - 1, 0))}>
                Previous
              </button>
              <strong>Page {page + 1} / {totalPages}</strong>
              <button className="btn btn-secondary" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedArticle && (
        <div className="crawler-article-modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="crawler-article-modal" onClick={(event) => event.stopPropagation()}>
            <button className="crawler-article-close" onClick={() => setSelectedArticle(null)} aria-label="Close article detail">
              <X size={20} />
            </button>

            <div className="crawler-article-modal-head">
              <div>
                <span className="workspace-side-eyebrow">Article detail</span>
                <h2>{selectedArticle.title || 'Untitled article'}</h2>
                <div className="crawler-news-meta">
                  <span><CalendarDays size={14} /> {formatDate(selectedArticle.publishedAt)}</span>
                  <span><FileText size={14} /> {selectedArticle.source || 'Unknown source'}</span>
                </div>
              </div>
              {selectedArticle.url && (
                <a className="btn btn-primary" href={selectedArticle.url} target="_blank" rel="noreferrer">
                  Open original
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>

            <div className="crawler-detail-section">
              <h3>Related companies</h3>
              <div className="crawler-detail-companies">
                {selectedArticle.relatedCompanyName ? (
                  <div className="crawler-detail-company">
                    <strong>{selectedArticle.relatedCompanyName}</strong>
                    <span>MATCH</span>
                  </div>
                ) : (
                  <span className="crawler-company-pill muted">No matched company</span>
                )}
              </div>
            </div>

            <div className="crawler-detail-grid">
              <section className="crawler-detail-section">
                <h3><Sparkles size={18} /> AI summary</h3>
                <p>{selectedArticle.summary || 'No summary was generated for this article yet.'}</p>
              </section>

              <section className="crawler-detail-section">
                <h3>Priority</h3>
                <div className="crawler-detail-kpis">
                  <span className={`workspace-badge ${priorityClass(selectedArticle)}`}>
                    {selectedArticle.riskLevel
                      ? `Risk ${selectedArticle.riskLevel}`
                      : selectedArticle.opportunityLevel
                        ? `Opportunity ${selectedArticle.opportunityLevel}`
                        : 'N/A'}
                  </span>
                  <span className="workspace-badge neutral">{selectedArticle.category || 'GENERAL'}</span>
                  {selectedArticle.sentiment && (
                    <span className="workspace-badge info">{selectedArticle.sentiment}</span>
                  )}
                </div>
                {!selectedArticle.riskLevel && !selectedArticle.opportunityLevel && (
                  <p>No priority level was stored for this article.</p>
                )}
              </section>
            </div>

            <section className="crawler-detail-section">
              <h3>Extracted content</h3>
              <p className="crawler-detail-content">
                {selectedArticle.summary || 'No extracted content is available.'}
              </p>
            </section>
          </div>
        </div>
      )}
    </section>
  );
};
