import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Play, RefreshCw, Trash2 } from 'lucide-react';
import type { FinancialReportEntry } from '../../types/domain';
import styles from './FinancialResearchWorkbench.module.css';

interface Props {
  report: FinancialReportEntry;
  onExtract: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  onViewPdf: (documentId: string) => void;
  metricCount: number;
  needsReviewCount: number;
  selected?: boolean;
  selectedForSubmission?: boolean;
  isEligible?: boolean;
  canEdit?: boolean;
  onSelect?: (reportId: string) => void;
  onToggleSelection?: (reportId: string) => void;
}

const formatReportType = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : null;

const formatDate = (value?: string | null) => {
  if (!value) return 'No publication date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

const formatPeriod = (report: FinancialReportEntry) => {
  const period = report.reportingPeriod;
  if (!period) return null;
  if (period.period && period.year) return `${period.period} ${period.year}`;
  if (period.periodType === 'FULL_YEAR' && period.year) return `FY ${period.year}`;
  if (period.asOfDate) return `As of ${formatDate(period.asOfDate)}`;
  return period.year ? String(period.year) : null;
};

export default function FinancialReportCard({
  report,
  onExtract,
  onDelete,
  onViewPdf,
  metricCount,
  needsReviewCount,
  selected = false,
  selectedForSubmission = false,
  isEligible = false,
  canEdit = true,
  onSelect,
  onToggleSelection,
}: Props) {
  const isExtracting = report.extractionStatus === 'EXTRACTING';
  const isExtracted = report.extractionStatus === 'EXTRACTED' || report.extractionStatus === 'NEEDS_REVIEW';
  const isFailed = report.extractionStatus === 'FAILED';
  const reportType = formatReportType(report.reportType);
  const period = formatPeriod(report);

  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (canEdit && isEligible) {
      onToggleSelection?.(report.id);
    }
  };

  const isApproved = report.reviewStatus === 'APPROVED';
  const canEditCard = canEdit && !isApproved;

  return (
    <article
      className={`${styles.reportCard} ${selected ? styles.reportCardSelected : ''}`}
      onClick={() => onSelect?.(report.id)}
      aria-current={selected ? 'true' : undefined}
    >
      {isExtracting && <div className={styles.extractingBar} />}

      <div className={styles.cardTopRow}>
        {isApproved ? (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle2 size={12} />
            Approved
          </span>
        ) : (
          <label
            className={styles.cardSelectLabel}
            onClick={stop}
            title={!isEligible ? 'Extract this report before adding it to the submission.' : 'Select this report for manager submission.'}
          >
            <input
              type="checkbox"
              checked={selectedForSubmission}
              disabled={!canEditCard || !isEligible}
              onChange={handleSelectionChange}
              aria-label={`Select ${report.title} for submission`}
            />
            <span>Submit</span>
          </label>
        )}

        {canEditCard && (
          <button
            className={styles.cardDeleteBtn}
            type="button"
            onClick={(event) => { stop(event); onDelete(report.id); }}
            disabled={isExtracting}
            aria-label={`Delete ${report.title}`}
            title="Delete report"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className={styles.cardMetaRow}>
        {period && <span className={styles.cardPeriodPill}>{period}</span>}
        {reportType && <span className={styles.cardPeriodPill}>{reportType}</span>}
        <span>{formatDate(report.publicationDate)}</span>
      </div>

      <h4 className={styles.cardTitle}>{report.title}</h4>

      {report.reviewStatus === 'CHANGES_REQUESTED' && (
        <div className={styles.cardFeedbackBox}>
          <strong>Manager Feedback</strong>
          <p>{report.reviewComment || 'Manager requested changes to this report.'}</p>
          <small>
            {report.reviewedByName || 'Manager'}
            {report.reviewedAt ? ` • ${formatDate(report.reviewedAt)}` : ''}
          </small>
        </div>
      )}

      <button className={styles.cardPdfLink} type="button" onClick={(event) => { stop(event); onViewPdf(report.documentId); }}>
        <FileText size={14} />
        View Source PDF
      </button>

      <div className={styles.cardFooter}>
        <div className={`${styles.cardStatus} ${isExtracted ? styles.cardStatusSuccess : isFailed ? styles.cardStatusError : isExtracting ? styles.cardStatusExtracting : ''}`}>
          {isExtracting ? (
            <>
              <Loader2 size={14} className={styles.spinIcon} />
              <span>Extracting...</span>
            </>
          ) : isExtracted ? (
            <>
              <CheckCircle2 size={14} />
              <span>{metricCount} metrics {needsReviewCount > 0 && `(${needsReviewCount} review)`}</span>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle size={14} />
              <span>Failed</span>
            </>
          ) : (
            <span>Ready</span>
          )}
        </div>

        {canEditCard && (
          <button
            className={isExtracted || isFailed ? styles.secondaryButton : styles.primaryButton}
            type="button"
            onClick={(event) => { stop(event); onExtract(report.id); }}
            disabled={isExtracting}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            {isExtracting ? (
              <>
                <Loader2 size={12} className={styles.spinIcon} />
                Processing
              </>
            ) : isExtracted ? (
              <>
                <RefreshCw size={12} />
                Re-extract
              </>
            ) : (
              <>
                <Play size={12} />
                {isFailed ? 'Retry' : 'Extract'}
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
