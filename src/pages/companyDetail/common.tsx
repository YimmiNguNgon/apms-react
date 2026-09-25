import React from 'react';
import { RefreshCw, AlertCircle, Newspaper } from 'lucide-react';
import { formatDateTime } from './utils';
import { CompanyDetailEmptyState } from './CompanyDetailEmptyState';
import styles from '../CompanyDetail.module.css';

interface ListingTabShellProps {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  crawledAt?: string | null;
  onRetry: () => void;
  emptyHint?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  children?: React.ReactNode;
}

export const ListingTabShell: React.FC<ListingTabShellProps> = ({
  loading,
  error,
  hasData,
  crawledAt,
  onRetry,
  emptyHint,
  emptyTitle = 'No news available yet',
  emptyDescription = 'Company news will appear here when relevant articles are available.',
  emptyIcon = <Newspaper size={22} />,
  emptyAction,
  errorTitle = 'Unable to load news',
  children,
}) => {
  if (loading) {
    return (
      <div className={styles.stateBox} style={{ minHeight: '210px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.spinnerRow}><div className="spinner" /><span>Loading data...</span></div>
      </div>
    );
  }

  if (error) {
    return (
      <CompanyDetailEmptyState
        icon={<AlertCircle size={22} color="#DC2626" />}
        title={errorTitle}
        description={error}
        action={
          <button type="button" className={styles.retryButton} onClick={onRetry} style={{ marginTop: 0 }}>
            <RefreshCw size={13} /> Retry
          </button>
        }
      />
    );
  }

  if (!hasData) {
    return (
      <CompanyDetailEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription || emptyHint}
        action={
          emptyAction !== undefined
            ? emptyAction
            : onRetry
              ? (
                <button type="button" className={styles.retryButton} onClick={onRetry} style={{ marginTop: 0 }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              )
              : undefined
        }
      />
    );
  }

  return (
    <div>
      {children}
      {crawledAt && <div className={styles.lastCrawled}>Last updated: {formatDateTime(crawledAt)}</div>}
    </div>
  );
};
