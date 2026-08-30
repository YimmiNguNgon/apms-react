import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import type { FinancialReportEntry } from '../../types/domain';
import styles from '../../pages/ProjectDetailPage.module.css';

interface Props {
  report: FinancialReportEntry;
  onDelete: (reportId: string) => void;
  onViewPdf: (documentId: string) => void;
  onSelect: (reportId: string) => void;
  metricCount: number;
  needsReviewCount: number;
  selected?: boolean;
  selectedForSubmission?: boolean;
  isEligible?: boolean;
  canEdit?: boolean;
  onExtract?: (reportId: string) => void;
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

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'EXTRACTED' || status === 'NEEDS_REVIEW') return <span className={styles.successBadge}>✓ Extracted</span>;
  if (status === 'FAILED') return <span className={styles.errorBadge}>Extraction Failed</span>;
  if (status === 'EXTRACTING') return <span className={styles.blueBadge}>● Extracting...</span>;
  return <span className={styles.neutralBadge}>Not Extracted</span>;
};

const getMetricsSummary = (report: FinancialReportEntry, metricCount: number, needsReviewCount: number) => {
  if (report.extractionStatus !== 'EXTRACTED' && report.extractionStatus !== 'NEEDS_REVIEW') {
    return report.extractionStatus === 'FAILED' ? 'Please retry extraction' : 'Ready for AI extraction';
  }
  let summary = `${metricCount} metrics`;
  if (needsReviewCount > 0) {
    summary += ` · ${needsReviewCount} need review`;
  }
  return summary;
};

export default function FinancialReportCard({
  report,
  onDelete,
  onViewPdf,
  onSelect,
  metricCount,
  needsReviewCount,
  selected = false,
  selectedForSubmission = false,
  isEligible = false,
  canEdit = true,
  onToggleSelection,
}: Props) {
  const reportType = formatReportType(report.reportType);
  const period = formatPeriod(report);

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete(report.id);
  };

  const handleViewPdf = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onViewPdf(report.documentId);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (onToggleSelection && isEligible) {
      onToggleSelection(report.id);
    }
  };

  return (
    <article
      className={`${styles.reportCard} ${selected ? styles.reportCardSelected : ''}`}
      onClick={() => onSelect(report.id)}
      aria-current={selected ? 'true' : undefined}
      style={{ display: 'flex', gap: '12px' }}
    >
      {(canEdit || report.reviewStatus === 'APPROVED') && (
        <div style={{ paddingTop: '4px' }} onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={report.reviewStatus === 'APPROVED' ? true : selectedForSubmission}
            disabled={report.reviewStatus === 'APPROVED' ? true : !isEligible}
            onChange={handleCheckboxChange}
            aria-label={`Select ${report.title} for submission`}
            title={report.reviewStatus === 'APPROVED' ? "Approved reports are locked." : !isEligible ? "Extract this report before adding it to the submission." : "Select for submission"}
            style={{ width: '18px', height: '18px', cursor: report.reviewStatus === 'APPROVED' ? 'not-allowed' : isEligible ? 'pointer' : 'not-allowed' }}
          />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.reportCardHeader}>
          <div className={styles.reportCardTitleBlock}>
            <div className={styles.reportMetaLine}>
              <span>{formatDate(report.publicationDate)}</span>
              {reportType && <span className={styles.typeBadge}>{reportType}</span>}
              <StatusBadge status={report.extractionStatus} />
            </div>
            <h4>{report.title}</h4>
            {period && <p>{period}</p>}
            {report.reviewStatus === 'APPROVED' && <div style={{marginTop: '4px'}}><span className={styles.successBadge}>✓ Approved</span></div>}
            {report.reviewStatus === 'CHANGES_REQUESTED' && (
              <div style={{marginTop: '6px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <span style={{color: '#b91c1c', fontWeight: 600, fontSize: '12px'}}>⚠ Changes Requested</span>
                </div>
                <div style={{fontSize: '11px', color: '#7f1d1d', marginTop: '2px'}}>
                  Manager feedback available
                </div>
              </div>
            )}
          </div>

          <button
            className={styles.iconDangerButton}
            type="button"
            onClick={handleDelete}
            disabled={!canEdit || report.extractionStatus === 'EXTRACTING'}
            aria-label={`Delete ${report.title}`}
            title="Delete report"
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <button className={styles.linkButton} type="button" onClick={handleViewPdf}>
            <FileText size={16} />
            View Source PDF
          </button>

          <span className={styles.reportStatusText} style={{ color: needsReviewCount > 0 ? '#b45309' : undefined }}>
            {getMetricsSummary(report, metricCount, needsReviewCount)}
          </span>
        </div>
      </div>
    </article>
  );
}
