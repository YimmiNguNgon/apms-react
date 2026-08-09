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
        <h3 className={styles.stateTitle}>Khong the tai du lieu</h3>
        <p className={styles.stateText}>{error}</p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Thu lai</button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={styles.stateBox}>
        <h3 className={styles.stateTitle}>Backend chua co du lieu cho muc nay</h3>
        <p className={styles.stateText}>
          {emptyHint ?? 'Chua co ban ghi da duoc xac minh trong ho so doanh nghiep. Du lieu se hien thi sau khi duoc them va phe duyet tren backend.'}
        </p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Lam moi</button>
      </div>
    );
  }

  return (
    <div>
      {children}
      {crawledAt && <div className={styles.lastCrawled}>Cap nhat lan cuoi: {formatDateTime(crawledAt)}</div>}
    </div>
  );
};
