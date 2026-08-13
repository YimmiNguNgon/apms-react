import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, Send, X as XIcon, Loader2 } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import { taskApi } from '../../API/taskApi';
import type { AiFieldResult, CandidateFieldEvidence, CandidateResponse, FieldApprovalRecord } from '../../types/domain';
import { ManagerReviewFieldCard } from './ManagerReviewFieldCard';
import styles from './CandidateReview.module.css';

interface ManagerCandidateReviewWorkspaceProps {
  projectId: string;
  candidateId: string;
  taskId?: number;
  submissionId?: number;
  onReviewed?: () => void;
  onCancel?: () => void;
  isWorkspaceReadOnly?: boolean;
}

type TabType = 'Overview' | 'Business' | 'SWOT' | 'Analysis';
type ManagerUiStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED';
type EvidenceItem = CandidateFieldEvidence & Record<string, unknown>;

/* ── Toast Layer ── */

interface ToastItem {
  id: number;
  message: string;
  detail?: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

const ToastContainer: React.FC<{ toasts: ToastItem[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return ReactDOM.createPortal(
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${t.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          <div className={styles.toastContent}>
            {t.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <div>
              <div className={styles.toastMessage}>{t.message}</div>
              {t.detail && <div className={styles.toastDetail}>{t.detail}</div>}
            </div>
          </div>
          <button className={styles.toastDismiss} onClick={() => onDismiss(t.id)}><XIcon size={14} /></button>
        </div>
      ))}
    </div>,
    document.body
  );
};

/* ── Field Definitions ── */

const FIELD_DEFS: Record<TabType, Array<{ label: string; key: string }>> = {
  Overview: [
    { label: 'Legal Name', key: 'identity.legalName' },
    { label: 'Trade Name', key: 'identity.tradeName' },
    { label: 'Tax Code', key: 'identity.taxCode' },
    { label: 'Address', key: 'contact.address' },
    { label: 'Website', key: 'contact.website' },
    { label: 'Emails', key: 'contact.emails' },
    { label: 'Phones', key: 'contact.phones' },
  ],
  Business: [
    { label: 'Business Model', key: 'business.businessModel' },
    { label: 'Industries', key: 'business.industries' },
    { label: 'Employee Tier', key: 'companySize.employeeTier' },
    { label: 'Employee Count', key: 'companySize.employeeCount' },
    { label: 'Revenue Tier', key: 'companySize.revenueTier' },
    { label: 'Markets', key: 'business.markets' },
    { label: 'Target Customers', key: 'business.targetCustomers' },
    { label: 'Products & Services', key: 'business.products' },
  ],
  SWOT: [
    { label: 'Strengths', key: 'insights.strengths' },
    { label: 'Weaknesses', key: 'insights.weaknesses' },
    { label: 'Opportunities', key: 'insights.opportunities' },
    { label: 'Threats', key: 'insights.threats' },
  ],
  Analysis: [
    { label: 'Financial', key: 'financial' },
    { label: 'Innovation', key: 'innovation' },
    { label: 'Market Analysis', key: 'market' },
    { label: 'Risk', key: 'risk' },
    { label: 'Compliance', key: 'compliance' },
  ],
};

const tabForFieldKey = (fieldKey: string): TabType | undefined => (
  (Object.keys(FIELD_DEFS) as TabType[]).find(tab => FIELD_DEFS[tab].some(field => field.key === fieldKey))
);

const labelForFieldKey = (fieldKey: string): string => (
  Object.values(FIELD_DEFS).flat().find(field => field.key === fieldKey)?.label || fieldKey
);

/* ── Stats Helper ── */

interface ReviewStats {
  total: number;
  reviewed: number;
  approved: number;
  rejected: number;
  needsReview: number;
  pending: number;
  staffEdited: number;
  lowConfidence: number;
  percentage: number;
  canComplete: boolean;
  canSendBack: boolean;
}

function normalizeManagerStatus(status: unknown): ManagerUiStatus {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'ACCEPTED' || value === 'APPROVED') return 'ACCEPTED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'CHANGES_REQUESTED' || value === 'NEEDS_REVIEW' || value === 'REVISION_REQUIRED') return 'CHANGES_REQUESTED';
  return 'PENDING';
}

