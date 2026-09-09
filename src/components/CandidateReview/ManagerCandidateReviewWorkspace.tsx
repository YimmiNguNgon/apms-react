import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, Send, X as XIcon, Loader2, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import { taskApi } from '../../API/taskApi';
import type { AiFieldResult, CandidateFieldEvidence, CandidateResponse, FieldApprovalRecord, ProjectTaskSubmissionResponse } from '../../types/domain';
import { CANDIDATE_FIELD_GROUPS, CANDIDATE_TABS, isCandidateFieldEdited, type CandidateCategoryTab } from './candidateFieldDefinitions';
import { ManagerReviewFieldCard } from './ManagerReviewFieldCard';
import { parseEvidenceCitations } from './EvidenceSection';
import styles from './CandidateReview.module.css';

interface ManagerCandidateReviewWorkspaceProps {
  projectId: string;
  candidateId: string;
  taskId?: number;
  submissionId?: number;
  submission?: ProjectTaskSubmissionResponse | null;
  allActiveSubmissions?: ProjectTaskSubmissionResponse[];
  taskDueDate?: string;
  taskTitle?: string;
  sourceDocuments?: Array<{ id: string | number; fileName?: string }>;
  onSelectCandidate?: (candidateId: string) => void;
  onReviewed?: () => void;
  onCancel?: () => void;
  isWorkspaceReadOnly?: boolean;
}

type TabType = CandidateCategoryTab;
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
const FIELD_DEFS = CANDIDATE_FIELD_GROUPS;

const tabForFieldKey = (fieldKey: string): TabType | undefined => (
  (Object.keys(FIELD_DEFS) as TabType[]).find(tab => FIELD_DEFS[tab].some(field => field.key === fieldKey))
);

const labelForFieldKey = (fieldKey: string): string => (
  Object.values(FIELD_DEFS).flat().find(field => field.key === fieldKey)?.label || fieldKey
);

