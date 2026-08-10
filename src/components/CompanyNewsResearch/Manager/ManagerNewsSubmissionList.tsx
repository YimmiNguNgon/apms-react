import React, { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import type { CompanyNewsResearchDraft } from '../../../types/domain';
import { ManagerNewsSubmissionCard } from './ManagerNewsSubmissionCard';
import styles from '../ManagerNewsReviewWorkspace.module.css';

interface ManagerNewsSubmissionListProps {
  drafts: CompanyNewsResearchDraft[];
  loading: boolean;
  onRefresh: () => void;
  onViewDetail: (draft: CompanyNewsResearchDraft) => void;
}

export const ManagerNewsSubmissionList: React.FC<ManagerNewsSubmissionListProps> = ({
  drafts,
  loading,
  onRefresh,
  onViewDetail
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED'>('ALL');

  const submittedDrafts = useMemo(
    () => drafts.filter((draft) => draft.reviewStatus !== 'DRAFT'),
    [drafts]
  );

  const filteredDrafts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const statusRows = statusFilter === 'ALL'
      ? submittedDrafts
      : submittedDrafts.filter((draft) => draft.reviewStatus === statusFilter);
    if (!term) return statusRows;
    return statusRows.filter((draft) => {
      const haystack = [
        draft.title,
        draft.sourceName,
        draft.sourceUrl,
        draft.author,
        draft.summary,
        ...(draft.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [query, statusFilter, submittedDrafts]);

  return (
    <section className={styles.articleSection}>
      <div className={styles.articleSectionHeader}>
        <div>
          <h2>News Drafts</h2>
          <p>Review submitted news drafts before approving or returning to Staff.</p>
        </div>
      </div>

        <div className={styles.articleTools}>
          <div className={styles.searchWrap}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input
              className={styles.searchBox}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drafts..."
            />
          </div>
          {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterButton} ${statusFilter === filter ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            type="button"
            className={styles.iconButton}
            onClick={onRefresh}
            disabled={loading}
            title="Refresh articles"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      {loading && submittedDrafts.length === 0 ? (
        <div className={styles.loadingPanel}>
          <RefreshCw size={30} className="animate-spin" />
          <span>Loading submitted articles...</span>
        </div>
      ) : submittedDrafts.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={34} />
          <h3>No submitted articles yet</h3>
          <p>The Staff has not submitted news articles for this task.</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={34} />
          <h3>No article matches your search</h3>
          <p>Search by title, source, source URL, author, or tag.</p>
        </div>
      ) : (
        <div className={styles.articleList}>
          {filteredDrafts.map((draft) => (
            <ManagerNewsSubmissionCard
              key={draft.id}
              draft={draft}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </section>
  );
};
