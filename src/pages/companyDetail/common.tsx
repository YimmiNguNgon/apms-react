import React from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
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
  if (loading) {
    return (
      <div className={styles.stateBox}>
        <div className={styles.spinnerRow} style={{ justifyContent: 'center' }}>
          <div className="spinner" />
          <span>Đang tải dữ liệu niêm yết...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateBox}>
        <AlertTriangle size={36} className={styles.stateIcon} style={{ color: '#D97706' }} />
        <h3 className={styles.stateTitle}>Không thể tải dữ liệu</h3>
        <p className={styles.stateText}>{error}</p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={styles.stateBox}>
        <Database size={36} className={styles.stateIcon} style={{ color: '#94A3B8' }} />
        <h3 className={styles.stateTitle}>Chưa có dữ liệu niêm yết</h3>
        <p className={styles.stateText}>
          {emptyHint || 'Doanh nghiệp này chưa được thu thập dữ liệu niêm yết từ nguồn công khai.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {children}
      <div className={styles.lastCrawled}>Cập nhật lần cuối: {formatDateTime(crawledAt)}</div>
    </div>
  );
};