/* ── Date Formatter ── */
function formatReviewDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

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

    const originalValue = field?.value;
    const staffValue = field?.reviewedValue !== undefined ? field.reviewedValue : field?.staffReviewedValue;
    if (isCandidateFieldEdited(originalValue, staffValue)) staffEdited++;
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
    const citations = parseEvidenceCitations(evidenceText, undefined, field?.pageNumber);
    if (citations.length > 0) {
      for (const cit of citations) {
        const pageNum = cit.page ? parseInt(cit.page.replace(/\D+/g, ''), 10) || undefined : field?.pageNumber;
        merged.push({
          fileName: cit.fileName !== 'Source Document' ? cit.fileName : undefined,
          rawDocumentId: cit.docId,
          pageNumber: pageNum,
          evidenceText: cit.quote,
          confidence: field?.confidence,
        });
      }
    } else {
      merged.push({
        evidenceText,
        pageNumber: field?.pageNumber,
        confidence: field?.confidence,
      });
    }
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
  submission,
  allActiveSubmissions,
  taskDueDate,
  taskTitle,
  sourceDocuments,
  onSelectCandidate,
  onReviewed,
  onCancel,
  isWorkspaceReadOnly,
}) => {
  const [serverCandidate, setServerCandidate] = useState<CandidateResponse | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<ProjectTaskSubmissionResponse | null>(submission ?? null);
  const [submissionHistory, setSubmissionHistory] = useState<ProjectTaskSubmissionResponse[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Identity');
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

      if (taskId) {
        try {
          const subRes = await taskApi.getSubmissions(Number(projectId), taskId, { page: 0, size: 20 });
          const subs = 'content' in subRes.data ? subRes.data.content : subRes.data;
          const subList = Array.isArray(subs) ? subs : [];
          setSubmissionHistory(subList);
          if (!currentSubmission && subList.length > 0) {
            const matched = subList.find(s => s.targetEntityId === candidateId && s.status === 'IN_REVIEW')
              || subList.find(s => s.status === 'IN_REVIEW')
              || subList.find(s => s.targetEntityId === candidateId)
              || subList[0];
            if (matched) {
              setCurrentSubmission(matched);
            }
          }
        } catch {
          // ignore error fetching submissions for display
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [candidateId, taskId, projectId, currentSubmission]);

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

  const handleApproveAllInTab = useCallback(async () => {
    if (isWorkspaceReadOnly || !serverCandidate) return;

    const pendingFields = FIELD_DEFS[activeTab].filter(f => {
      const field = effectiveFieldForKey(serverCandidate, f.key);
      return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
    });

    if (pendingFields.length === 0) return;

    const payload: Record<string, any> = {};
    pendingFields.forEach(f => {
      payload[f.key] = {
        managerReviewStatus: 'ACCEPTED',
        managerReviewComment: '',
        isManager: true,
        manager: true
      };
    });

    try {
      const res = await candidateApi.reviewCandidateFields(projectId, candidateId, payload);
      if (res?.data) {
        setServerCandidate(res.data);
      }
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      addToast('Batch Approved', `Approved ${pendingFields.length} fields in ${activeTab}`);
    } catch (e) {
      addToast('Error', 'Could not batch approve fields', 'error');
    }
  }, [isWorkspaceReadOnly, serverCandidate, activeTab, projectId, candidateId, queryClient, addToast]);

  // ── Complete Review ──
  const effectiveSubmissionId = submissionId || currentSubmission?.id;

  const handleCompleteReview = useCallback(async () => {
    if (!stats.canComplete || completingReview) return;
    setCompletingReview(true);
    try {
      if (effectiveSubmissionId && taskId) {
        await taskApi.reviewSubmission(Number(projectId), taskId, effectiveSubmissionId, {
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
  }, [stats.canComplete, completingReview, effectiveSubmissionId, taskId, projectId, candidateId, addToast, invalidateFinalApprovalState, onReviewed, fetchData]);

  // ── Send Back ──
  const handleSendBack = useCallback(async () => {
    if (sendingBack) return;
    setSendingBack(true);
    try {
      if (effectiveSubmissionId && taskId) {
        await taskApi.reviewSubmission(Number(projectId), taskId, effectiveSubmissionId, {
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
  }, [sendingBack, effectiveSubmissionId, taskId, projectId, candidateId, queryClient, addToast, onReviewed]);

  // ── Next Pending ──
  const handleNextPending = useCallback(() => {
    for (const tab of CANDIDATE_TABS) {
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

  // ── Header Information ──
  const draftTitle = serverCandidate.draftName
    || (serverCandidate.draftSequence ? `Draft ${serverCandidate.draftSequence}` : (currentSubmission?.submittedRevisionNumber ? `Draft ${currentSubmission.submittedRevisionNumber}` : 'Draft 1'));
  const roundNumber = currentSubmission?.submittedRevisionNumber || serverCandidate.revisionNumber || 1;
  const submittedBy = currentSubmission?.submittedByName || 'Staff';
  const submittedAt = currentSubmission?.submittedAt || currentSubmission?.createdAt;
  const companyLegalName = serverCandidate.identity?.legalName || 'Unknown Company';

  // Extract source document info if present
  const sourceDocNames: string[] = [];
  if (sourceDocuments && sourceDocuments.length > 0) {
    sourceDocuments.forEach(doc => {
      if (doc.fileName && !sourceDocNames.includes(doc.fileName)) {
        sourceDocNames.push(doc.fileName);
      }
    });
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
          <div className={styles.candidateEyebrowRow}>
            <span className={styles.candidateEyebrow}>REVIEW CANDIDATE</span>
            <span className={styles.taskTitleTag}>• {taskTitle || 'Research Basic Company Information'}</span>
          </div>

          <div className={styles.titleWithDraftRow}>
            <h2 className={styles.managerReviewTitle}>
              {draftTitle}
            </h2>
            {allActiveSubmissions && allActiveSubmissions.length > 1 && onSelectCandidate && (
              <div className={styles.legacyDraftSelector}>
                <label htmlFor="candidate-select">Submitted candidate:</label>
                <select
                  id="candidate-select"
                  value={candidateId}
                  onChange={(e) => onSelectCandidate(e.target.value)}
                >
                  {allActiveSubmissions.map((sub, idx) => (
                    <option key={sub.id} value={sub.targetEntityId || ''}>
                      Draft {sub.submittedRevisionNumber || idx + 1} ({sub.submittedByName || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.managerReviewMeta}>
            <span className={styles.managerReviewStatus}>
              IN REVIEW
            </span>
            <span>•</span>
            <span>Round {roundNumber}</span>
            <span>•</span>
            <span>Submitted by {submittedBy}</span>
            {submittedAt && (
              <>
                <span>•</span>
                <span>{formatReviewDate(submittedAt)}</span>
              </>
            )}
            {taskDueDate && (
              <>
                <span>•</span>
                <span>Due {formatReviewDate(taskDueDate)}</span>
              </>
            )}
          </div>

          <div className={styles.companyNameSubline}>
            Target Company: <strong>{companyLegalName}</strong>
            {sourceDocNames.length > 0 && (
              <span className={styles.sourceDocsInline}>
                • Source: {sourceDocNames.join(', ')}
              </span>
            )}
          </div>
        </div>
        <button
          className={styles.closeButton}
          onClick={onCancel}
          aria-label="Close review workspace"
        >
          <XIcon size={22} />
        </button>
      </div>

      {/* Main Layout */}
      <div className={styles.layoutContainer}>
        {/* Left Column */}
        <div className={styles.mainContent}>
          <div className={styles.tabsContainer}>
            {CANDIDATE_TABS.map(tab => {
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
            {!isWorkspaceReadOnly && (
              <div className={styles.quickFilterActions}>
                <button
                  type="button"
                  className={styles.approveAllBtn}
                  onClick={handleApproveAllInTab}
                  title={`Approve all pending fields in ${activeTab}`}
                >
                  <CheckCheck size={16} /> Approve All
                </button>
              </div>
            )}
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
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${stats.percentage}%` }}
                />
                <span className={styles.progressBarLabel}>{stats.percentage}%</span>
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

            {/* Collapsible submission history (if history exists) */}
            {submissionHistory.length > 0 && (
              <div className={styles.historySection}>
                <button
                  type="button"
                  className={styles.historyToggle}
                  onClick={() => setHistoryOpen(prev => !prev)}
                >
                  {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  View submission history ({submissionHistory.length})
                </button>
                {historyOpen && (
                  <div className={styles.historyTimeline}>
                    {submissionHistory.map((sub) => (
                      <article key={sub.id} className={styles.historyItem}>
                        <div className={styles.historyItemHeader}>
                          <span
                            className={styles.historyItemStatus}
                            style={{
                              backgroundColor: sub.status === 'APPROVED' ? '#dcfce7' : sub.status === 'REJECTED' ? '#fee2e2' : '#dbeafe',
                              color: sub.status === 'APPROVED' ? '#166534' : sub.status === 'REJECTED' ? '#991b1b' : '#1e40af',
                            }}
                          >
                            {sub.status}
                          </span>
                          <span className={styles.historyItemDate}>{formatReviewDate(sub.submittedAt || sub.createdAt)}</span>
                        </div>
                        <div className={styles.historyItemNote}>
                          Round {sub.submittedRevisionNumber || 1} &bull; {sub.submittedByName || 'Staff'}
                        </div>
                        {sub.reviewComment && (
                          <div style={{ marginTop: 4, color: '#64748b', fontStyle: 'italic' }}>
                            Review: &ldquo;{sub.reviewComment}&rdquo;
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
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