const fieldApprovalForKey = (candidate: CandidateResponse | null | undefined, key: string): FieldApprovalRecord | undefined => {
  const approvals = candidate?.fieldApprovals;
  if (!approvals) return undefined;
  if (Array.isArray(approvals)) {
    return approvals.find((record) => record?.fieldPath === key);
  }
  return approvals[key] || approvals[key.replace('.', '_')];
};

const fieldForKey = (fieldResults: Record<string, AiFieldResult> | undefined, key: string): AiFieldResult | undefined => (
  fieldResults?.[key] || fieldResults?.[key.replace('.', '_')]
);

const evidenceMapForKey = (candidate: CandidateResponse | null | undefined, key: string): EvidenceItem[] => {
  const map = candidate?.fieldEvidence;
  if (!map || Array.isArray(map)) return [];
  const items = map[key] || map[key.replace('.', '_')] || [];
  return Array.isArray(items) ? items.filter(Boolean) as EvidenceItem[] : [];
};

const effectiveFieldForKey = (candidate: CandidateResponse | null | undefined, key: string): AiFieldResult | undefined => {
  const field = fieldForKey(candidate?.fieldResults, key);
  const approval = fieldApprovalForKey(candidate, key);
  if (!approval) {
    return field;
  }
  return {
    ...(field || { fieldName: key }),
    managerReviewStatus: normalizeManagerStatus(approval.status),
    managerReviewComment: approval.comment ?? field?.managerReviewComment,
    managerReviewedAt: approval.reviewedAt ?? field?.managerReviewedAt,
    previousManagerReviewStatus: approval.previousStatus ? normalizeManagerStatus(approval.previousStatus) : field?.previousManagerReviewStatus,
    previousManagerReviewComment: approval.previousComment ?? field?.previousManagerReviewComment,
    previousSubmittedValue: approval.pendingValue ?? field?.previousSubmittedValue,
    previousReviewedRevision: approval.reviewedRevision ?? field?.previousReviewedRevision,
    changedInRevision: approval.changedInRevision ?? field?.changedInRevision,
  };
};

function getReviewStats(candidate: CandidateResponse | null | undefined): ReviewStats {
  let total = 0, approved = 0, rejected = 0, needsReview = 0, pending = 0, staffEdited = 0, lowConfidence = 0;
  const allKeys = Object.values(FIELD_DEFS).flat().map(f => f.key);
  for (const key of allKeys) {
    const field = effectiveFieldForKey(candidate, key);
    const status = normalizeManagerStatus(field?.managerReviewStatus);
    total++;
    if (status === 'ACCEPTED') approved++;
    else if (status === 'REJECTED') rejected++;
    else if (status === 'CHANGES_REQUESTED') needsReview++;
    else pending++;

    if (
      field?.staffReviewStatus === 'EDITED'
      || field?.staffReviewStatus === 'ADDED'
      || field?.staffReviewStatus === 'REMOVED'
      || hasReviewedValue(field)
    ) staffEdited++;
    if (field?.confidence && field.confidence < 0.6) lowConfidence++;
  }
  const reviewed = approved + rejected + needsReview;
  return {
    total,
    reviewed,
    approved,
    rejected,
    needsReview,
    pending,
    staffEdited,
    lowConfidence,
    percentage: total > 0 ? Math.round((reviewed / total) * 100) : 0,
    canComplete: pending === 0 && rejected === 0 && needsReview === 0,
    canSendBack: (rejected > 0 || needsReview > 0) && pending === 0,
  };
}

const fieldValueToText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(fieldValueToText).filter(Boolean).join(' ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const evidenceTextOf = (item: EvidenceItem): string => {
  const value = item.evidenceText ?? item.text ?? item.snippet ?? item.extractedText ?? item.content;
  return typeof value === 'string' ? value.trim() : '';
};

