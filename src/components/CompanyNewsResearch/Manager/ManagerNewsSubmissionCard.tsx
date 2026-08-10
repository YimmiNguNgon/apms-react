import React from 'react';
import { Calendar, ExternalLink, Eye, Newspaper } from 'lucide-react';
import type { CompanyNewsResearchDraft } from '../../../types/domain';
import { NewsStatusBadge } from '../Shared/NewsStatusBadge';
import styles from '../ManagerNewsReviewWorkspace.module.css';

const formatOptionalDate = (dateString?: string | null) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

interface ManagerNewsSubmissionCardProps {
  draft: CompanyNewsResearchDraft;
  onViewDetail: (draft: CompanyNewsResearchDraft) => void;
}

export const ManagerNewsSubmissionCard: React.FC<ManagerNewsSubmissionCardProps> = ({
  draft,
  onViewDetail
}) => {
  const externalImageUrl = draft.externalImageUrl || '';
  const hasUploadedImage = Boolean(draft.imageStorageKey);

  return (
    <article className={styles.articleCard}>
      <div className={styles.thumb}>
        {externalImageUrl ? (
          <img src={externalImageUrl} alt={draft.title} />
        ) : (
          <div className={styles.thumbEmpty}>
            <Newspaper size={28} />
            {hasUploadedImage && <span style={{ fontSize: 11, marginTop: 4 }}>Image attached</span>}
          </div>
        )}
      </div>

      <div className={styles.articleContent}>
        <div className={styles.articleStatus}>
          <NewsStatusBadge status={draft.reviewStatus} />
        </div>

        <h3 className={styles.articleTitle}>{draft.title}</h3>

        <div className={styles.articleMeta}>
          {draft.sourceName && <span><Newspaper size={13} /> {draft.sourceName}</span>}
          {draft.publishedAt && <span><Calendar size={13} /> {formatOptionalDate(draft.publishedAt)}</span>}
        </div>

        {draft.summary && <p className={styles.summaryText}>{draft.summary}</p>}

        {(draft.tags?.length ?? 0) > 0 && (
          <div className={styles.tags}>
            {draft.tags?.slice(0, 4).map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}
          </div>
        )}

        <div className={styles.articleFooter}>
          <div className={styles.footerActions}>
            <button type="button" className={styles.viewDetailButton} onClick={() => onViewDetail(draft)}>
              <Eye size={14} /> View
            </button>
            {draft.sourceUrl && (
              <a className={styles.sourceButton} href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" title={draft.sourceUrl}>
                <ExternalLink size={14} /> Source
              </a>
            )}
          </div>
          <span className={styles.articleStateText}>
            {draft.reviewStatus === 'SUBMITTED' ? 'Submitted for review' : draft.reviewStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </article>
  );
};
