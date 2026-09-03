import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileSearch,
  FileText,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';
import { API_BASE_URL, api } from '../../services/api';
import type {
  CreateFinancialMetricRequest,
  CreateFinancialReportRequest,
  FinancialMetricResponse,
  FinancialReportEntry,
  TaskStatus,
  UpdateFinancialMetricRequest,
} from '../../types/domain';
import AddFinancialReportModal from './AddFinancialReportModal';
import AddManualMetricModal from './CreateFinancialReportModal';
import EditFinancialMetricModal from './EditFinancialMetricModal';
import ExtractionProgressBar from './ExtractionProgressBar';
import FinancialReportCard from './FinancialReportCard';
import styles from './FinancialResearchWorkbench.module.css';

type FinancialResearchWorkbenchProps = {
  projectId: number;
  taskId: number;
  taskTitle?: string | null;
  taskStatus?: TaskStatus | string | null;
  taskTypeLabel?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  canEdit?: boolean;
  isManagerMode?: boolean;
  onClose?: () => void;
  onReviewed?: (message: string, isSuccess: boolean) => void;
  documents?: unknown[];
  uploadingDocument?: boolean;
  onUploadDocument?: (file: File) => Promise<unknown> | unknown;
  onRefreshWorkbench?: () => void;
  onRecallSuccess?: () => void;
  onSubmitSuccess?: () => void;
};

type PackageCounts = {
  reports: number;
  extracted: number;
  selected: number;
  metrics: number;
  needsReview: number;
};

type UploadedDocumentResponse = {
  rawDocumentId?: string | null;
  id?: string | null;
};

type MetricFilter = 'ALL' | 'NEEDS_REVIEW' | 'VERIFIED' | 'MANUAL';

const isReportExtracted = (report: FinancialReportEntry) =>
  report.extractionStatus === 'EXTRACTED' || report.extractionStatus === 'NEEDS_REVIEW';

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

const formatPeriod = (report?: FinancialReportEntry | null) => {
  const period = report?.reportingPeriod;
  if (!period) return 'Not specified';
  if (period.period && period.year) return `${period.period} ${period.year}`;
  if (period.periodType === 'FULL_YEAR' && period.year) return `FY ${period.year}`;
  if (period.periodType && period.year) return `${period.periodType.replace(/_/g, ' ')} ${period.year}`;
  if (period.asOfDate) return `As of ${formatDate(period.asOfDate)}`;
  return period.year ? String(period.year) : 'Not specified';
};

const formatMetricPeriod = (metric: FinancialMetricResponse) => {
  const period = metric.period;
  if (!period) return 'Not specified';
  if (period.period && period.year) return `${period.period} ${period.year}`;
  if (period.periodType === 'FULL_YEAR' && period.year) return `FY ${period.year}`;
  if (period.periodType && period.year) return `${period.periodType.replace(/_/g, ' ')} ${period.year}`;
  if (period.asOfDate) return `As of ${formatDate(period.asOfDate)}`;
  return period.year ? String(period.year) : 'Not specified';
};

const formatStatus = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : 'Draft';

const formatReportType = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : null;

const formatMetricNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return 'Not captured';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return new Intl.NumberFormat('vi-VN').format(numeric);
  }
  return String(value);
};

const metricBelongsToReport = (metric: FinancialMetricResponse, report: FinancialReportEntry) =>
  metric.source?.reportEntryId === report.id ||
  (!metric.source?.reportEntryId && metric.source?.documentId === report.documentId);

const metricValueParts = (metric: FinancialMetricResponse) => {
  const value = metric.normalizedValue ?? metric.rawValue ?? metric.value;
  const unit = metric.normalizedUnit ?? metric.rawUnit ?? metric.unit ?? metric.currency;
  return {
    value: formatMetricNumber(value),
    unit: unit || '',
  };
};

const getMetricSource = (metric: FinancialMetricResponse) => {
  if (!metric.source) return 'Manual';
  if (metric.source.page) return `Page ${metric.source.page}`;
  return metric.source.documentName || 'Source document';
};

