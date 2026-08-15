import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { externalDataApi, type ExternalDataItem } from '../API/externalDataApi';
import { SecondaryButton } from '../components/ui';
import styles from './News.module.css';

interface TrackedCompany {
  id: string;
  companyName: string;
  aliases?: string[];
}

interface NormalizedNewsArticle {
  id: string;
  title: string;
  source: { name: string; publishedAt: string; url: string | null };
  summary: { text: string | null };
  originalArticle: { content: string | null; url: string | null };
  aiAnalysis: {
    sentiment: string | null;
    importance: string | null;
    confidence: number | null;
    topics: string[];
    keyPoints: string[];
    businessImpact: string | null;
    riskLevel: string | null;
  };
  relatedCompanies: Array<{ id: string | null; name: string; ticker: string | null; relationship: string; relevance: string | null }>;
  recommendedAction: { priority: string | null; action: string | null; reason: string | null; timeframe: string | null };
  relatedCompanyId: string | null;
  companyProfileId: string | null;
  topics: string[];
  imageUrl: string | null;
  crawledAt: string | null;
}

type NewsArticleItem = NormalizedNewsArticle;

interface NewsProps {
  setActivePage?: (page: string) => void;
}

// ── Utils ───────────────────────────────────────────────────

const repairMojibake = (value: string) => {
  if (!/[\u00c2\u00c3\u00e2]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return repaired.includes('\uFFFD') ? value : repaired;
  } catch {
    return value;
  }
};

const displayValue = (value?: string | null) => (value && value.trim() ? repairMojibake(value).trim() : null);

const safeExternalUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

const parseHtmlContent = (value?: string | null) => {
  if (!value) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
  const text = (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return text ? repairMojibake(text) : null;
};

const extractSource = (value?: string | null) => {
  if (!value) return { name: 'Source not available', url: null as string | null };
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  const anchor = doc.querySelector('a[href]');
  const font = doc.querySelector('font');
  const text = parseHtmlContent(value) || 'Source not available';
  return {
    name: repairMojibake((font?.textContent || text).replace(/\s+/g, ' ').trim()),
    url: safeExternalUrl(anchor?.getAttribute('href')),
  };
};

const formatRelativeTime = (value: string | null | undefined, t: any) => {
  if (!value) return t('date.unknown', 'Unknown date');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('date.unknown', 'Unknown date');

  const diffMs = Date.now() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);

  if (diffHrs < 1) return t('date.justNow', 'Just now');
  if (diffHrs < 24) return t('date.hoursAgo', { count: diffHrs, defaultValue: `${diffHrs}h ago` });
  if (diffDays === 1) return t('date.yesterday', 'Yesterday');
  if (diffDays <= 7) return t('date.daysAgo', { count: diffDays, defaultValue: `${diffDays}d ago` });

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const normalizeConfidence = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const percentage = value >= 0 && value <= 1 ? value * 100 : value;
  return percentage >= 0 && percentage <= 100 ? Math.round(percentage) : null;
};

const normalizeArticle = (item: ExternalDataItem): NormalizedNewsArticle => {
  const source = extractSource(item.source || item.sourceDomain);
  const title = parseHtmlContent(item.title) || 'Untitled news item';
  const summary = parseHtmlContent(item.aiSummary) || parseHtmlContent(item.summary);
  const content = parseHtmlContent(item.content);
  const topics = (item.topics || []).filter(Boolean);
  const importance = item.riskLevel || item.opportunityLevel || null;
  const companyName = displayValue(item.relatedCompanyName);
  return {
    id: item.id,
    title,
    source: { name: source.name, publishedAt: item.publishedAt || item.createdAt || '', url: safeExternalUrl(item.url) || source.url },
    summary: { text: summary },
    originalArticle: { content, url: safeExternalUrl(item.url) || source.url },
    aiAnalysis: {
      sentiment: displayValue(item.sentiment)?.toUpperCase() || null,
      importance: importance?.toUpperCase() || null,
      confidence: normalizeConfidence(item.sentimentConfidence),
      topics,
      keyPoints: [],
      businessImpact: null,
      riskLevel: item.riskLevel?.toUpperCase() || null,
    },
    relatedCompanies: companyName ? [{ id: item.relatedCompanyId || item.companyProfileId || null, name: companyName, ticker: null, relationship: 'Referenced Company', relevance: null }] : [],
    recommendedAction: { priority: null, action: null, reason: null, timeframe: null },
    relatedCompanyId: item.relatedCompanyId || null,
    companyProfileId: item.companyProfileId || null,
    topics,
    imageUrl: item.imageUrl || null,
    crawledAt: item.crawledAt || item.createdAt || null,
  };
};

