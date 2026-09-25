import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit3, FileText, Loader2, Play, RefreshCw, Trash2, XCircle } from 'lucide-react';
import type { FinancialReportEntry } from '../../types/domain';
import { isManualReport, isReportChangesRequested, resolveReportDocumentId } from './financialDocumentUtils';
import styles from './FinancialResearchWorkbench.module.css';

interface Props {
  report: FinancialReportEntry;
  onExtract: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  onEdit?: (report: FinancialReportEntry) => void;
  onViewPdf: (documentId: string) => void;
  isOpeningPdf?: boolean;
  metricCount: number;
  selected?: boolean;
  selectedForSubmission?: boolean;
  isEligible?: boolean;
  canEdit?: boolean;
  isAnyExtracting?: boolean;
  onSelect?: (reportId: string) => void;
  onToggleSelection?: (reportId: string) => void;
  isManagerMode?: boolean;
  hasTopReviewBanner?: boolean;
  onCancelExtract?: (reportId: string) => void;
  isCancellingExtract?: boolean;
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
  onCancelExtract,
  isCancellingExtract = false,
  onDelete,
  onEdit,
  onViewPdf,
  isOpeningPdf = false,
  metricCount,
  selected = false,
  selectedForSubmission = false,
  isEligible = false,
  canEdit = true,
  isAnyExtracting = false,
  onSelect,
  onToggleSelection,
  isManagerMode = false,
  hasTopReviewBanner = false,
}: Props) {
  const isManual = isManualReport(report);
  const documentId = resolveReportDocumentId(report);
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
  const requiresRevision = isReportChangesRequested(report);
  const canEditCard = canEdit && !isApproved;

  return (
    <article
      className={`${styles.reportCard} ${
        requiresRevision
          ? selected
            ? styles.reportCardChangesRequestedSelected
            : styles.reportCardChangesRequested
          : selected
          ? styles.reportCardSelected
          : ''
      }`}
      onClick={() => onSelect?.(report.id)}
      aria-current={selected ? 'true' : undefined}
    >
      {isExtracting && <div className={styles.extractingBar} />}

      <div className={styles.cardTopRow}>
        {isManagerMode ? (
          isApproved ? (
            <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
              <CheckCircle2 size={12} />
              Approved
            </span>
          ) : requiresRevision ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              <AlertTriangle size={12} />
              Changes Requested
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusPendingReview}`}>
              <Clock size={12} />
              Pending Review
            </span>
          )
        ) : isApproved ? (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle2 size={12} />
            Approved
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {requiresRevision && (
              <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
                <AlertTriangle size={12} />
                Changes Requested
              </span>
            )}
            <label
              className={styles.cardSelectLabel}
              onClick={stop}
              title={!isEligible ? (isManual ? 'Enter at least one metric before adding to submission.' : 'Extract this report before adding it to the submission.') : 'Select this report for manager submission.'}
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
          </div>
        )}

        {canEditCard && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onEdit && (
              <button
                className={styles.cardDeleteBtn}
                type="button"
                onClick={(event) => {
                  stop(event);
                  if (isAnyExtracting) return;
                  onEdit(report);
                }}
                disabled={isExtracting || isAnyExtracting}
                aria-label={`Edit ${report.title}`}
                title={isAnyExtracting ? 'Không thể chỉnh sửa khi đang có tài liệu trích xuất' : 'Edit report details'}
                style={isAnyExtracting ? { opacity: 0.4, cursor: 'not-allowed' } : { color: '#2563eb' }}
              >
                <Edit3 size={15} />
              </button>
            )}

            <button
              className={styles.cardDeleteBtn}
              type="button"
              onClick={(event) => { stop(event); onDelete(report.id); }}
              disabled={isExtracting || isAnyExtracting}
              aria-label={`Delete ${report.title}`}
              title={isAnyExtracting ? 'Không thể xóa khi đang có tài liệu trích xuất' : 'Delete report'}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.cardMetaRow}>
        <span
          style={{
            padding: '2px 7px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            background: isManual ? '#f1f5f9' : '#eff6ff',
            color: isManual ? '#475569' : '#2563eb',
            border: `1px solid ${isManual ? '#e2e8f0' : '#bfdbfe'}`,
          }}
        >
          {isManual ? 'MANUAL ENTRY' : 'AI EXTRACTION'}
        </span>
        {period && <span className={styles.cardPeriodPill}>{period}</span>}
        {!isManual && reportType && <span className={styles.cardPeriodPill}>{reportType}</span>}
        {!isManual && report.publicationDate && <span>{formatDate(report.publicationDate)}</span>}
      </div>

      <h4 className={styles.cardTitle}>{report.title}</h4>

      {requiresRevision && (
        <div className={styles.cardRevisionNotice}>
          <AlertTriangle size={12} />
          <span>Manager requested revisions</span>
        </div>
      )}

      {documentId ? (
        <button
          className={styles.cardPdfLink}
          type="button"
          disabled={isOpeningPdf}
          onClick={(event) => {
            stop(event);
            onViewPdf(documentId);
          }}
          title={report.fileName || undefined}
        >
          {isOpeningPdf ? <Loader2 size={14} className={styles.spinIcon} /> : <FileText size={14} />}
          {isOpeningPdf
            ? 'Opening PDF...'
            : isManual
            ? 'View PDF tham khảo'
            : 'View Source PDF'}
        </button>
      ) : isManual ? (
        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 0' }}>
          <FileText size={12} />
          <span>Không có tài liệu tham khảo</span>
        </div>
      ) : null}

      <div className={styles.cardFooter}>
        {isManual ? (
          <div className={`${styles.cardStatus} ${metricCount > 0 ? styles.cardStatusSuccess : ''}`}>
            {metricCount > 0 ? (
              <>
                <CheckCircle2 size={14} />
                <span>{metricCount} {metricCount === 1 ? 'metric' : 'metrics'}</span>
              </>
            ) : (
              <span style={{ color: '#94a3b8' }}>No metrics entered</span>
            )}
          </div>
        ) : (
          <div className={`${styles.cardStatus} ${isExtracted ? styles.cardStatusSuccess : isFailed ? styles.cardStatusError : isExtracting ? styles.cardStatusExtracting : ''}`}>
            {isExtracting ? (
              <>
                <Loader2 size={14} className={styles.spinIcon} />
                <span>Extracting...</span>
              </>
            ) : isExtracted ? (
              <>
                <CheckCircle2 size={14} />
                <span>{metricCount} {metricCount === 1 ? 'metric' : 'metrics'}</span>
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
        )}

        {canEditCard && !isManual && isExtracting && onCancelExtract && (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={(event) => { stop(event); onCancelExtract(report.id); }}
            disabled={isCancellingExtract}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            <XCircle size={12} />
            {isCancellingExtract ? 'Cancelling...' : 'Cancel'}
          </button>
        )}

        {canEditCard && !isManual && !isExtracting && (
            <button
              className={isExtracted || isFailed ? styles.secondaryButton : styles.primaryButton}
              type="button"
              onClick={(event) => { stop(event); onExtract(report.id); }}
              disabled={isAnyExtracting}
              title={
                isAnyExtracting
                  ? 'Một tài liệu khác đang được AI trích xuất. Vui lòng đợi hoàn tất.'
                  : undefined
              }
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                opacity: isAnyExtracting ? 0.6 : 1,
                cursor: isAnyExtracting ? 'not-allowed' : 'pointer',
              }}
            >
              {isExtracted ? (
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