function FinancialResearchMetaBar({
  status,
  taskTypeLabel,
  dueDate,
  targetCompanyName,
  onClose,
}: {
  status?: string | null;
  taskTypeLabel?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  onClose?: () => void;
}) {
  const statusStr = (status || 'IN_PROGRESS').toUpperCase();
  const statusClass =
    statusStr === 'APPROVED' || statusStr === 'COMPLETED'
      ? styles.statusApproved
      : statusStr === 'CHANGES_REQUESTED'
      ? styles.statusChangesRequested
      : statusStr === 'SUBMITTED' || statusStr === 'IN_REVIEW'
      ? styles.statusInProgress
      : statusStr === 'DRAFT'
      ? styles.statusDraft
      : styles.statusInProgress;

  return (
    <div className={styles.metaBar}>
      <div className={styles.metaGroup}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Status:</span>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            ● {formatStatus(status)}
          </span>
        </div>

        <div className={styles.metaDivider} />

        <div className={styles.metaItem}>
          <Building2 size={14} className={styles.metaLabel} />
          <span className={styles.metaLabel}>Company:</span>
          <strong>{targetCompanyName || 'No target'}</strong>
        </div>

        <div className={styles.metaDivider} />

        <div className={styles.metaItem}>
          <BarChart3 size={14} className={styles.metaLabel} />
          <span className={styles.metaLabel}>Task:</span>
          <strong>{taskTypeLabel || 'Financial research'}</strong>
        </div>

        <div className={styles.metaDivider} />

        <div className={styles.metaItem}>
          <Calendar size={14} className={styles.metaLabel} />
          <span className={styles.metaLabel}>Due date:</span>
          <strong>{formatDate(dueDate)}</strong>
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 'auto',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function FinancialReportsEmptyState() {
  return (
    <div className={styles.emptyCard}>
      <div className={styles.emptyIcon}>
        <FileSearch size={30} />
      </div>
      <h3>No financial reports yet</h3>
      <p>Create your first financial report to begin this research task.</p>
    </div>
  );
}

function FinancialMetricsEmptyState() {
  return (
    <div className={styles.emptyCard}>
      <div className={styles.emptyIcon}>
        <BarChart3 size={30} />
      </div>
      <h3>No report selected</h3>
      <p>Financial metrics will appear here after you create a report and run AI extraction.</p>
    </div>
  );
}

function SelectedReportSummary({
  report,
  metricsCount,
  canEdit,
  onExtract,
}: {
  report: FinancialReportEntry;
  metricsCount: number;
  canEdit: boolean;
  onExtract: (reportId: string) => void;
}) {
  const isExtracting = report.extractionStatus === 'EXTRACTING';
  const isFailed = report.extractionStatus === 'FAILED';

  return (
    <div className={styles.metricsPanel}>
      <div className={styles.reportDetailHead}>
        <div className={styles.reportDetailTitleGroup}>
          <h3>{report.title}</h3>
          <div className={styles.reportDetailMeta}>
            <span>{formatPeriod(report)}</span>
            <span>•</span>
            <span>{formatReportType(report.reportType) || 'Financial Statement'}</span>
            <span>•</span>
            <span>{formatDate(report.publicationDate)}</span>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${isFailed ? styles.statusError : isExtracting ? styles.statusInProgress : styles.statusNeutral}`}>
          {isExtracting ? 'Extracting...' : isFailed ? 'Extraction Failed' : 'Ready for Extraction'}
        </span>
      </div>

      {report.reviewStatus === 'CHANGES_REQUESTED' && (
        <div className={styles.managerFeedbackBanner}>
          <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className={styles.managerFeedbackContent}>
            <strong>Manager Feedback / Changes Requested</strong>
            <p>{report.reviewComment || 'Manager requested changes to this report.'}</p>
            <small>
              {report.reviewedByName || 'Manager'}
              {report.reviewedAt ? ` • ${formatDate(report.reviewedAt)}` : ''}
            </small>
          </div>
        </div>
      )}

      {isExtracting ? (
        <ExtractionProgressBar
          status={report.extractionStatus}
          stage={report.extractionStage}
          progress={report.extractionProgress}
          startedAt={report.extractionStartedAt}
          errorMessage={report.extractionErrorMessage}
        />
      ) : (
        <div className={styles.inlineEmpty} style={{ flexDirection: 'column', gap: 12, minHeight: 180 }}>
          <Sparkles size={24} color="#2563eb" />
          <span>Click below to run AI extraction and generate financial metrics for this report.</span>
          <button className={styles.primaryButton} type="button" onClick={() => onExtract(report.id)} disabled={!canEdit}>
            <Sparkles size={14} />
            {isFailed ? 'Retry Extract' : 'Extract Financial Data'}
          </button>
        </div>
      )}

      {isFailed && report.extractionErrorMessage && (
        <div className={`${styles.statusBadge} ${styles.statusError}`} style={{ borderRadius: 8, padding: '8px 12px', width: 'fit-content' }}>
          {report.extractionErrorMessage}
        </div>
      )}
    </div>
  );
}

function ExtractedMetricsPanel({
  report,
  metrics,
  selectedMetricId,
  metricFilter,
  evidenceOpen,
  verifyingMetricId,
  onSelectMetric,
  onCloseEvidence,
  onFilterChange,
  canEdit,
  onReExtract,
  onVerifyMetric,
  onEditMetric,
  onAddManualMetric,
  onViewPdf,
}: {
  report: FinancialReportEntry;
  metrics: FinancialMetricResponse[];
  selectedMetricId?: string | null;
  metricFilter: MetricFilter;
  evidenceOpen: boolean;
  verifyingMetricId?: string | null;
  onSelectMetric: (metricId: string) => void;
  onCloseEvidence: () => void;
  onFilterChange: (filter: MetricFilter) => void;
  canEdit: boolean;
  onReExtract: (reportId: string) => void;
  onVerifyMetric: (metricId: string) => void;
  onEditMetric: (metric: FinancialMetricResponse) => void;
  onAddManualMetric: () => void;
  onViewPdf: (documentId: string) => void;
}) {
  const isApproved = report.reviewStatus === 'APPROVED';
  const canEditThisReport = canEdit && !isApproved;

  const needsReview = metrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW' && metric.verificationStatus !== 'VERIFIED').length;
  const verified = metrics.filter(metric => metric.verificationStatus === 'VERIFIED').length;
  const manual = metrics.filter(metric => metric.inputMethod === 'MANUAL').length;
  const visibleMetrics = metrics.filter(metric => {
    if (metricFilter === 'NEEDS_REVIEW') return metric.qualityStatus === 'NEEDS_REVIEW' && metric.verificationStatus !== 'VERIFIED';
    if (metricFilter === 'VERIFIED') return metric.verificationStatus === 'VERIFIED';
    if (metricFilter === 'MANUAL') return metric.inputMethod === 'MANUAL';
    return true;
  });

  const filterItems: Array<{ key: MetricFilter; label: string; count: number; warning?: boolean }> = [
    { key: 'ALL', label: 'All', count: metrics.length },
    { key: 'NEEDS_REVIEW', label: 'Needs Review', count: needsReview, warning: needsReview > 0 },
    { key: 'VERIFIED', label: 'Verified', count: verified },
    { key: 'MANUAL', label: 'Manual', count: manual },
  ];

  const totalMetrics = metrics.length;
  const verifiedCount = verified;
  const percentVerified = totalMetrics > 0 ? Math.round((verifiedCount / totalMetrics) * 100) : 0;

  return (
    <div className={styles.metricsPanel}>
      <div className={styles.reportDetailHead}>
        <div className={styles.reportDetailTitleGroup}>
          <h3>{report.title}</h3>
          <div className={styles.reportDetailMeta}>
            <span>{formatPeriod(report)}</span>
            <span>•</span>
            <span>{formatReportType(report.reportType) || 'Financial Statement'}</span>
            <span>•</span>
            <span>{formatDate(report.publicationDate)}</span>
          </div>
        </div>
        {isApproved ? (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle2 size={13} />
            Approved by Manager (Read Only)
          </span>
        ) : (
          <span className={`${styles.statusBadge} ${styles.statusExtracted}`}>
            <CheckCircle2 size={13} />
            Extraction Complete
          </span>
        )}
      </div>

      {report.reviewStatus === 'CHANGES_REQUESTED' && (
        <div className={styles.managerFeedbackBanner}>
          <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className={styles.managerFeedbackContent}>
            <strong>Manager Feedback / Changes Requested</strong>
            <p>{report.reviewComment || 'Manager requested changes to this report.'}</p>
            <small>
              {report.reviewedByName || 'Manager'}
              {report.reviewedAt ? ` • ${formatDate(report.reviewedAt)}` : ''}
            </small>
          </div>
        </div>
      )}

      {/* Verification Progress Banner (matching Contract Workbench) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 10,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', fontWeight: 600 }}>
          <ShieldCheck size={18} color={percentVerified === 100 ? '#16a34a' : '#2563eb'} />
          <span>
            Tiến độ thẩm định: <strong>{verifiedCount}/{totalMetrics}</strong> chỉ số ({percentVerified}%)
          </span>
        </div>

        <div style={{ flex: '1 1 180px', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${percentVerified}%`,
                background: percentVerified === 100 ? '#16a34a' : '#2563eb',
                borderRadius: 3,
                transition: 'width 200ms ease',
              }}
            />
          </div>
        </div>

        {canEditThisReport && totalMetrics > 0 && percentVerified < 100 && (
          <button
            type="button"
            className={styles.secondaryButton}
            style={{ padding: '4px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', fontWeight: 600 }}
            onClick={async () => {
              const unverified = metrics.filter(m => m.verificationStatus !== 'VERIFIED');
              for (const m of unverified) {
                await onVerifyMetric(m.id);
              }
            }}
          >
            <CheckCircle2 size={13} color="#2563eb" />
            Xác thực tất cả
          </button>
        )}
      </div>

      <div className={styles.reportToolbar}>
        <div className={styles.filterSegment} role="tablist">
          {filterItems.map(item => (
            <button
              key={item.key}
              className={`${styles.filterTab} ${metricFilter === item.key ? styles.filterTabActive : ''}`}
              type="button"
              onClick={() => onFilterChange(item.key)}
            >
              {item.label}
              <span className={`${styles.filterCount} ${item.warning ? styles.filterCountWarning : ''}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => onViewPdf(report.documentId)}>
            <FileText size={14} />
            View Source PDF
          </button>
          {canEditThisReport && (
            <>
              <button className={styles.secondaryButton} type="button" onClick={() => onReExtract(report.id)}>
                <RefreshCw size={14} />
                Re-extract
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={onAddManualMetric}
                style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }}
              >
                <Plus size={13} />
                Add Metric
              </button>
            </>
          )}
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className={styles.inlineEmpty} style={{ flexDirection: 'column', gap: '10px' }}>
          <span>Extraction completed, but no financial metrics were returned.</span>
          {canEditThisReport && (
            <button className={styles.primaryButton} type="button" onClick={onAddManualMetric} style={{ width: 'fit-content' }}>
              <Plus size={14} />
              Add First Metric
            </button>
          )}
        </div>
      ) : visibleMetrics.length === 0 ? (
        <div className={styles.inlineEmpty}>No metrics match this filter.</div>
      ) : (
        <div className={styles.metricsTableWrap}>
          <table className={styles.metricsTable}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Period</th>
                <th>Source</th>
                <th>Quality</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleMetrics.map(metric => {
                const value = metricValueParts(metric);
                const isVerified = metric.verificationStatus === 'VERIFIED';
                const isNeedsReview = metric.qualityStatus === 'NEEDS_REVIEW' && !isVerified;
                const showEvidence = evidenceOpen && metric.id === selectedMetricId;
                return (
                  <React.Fragment key={metric.id}>
                    <tr
                      className={showEvidence ? styles.metricRowSelected : ''}
                      onClick={() => onSelectMetric(metric.id)}
                      aria-selected={showEvidence}
                    >
                      <td className={styles.metricLabelCell}>{metric.label}</td>
                      <td className={styles.metricValueCell}>
                        {value.value}
                        {value.unit && <span className={styles.metricValueUnit}>{value.unit}</span>}
                      </td>
                      <td>{formatMetricPeriod(metric)}</td>
                      <td>
                        <span className={styles.sourceTag}>{getMetricSource(metric)}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${isNeedsReview ? styles.statusNeedsReview : isVerified ? styles.statusApproved : styles.statusNeutral}`}>
                          {isNeedsReview ? 'Needs Review' : isVerified ? 'Verified' : 'Ready'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActionRow}>
                          <button
                            className={isVerified ? styles.verifiedActionTag : styles.verifyActionBtn}
                            type="button"
                            disabled={isVerified || !canEditThisReport || verifyingMetricId === metric.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onVerifyMetric(metric.id);
                            }}
                          >
                            {isVerified ? (
                              <>
                                <CheckCircle2 size={13} />
                                Verified
                              </>
                            ) : verifyingMetricId === metric.id ? (
                              'Saving...'
                            ) : (
                              'Verify'
                            )}
                          </button>
                          {canEditThisReport && (
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEditMetric(metric);
                              }}
                              style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                              title="Edit metric values"
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {showEvidence && (
                      <tr className={styles.evidenceTableRow}>
                        <td colSpan={6} className={styles.evidenceTableCell}>
                          <aside className={styles.evidencePanel}>
                            <div className={styles.evidenceHeader}>
                              <div className={styles.evidenceTitle}>
                                <FileText size={15} />
                                <span>Evidence & Document Excerpt</span>
                              </div>
                              <button className={styles.evidenceCloseBtn} type="button" onClick={onCloseEvidence} aria-label="Close evidence">
                                <X size={14} />
                              </button>
                            </div>
                            <div className={styles.evidenceMetricInfo}>
                              <strong>{metric.label}:</strong>
                              <span>{value.value} {value.unit}</span>
                            </div>
                            <p className={styles.evidenceQuoteBox}>
                              "{metric.evidence || 'No evidence excerpt was provided for this metric.'}"
                            </p>
                            <div className={styles.evidenceMetaRow}>
                              <div className={styles.evidenceMetaItem}>
                                <span>Document:</span>
                                <strong>{metric.source?.documentName || report.title}</strong>
                              </div>
                              <div className={styles.evidenceMetaItem}>
                                <span>Page:</span>
                                <strong>{metric.source?.page ?? 'N/A'}</strong>
                              </div>
                              <div className={styles.evidenceMetaItem}>
                                <span>Confidence:</span>
                                <strong>{metric.confidence != null ? `${Math.round(metric.confidence * 100)}%` : 'N/A'}</strong>
                              </div>
                            </div>
                          </aside>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinancialReportsPanel({
  reports,
  metrics,
  selectedReportId,
  canEdit,
  onCreate,
  onSelect,
  onExtract,
  onDelete,
  onViewPdf,
  selectedReportIdsForSubmission,
  eligibleReportIds,
  onToggleSelection,
}: {
  reports: FinancialReportEntry[];
  metrics: FinancialMetricResponse[];
  selectedReportId?: string | null;
  canEdit: boolean;
  onCreate: () => void;
  onSelect: (reportId: string) => void;
  onExtract: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  onViewPdf: (documentId: string) => void;
  selectedReportIdsForSubmission: string[];
  eligibleReportIds: string[];
  onToggleSelection: (reportId: string) => void;
}) {
  const selectedSubmissionSet = useMemo(() => new Set(selectedReportIdsForSubmission), [selectedReportIdsForSubmission]);
  const eligibleSubmissionSet = useMemo(() => new Set(eligibleReportIds), [eligibleReportIds]);
  const groupedReports = reports.reduce((groups, report) => {
    const key = formatPeriod(report);
    if (!groups[key]) groups[key] = [];
    groups[key].push(report);
    return groups;
  }, {} as Record<string, FinancialReportEntry[]>);

  return (
    <section className={`${styles.panel} ${styles.leftPanel}`}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitleGroup}>
          <div className={styles.panelTitleWithBadge}>
            <h3>Financial Reports</h3>
            <span className={styles.badgeCount}>{reports.length}</span>
          </div>
          <p>Add documents & extract data</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={onCreate} disabled={!canEdit}>
          <Plus size={14} />
          Create Report
        </button>
      </div>

      {reports.length === 0 ? (
        <FinancialReportsEmptyState />
      ) : (
        <div className={styles.reportGroups}>
          {Object.entries(groupedReports).map(([group, groupReports]) => (
            <div className={styles.reportGroup} key={group}>
              <h4 className={styles.reportGroupTitle}>{group}</h4>
              <div className={styles.reportList}>
                {groupReports.map(report => {
                  const reportMetrics = metrics.filter(metric => metricBelongsToReport(metric, report));
                  const reportNeedsReview = reportMetrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW' && metric.verificationStatus !== 'VERIFIED').length;
                  return (
                    <FinancialReportCard
                      key={report.id}
                      report={report}
                      metricCount={reportMetrics.length}
                      needsReviewCount={reportNeedsReview}
                      selected={report.id === selectedReportId}
                      selectedForSubmission={selectedSubmissionSet.has(report.id)}
                      isEligible={eligibleSubmissionSet.has(report.id)}
                      canEdit={canEdit}
                      onSelect={onSelect}
                      onToggleSelection={onToggleSelection}
                      onExtract={onExtract}
                      onDelete={onDelete}
                      onViewPdf={onViewPdf}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FinancialPackageSummary({
  counts,
  allApproved = false,
  disabled,
  submitting,
  submitted,
  canRecall,
  onRecall,
  recalling,
  onSubmit,
}: {
  counts: PackageCounts;
  allApproved?: boolean;
  disabled: boolean;
  submitting: boolean;
  submitted: boolean;
  canRecall?: boolean;
  onRecall?: () => void;
  recalling?: boolean;
  onSubmit: () => void;
}) {
  const isWarning = counts.needsReview > 0;
  const isSuccess = !isWarning && counts.selected > 0 && counts.metrics > 0;

  const label = submitted
    ? (canRecall
        ? `Submitted to Manager • ${counts.selected || counts.reports} report(s) waiting for Manager review.`
        : 'This package has been submitted and is currently under Manager review.')
    : allApproved
      ? 'All financial reports in this task have been approved by manager.'
    : counts.selected === 0
      ? 'Select at least one extracted report to submit.'
    : counts.metrics === 0
      ? 'Extract metrics before submitting the selected report(s).'
    : counts.needsReview > 0
      ? `${counts.needsReview} selected metric(s) need review before submission.`
      : `${counts.selected} report(s), ${counts.metrics} metric(s) ready to submit.`;

  return (
    <footer className={styles.packageSummary}>
      <div className={`${styles.summaryStatusGroup} ${isWarning ? styles.summaryStatusWarning : isSuccess || allApproved || submitted ? styles.summaryStatusSuccess : styles.summaryStatusNeutral}`}>
        {isWarning ? (
          <AlertTriangle size={16} />
        ) : isSuccess || allApproved ? (
          <CheckCircle2 size={16} />
        ) : submitted ? (
          <Clock size={16} />
        ) : (
          <FileText size={16} />
        )}
        <span>{label}</span>
      </div>
      {!allApproved && (
        submitted ? (
          canRecall && onRecall && (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={onRecall}
              disabled={recalling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                borderColor: '#cbd5e1',
                background: '#ffffff',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {recalling ? (
                <>
                  <Loader2 size={14} className={styles.spinIcon} />
                  Recalling...
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  Recall Submission
                </>
              )}
            </button>
          )
        ) : (
          <button className={styles.submitBtn} type="button" onClick={onSubmit} disabled={disabled || submitted || submitting}>
            {submitting ? (
              <>
                <Loader2 size={14} className={styles.spinIcon} />
                Submitting...
              </>
            ) : (
              'Submit to Manager'
            )}
          </button>
        )
      )}
    </footer>
  );
}

function ManagerReviewSummaryBar({
  selectedReport,
  reports,
  isRecalled,
  onApprove,
  onRequestChanges,
  onApproveAll,
  isProcessing,
}: {
  selectedReport: FinancialReportEntry | null;
  reports: FinancialReportEntry[];
  isRecalled?: boolean;
  onApprove: (reportId: string) => void;
  onRequestChanges: (reportId: string) => void;
  onApproveAll: () => void;
  isProcessing: boolean;
}) {
  if (isRecalled) {
    return (
      <footer className={styles.packageSummary}>
        <div className={styles.summaryStatusGroup} style={{ color: '#ea580c' }}>
          <AlertTriangle size={16} />
          <span>This submission was recalled by Staff for further editing. No active review is pending.</span>
        </div>
      </footer>
    );
  }

  const pendingReports = reports.filter(r => r.reviewStatus !== 'APPROVED');
  const isApproved = selectedReport?.reviewStatus === 'APPROVED';
  const isChangesRequested = selectedReport?.reviewStatus === 'CHANGES_REQUESTED';

  return (
    <footer className={styles.packageSummary}>
      <div className={styles.summaryStatusGroup}>
        {isApproved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 600 }}>
            <CheckCircle2 size={16} />
            <span>
              "{selectedReport?.title}" was approved by {selectedReport?.reviewedByName || 'Manager'}.
            </span>
          </div>
        ) : isChangesRequested ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', fontWeight: 600 }}>
            <AlertTriangle size={16} />
            <span>
              "{selectedReport?.title}" returned for changes: "{selectedReport?.reviewComment || 'Staff needs to make corrections.'}"
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600 }}>
            <FileText size={16} />
            <span>
              Reviewing "{selectedReport?.title || 'Financial Report'}" • {pendingReports.length} report(s) pending review
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {pendingReports.length > 1 && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onApproveAll}
            disabled={isProcessing}
            style={{ padding: '7px 14px', fontSize: '13px', color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' }}
          >
            <Check size={14} />
            Approve All ({pendingReports.length})
          </button>
        )}

        {selectedReport && !isApproved && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onRequestChanges(selectedReport.id)}
            disabled={isProcessing}
            style={{ padding: '7px 14px', fontSize: '13px', color: '#c2410c', borderColor: '#fed7aa', background: '#fff7ed' }}
          >
            <AlertTriangle size={14} />
            Request Changes
          </button>
        )}

        {selectedReport && !isApproved && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => onApprove(selectedReport.id)}
            disabled={isProcessing}
            style={{ padding: '7px 16px', fontSize: '13px', background: '#16a34a', borderColor: '#16a34a' }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className={styles.spinIcon} />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Approve Report
              </>
            )}
          </button>
        )}

        {selectedReport && isApproved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 700, fontSize: '13px', padding: '6px 12px', background: '#dcfce7', borderRadius: '8px' }}>
            <CheckCircle2 size={15} />
            Approved
          </span>
        )}
      </div>
    </footer>
  );
}

export default function FinancialResearchWorkbench({
  projectId,
  taskId,
  taskTitle,
  taskStatus,
  taskTypeLabel,
  dueDate,
  targetCompanyName,
  canEdit = true,
  isManagerMode = false,
  onClose,
  onReviewed,
  onRefreshWorkbench,
  onRecallSuccess,
  onSubmitSuccess,
}: FinancialResearchWorkbenchProps) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMetricModalOpen, setIsAddMetricModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<FinancialMetricResponse | null>(null);
  const [reportToDelete, setReportToDelete] = useState<FinancialReportEntry | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('ALL');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedReportIdsForSubmission, setSelectedReportIdsForSubmission] = useState<string[]>([]);
  const [submissionSelectionTouched, setSubmissionSelectionTouched] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const { data: researchRes, isLoading, isError, error } = useQuery({
    queryKey: ['financial-research', projectId, taskId],
    queryFn: () => financialResearchApi.getResearch(projectId, taskId),
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      const anyExtracting = (data?.reports || []).some(
        (report: FinancialReportEntry) => report.extractionStatus === 'EXTRACTING' || report.extractionStatus === 'PROCESSING',
      );
      return anyExtracting ? 1500 : false;
    },
  });

  const research = researchRes?.data;
  const reports = useMemo(() => research?.reports || [], [research?.reports]);
  const metrics = useMemo(() => research?.metrics || [], [research?.metrics]);
  const extractedReports = useMemo(() => reports.filter(isReportExtracted), [reports]);
  const isSubmitted = research?.status === 'SUBMITTED' || research?.status === 'APPROVED';
  const isReadOnly = !canEdit || isSubmitted;
  const eligibleReportIds = useMemo(
    () => extractedReports.filter(report => report.reviewStatus !== 'APPROVED').map(report => report.id),
    [extractedReports],
  );
  const selectedSubmissionReportSet = useMemo(() => new Set(selectedReportIdsForSubmission), [selectedReportIdsForSubmission]);
  const selectedSubmissionReports = useMemo(
    () => extractedReports.filter(report => selectedSubmissionReportSet.has(report.id)),
    [extractedReports, selectedSubmissionReportSet],
  );
  const selectedSubmissionMetrics = useMemo(
    () => metrics.filter(metric => selectedSubmissionReports.some(report => metricBelongsToReport(metric, report))),
    [metrics, selectedSubmissionReports],
  );

  const selectedReport = useMemo(
    () => reports.find(report => report.id === selectedReportId) || null,
    [reports, selectedReportId],
  );

  const selectedReportMetrics = useMemo(
    () => selectedReport ? metrics.filter(metric => metricBelongsToReport(metric, selectedReport)) : [],
    [metrics, selectedReport],
  );

  const allApproved = reports.length > 0 && reports.every(report => report.reviewStatus === 'APPROVED');

  const counts = useMemo<PackageCounts>(() => ({
    reports: reports.length,
    extracted: extractedReports.length,
    selected: selectedReportIdsForSubmission.length,
    metrics: selectedSubmissionMetrics.length,
    needsReview: selectedSubmissionMetrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW' && metric.verificationStatus !== 'VERIFIED').length,
  }), [extractedReports.length, reports.length, selectedReportIdsForSubmission.length, selectedSubmissionMetrics]);

  const canSubmit = !allApproved && counts.selected > 0 && counts.metrics > 0 && counts.needsReview === 0;

  useEffect(() => {
    setSubmissionSelectionTouched(false);
    setSelectedReportIdsForSubmission([]);
  }, [research?.id]);

  useEffect(() => {
    const eligibleSet = new Set(eligibleReportIds);
    setSelectedReportIdsForSubmission(previous => {
      const next = submissionSelectionTouched
        ? previous.filter(reportId => eligibleSet.has(reportId))
        : eligibleReportIds;
      if (next.length === previous.length && next.every((reportId, index) => reportId === previous[index])) {
        return previous;
      }
      return next;
    });
  }, [eligibleReportIds, submissionSelectionTouched]);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedReportId(null);
      setSelectedMetricId(null);
      setEvidenceOpen(false);
      return;
    }
    if (!selectedReportId || !reports.some(report => report.id === selectedReportId)) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (selectedReportMetrics.length === 0) {
      setSelectedMetricId(null);
      setEvidenceOpen(false);
      return;
    }
    if (selectedMetricId && !selectedReportMetrics.some(metric => metric.id === selectedMetricId)) {
      setSelectedMetricId(null);
      setEvidenceOpen(false);
    }
  }, [selectedMetricId, selectedReportMetrics]);

  const addReportMutation = useMutation({
    mutationFn: (data: CreateFinancialReportRequest) => financialResearchApi.addReport(projectId, taskId, data),
    onSuccess: (res) => {
      const createdReport = res.data.reports.at(-1);
      if (createdReport) setSelectedReportId(createdReport.id);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setToast({ message: 'Financial report created successfully.', type: 'success' });
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to create report.', type: 'error' });
    },
  });

  const removeReportMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.removeReport(projectId, taskId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      const title = reportToDelete?.title || 'Financial Report';
      setReportToDelete(null);
      setToast({ message: `Report "${title}" deleted successfully.`, type: 'success' });
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to delete report.', type: 'error' });
    },
  });

  const extractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.extractReport(projectId, taskId, reportId),
    onMutate: (reportId) => setSelectedReportId(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Extraction failed.', type: 'error' });
    },
  });

  const reExtractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.reExtractReport(projectId, taskId, reportId),
    onMutate: (reportId) => setSelectedReportId(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Re-extraction failed.', type: 'error' });
    },
  });

  const verifyMetricMutation = useMutation({
    mutationFn: (metricId: string) => financialResearchApi.verifyMetric(projectId, taskId, metricId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to verify metric.', type: 'error' });
    },
  });

  const addMetricMutation = useMutation({
    mutationFn: (data: CreateFinancialMetricRequest) => financialResearchApi.addMetric(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setIsAddMetricModalOpen(false);
      setToast({ message: 'Manual financial metric added successfully.', type: 'success' });
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to add manual metric.', type: 'error' });
    },
  });

  const updateMetricMutation = useMutation({
    mutationFn: ({ metricId, data }: { metricId: string; data: UpdateFinancialMetricRequest }) =>
      financialResearchApi.updateMetric(projectId, taskId, metricId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setEditingMetric(null);
      setToast({ message: 'Financial metric updated successfully.', type: 'success' });
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to update metric.', type: 'error' });
    },
  });

  const submitTaskMutation = useMutation({
    mutationFn: () => financialResearchApi.submitResearch(
      projectId,
      taskId,
      research!.id,
      selectedReportIdsForSubmission,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setToast({ message: 'Financial research submitted to manager.', type: 'success' });
      onSubmitSuccess?.();
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to submit research.', type: 'error' });
    },
  });

  const canRecall = Boolean(
    research?.canRecallSubmission ?? (
      isSubmitted &&
      research?.status === 'SUBMITTED' &&
      reports.filter(r => (research?.submittedReportIds && research.submittedReportIds.length > 0 ? research.submittedReportIds.includes(r.id) : true))
             .every(r => r.reviewStatus !== 'APPROVED' && r.reviewStatus !== 'CHANGES_REQUESTED')
    )
  );

  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);

  const recallMutation = useMutation({
    mutationFn: () => financialResearchApi.recallSubmission(projectId, taskId),
    onSuccess: () => {
      setIsRecallModalOpen(false);
      setSelectedReportIdsForSubmission([]);
      setSubmissionSelectionTouched(false);
      setToast({ message: 'Submission recalled successfully. You can now edit and resubmit.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-task-submissions', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onRecallSuccess?.();
      onRefreshWorkbench?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to recall submission.';
      setToast({ message: msg, type: 'error' });
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setIsRecallModalOpen(false);
    },
  });

  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');

  const reviewReportMutation = useMutation({
    mutationFn: ({ reportId, status, reason }: { reportId: string; status: 'APPROVED' | 'CHANGES_REQUESTED'; reason?: string }) =>
      financialResearchApi.reviewReport(projectId, taskId, reportId, status, reason),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      setIsRequestChangesModalOpen(false);
      setChangesReason('');
      const actionLabel = vars.status === 'APPROVED' ? 'approved' : 'returned for changes';
      setToast({ message: `Report ${actionLabel} successfully.`, type: 'success' });

      const allAppr = res.data.reports.every(r => r.reviewStatus === 'APPROVED');
      if (allAppr) {
        onReviewed?.('All financial reports approved. Task completed.', true);
      } else if (vars.status === 'CHANGES_REQUESTED') {
        onReviewed?.('Report returned to staff for changes.', true);
      }
    },
    onError: (err: any) => {
      setToast({ message: err?.response?.data?.message || 'Failed to review report.', type: 'error' });
    },
  });

  const handleApproveAllReports = async () => {
    const unapproved = reports.filter(r => r.reviewStatus !== 'APPROVED');
    for (const r of unapproved) {
      await financialResearchApi.reviewReport(projectId, taskId, r.id, 'APPROVED');
    }
    queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
    setToast({ message: `All ${unapproved.length} reports approved successfully.`, type: 'success' });
    onReviewed?.('All financial reports approved. Task completed.', true);
  };

  const handleExtract = (reportId: string) => {
    const report = reports.find(item => item.id === reportId);
    if (!report || isReadOnly || report.reviewStatus === 'APPROVED') return;
    if (isReportExtracted(report)) {
      reExtractMutation.mutate(reportId);
      return;
    }
    extractMutation.mutate(reportId);
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setSelectedMetricId(null);
    setMetricFilter('ALL');
    setEvidenceOpen(false);
  };

  const handleSelectMetric = (metricId: string) => {
    setSelectedMetricId(metricId);
    setEvidenceOpen(true);
  };

  const handleToggleReportSelection = (reportId: string) => {
    if (!eligibleReportIds.includes(reportId)) return;
    setSubmissionSelectionTouched(true);
    setSelectedReportIdsForSubmission(previous =>
      previous.includes(reportId)
        ? previous.filter(selectedId => selectedId !== reportId)
        : [...previous, reportId],
    );
  };

  const handleViewPdf = (documentId: string) => {
    window.open(`${API_BASE_URL}/projects/${projectId}/documents/${encodeURIComponent(documentId)}/download?download=false`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return <div className={styles.stateMessage}>Loading financial research...</div>;
  }

  if (isError) {
    return <div className={styles.stateMessage}>{error instanceof Error ? error.message : 'Cannot load financial research.'}</div>;
  }

  if (!research) {
    return <div className={styles.stateMessage}>Research not found.</div>;
  }

  const effectiveCanEdit = isManagerMode ? false : !isReadOnly;

  return (
    <div className={styles.workbench}>
      <FinancialResearchMetaBar
        status={research.status === 'SUBMITTED' ? 'IN_REVIEW' : research.status === 'APPROVED' ? 'DONE' : 'IN_PROGRESS'}
        taskTypeLabel={taskTypeLabel}
        dueDate={dueDate}
        targetCompanyName={targetCompanyName}
        onClose={onClose}
      />

      <div className={styles.mainGrid}>
        <FinancialReportsPanel
          reports={reports}
          metrics={metrics}
          selectedReportId={selectedReportId}
          canEdit={effectiveCanEdit}
          onCreate={() => setIsCreateModalOpen(true)}
          onSelect={handleSelectReport}
          onExtract={handleExtract}
          onDelete={(reportId) => {
            const r = reports.find(item => item.id === reportId);
            if (r) setReportToDelete(r);
          }}
          onViewPdf={handleViewPdf}
          selectedReportIdsForSubmission={selectedReportIdsForSubmission}
          eligibleReportIds={eligibleReportIds}
          onToggleSelection={handleToggleReportSelection}
        />

        <section className={`${styles.panel} ${styles.rightPanel}`}>
          <div className={styles.rightPanelBody}>
            {!selectedReport ? (
              <FinancialMetricsEmptyState />
            ) : isReportExtracted(selectedReport) ? (
              <ExtractedMetricsPanel
                report={selectedReport}
                metrics={selectedReportMetrics}
                selectedMetricId={selectedMetricId}
                metricFilter={metricFilter}
                evidenceOpen={evidenceOpen}
                verifyingMetricId={verifyMetricMutation.isPending ? verifyMetricMutation.variables ?? null : null}
                onSelectMetric={handleSelectMetric}
                onCloseEvidence={() => setEvidenceOpen(false)}
                onFilterChange={setMetricFilter}
                canEdit={effectiveCanEdit}
                onReExtract={(reportId) => reExtractMutation.mutate(reportId)}
                onVerifyMetric={(metricId) => verifyMetricMutation.mutate(metricId)}
                onEditMetric={(metric) => setEditingMetric(metric)}
                onAddManualMetric={() => setIsAddMetricModalOpen(true)}
                onViewPdf={handleViewPdf}
              />
            ) : (
              <SelectedReportSummary
                report={selectedReport}
                metricsCount={selectedReportMetrics.length}
                canEdit={effectiveCanEdit && selectedReport.reviewStatus !== 'APPROVED'}
                onExtract={handleExtract}
              />
            )}
          </div>
        </section>
      </div>

      {isSubmitted && !isManagerMode && (
        <div className={styles.submittedNotice}>
          <CheckCircle2 size={18} />
          <span>This financial research package is currently {formatStatus(research.status)}.</span>
        </div>
      )}

      {isManagerMode ? (
        <ManagerReviewSummaryBar
          selectedReport={selectedReport}
          reports={reports}
          isRecalled={research.status !== 'SUBMITTED'}
          onApprove={(reportId) => reviewReportMutation.mutate({ reportId, status: 'APPROVED' })}
          onRequestChanges={() => setIsRequestChangesModalOpen(true)}
          onApproveAll={handleApproveAllReports}
          isProcessing={reviewReportMutation.isPending}
        />
      ) : (
        <FinancialPackageSummary
          counts={counts}
          allApproved={allApproved}
          disabled={isReadOnly || !canSubmit}
          submitting={submitTaskMutation.isPending}
          submitted={isSubmitted}
          canRecall={canRecall}
          onRecall={() => setIsRecallModalOpen(true)}
          recalling={recallMutation.isPending}
          onSubmit={() => submitTaskMutation.mutate()}
        />
      )}

      <AddFinancialReportModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data, file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('taskId', String(taskId));

          const res = await api.post<UploadedDocumentResponse>(`/projects/${projectId}/documents/upload`, formData);
          const documentId = res.data?.rawDocumentId || res.data?.id;

          if (!documentId) {
            throw new Error('Upload succeeded, but the uploaded document ID was not returned.');
          }

          await addReportMutation.mutateAsync({
            ...data,
            documentId,
          });
        }}
      />

      <AddManualMetricModal
        open={isAddMetricModalOpen}
        report={selectedReport}
        onClose={() => setIsAddMetricModalOpen(false)}
        onSave={async (data) => {
          await addMetricMutation.mutateAsync(data);
        }}
        isSaving={addMetricMutation.isPending}
      />

      <EditFinancialMetricModal
        open={Boolean(editingMetric)}
        metric={editingMetric}
        onClose={() => setEditingMetric(null)}
        onSave={async (metricId, data) => {
          await updateMetricMutation.mutateAsync({ metricId, data });
        }}
        isSaving={updateMetricMutation.isPending}
      />

      {/* Recall Confirmation Modal */}
      {isRecallModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRecallModalOpen(false)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()} style={{ width: '480px' }}>
            <div className={styles.deleteModalHead}>
              <div className={styles.deleteModalIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Recall Submission?</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Current submission: {(research.submittedReportIds || []).length || counts.selected} report{((research.submittedReportIds || []).length || counts.selected) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <p className={styles.deleteModalText}>
              This submission is currently waiting for Manager review.
            </p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '12.5px',
              color: '#334155',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#0f172a' }}>Recalling it will:</div>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Remove it from the active Manager review queue</li>
                <li>Return the task to <strong>In Progress</strong></li>
                <li>Allow you to edit the financial reports and extracted metrics</li>
                <li>Require you to submit again after making changes</li>
              </ul>
            </div>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsRecallModalOpen(false)}
                disabled={recallMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => recallMutation.mutate()}
                disabled={recallMutation.isPending}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}
              >
                {recallMutation.isPending ? (
                  <>
                    <Loader2 size={14} className={styles.spinIcon} />
                    Recalling...
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Recall Submission
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {isRequestChangesModalOpen && selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setIsRequestChangesModalOpen(false)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()} style={{ width: '500px' }}>
            <div className={styles.deleteModalHead}>
              <div className={styles.deleteModalIcon} style={{ background: '#fff7ed', color: '#ea580c' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Request Changes</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>For {selectedReport.title}</span>
              </div>
            </div>
            <p className={styles.deleteModalText}>
              Provide specific feedback explaining what staff needs to correct or re-extract:
            </p>
            <textarea
              required
              value={changesReason}
              onChange={(e) => setChangesReason(e.target.value)}
              placeholder="e.g. Please verify Q2 Charter Capital or re-extract liabilities..."
              style={{
                width: '100%',
                minHeight: '85px',
                boxSizing: 'border-box',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setIsRequestChangesModalOpen(false);
                  setChangesReason('');
                }}
                disabled={reviewReportMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                style={{ background: '#ea580c' }}
                onClick={() => reviewReportMutation.mutate({
                  reportId: selectedReport.id,
                  status: 'CHANGES_REQUESTED',
                  reason: changesReason.trim(),
                })}
                disabled={!changesReason.trim() || reviewReportMutation.isPending}
              >
                {reviewReportMutation.isPending ? (
                  <>
                    <Loader2 size={14} className={styles.spinIcon} />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className={styles.modalOverlay} onClick={() => setReportToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHead}>
              <div className={styles.deleteModalIcon}>
                <AlertTriangle size={20} />
              </div>
              <h3>Delete Financial Report</h3>
            </div>
            <p className={styles.deleteModalText}>
              Are you sure you want to delete <strong>"{reportToDelete.title}"</strong>? All associated extracted metrics will also be permanently removed.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setReportToDelete(null)}
                disabled={removeReportMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => removeReportMutation.mutate(reportToDelete.id)}
                disabled={removeReportMutation.isPending}
              >
                {removeReportMutation.isPending ? (
                  <>
                    <Loader2 size={14} className={styles.spinIcon} />
                    Deleting...
                  </>
                ) : (
                  'Delete Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={styles.toastCloseBtn}
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
