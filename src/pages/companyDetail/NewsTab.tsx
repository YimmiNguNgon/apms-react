import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Newspaper, RefreshCw, Search } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type {
  CompanyNews,
  CompanyNewsSearchRejection,
  CompanyNewsSearchResponse,
} from '../../types/listingData';
import { ListingTabShell } from './common';
import { formatDateTime, useListingTabData } from './utils';
import styles from '../CompanyDetail.module.css';

const BATCH_SIZE = 5;
const SEARCH_COOLDOWN_SECONDS = 120;

const REJECTION_LABELS: Record<CompanyNewsSearchRejection, string> = {
  UNTRUSTED_DOMAIN: 'Nguồn không nằm trong whitelist',
  UNKNOWN_DOMAIN: 'Không xác định được nguồn (aggregator)',
  NO_COMPANY_MENTION: 'Không nhắc tới công ty',
};

interface NewsTabProps {
  companyId: string;
}

const NewsTab: React.FC<NewsTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyNews[]>(
    `news:${companyId}`,
    companyId,
    listingDataApi.getNews,
  );
  const [visible, setVisible] = useState(BATCH_SIZE);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CompanyNewsSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const runSearch = async () => {
    if (searching || cooldown > 0) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setShowRejected(false);
    try {
      const result = await listingDataApi.searchCompanyNews(companyId);
      setSearchResult(result);
      setCooldown(SEARCH_COOLDOWN_SECONDS);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Không thể tìm kiếm tin tức. Vui lòng thử lại.',
      );
      setCooldown(SEARCH_COOLDOWN_SECONDS);
    } finally {
      setSearching(false);
    }
  };

  const news = data?.data ?? [];
  const shown = news.slice(0, visible);
  const hasMore = visible < news.length;

  const accepted = searchResult?.results.filter((r) => r.status !== 'REJECTED') ?? [];
  const rejected = searchResult?.results.filter((r) => r.status === 'REJECTED') ?? [];
  const foundAny = (searchResult?.savedNew ?? 0) + (searchResult?.alreadyExisting ?? 0) > 0;

  return (
    <ListingTabShell
      loading={loading}
      error={error}
      hasData={true}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div className={styles.card} style={{ marginBottom: '14px' }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Search size={20} style={{ color: '#2563EB' }} />
            <h2>Tìm tin tức mới</h2>
          </div>
          <button
            type="button"
            className={styles.newsSearchBtn}
            onClick={runSearch}
            disabled={searching || cooldown > 0}
          >
            {searching ? (
              <Loader2 size={15} className={styles.spinIcon} />
            ) : (
              <RefreshCw size={15} />
            )}
            {searching
              ? 'Đang tìm kiếm...'
              : cooldown > 0
                ? `Đợi ${cooldown}s để tìm lại`
                : 'Tìm bài báo mới'}
          </button>
        </div>

        {searching && (
          <div className={styles.spinnerRow}>
            <Loader2 size={16} className={styles.spinIcon} />
            Đang lấy và lọc tin tức mới nhất về công ty...
          </div>
        )}

        {searchError && <p className={styles.newsSearchError}>{searchError}</p>}

        {searchResult && !searching && (
          <div>
            <div className={styles.newsSearchSummary}>
              <span className={`${styles.newsSearchChip} ${styles.newsChipNew}`}>
                Mới lưu: {searchResult.savedNew}
              </span>
              <span className={`${styles.newsSearchChip} ${styles.newsChipExisting}`}>
                Đã có sẵn: {searchResult.alreadyExisting}
              </span>
              <span className={`${styles.newsSearchChip} ${styles.newsChipRejected}`}>
                Bị loại: {searchResult.rejected}
              </span>
              <span className={styles.newsSearchTime}>
                Tìm lúc {formatDateTime(searchResult.searchedAt)}
              </span>
            </div>

            {!foundAny ? (
              <div className={styles.stateBox}>
                <div className={styles.stateIcon}>
                  <Newspaper size={24} />
                </div>
                <p className={styles.stateTitle}>Không tìm thấy bài báo mới</p>
                <p className={styles.stateText}>
                  Không tìm thấy bài viết mới nào về {searchResult.companyName} từ các nguồn tin
                  cậy.
                </p>
              </div>
            ) : (
              <div className={styles.newsList}>
                {accepted.map((r) => (
                  <div key={r.item.url ?? r.item.id} className={styles.newsItem}>
                    <div className={styles.newsThumbPlaceholder}>
                      <Newspaper size={20} />
                    </div>
                    <div className={styles.newsBody}>
                      {r.item.url ? (
                        <a
                          className={styles.newsTitle}
                          href={r.item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.item.title || 'Bài viết'}{' '}
                          <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                        </a>
                      ) : (
                        <p className={styles.newsTitle}>{r.item.title || 'Bài viết'}</p>
                      )}
                      {r.item.summary && <p className={styles.newsSummary}>{r.item.summary}</p>}
                      <div className={styles.newsMeta}>
                        {r.item.sourceDomain && <span>{r.item.sourceDomain} · </span>}
                        {formatDateTime(r.item.publishedAt) || 'Không rõ thời gian'}
                      </div>
                    </div>
                    <span
                      className={`${styles.newsSearchBadge} ${
                        r.status === 'SAVED_NEW' ? styles.newsBadgeNew : styles.newsBadgeExisting
                      }`}
                    >
                      {r.status === 'SAVED_NEW' ? 'Đã lưu mới' : 'Đã có sẵn'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {rejected.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className={styles.showMoreBtn}
                  onClick={() => setShowRejected((s) => !s)}
                >
                  {showRejected ? 'Ẩn' : 'Xem'} {rejected.length} bài bị loại
                </button>
                {showRejected && (
                  <div className={styles.newsList} style={{ marginTop: '8px' }}>
                    {rejected.map((r) => (
                      <div key={r.item.url ?? r.item.id} className={styles.newsItem}>
                        <div className={styles.newsBody}>
                          <p className={styles.newsTitle}>{r.item.title || 'Bài viết'}</p>
                          {r.item.summary && <p className={styles.newsSummary}>{r.item.summary}</p>}
                          <div className={styles.newsMeta}>{r.item.sourceDomain}</div>
                        </div>
                        <span className={`${styles.newsSearchBadge} ${styles.newsBadgeRejected}`}>
                          {r.rejection ? REJECTION_LABELS[r.rejection] : 'Bị loại'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Newspaper size={20} style={{ color: '#2563EB' }} />
            <h2>Tin tức liên quan</h2>
          </div>
          <span style={{ fontSize: '13px', color: '#64748B' }}>{news.length} bài</span>
        </div>

        <div className={styles.newsList}>
          {shown.map((item) => (
            <div key={item.id ?? item.sourceUrl} className={styles.newsItem}>
              {item.imageUrl ? (
                <img
                  className={styles.newsThumb}
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={styles.newsThumbPlaceholder}>
                  <Newspaper size={20} />
                </div>
              )}
              <div className={styles.newsBody}>
                {item.sourceUrl ? (
                  <a
                    className={styles.newsTitle}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title || 'Bài viết'} <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                ) : (
                  <p className={styles.newsTitle}>{item.title || 'Bài viết'}</p>
                )}
                {item.summary && <p className={styles.newsSummary}>{item.summary}</p>}
                <div className={styles.newsMeta}>
                  {formatDateTime(item.publishedAt) || 'Không rõ thời gian'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() => setVisible((v) => v + BATCH_SIZE)}
            >
              Xem thêm
            </button>
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default NewsTab;