const stringField = (item: EvidenceItem, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const numberField = (item: EvidenceItem, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
};

const evidenceForField = (candidate: CandidateResponse | null | undefined, key: string): EvidenceItem[] => {
  const field = effectiveFieldForKey(candidate, key);
  const fieldEvidence = evidenceMapForKey(candidate, key);
  const sourceIds = Array.isArray(field?.sourceDocumentIds) ? field.sourceDocumentIds : [];
  const baseEvidence: EvidenceItem[] = fieldEvidence.length > 0
    ? fieldEvidence
    : sourceIds.map(rawDocumentId => ({ rawDocumentId }));

  const evidenceText = typeof field?.evidenceText === 'string' ? field.evidenceText.trim() : '';
  const fieldEvidenceItems = Array.isArray(field?.evidence) ? field.evidence.filter(Boolean) as EvidenceItem[] : [];
  const merged = [
    ...baseEvidence.map(item => ({
      ...item,
      evidenceText: evidenceTextOf(item) || evidenceText || undefined,
      pageNumber: numberField(item, ['pageNumber', 'page']) ?? field?.pageNumber,
      confidence: numberField(item, ['confidence']) ?? field?.confidence,
    })),
    ...fieldEvidenceItems,
  ];

  if (merged.length === 0 && evidenceText) {
    merged.push({
      evidenceText,
      pageNumber: field?.pageNumber,
      confidence: field?.confidence,
    });
  }

  const seen = new Set<string>();
  return merged.filter(item => {
    const fingerprint = [
      stringField(item, ['rawDocumentId', 'documentId', 'sourceDocumentId', 'fileName', 'documentName']) || '',
      numberField(item, ['pageNumber', 'page']) ?? '',
      evidenceTextOf(item),
    ].join('|');
    if (!fingerprint.trim() || seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
};

const hasReviewedValue = (field: any): boolean => (
  field?.reviewedValue !== undefined || field?.staffReviewedValue !== undefined
);

const getEffectiveReviewedValue = (field: any): unknown => {
  if (!field) return undefined;
  if (field.reviewedValue !== undefined) return field.reviewedValue;
  if (field.staffReviewedValue !== undefined) return field.staffReviewedValue;
  return field.value;
};

/* ── Component ── */

export const ManagerCandidateReviewWorkspace: React.FC<ManagerCandidateReviewWorkspaceProps> = ({
  projectId,
  candidateId,
  taskId,
  submissionId,
  onReviewed,
  onCancel,
  isWorkspaceReadOnly,
}) => {
  const [serverCandidate, setServerCandidate] = useState<CandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [completingReview, setCompletingReview] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ── Toast helpers ──
  const addToast = useCallback((message: string, detail?: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, detail, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const invalidateFinalApprovalState = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
    queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
    queryClient.invalidateQueries({ queryKey: ['managerReviewQueue'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['companyProfiles'] });
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: ['taskSubmissions', Number(projectId), taskId] });
      queryClient.invalidateQueries({ queryKey: ['projectTaskSubmissions', Number(projectId), taskId] });
    }
  }, [candidateId, projectId, queryClient, taskId]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    try {
      const res = await candidateApi.getCandidateById(candidateId);
      if (res?.data) {
        setServerCandidate(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats (reactive to serverCandidate) ──
  const stats = useMemo(() => getReviewStats(serverCandidate), [serverCandidate]);

  // ── Field Decision Handler (returns Promise for per-field loading) ──
  const handleFieldDecision = useCallback(async (
    dotKey: string,
    decision: 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comment?: string,
    fieldLabel?: string
  ) => {
    const res = await candidateApi.reviewCandidateFields(projectId, candidateId, {
      [dotKey]: {
        managerReviewStatus: decision === 'CHANGES_REQUESTED' ? 'NEEDS_REVIEW' : decision,
        managerReviewComment: comment,
        isManager: true,
        manager: true
      }
    });

    // Update from backend response (source of truth)
    if (res?.data) {
      setServerCandidate(res.data);
    }

    // Invalidate queries for consistency
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });

    // Toast
    const name = fieldLabel || dotKey;
    if (decision === 'ACCEPTED') {
      addToast('Field approved', `${name} has been approved successfully.`);
    } else if (decision === 'REJECTED') {
      addToast('Field rejected', `${name} has been marked for revision.`);
    } else {
      addToast('Review requested', `${name} has been flagged for further review.`);
    }
  }, [projectId, candidateId, queryClient, addToast]);

  // ── Complete Review ──
  const handleCompleteReview = useCallback(async () => {
    if (!stats.canComplete || completingReview) return;
    setCompletingReview(true);
    try {
      if (submissionId && taskId) {
        await taskApi.reviewSubmission(Number(projectId), taskId, submissionId, {
          decision: 'APPROVE',
          comment: 'Candidate approved and Company Profile created.'
        });
      } else {
        await candidateApi.approveCandidateWorkflow(candidateId, 'Candidate approved and Company Profile created.');
      }
      const refreshed = await candidateApi.getCandidateById(candidateId);
      if (refreshed?.data) {
        setServerCandidate(refreshed.data);
      }
      addToast('Candidate approved', 'Official Company Profile created and the task moved to Done.');
      invalidateFinalApprovalState();
      if (onReviewed) onReviewed();
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Please try again.';
      const blockingMatch = /Field\s+([A-Za-z0-9_.]+)\s+is\s+(PENDING_REVIEW|REVISION_REQUIRED|STALE)/.exec(detail);
      if (blockingMatch) {
        const fieldKey = blockingMatch[1];
        const tab = tabForFieldKey(fieldKey);
        const label = labelForFieldKey(fieldKey);
        addToast('Cannot approve candidate yet', `${label} still needs a manager decision.`, 'error');
        await fetchData();
        if (tab) {
          setActiveTab(tab);
          window.setTimeout(() => {
            const el = document.getElementById(`field-${fieldKey}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setHighlightedField(fieldKey);
              window.setTimeout(() => setHighlightedField((current) => current === fieldKey ? null : current), 1800);
            }
          }, 120);
        }
      } else {
        addToast('Unable to complete review', detail, 'error');
      }
    } finally {
      setCompletingReview(false);
    }
  }, [stats.canComplete, completingReview, projectId, candidateId, taskId, submissionId, addToast, onReviewed, fetchData, invalidateFinalApprovalState]);

  // ── Send Back ──
  const handleSendBack = useCallback(async () => {
    if (sendingBack) return;
    setSendingBack(true);
    try {
      if (submissionId && taskId) {
        await taskApi.reviewSubmission(Number(projectId), taskId, submissionId, {
          decision: 'REJECT',
          comment: 'Some fields require revision.'
        });
      } else {
        await candidateApi.rejectCandidateWorkflow(candidateId, 'Some fields require revision.');
      }
      addToast('Candidate sent back', 'The candidate has been returned to Staff for revision.');
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      }
      if (onReviewed) onReviewed();
    } catch (err: any) {
      addToast('Unable to send back', err?.message || 'Please try again.', 'error');
    } finally {
      setSendingBack(false);
    }
  }, [sendingBack, projectId, candidateId, taskId, submissionId, queryClient, addToast, onReviewed]);

  // ── Next Pending ──
  const handleNextPending = useCallback(() => {
    const tabs: TabType[] = ['Overview', 'Business', 'SWOT', 'Analysis'];
    for (const tab of tabs) {
      const pendingFields = FIELD_DEFS[tab].filter(f => {
        const field = effectiveFieldForKey(serverCandidate, f.key);
        return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
      });
      if (pendingFields.length > 0) {
        const nextField = pendingFields[0].key;
        const scrollToField = () => {
          const el = document.getElementById(`field-${nextField}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedField(nextField);
            window.setTimeout(() => setHighlightedField((current) => current === nextField ? null : current), 1600);
          }
        };

        if (activeTab !== tab) {
          setActiveTab(tab);
          setTimeout(scrollToField, 100);
        } else {
          scrollToField();
        }
        return;
      }
    }
    addToast('All Done', 'No pending fields remaining.', 'success');
  }, [activeTab, serverCandidate, addToast]);

  // ── Tab Content ──
  const renderTabContent = () => {
    if (!serverCandidate) return null;

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const fields = FIELD_DEFS[activeTab]
      .filter(f => {
        const field = effectiveFieldForKey(serverCandidate, f.key);
        const currentValue = getEffectiveReviewedValue(field);
        const matchesSearch = !normalizedSearch || `${f.label} ${fieldValueToText(currentValue)}`.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
        return true;
      });

    if (fields.length === 0) {
      return (
        <div className={styles.emptyTab}>
          No fields match the current search.
        </div>
      );
    }

    const cards = fields.map(f => {
      const evidenceItems = evidenceForField(serverCandidate, f.key);
      return (
        <div key={f.key} id={`field-${f.key}`} className={styles.managerFieldGridItem}>
          <ManagerReviewFieldCard
            label={f.label}
            fieldKey={f.key}
            fieldResult={effectiveFieldForKey(serverCandidate, f.key)}
            evidenceItems={evidenceItems}
            onDecision={async (decision, comment) => {
              await handleFieldDecision(f.key, decision, comment, f.label);
            }}
            disabled={isWorkspaceReadOnly}
            highlighted={highlightedField === f.key}
          />
        </div>
      );
    });

    return <div className={styles.managerFieldGrid}>{cards}</div>;
  };

  // ── Loading state ──
  if (loading || !serverCandidate) {
    const skeletonContent = (
      <div className={styles.workspace} style={{ padding: 24, height: '100%' }}>
        <div className={styles.skeletonHeader} style={{ height: 60, background: '#e2e8f0', borderRadius: 8, marginBottom: 20 }} />
        <div className={styles.skeletonBody} style={{ height: 400, background: '#f1f5f9', borderRadius: 8 }} />
      </div>
    );
    return ReactDOM.createPortal(
      <div className={styles.managerReviewBackdrop} onClick={onCancel}>
        <div className={styles.managerReviewModal} onClick={(e) => e.stopPropagation()}>
          {skeletonContent}
        </div>
      </div>,
      document.body
    );
  }

  // ── Sidebar status message ──
  let sidebarMessage: React.ReactNode = null;
  if (stats.pending > 0) {
    sidebarMessage = (
      <div className={styles.sidebarInfoBanner}>
        {stats.pending} field{stats.pending !== 1 ? 's' : ''} still need{stats.pending === 1 ? 's' : ''} a decision.
      </div>
    );
  } else if (stats.rejected > 0 || stats.needsReview > 0) {
    sidebarMessage = (
      <div className={styles.sidebarWarnBanner}>
        {stats.rejected + stats.needsReview} field{stats.rejected + stats.needsReview !== 1 ? 's' : ''} require{stats.rejected + stats.needsReview === 1 ? 's' : ''} Staff attention.
      </div>
    );
  } else if (stats.canComplete) {
    sidebarMessage = (
      <div className={styles.sidebarSuccessBanner}>
        <CheckCircle size={14} /> All required fields approved.
      </div>
    );
  }

  const workspaceContent = (
    <div className={styles.workspace}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className={styles.managerReviewHeader}>
        <div className={styles.headerInfo}>
          <div className={styles.candidateEyebrow}>REVIEW CANDIDATE</div>
          <h2 className={styles.managerReviewTitle}>
            {serverCandidate.identity?.legalName || 'Unknown Company'}
          </h2>
          <div className={styles.managerReviewMeta}>
            <span className={styles.managerReviewStatus}>
              In Review
            </span>
            <span>Round {serverCandidate.revisionNumber || 1}</span>
            <span>{stats.total} fields</span>
            <span>{stats.reviewed}/{stats.total} reviewed</span>
            <strong>{stats.percentage}%</strong>
          </div>
        </div>
        <button
          className={styles.closeButton}
          onClick={onCancel}
          aria-label="Close review workspace"
        >
          <XIcon size={24} />
        </button>
      </div>

      {/* Main Layout */}
      <div className={styles.layoutContainer}>
        {/* Left Column */}
        <div className={styles.mainContent}>
          <div className={styles.tabsContainer}>
            {(['Overview', 'Business', 'SWOT', 'Analysis'] as TabType[]).map(tab => {
              const tabPending = FIELD_DEFS[tab].filter(f => {
                const field = effectiveFieldForKey(serverCandidate, f.key);
                return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
              }).length;
              return (
                <button
                  key={tab}
                  className={`${styles.tab} ${styles.managerTab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  <span className={styles.tabCount}>{FIELD_DEFS[tab].length}</span>
                  {tabPending > 0 && <span className={styles.tabIssueDot}>{tabPending} pending</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.quickFilterBar}>
            <div>
              <span>Review Fields</span>
              <small>{stats.reviewed} / {stats.total} reviewed</small>
            </div>
            <label className={styles.fieldSearch}>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fields..."
              />
            </label>
          </div>
          
          <div className={styles.tabContent}>
            {renderTabContent()}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.managerReviewPanel}>
            <h3>Review Progress</h3>

            {/* Progress bar */}
            <div className={styles.progressBarWrap}>
              <div className={styles.managerProgressLabels}>
                <span>{stats.reviewed} / {stats.total} reviewed</span>
                <span>{stats.percentage}%</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className={styles.managerStatsList}>
              <div className={styles.managerStatRow}>
                <span className={styles.managerStatApproved}><CheckCircle size={13} /> Approved</span>
                <strong>{stats.approved}</strong>
              </div>
              <div className={styles.managerStatRow}>
                <span className={styles.managerStatRejected}><XCircle size={13} /> Rejected</span>
                <strong>{stats.rejected}</strong>
              </div>

              <div className={styles.managerStatRow}>
                <span className={styles.managerStatPending}>Pending</span>
                <strong>{stats.pending}</strong>
              </div>
            </div>

            {/* Next Pending */}
            {stats.pending > 0 && !isWorkspaceReadOnly && (
              <div className={styles.managerNextPending}>
                <button onClick={handleNextPending}>
                  Next pending field &rarr;
                </button>
              </div>
            )}

            {/* Status Message */}
            <div className={styles.managerSubmissionStatus}>
              {sidebarMessage}
            </div>

            {/* Actions */}
            {!isWorkspaceReadOnly && (
              <div className={styles.managerSidebarActions}>
                {stats.canComplete && (
                  <button
                    className={styles.btnCompleteReview}
                    onClick={handleCompleteReview}
                    disabled={completingReview}
                  >
                    {completingReview ? (
                      <><Loader2 size={16} className={styles.spin} /> Approving&hellip;</>
                    ) : (
                      <><CheckCircle size={16} /> Approve Candidate</>
                    )}
                  </button>
                )}

                {!stats.canComplete && stats.pending === 0 && (stats.rejected > 0 || stats.needsReview > 0) && (
                  <button
                    className={styles.btnSendBack}
                    onClick={handleSendBack}
                    disabled={sendingBack}
                  >
                    {sendingBack ? (
                      <><Loader2 size={16} className={styles.spin} /> Sending&hellip;</>
                    ) : (
                      <><Send size={16} /> Send Back to Staff</>
                    )}
                  </button>
                )}

                {stats.pending > 0 && (
                  <button
                    className={styles.btnCompleteDisabled}
                    disabled
                    title={`${stats.pending} fields still need a decision`}
                  >
                    <CheckCircle size={16} /> Approve Candidate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );

  return ReactDOM.createPortal(
    <div className={styles.managerReviewBackdrop} onClick={onCancel}>
      <div className={styles.managerReviewModal} onClick={(e) => e.stopPropagation()}>
        {workspaceContent}
      </div>
    </div>,
    document.body
  );
};