const getCompanyDisplayName = (company: TrackedCompany) => {
  if (company.aliases && company.aliases.length > 0) {
    const sorted = [...company.aliases].sort((a, b) => a.length - b.length);
    return sorted[0];
  }
  return company.companyName.replace(/Công ty Cổ phần Tập đoàn|Công ty Cổ phần|Công ty TNHH|Tập đoàn|Tổng công ty/gi, '').trim();
};

const PAGE_SIZE = 12;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800';

// ── Badge Components ────────────────────────────────────────

const SentimentBadge: React.FC<{ sentiment?: string | null }> = ({ sentiment }) => {
  if (!sentiment || sentiment === 'NEUTRAL') return null;
  const isPos = sentiment === 'POSITIVE';
  return (
    <span className={`${styles.tagPill} ${isPos ? styles.newsPillSuccess : styles.newsPillDanger}`}>
      {isPos ? 'Positive' : 'Negative'}
    </span>
  );
};

// ── Main Component ──────────────────────────────────────────

export const News: React.FC<NewsProps> = () => {
  const { t } = useTranslation('news');
  const [trackedCompanies, setTrackedCompanies] = useState<TrackedCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [importanceFilter, setImportanceFilter] = useState('All');
  const [dataVersion, setDataVersion] = useState(0);
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Load Companies
  useEffect(() => {
    externalDataApi.getTrackedCompanies(true)
      .then((data: any) => {
        if (Array.isArray(data)) {
          setTrackedCompanies(data);
        }
      })
      .catch((err) => console.error('Failed to load companies', err));
  }, []);

  // Server-side fetching with pagination
  const fetchNews = useCallback(async (targetPage = 0) => {
    setLoading(true);
    try {
      const selectedCompany = trackedCompanies.find(c => c.id === selectedCompanyId);
      const companyNameQuery = selectedCompany ? selectedCompany.companyName : undefined;

      const res = await externalDataApi.getItems('NEWS', {
        page: targetPage,
        size: PAGE_SIZE,
        keyword: search || undefined,
        companyName: companyNameQuery,
        sentiment: sentimentFilter !== 'All' ? sentimentFilter : undefined,
        importance: importanceFilter !== 'All' ? importanceFilter : undefined,
      });
      
      const mapped = (res?.content || []).map(normalizeArticle);
      setArticles(mapped);
      setPage(targetPage);
      setTotalCount(res ? res.totalElements : 0);
    } catch (error) {
      console.error('Failed to load news', error);
      setArticles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, sentimentFilter, importanceFilter, selectedCompanyId, dataVersion, trackedCompanies]);

  // Fetch when filters change (resets to page 0)
  useEffect(() => {
    void fetchNews(0);
  }, [search, sentimentFilter, importanceFilter, selectedCompanyId, dataVersion, trackedCompanies]);

  const refreshCompanyNews = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await externalDataApi.runFetch(); 
      setTimeout(() => {
        setDataVersion((v) => v + 1);
      }, 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCompanyTagClick = (e: React.MouseEvent, companyName: string) => {
    e.stopPropagation();
    const found = trackedCompanies.find(c => c.companyName === companyName);
    if (found) {
      setSelectedCompanyId(found.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleArticleClick = (item: NewsArticleItem) => {
    const targetUrl = item.originalArticle.url || item.source.url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages || newPage === page) return;
    void fetchNews(newPage);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Helper for computing badges
  const isRecentlyCrawled = (crawledAt?: string | null) => 
    crawledAt ? (Date.now() - new Date(crawledAt).getTime()) < 12 * 60 * 60 * 1000 : false;
  
  const isHotItem = (article: NewsArticleItem) => 
    article.aiAnalysis.riskLevel === 'HIGH' && article.source.publishedAt
      ? (Date.now() - new Date(article.source.publishedAt).getTime()) < 48 * 60 * 60 * 1000
      : false;

  // Layout derivations
  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const secondaryArticles = articles.length > 1 ? articles.slice(1, 4) : [];
  const latestArticles = articles.length > 4 ? articles.slice(4) : [];

  const selectedCompanyName = selectedCompanyId 
    ? getCompanyDisplayName(trackedCompanies.find(c => c.id === selectedCompanyId)!) 
    : null;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItemIndex = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const endItemIndex = Math.min((page + 1) * PAGE_SIZE, totalCount);

  // Pagination pages array helper
  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, page - 1);
      let end = Math.min(totalPages - 2, page + 1);

      if (page <= 2) {
        end = 3;
      } else if (page >= totalPages - 3) {
        start = totalPages - 4;
      }

      if (start > 1) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push('...');
      pages.push(totalPages - 1);
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>...</span>;
      }
      const pageNum = p as number;
      return (
        <button
          key={pageNum}
          className={`${styles.pageBtn} ${pageNum === page ? styles.pageBtnActive : ''}`}
          onClick={() => handlePageChange(pageNum)}
        >
          {pageNum + 1}
        </button>
      );
    });
  };

  return (
    <div className={styles.newsPage}>
      {/* ── Custom Newspaper Header ───────────────────────── */}
      <div className={styles.newsHeader}>
        <div className={styles.newsHeaderLeft}>
          <div className={styles.headerEyebrow}>
            {t('header.eyebrow')}
          </div>
          <h1 className={styles.newsTitle}>{t('header.title')}</h1>
          <p className={styles.newsSub}>
            {t('header.description')}
          </p>
        </div>
        <div className={styles.newsHeaderRight}>
          <div className={styles.newsLastUpdated}>
            {loading ? t('aiState.inProgress', 'Updating...') : `${t('drawer.synced', 'Updated')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
      </div>

      {/* ── Company Filter Bar ────────────────────────────── */}
      <div className={styles.companyFilterBar}>
        <div 
          className={`${styles.companyChip} ${!selectedCompanyId ? styles.companyChipActive : ''}`}
          onClick={() => setSelectedCompanyId(null)}
        >
          {t('filters.allCompanies')}
        </div>
        {trackedCompanies.map(c => (
          <div 
            key={c.id} 
            className={`${styles.companyChip} ${selectedCompanyId === c.id ? styles.companyChipActive : ''}`}
            onClick={() => setSelectedCompanyId(c.id)}
          >
            {getCompanyDisplayName(c)}
          </div>
        ))}
      </div>

      {/* ── Search & Secondary Filters ────────────────────── */}
      <div className={styles.toolsBar}>
        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder={t('filters.searchPlaceholder')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Empty & Loading States ────────────────────────── */}
      {loading && articles.length === 0 && (
        <div className={styles.emptyStateContainer}>
          {t('empty.loading')}
        </div>
      )}

      {!loading && articles.length === 0 && (
        <div className={styles.emptyStateContainer}>
          <h3 className={styles.emptyStateTitle}>
            {selectedCompanyName ? t('empty.noResultsWithCompany', { company: selectedCompanyName, defaultValue: `No ${selectedCompanyName} articles found` }) : t('empty.noResultsTitle')}
          </h3>
          <p className={styles.emptyStateText}>
            {t('empty.noResultsBody')}
          </p>
          {(search || sentimentFilter !== 'All' || importanceFilter !== 'All' || selectedCompanyId) && (
            <SecondaryButton size="sm" onClick={() => {
              setSearch('');
              setSentimentFilter('All');
              setImportanceFilter('All');
              setSelectedCompanyId(null);
            }}>
              {t('filters.viewAll')}
            </SecondaryButton>
          )}
        </div>
      )}

      {/* ── Top Stories (Featured + Secondary) ────────────── */}
      {featuredArticle && (
        <>
          {/* <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Stories</h2>
          </div> */}
          <div className={styles.topStories}>
            
            {/* Featured Card - Clicking anywhere opens original article URL in new tab */}
            <div className={styles.featuredCard} onClick={() => handleArticleClick(featuredArticle)}>
              <img src={featuredArticle.imageUrl || FALLBACK_IMAGE} className={styles.featuredImage} alt={featuredArticle.title} />
              <div className={styles.featuredMeta}>
                <span className={styles.sourceNameText}>{featuredArticle.source.name}</span>
                <span>•</span>
                <span>{formatRelativeTime(featuredArticle.source.publishedAt, t)}</span>
                
                {featuredArticle.relatedCompanies.slice(0, 2).map(c => (
                  <React.Fragment key={c.name}>
                    <span>•</span>
                    <span 
                      className={`${styles.tagPill} ${styles.tagCompany}`}
                      onClick={(e) => handleCompanyTagClick(e, c.name)}
                    >
                      {c.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <h3 className={styles.featuredTitle}>{featuredArticle.title}</h3>
              <p className={styles.featuredSummary}>{featuredArticle.summary.text}</p>
              
              <div className={styles.featuredFooter}>
                <div className={styles.badgeGroup}>
                  {/* {isRecentlyCrawled(featuredArticle.crawledAt) && (
                    <span className={`${styles.tagPill} ${styles.newsPillNew}`}>NEW</span>
                  )} */}
                  {isHotItem(featuredArticle) && (
                    <span className={`${styles.tagPill} ${styles.newsPillHot}`}>🔥 HOT</span>
                  )}
                  {/* <SentimentBadge sentiment={featuredArticle.aiAnalysis.sentiment} /> */}
                </div>
              </div>
            </div>

            {/* Secondary Stories */}
            {secondaryArticles.length > 0 && (
              <div className={styles.secondaryStories}>
                {secondaryArticles.map(article => (
                  <div key={article.id} className={styles.secondaryCard} onClick={() => handleArticleClick(article)}>
                    <img src={article.imageUrl || FALLBACK_IMAGE} className={styles.secondaryImage} alt={article.title} />
                    <div className={styles.secondaryContent}>
                      <div className={styles.secondaryMeta}>
                        <span className={styles.sourceNameText}>{article.source.name}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(article.source.publishedAt, t)}</span>
                      </div>
                      <h4 className={styles.secondaryTitle}>{article.title}</h4>
                      <div className={styles.badgeGroup}>
                        {/* {isRecentlyCrawled(article.crawledAt) && <span className={`${styles.tagPill} ${styles.newsPillNew}`}>NEW</span>} */}
                        {/* {isHotItem(article) && <span className={`${styles.tagPill} ${styles.newsPillHot}`}>🔥 HOT</span>} */}
                        {article.relatedCompanies.slice(0, 1).map(c => (
                          <span key={c.name} className={`${styles.tagPill} ${styles.tagCompany}`} onClick={(e) => handleCompanyTagClick(e, c.name)}>
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Latest News Grid ──────────────────────────────── */}
      {latestArticles.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('sections.latestNews')}</h2>
            <div className={styles.sectionCount}>{t('sections.storiesCount', { count: totalCount })}</div>
          </div>
          
          <div className={styles.newsGrid}>
            {latestArticles.map(article => (
              <div key={article.id} className={styles.gridCard} onClick={() => handleArticleClick(article)}>
                <img src={article.imageUrl || FALLBACK_IMAGE} className={styles.gridImage} alt={article.title} />
                <div className={styles.gridMeta}>
                  <span className={styles.sourceNameText}>{article.source.name}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(article.source.publishedAt, t)}</span>
                </div>
                <h4 className={styles.gridTitle}>{article.title}</h4>
                <p className={styles.gridSummary}>{article.summary.text}</p>
                <div className={styles.badgeGroup}>
                  {/* {isRecentlyCrawled(article.crawledAt) && <span className={`${styles.tagPill} ${styles.newsPillNew}`}>NEW</span>} */}
                  {/* {isHotItem(article) && <span className={`${styles.tagPill} ${styles.newsPillHot}`}>🔥 HOT</span>} */}
                  {article.relatedCompanies.slice(0, 2).map(c => (
                    <span key={c.name} className={`${styles.tagPill} ${styles.tagCompany}`} onClick={(e) => handleCompanyTagClick(e, c.name)}>
                      {c.name}
                    </span>
                  ))}
                  {article.relatedCompanies.length > 2 && (
                    <span className={styles.tagPill}>+{article.relatedCompanies.length - 2}</span>
                  )}
                  {/* <SentimentBadge sentiment={article.aiAnalysis.sentiment} /> */}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Numerated Server-side Pagination ───────────────── */}
      {totalCount > 0 && (
        <div className={styles.paginationContainer}>
          <div className={styles.paginationInfo}>
            {t('pagination.showingRange', { start: startItemIndex, end: endItemIndex, total: totalCount })}
          </div>

          <div className={styles.paginationControls}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0 || loading}
            >
              ‹ {t('pagination.previous')}
            </button>

            {renderPaginationButtons()}

            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1 || loading}
            >
              {t('pagination.next')} ›
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
