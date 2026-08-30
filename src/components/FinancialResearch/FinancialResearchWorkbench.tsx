import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSearch,
  FileText,
  Plus,
  Sparkles,
} from 'lucide-react';
import { financialResearchApi } from '../../API/financialResearchApi';
import { API_BASE_URL, api } from '../../services/api';
import type {
  FinancialMetricResponse,
  FinancialReportEntry,
  FinancialResearchStatus,
  TaskStatus,
} from '../../types/domain';
import CreateFinancialReportModal from './CreateFinancialReportModal';
import ExtractionProgressBar from './ExtractionProgressBar';
import FinancialReportCard from './FinancialReportCard';
import styles from '../../pages/ProjectDetailPage.module.css';

const STEPS = ['Sources', 'AI Extraction', 'Review Metrics', 'Submit'];

type FinancialResearchWorkbenchProps = {
  projectId: number;
  taskId: number;
  taskTitle?: string | null;
  taskStatus?: TaskStatus | string | null;
  taskTypeLabel?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  canEdit?: boolean;
  documents?: unknown[];
  uploadingDocument?: boolean;
  onUploadDocument?: (file: File) => Promise<unknown> | unknown;
  onRefreshWorkbench?: () => void;
  onSubmitSuccess?: () => void;
};

type PackageCounts = {
  reports: number;
  extracted: number;
  metrics: number;
  needsReview: number;
};

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
  const parts = [period.period, period.periodType?.replace(/_/g, ' '), period.year].filter(Boolean);
  if (period.asOfDate) parts.push(`as of ${formatDate(period.asOfDate)}`);
  return parts.join(' - ') || 'Not specified';
};

const formatStatus = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : 'Draft';

const getWorkflowStep = (
  status: FinancialResearchStatus,
  reports: FinancialReportEntry[],
  metrics: FinancialMetricResponse[],
) => {
  if (status === 'SUBMITTED' || status === 'APPROVED') return 3;
  if (metrics.length > 0 || reports.some(isReportExtracted)) return 2;
  if (reports.length > 0) return 1;
  return 0;
};

function FinancialResearchHeader({
  status,
  taskTypeLabel,
  dueDate,
  targetCompanyName,
}: {
  status?: string | null;
  taskTypeLabel?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
}) {
  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Financial Research</span>
        <h2>Research Financial Information</h2>
      </div>
      <div className={styles.headerSummary} aria-label="Financial research task summary">
        <div>
          <span>Status</span>
          <strong>{formatStatus(status)}</strong>
        </div>
        <div>
          <span>Task type</span>
          <strong>{taskTypeLabel || 'Financial research'}</strong>
        </div>
        <div>
          <span>Due date</span>
          <strong>{formatDate(dueDate)}</strong>
        </div>
        <div>
          <span>Target company</span>
          <strong>{targetCompanyName || 'No target'}</strong>
        </div>
      </div>
    </header>
  );
}

function FinancialResearchStepper({ activeStep }: { activeStep: number }) {
  return (
    <nav className={styles.stepper} aria-label="Financial research workflow">
      {STEPS.map((step, index) => {
        const stateClass = index < activeStep
          ? styles.stepDone
          : index === activeStep
            ? styles.stepActive
            : '';
        return (
          <div className={`${styles.step} ${stateClass}`} key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        );
      })}
    </nav>
  );
}

function FinancialReportsEmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className={styles.emptyCard}>
      <div className={styles.emptyIcon}>
        <FileSearch size={30} />
      </div>
      <h3>No financial reports yet</h3>
      <p>Create your first financial report to begin this research task.</p>
      <button className={styles.primaryButton} type="button" onClick={onCreate} disabled={disabled}>
        <Plus size={16} />
        Create Financial Report
      </button>
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
    <div className={styles.selectedReport}>
      <div className={styles.selectedReportHead}>
        <div>
          <span className={styles.eyebrow}>Selected report</span>
          <h3>{report.title}</h3>
        </div>
        <span className={styles.statusBadge}>
          {isExtracting ? 'Extracting' : isFailed ? 'Extraction failed' : 'Not extracted yet'}
        </span>
      </div>

      <dl className={styles.reportMetaGrid}>
        <div>
          <dt>Period</dt>
          <dd>{formatPeriod(report)}</dd>
        </div>
        <div>
          <dt>Publication date</dt>
          <dd>{formatDate(report.publicationDate)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{isExtracting ? 'AI extraction in progress' : isFailed ? 'Failed' : 'Not extracted yet'}</dd>
        </div>
        <div>
          <dt>Metrics</dt>
          <dd>{metricsCount}</dd>
        </div>
      </dl>

      {report.reviewStatus === 'CHANGES_REQUESTED' && (
        <div style={{
          margin: '0 0 16px 0', 
          padding: '16px', 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fde68a', 
          borderLeft: '4px solid #f59e0b', 
          borderRadius: '4px'
        }}>
          <h4 style={{ color: '#b45309', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
            <span style={{ fontSize: '15px' }}>⚠</span> Changes Requested
          </h4>
          <div style={{ color: '#1f2937', fontSize: '14px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Manager Feedback</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '12px' }}>
              {report.reviewComment || 'Manager requested changes to this report.\nNo detailed feedback was provided.'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {report.reviewedByName || 'Manager'} {report.reviewedAt ? `· ${formatDate(report.reviewedAt)}` : ''}
            </div>
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
        <div className={styles.callout}>
          <Sparkles size={18} />
          <span>Run AI extraction to generate financial metrics for this report.</span>
        </div>
      )}

      {isFailed && report.extractionErrorMessage && (
        <div className={styles.errorBox}>{report.extractionErrorMessage}</div>
      )}

      {!isExtracting && (
        <button className={styles.primaryButton} type="button" onClick={() => onExtract(report.id)} disabled={!canEdit}>
          <Sparkles size={16} />
          {isFailed ? 'Retry Extract' : 'Extract Financial Data'}
        </button>
      )}
    </div>
  );
}

function ExtractedMetricsPanel({
  report,
  metrics,
  selectedMetric,
  selectedMetricId,
  onSelectMetric,
  canEdit,
  onReExtract,
}: {
  report: FinancialReportEntry;
  metrics: FinancialMetricResponse[];
  selectedMetric?: FinancialMetricResponse;
  selectedMetricId?: string | null;
  onSelectMetric: (metricId: string) => void;
  canEdit: boolean;
  onReExtract: (reportId: string) => void;
}) {
  const needsReview = metrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW').length;
  const verified = metrics.filter(metric => metric.verificationStatus === 'VERIFIED').length;

  return (
    <div className={styles.metricsPanel}>
      <div className={styles.selectedReportHead}>
        <div>
          <span className={styles.eyebrow}>Extracted metrics</span>
          <h3>{report.title}</h3>
        </div>
      </div>
      
      {report.reviewStatus === 'CHANGES_REQUESTED' && (
        <div style={{
          margin: '0 0 16px 0', 
          padding: '16px', 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fde68a', 
          borderLeft: '4px solid #f59e0b', 
          borderRadius: '4px'
        }}>
          <h4 style={{ color: '#b45309', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
            <span style={{ fontSize: '15px' }}>⚠</span> Changes Requested
          </h4>
          <div style={{ color: '#1f2937', fontSize: '14px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Manager Feedback</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '12px' }}>
              {report.reviewComment || 'Manager requested changes to this report.\nNo detailed feedback was provided.'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {report.reviewedByName || 'Manager'} {report.reviewedAt ? `· ${formatDate(report.reviewedAt)}` : ''}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
        <button className={styles.secondaryButton} type="button" onClick={() => onReExtract(report.id)} disabled={!canEdit}>
          Re-extract
        </button>
      </div>

      <div className={styles.metricsSummary}>
        <div>
          <span>Metrics</span>
          <strong>{metrics.length}</strong>
        </div>
        <div>
          <span>Verified</span>
          <strong>{verified}</strong>
        </div>
        <div>
          <span>Needs review</span>
          <strong>{needsReview}</strong>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className={styles.inlineEmpty}>Extraction completed, but no financial metrics were returned.</div>
      ) : (
        <div className={styles.metricsTableWrap}>
          <table className={styles.metricsTable}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Period</th>
                <th>Quality</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr
                  className={metric.id === selectedMetricId ? styles.metricRowSelected : ''}
                  key={metric.id}
                  onClick={() => onSelectMetric(metric.id)}
                >
                  <td>{metric.label}</td>
                  <td>{[metric.rawValue, metric.rawUnit].filter(Boolean).join(' ') || 'Not captured'}</td>
                  <td>{[metric.period?.period, metric.period?.year].filter(Boolean).join(' ') || 'Not specified'}</td>
                  <td>
                    <span className={metric.qualityStatus === 'NEEDS_REVIEW' ? styles.warningBadge : styles.successBadge}>
                      {metric.qualityStatus === 'NEEDS_REVIEW' ? 'Needs review' : 'Valid'}
                    </span>
                  </td>
                  <td>
                    <span className={metric.verificationStatus === 'VERIFIED' ? styles.successBadge : styles.neutralBadge}>
                      {metric.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <aside className={styles.evidencePanel}>
        <div className={styles.evidenceHeader}>
          <FileText size={17} />
          <strong>Evidence / detail</strong>
        </div>
        {selectedMetric ? (
          <>
            <div className={styles.evidenceMetric}>
              <span>{selectedMetric.label}</span>
              <strong>{[selectedMetric.rawValue, selectedMetric.rawUnit].filter(Boolean).join(' ') || 'Not captured'}</strong>
            </div>
            <p>{selectedMetric.evidence || 'No evidence text was provided for this metric.'}</p>
            <dl className={styles.evidenceMeta}>
              <div>
                <dt>Source</dt>
                <dd>{selectedMetric.source?.documentName || report.title}</dd>
              </div>
              <div>
                <dt>Page</dt>
                <dd>{selectedMetric.source?.page ?? 'Not specified'}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{selectedMetric.confidence != null ? `${Math.round(selectedMetric.confidence * 100)}%` : 'Not provided'}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p>Select a metric row to inspect the source evidence.</p>
        )}
      </aside>
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
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>Financial Reports</h3>
          <p>Create report sources before running AI extraction.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={onCreate} disabled={!canEdit}>
          <Plus size={16} />
          Create Financial Report
        </button>
      </div>

      {reports.length === 0 ? (
        <FinancialReportsEmptyState onCreate={onCreate} disabled={!canEdit} />
      ) : (
        <div className={styles.reportList}>
          {reports.map(report => {
            const reportMetrics = metrics.filter(metric => metric.source?.reportEntryId === report.id);
            const reportNeedsReview = reportMetrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW').length;
            return (
              <FinancialReportCard
                key={report.id}
                report={report}
                metricCount={reportMetrics.length}
                needsReviewCount={reportNeedsReview}
                selected={report.id === selectedReportId}
                canEdit={canEdit}
                onSelect={onSelect}
                onExtract={onExtract}
                onDelete={onDelete}
                onViewPdf={onViewPdf}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function FinancialPackageSummary({
  counts,
  disabled,
  submitting,
  submitted,
  onSubmit,
}: {
  counts: PackageCounts;
  disabled: boolean;
  submitting: boolean;
  submitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <section className={styles.packageSummary}>
      <div className={styles.packageMetrics}>
        <div>
          <span>Reports</span>
          <strong>{counts.reports}</strong>
        </div>
        <div>
          <span>Extracted</span>
          <strong>{counts.extracted}</strong>
        </div>
        <div>
          <span>Metrics</span>
          <strong>{counts.metrics}</strong>
        </div>
        <div>
          <span>Needs Review</span>
          <strong>{counts.needsReview}</strong>
        </div>
      </div>
      <button className={styles.submitButton} type="button" onClick={onSubmit} disabled={disabled || submitted || submitting}>
        {submitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit to Manager'}
      </button>
    </section>
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
  documents: _documents,
  uploadingDocument: _uploadingDocument,
  onUploadDocument: _onUploadDocument,
  onRefreshWorkbench: _onRefreshWorkbench,
  onSubmitSuccess,
}: FinancialResearchWorkbenchProps) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  const { data: researchRes, isLoading, isError, error } = useQuery({
    queryKey: ['financial-research', projectId, taskId],
    queryFn: () => financialResearchApi.getResearch(projectId, taskId),
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      const anyExtracting = (data?.reports || []).some(
        (report: FinancialReportEntry) => report.extractionStatus === 'EXTRACTING',
      );
      return anyExtracting ? 2000 : false;
    },
  });

  const research = researchRes?.data;
  const reports = research?.reports || [];
  const metrics = research?.metrics || [];
  const isSubmitted = research?.status === 'SUBMITTED' || research?.status === 'APPROVED';
  const isReadOnly = !canEdit || isSubmitted;

  const selectedReport = useMemo(
    () => reports.find(report => report.id === selectedReportId) || null,
    [reports, selectedReportId],
  );

  const selectedReportMetrics = useMemo(
    () => selectedReport ? metrics.filter(metric => metric.source?.reportEntryId === selectedReport.id) : [],
    [metrics, selectedReport],
  );

  const selectedMetric = useMemo(
    () => selectedReportMetrics.find(metric => metric.id === selectedMetricId) || selectedReportMetrics[0],
    [selectedMetricId, selectedReportMetrics],
  );

  const counts = useMemo<PackageCounts>(() => ({
    reports: reports.length,
    extracted: reports.filter(isReportExtracted).length,
    metrics: metrics.length,
    needsReview: metrics.filter(metric => metric.qualityStatus === 'NEEDS_REVIEW').length,
  }), [metrics, reports]);

  const activeStep = getWorkflowStep((research?.status || 'DRAFT') as FinancialResearchStatus, reports, metrics);
  const canSubmit = counts.reports > 0 && counts.metrics > 0 && counts.needsReview === 0;

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedReportId(null);
      setSelectedMetricId(null);
      return;
    }
    if (!selectedReportId || !reports.some(report => report.id === selectedReportId)) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (selectedReportMetrics.length === 0) {
      setSelectedMetricId(null);
      return;
    }
    if (!selectedMetricId || !selectedReportMetrics.some(metric => metric.id === selectedMetricId)) {
      setSelectedMetricId(selectedReportMetrics[0].id);
    }
  }, [selectedMetricId, selectedReportMetrics]);

  const addReportMutation = useMutation({
    mutationFn: (data: any) => financialResearchApi.addReport(projectId, taskId, data),
    onSuccess: (res) => {
      const createdReport = res.data.reports.at(-1);
      if (createdReport) setSelectedReportId(createdReport.id);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
    },
  });

  const removeReportMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.removeReport(projectId, taskId, reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
  });

  const extractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.extractReport(projectId, taskId, reportId),
    onMutate: (reportId) => setSelectedReportId(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
  });

  const reExtractMutation = useMutation({
    mutationFn: (reportId: string) => financialResearchApi.reExtractReport(projectId, taskId, reportId),
    onMutate: (reportId) => setSelectedReportId(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] }),
  });

  const submitTaskMutation = useMutation({
    mutationFn: () => financialResearchApi.submitResearch(projectId, taskId, research!.id, []),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-research', projectId, taskId] });
      onSubmitSuccess?.();
    },
  });

  const handleExtract = (reportId: string) => {
    const report = reports.find(item => item.id === reportId);
    if (!report || isReadOnly) return;
    if (isReportExtracted(report)) {
      reExtractMutation.mutate(reportId);
      return;
    }
    extractMutation.mutate(reportId);
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

  return (
    <div className={styles.workbench}>
      <FinancialResearchHeader
        status={taskStatus || research.status}
        taskTypeLabel={taskTypeLabel}
        dueDate={dueDate}
        targetCompanyName={targetCompanyName}
      />

      {taskTitle && <p className={styles.taskTitle}>{taskTitle}</p>}

      <FinancialResearchStepper activeStep={activeStep} />

      <div className={styles.mainGrid}>
        <FinancialReportsPanel
          reports={reports}
          metrics={metrics}
          selectedReportId={selectedReportId}
          canEdit={!isReadOnly}
          onCreate={() => setIsCreateModalOpen(true)}
          onSelect={setSelectedReportId}
          onExtract={handleExtract}
          onDelete={(reportId) => removeReportMutation.mutate(reportId)}
          onViewPdf={handleViewPdf}
        />

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h3>Extracted Metrics</h3>
              <p>{selectedReport ? 'Review metrics for the selected report.' : 'Select or create a report to begin extraction.'}</p>
            </div>
          </div>

          {!selectedReport ? (
            <FinancialMetricsEmptyState />
          ) : isReportExtracted(selectedReport) ? (
            <ExtractedMetricsPanel
              report={selectedReport}
              metrics={selectedReportMetrics}
              selectedMetric={selectedMetric}
              selectedMetricId={selectedMetric?.id}
              onSelectMetric={setSelectedMetricId}
              canEdit={!isReadOnly}
              onReExtract={(reportId) => reExtractMutation.mutate(reportId)}
            />
          ) : (
            <SelectedReportSummary
              report={selectedReport}
              metricsCount={selectedReportMetrics.length}
              canEdit={!isReadOnly}
              onExtract={handleExtract}
            />
          )}
        </section>
      </div>

      {counts.needsReview > 0 && (
        <div className={styles.reviewWarning}>
          <AlertTriangle size={18} />
          <span>{counts.needsReview} metric(s) need review before this package can be submitted.</span>
        </div>
      )}

      {isSubmitted && (
        <div className={styles.submittedNotice}>
          <CheckCircle2 size={18} />
          <span>This financial research package is currently {formatStatus(research.status)}.</span>
        </div>
      )}

      <FinancialPackageSummary
        counts={counts}
        disabled={isReadOnly || !canSubmit}
        submitting={submitTaskMutation.isPending}
        submitted={isSubmitted}
        onSubmit={() => submitTaskMutation.mutate()}
      />

      <CreateFinancialReportModal
        open={isCreateModalOpen}
        submitting={addReportMutation.isPending}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data: any, file: File | null) => {
          const formData = new FormData();
          if (file) {
            formData.append('file', file);
          }
          formData.append('taskId', String(taskId));

          const res = await api.post<any>(`/projects/${projectId}/documents/upload`, formData);
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
    </div>
  );
}
