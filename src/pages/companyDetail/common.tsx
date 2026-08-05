import React, { useState } from 'react';
import { externalDataApi } from '../../API/externalDataApi';
import { formatDateTime } from './utils';
import styles from '../CompanyDetail.module.css';

interface ListingTabShellProps {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  crawledAt?: string | null;
  onRetry: () => void;
  emptyHint?: string;
  children?: React.ReactNode;
}

export const ListingTabShell: React.FC<ListingTabShellProps> = ({
  loading,
  error,
  hasData,
  crawledAt,
  onRetry,
  emptyHint,
  children,
}) => {
  const [triggeringCrawl, setTriggeringCrawl] = useState(false);
  const [crawlStatusMsg, setCrawlStatusMsg] = useState<string | null>(null);

  const handleCrawlNow = async () => {
    setTriggeringCrawl(true);
    setCrawlStatusMsg(null);
    try {
      const msg = await externalDataApi.runFetch({ forceRefresh: true });
      setCrawlStatusMsg(msg || 'Đã kích hoạt thu thập dữ liệu công khai.');
      setTimeout(() => {
        onRetry();
      }, 2500);
    } catch (err) {
      setCrawlStatusMsg(err instanceof Error ? err.message : 'Không thể kết nối với dịch vụ thu thập.');
    } finally {
      setTriggeringCrawl(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.stateBox} style={{ background: '#FFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <div className={styles.spinnerRow} style={{ justifyContent: 'center', fontSize: '0.78rem', color: '#475569' }}>
          <div className="spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateBox} style={{ background: '#FFF', padding: '16px', borderRadius: '8px', border: '1px solid #FED7AA', textAlign: 'center' }}>
        <h3 className={styles.stateTitle} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C2410C', margin: '0 0 4px' }}>Không thể tải dữ liệu</h3>
        <p className={styles.stateText} style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 8px' }}>{error}</p>
        <button type="button" className={styles.retryButton} onClick={onRetry} style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={styles.stateBox} style={{ background: '#FFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <h3 className={styles.stateTitle} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Chưa có dữ liệu niêm yết từ nguồn công khai</h3>
        <p className={styles.stateText} style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 12px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          {emptyHint || 'Doanh nghiệp này chưa được thu thập dữ liệu báo cáo tài chính, tài liệu niêm yết hoặc tin tức tự động từ các nguồn báo chí.'}
        </p>

        {crawlStatusMsg && (
          <div style={{ fontSize: '0.72rem', background: '#F0FDF4', color: '#15803D', padding: '6px 12px', borderRadius: '4px', marginBottom: '10px', display: 'inline-block' }}>
            {crawlStatusMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleCrawlNow}
            disabled={triggeringCrawl}
            style={{ fontSize: '0.72rem', padding: '5px 12px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
          >
            {triggeringCrawl ? 'Đang kích hoạt thu thập...' : 'Kích hoạt cào dữ liệu ngay'}
          </button>
          <button
            type="button"
            onClick={onRetry}
            style={{ fontSize: '0.72rem', padding: '5px 12px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
          >
            Làm mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
      {crawledAt && <div className={styles.lastCrawled} style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '6px', textAlign: 'right' }}>Cập nhật lần cuối: {formatDateTime(crawledAt)}</div>}
    </div>
  );
};
