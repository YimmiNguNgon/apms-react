import React from 'react';
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
        <div className={styles.spinnerRow}><div className="spinner" /><span>Dang tai du lieu...</span></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateBox}>
        <h3 className={styles.stateTitle}>Failed to load data</h3>
        <p className={styles.stateText}>{error}</p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Retry</button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={styles.stateBox}>
        <h3 className={styles.stateTitle}>No Data Available</h3>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Refresh</button>
      </div>
    );
  }

  return (
    <div>
      {children}
      {crawledAt && <div className={styles.lastCrawled}>Last updated: {formatDateTime(crawledAt)}</div>}
    </div>
  );
};
