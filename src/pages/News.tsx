import React, { useEffect, useMemo, useState } from 'react';
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
  crawlerApi,
  CrawlerNotAvailableError,
} from '../API/crawlerApi';
import type {
  CrawledArticle,
  CrawlerStats,
  TrackedCompany,
} from '../API/crawlerApi';

const PAGE_SIZE = 9;

const priorityClass = (priority?: string | null) => {
  const value = String(priority || '').toUpperCase();
  if (value === 'HIGH') return 'danger';
  if (value === 'MEDIUM') return 'warning';
  if (value === 'LOW') return 'success';
  return 'neutral';
};

const statusClass = (status?: string | null) => {
  const value = String(status || '').toUpperCase();
  if (value === 'PUBLISHED' || value === 'MATCHED') return 'success';
  if (value === 'ERROR') return 'danger';
  if (value === 'DISCARDED') return 'neutral';
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

const articleSummary = (article: CrawledArticle) =>
  article.aiSummary ||
  article.summary ||
  article.content?.slice(0, 260) ||
  'No summary is available for this article yet.';

const companyNames = (article: CrawledArticle) => {
  const names = (article.matchedCompanies || [])
    .map((match) => match.companyName?.trim())
    .filter(Boolean) as string[];
  return names.length ? names : ['No company match'];
};

export const News: React.FC = () => {
  const [articles, setArticles] = useState<CrawledArticle[]>([]);
  const [companies, setCompanies] = useState<TrackedCompany[]>([]);
  const [stats, setStats] = useState<CrawlerStats | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<CrawledArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crawlerAvailable, setCrawlerAvailable] = useState<boolean | null>(null);

  const loadCompaniesAndStats = async () => {
    try {
      const [companyRows, statData] = await Promise.all([
        crawlerApi.getTrackedCompanies(),
        crawlerApi.getStats(),
      ]);
      setCompanies(companyRows);
      setStats(statData);
      setCrawlerAvailable(true);
    } catch (err) {
      if (err instanceof CrawlerNotAvailableError) {
        setCrawlerAvailable(false);
        setCompanies([]);
        setStats(null);
      }
    }
  };

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crawlerApi.getArticles({
        page,
        size: PAGE_SIZE,
        company: selectedCompany || undefined,
        status: selectedStatus || undefined,
      });
      setArticles(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(Math.max(Number(data?.totalPages || 1), 1));
      setTotalElements(Number(data?.totalElements || data?.content?.length || 0));
      setCrawlerAvailable(true);
    } catch (err: unknown) {
      if (err instanceof CrawlerNotAvailableError) {
        setCrawlerAvailable(false);
        setArticles([]);
        setTotalPages(1);
        setTotalElements(0);
      } else {
        setArticles([]);
        setTotalPages(1);
        setTotalElements(0);
        setError(err instanceof Error ? err.message : 'Cannot load crawler articles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesAndStats();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [page, selectedCompany, selectedStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadCompaniesAndStats();
      loadArticles();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [page, selectedCompany, selectedStatus]);

  const companyOptions = useMemo(() => {
    const fromArticles = articles.flatMap((article) => companyNames(article));
    return Array.from(new Set([
      ...companies.map((company) => company.companyName).filter(Boolean),
      ...fromArticles.filter((name) => name !== 'No company match'),
    ])).sort((a, b) => a.localeCompare(b));
  }, [articles, companies]);

  const visibleArticles = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return articles;
    return articles.filter((article) => {
      const haystack = [
        article.title,
        article.summary,
        article.aiSummary,
        article.sourceName,
        article.informationType,
        ...companyNames(article),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [articles, searchTerm]);

  const openDetail = async (article: CrawledArticle) => {
    setSelectedArticle(article);
    setDetailLoading(true);
    try {
      const detail = await crawlerApi.getArticleById(article.id);
      setSelectedArticle(detail || article);
    } catch {
      setSelectedArticle(article);
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCompany('');
    setSelectedStatus('');
    setSearchTerm('');
    setPage(0);
  };

  const statCards = [
    { label: 'Crawler articles', value: stats?.totalArticles ?? totalElements, note: 'Total articles saved by crawler' },
    { label: 'Matched', value: stats?.matchedArticles ?? 0, note: 'Articles related to tracked companies' },
    { label: 'Published', value: stats?.publishedArticles ?? 0, note: 'Articles pushed to raw documents' },
    { label: 'Tracked companies', value: stats?.trackedCompanies ?? companyOptions.length, note: 'Companies available for filtering' },
  ];

  return (
    <section className="workspace-page crawler-news-page" id="page-news">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Intelligence <span>/</span> Crawler Articles</div>

          <div className="workspace-page-head crawler-news-head">
            <div>
              <span className="workspace-side-eyebrow">Crawler feed</span>
              <h1>Company related articles</h1>
              <p>Backend crawler runs automatically on startup and every 5 minutes. This screen refreshes itself every 30 seconds.</p>
            </div>
            <div className="workspace-head-actions">
              <span className="crawler-auto-sync">
                <RefreshCw size={16} />
                Auto updating
              </span>
            </div>
          </div>

          <div className="workspace-stats crawler-news-stats">
            {crawlerAvailable !== false && statCards.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          {crawlerAvailable !== false && (
          <div className="workspace-panel crawler-news-filter-panel">
            <div className="crawler-news-search">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, source, company, or AI summary..."
              />
            </div>

            <label className="crawler-news-select">
              <Building2 size={16} />
              <select
                value={selectedCompany}
                onChange={(event) => {
                  setSelectedCompany(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">All companies</option>
                {companyOptions.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </label>

            {/* <label className="crawler-news-select">
              <Filter size={16} />
              <select
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setPage(0);
                }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value || 'all'} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label> */}

            <button className="btn btn-ghost" onClick={resetFilters}>Reset</button>
          </div>
          )}

          {error && <div className="workspace-alert danger">{error}</div>}

          {!loading && crawlerAvailable === false && (
            <div className="workspace-panel" style={{ padding: '64px 32px', textAlign: 'center' }}>
              <Newspaper size={48} color="#9CA3AF" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
                Chức năng thu thập dữ liệu tự động đang được xây dựng
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
                Tính năng Crawler sẽ sớm ra mắt. Hệ thống sẽ tự động thu thập và phân tích bài viết liên quan đến các công ty được theo dõi.
              </p>
            </div>
          )}

          {!loading && companyOptions.length === 0 && crawlerAvailable !== false && (
            <div className="workspace-alert warning">
              No tracked companies were found. Restart backend with crawler seed enabled or create tracked companies first.
            </div>
          )}

          {loading ? (
            <div className="crawler-news-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <article key={index} className="crawler-news-card crawler-news-card-loading" />
              ))}
            </div>
          ) : crawlerAvailable === false ? null : visibleArticles.length === 0 ? (
            <div className="workspace-panel">
              <div className="workspace-empty">No crawler articles match the current filters.</div>
            </div>
          ) : (
            <div className="crawler-news-grid">
              {visibleArticles.map((article) => {
                const companiesForArticle = companyNames(article);
                return (
                  <article key={article.id} className="crawler-news-card">
                    <div className="crawler-news-thumb">
                      {article.thumbnail ? (
                        <img src={article.thumbnail} alt={article.title || 'Article thumbnail'} />
                      ) : (
                        <Newspaper size={30} />
                      )}
                      <span className={`workspace-badge ${statusClass(article.aiProcessingStatus)}`}>
                        {article.aiProcessingStatus || 'PENDING'}
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
                        <span><CalendarDays size={14} /> {formatDate(article.publishedDate || article.crawledAt)}</span>
                        <span><FileText size={14} /> {article.sourceName || 'Unknown source'}</span>
                      </div>

                      <div className="crawler-news-footer">
                        <span className={`workspace-badge ${priorityClass(article.priorityLevel)}`}>
                          {article.priorityLevel || article.informationType || 'GENERAL'}
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
              Showing {visibleArticles.length} of {totalElements} articles
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
                  <span><CalendarDays size={14} /> {formatDate(selectedArticle.publishedDate || selectedArticle.crawledAt)}</span>
                  <span><FileText size={14} /> {selectedArticle.sourceName || 'Unknown source'}</span>
                </div>
              </div>
              {selectedArticle.url && (
                <a className="btn btn-primary" href={selectedArticle.url} target="_blank" rel="noreferrer">
                  Open original
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>

            {detailLoading && <div className="workspace-empty">Loading article detail...</div>}

            <div className="crawler-detail-section">
              <h3>Related companies</h3>
              <div className="crawler-detail-companies">
                {(selectedArticle.matchedCompanies || []).length === 0 ? (
                  <span className="crawler-company-pill muted">No matched company</span>
                ) : (
                  selectedArticle.matchedCompanies?.map((match, index) => (
                    <div key={`${match.companyName}-${index}`} className="crawler-detail-company">
                      <strong>{match.companyName || 'Unknown company'}</strong>
                      <span>{match.matchType || 'MATCH'} {match.confidenceScore !== undefined && match.confidenceScore !== null ? `- ${Math.round(match.confidenceScore * 100)}%` : ''}</span>
                      {match.matchReason && <p>{match.matchReason}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="crawler-detail-grid">
              <section className="crawler-detail-section">
                <h3><Sparkles size={18} /> AI summary</h3>
                <p>{selectedArticle.aiSummary || selectedArticle.summary || 'No AI summary was generated for this article yet.'}</p>
              </section>

              <section className="crawler-detail-section">
                <h3>Priority</h3>
                <div className="crawler-detail-kpis">
                  <span className={`workspace-badge ${priorityClass(selectedArticle.priorityLevel)}`}>{selectedArticle.priorityLevel || 'N/A'}</span>
                  <span className="workspace-badge neutral">{selectedArticle.informationType || 'GENERAL'}</span>
                  <span className="workspace-badge info">Score {selectedArticle.priorityScore ?? 'N/A'}</span>
                </div>
                <p>{selectedArticle.priorityReason || 'No priority reason was stored.'}</p>
              </section>
            </div>

            <section className="crawler-detail-section">
              <h3>Extracted content</h3>
              <p className="crawler-detail-content">
                {selectedArticle.content || selectedArticle.summary || 'No extracted content is available.'}
              </p>
            </section>
          </div>
        </div>
      )}
    </section>
  );
};
