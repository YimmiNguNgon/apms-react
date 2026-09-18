import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle, XCircle, Clock, Send, X as XIcon, Loader2, CheckCheck, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import { taskApi } from '../../API/taskApi';
import type { AiFieldResult, CandidateFieldEvidence, CandidateResponse, FieldApprovalRecord, ProjectTaskSubmissionResponse, ManagerReviewHistoryItem } from '../../types/domain';
import { CANDIDATE_FIELD_GROUPS, CANDIDATE_TABS, isCandidateFieldEdited, isManualCandidate, normalizeCandidateFieldValue, type CandidateCategoryTab } from './candidateFieldDefinitions';
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
  onViewCompanyProfile?: (profileId?: string) => void;
  banner?: React.ReactNode;
  reviewHistoryItem?: ManagerReviewHistoryItem | null;
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

function formatReviewDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
  notProvided: number;
  staffEdited: number;
  lowConfidence: number;
  percentage: number;
  canComplete: boolean;
  canSendBack: boolean;
}

interface SectionReviewSummary {
  tab: TabType;
  totalFields: number;
  submittedCount: number;
  reviewedCount: number;
  pendingCount: number;
  rejectedCount: number;
  complete: boolean;
  hasData: boolean;
}

function normalizeManagerStatus(status: unknown): ManagerUiStatus {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'ACCEPTED' || value === 'APPROVED') return 'ACCEPTED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'CHANGES_REQUESTED' || value === 'NEEDS_REVIEW' || value === 'REVISION_REQUIRED') return 'CHANGES_REQUESTED';
  return 'PENDING';
}

const DOT_TO_FLAT: Record<string, string> = {
  'identity.tradeName': 'tradeName',
  'identity.legalName': 'legalName',
  'identity.taxCode': 'taxCode',
  'contact.address': 'address',
  'contact.website': 'website',
  'contact.emails': 'emails',
  'contact.phones': 'phones',
  'business.businessModel': 'businessModel',
  'business.industries': 'industries',
  'business.markets': 'markets',
  'business.targetCustomers': 'targetCustomers',
  'business.products': 'products',
  'companySize.employeeTier': 'employeeTier',
  'companySize.employeeCount': 'employeeCount',
  'companySize.revenueTier': 'revenueTier',
};

const fieldApprovalForKey = (candidate: CandidateResponse | null | undefined, key: string): FieldApprovalRecord | undefined => {
  const approvals = candidate?.fieldApprovals;
  if (!approvals) return undefined;
  const flatKey = DOT_TO_FLAT[key] || (key.includes('.') ? key.split('.').pop() : undefined);
  if (Array.isArray(approvals)) {
    return approvals.find(a =>
      a.fieldPath === key ||
      a.fieldPath === key.replace('.', '_') ||
      (flatKey && a.fieldPath === flatKey)
    );
  }
  return approvals[key]
    || approvals[key.replace('.', '_')]
    || (flatKey ? approvals[flatKey] : undefined);
};

const fieldForKey = (fieldResults: Record<string, AiFieldResult> | undefined, key: string): AiFieldResult | undefined => {
  if (!fieldResults) return undefined;
  const flatKey = DOT_TO_FLAT[key] || (key.includes('.') ? key.split('.').pop() : undefined);
  return fieldResults[key]
    || fieldResults[key.replace('.', '_')]
    || (flatKey ? fieldResults[flatKey] : undefined);
};

const evidenceMapForKey = (candidate: CandidateResponse | null | undefined, key: string): EvidenceItem[] => {
  const map = candidate?.fieldEvidence;
  if (!map || Array.isArray(map)) return [];
  const items = map[key] || map[key.replace('.', '_')] || [];
  return Array.isArray(items) ? items.filter(Boolean) as EvidenceItem[] : [];
};

const getEffectiveReviewedValue = (field: any): unknown => {
  if (!field) return undefined;
  if (field.reviewedValue !== undefined) return field.reviewedValue;
  if (field.staffReviewedValue !== undefined) return field.staffReviewedValue;
  return field.value;
};

const getCandidateDomainValue = (candidate: CandidateResponse | null | undefined, key: string): unknown => {
  if (!candidate) return undefined;
  const c = candidate as any;
  switch (key) {
    case 'identity.legalName': return c.identity?.legalName ?? c.legalName;
    case 'identity.tradeName': return c.identity?.tradeName ?? c.tradeName;
    case 'identity.taxCode': return c.identity?.taxCode ?? c.identity?.taxId ?? c.taxCode;
    case 'contact.website': return c.contact?.website ?? c.website;
    case 'contact.address': {
      const addrs = c.contact?.addresses ?? c.addresses;
      if (Array.isArray(addrs) && addrs.length > 0) {
        const first = addrs[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object') return first.fullAddress || first.address;
      }
      return c.contact?.address ?? c.address;
    }
    case 'contact.emails': return c.contact?.emails ?? c.emails ?? c.email;
    case 'contact.phones': return c.contact?.phones ?? c.phones ?? c.phone;
    case 'business.businessModel': return c.business?.businessModel ?? c.businessModel;
    case 'business.industries': return c.business?.industries ?? c.industries;
    case 'business.products': return c.business?.products ?? c.products;
    case 'business.markets': return c.business?.markets ?? c.markets;
    case 'business.targetCustomers': return c.business?.targetCustomers ?? c.targetCustomers;
    case 'companySize.employeeTier': return c.companySize?.employeeTier ?? c.employeeTier;
    case 'companySize.employeeCount': return c.companySize?.employeeCount ?? c.employeeCount;
    case 'companySize.revenueTier': return c.companySize?.revenueTier ?? c.revenueTier ?? c.companySize;
    default: return undefined;
  }
};

const effectiveFieldForKey = (candidate: CandidateResponse | null | undefined, key: string): AiFieldResult | undefined => {
  const field = fieldForKey(candidate?.fieldResults, key);
  const approval = fieldApprovalForKey(candidate, key);
  const domainVal = getCandidateDomainValue(candidate, key);

  const rawPending = normalizeCandidateFieldValue(approval?.pendingValue) !== null ? approval?.pendingValue : undefined;
  const rawStaffReviewed = normalizeCandidateFieldValue(field?.staffReviewedValue) !== null ? field?.staffReviewedValue : undefined;
  const rawReviewed = normalizeCandidateFieldValue(field?.reviewedValue) !== null ? field?.reviewedValue : undefined;
  const rawFieldValue = normalizeCandidateFieldValue(field?.value) !== null ? field?.value : undefined;
  const rawDomain = normalizeCandidateFieldValue(domainVal) !== null ? domainVal : undefined;

  const effectiveValue = rawPending ?? rawStaffReviewed ?? rawReviewed ?? rawFieldValue ?? rawDomain;

  if (!approval) {
    if (!field) {
      if (domainVal !== undefined) {
        return {
          fieldName: key,
          value: domainVal,
          staffReviewedValue: domainVal,
          managerReviewStatus: 'PENDING',
        };
      }
      return undefined;
    }
    return {
      ...field,
      value: effectiveValue !== undefined ? effectiveValue : field.value,
      staffReviewedValue: effectiveValue !== undefined ? effectiveValue : field.staffReviewedValue,
    };
  }

  return {
    ...(field || { fieldName: key }),
    value: effectiveValue !== undefined ? effectiveValue : field?.value,
    staffReviewedValue: effectiveValue !== undefined ? effectiveValue : field?.staffReviewedValue,
    managerReviewStatus: normalizeManagerStatus(approval.status),
    managerReviewComment: approval.comment ?? field?.managerReviewComment,
    managerReviewedAt: approval.reviewedAt ?? field?.managerReviewedAt,
    reviewedRevision: approval.reviewedRevision ?? field?.reviewedRevision,
    previousManagerReviewStatus: approval.previousStatus ? normalizeManagerStatus(approval.previousStatus) : field?.previousManagerReviewStatus,
    previousManagerReviewComment: approval.previousComment ?? field?.previousManagerReviewComment,
    previousSubmittedValue: approval.pendingValue ?? field?.previousSubmittedValue,
    previousReviewedRevision: approval.previousReviewedRevision ?? field?.previousReviewedRevision,
    changedInRevision: approval.changedInRevision ?? field?.changedInRevision,
  };
};

const isCandidateFieldProvided = (candidate: CandidateResponse | null | undefined, key: string): boolean => {
  if (!candidate) return false;
  const approval = fieldApprovalForKey(candidate, key);
  if (approval && approval.status && approval.status !== 'STALE' && approval.status !== 'PENDING_REVIEW') {
    return true;
  }
  if (approval && normalizeCandidateFieldValue(approval.pendingValue) !== null) {
    return true;
  }
  const field = effectiveFieldForKey(candidate, key);
  const effectiveVal = getEffectiveReviewedValue(field);
  if (normalizeCandidateFieldValue(effectiveVal) !== null) {
    return true;
  }
  const domainVal = getCandidateDomainValue(candidate, key);
  return normalizeCandidateFieldValue(domainVal) !== null;
};

function getReviewStats(candidate: CandidateResponse | null | undefined): ReviewStats {
  const isManual = isManualCandidate(candidate);
  let total = 0, approved = 0, rejected = 0, needsReview = 0, pending = 0, notProvided = 0, staffEdited = 0, lowConfidence = 0;
  const allKeys = Object.values(FIELD_DEFS).flat().map(f => f.key);
  for (const key of allKeys) {
    const isProvided = !isManual || isCandidateFieldProvided(candidate, key);
    if (isManual && !isProvided) {
      notProvided++;
      continue;
    }

    const field = effectiveFieldForKey(candidate, key);
    const status = normalizeManagerStatus(field?.managerReviewStatus);
    total++;
    if (status === 'ACCEPTED') approved++;
    else if (status === 'REJECTED') rejected++;
    else if (status === 'CHANGES_REQUESTED') needsReview++;
    else pending++;

    if (!isManual) {
      const originalValue = field?.value;
      const staffValue = field?.reviewedValue !== undefined ? field.reviewedValue : field?.staffReviewedValue;
      if (isCandidateFieldEdited(originalValue, staffValue)) staffEdited++;
      if (field?.confidence && field.confidence < 0.6) lowConfidence++;
    }
  }
  const reviewed = approved + rejected + needsReview;
  return {
    total,
    reviewed,
    approved,
    rejected,
    needsReview,
    pending,
    notProvided,
    staffEdited,
    lowConfidence,
    percentage: total > 0 ? Math.round((reviewed / total) * 100) : 0,
    canComplete: total > 0 && pending === 0 && rejected === 0 && needsReview === 0,
    canSendBack: (total === 0 || rejected > 0 || needsReview > 0) && pending === 0,
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
  onViewCompanyProfile,
  banner,
  reviewHistoryItem,
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

  const isManual = isManualCandidate(serverCandidate);

  const isReadOnly = Boolean(
    isWorkspaceReadOnly ||
    serverCandidate?.status === 'APPROVED' ||
    serverCandidate?.status === 'REJECTED' ||
    currentSubmission?.status === 'APPROVED' ||
    currentSubmission?.status === 'APPLIED'
  );

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
            const matched = (submissionId ? subList.find(s => s.id === submissionId) : null)
              || subList.find(s => s.targetEntityId === candidateId && s.status === 'IN_REVIEW')
              || subList.find(s => s.targetEntityId === candidateId)
              || subList.find(s => s.status === 'IN_REVIEW')
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
  }, [candidateId, taskId, projectId, currentSubmission, submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats (reactive to serverCandidate) ──
  const stats = useMemo(() => getReviewStats(serverCandidate), [serverCandidate]);

  const sectionSummaries = useMemo<Record<TabType, SectionReviewSummary>>(() => {
    const map = {} as Record<TabType, SectionReviewSummary>;
    for (const tab of CANDIDATE_TABS) {
      const tabFields = FIELD_DEFS[tab];
      const submittedFields = tabFields.filter(f => !isManual || isCandidateFieldProvided(serverCandidate, f.key));
      let pendingCount = 0;
      let reviewedCount = 0;
      let rejectedCount = 0;

      for (const f of submittedFields) {
        const field = effectiveFieldForKey(serverCandidate, f.key);
        const status = normalizeManagerStatus(field?.managerReviewStatus);
        if (status === 'PENDING') {
          pendingCount++;
        } else {
          reviewedCount++;
          if (status === 'REJECTED' || status === 'CHANGES_REQUESTED') {
            rejectedCount++;
          }
        }
      }

      const submittedCount = submittedFields.length;
      map[tab] = {
        tab,
        totalFields: tabFields.length,
        submittedCount,
        reviewedCount,
        pendingCount,
        rejectedCount,
        complete: submittedCount > 0 && reviewedCount === submittedCount,
        hasData: submittedCount > 0,
      };
    }
    return map;
  }, [serverCandidate, isManual]);

  const isActiveManagerReview =
    serverCandidate?.status === 'PENDING_REVIEW' ||
    serverCandidate?.status === 'CORRECTED';
  const isEffectiveReadOnly = Boolean(isWorkspaceReadOnly) || !isActiveManagerReview;

  // ── Field Decision Handler (returns Promise for per-field loading) ──
  const handleFieldDecision = useCallback(async (
    dotKey: string,
    decision: 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING',
    comment?: string,
    fieldLabel?: string
  ) => {
    const res = await candidateApi.reviewCandidateFields(projectId, candidateId, {
      [dotKey]: {
        managerReviewStatus: decision === 'CHANGES_REQUESTED' ? 'NEEDS_REVIEW' : decision,
        managerReviewComment: decision === 'PENDING' ? null : comment,
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
    } else if (decision === 'PENDING') {
      addToast('Decision undone', `${name} has been returned to Pending Review.`);
    } else {
      addToast('Review requested', `${name} has been flagged for further review.`);
    }
  }, [projectId, candidateId, queryClient, addToast]);

  const handleApproveAllInTab = useCallback(async () => {
    if (isReadOnly || isEffectiveReadOnly || !serverCandidate) return;

    const pendingFields = FIELD_DEFS[activeTab].filter(f => {
      if (isManual && !isCandidateFieldProvided(serverCandidate, f.key)) {
        return false;
      }
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
  }, [isReadOnly, isEffectiveReadOnly, serverCandidate, activeTab, projectId, candidateId, queryClient, addToast, isManual]);

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
      const blockingMatch = /Field\s+([A-Za-z0-9_.]+)\s+is\s+(PENDING_REVIEW|REVISION_REQUIRED|STALE|PENDING|REJECTED)/.exec(detail);
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
        if (isManual && !isCandidateFieldProvided(serverCandidate, f.key)) {
          return false;
        }
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
  }, [activeTab, serverCandidate, addToast, isManual]);

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
            currentRevisionNumber={serverCandidate?.revisionNumber ?? 1}
            evidenceItems={evidenceItems}
            onDecision={async (decision, comment) => {
              await handleFieldDecision(f.key, decision, comment, f.label);
            }}
            disabled={isReadOnly || isEffectiveReadOnly}
            highlighted={highlightedField === f.key}
            isManual={isManual}
          />
        </div>
      );
    });

    return <div className={styles.managerFieldGrid}>{cards}</div>;
  };

  // ── Unified Top Bar (Kiểu 1) ──
  const isHistoryView = Boolean(reviewHistoryItem);
  const historyStatus = reviewHistoryItem?.status;
  const isApproved = historyStatus === 'APPROVED' || serverCandidate?.status === 'APPROVED';
  const isChangesRequested = historyStatus === 'CHANGES_REQUESTED' || historyStatus === 'REVISION_REQUESTED' || historyStatus === 'REJECTED';
  const showTopBar = isHistoryView || isWorkspaceReadOnly;

  let unifiedTopBar: React.ReactNode = null;
  if (showTopBar) {
    const reviewerName = reviewHistoryItem?.reviewedByName || serverCandidate?.review?.reviewedBy || 'Business Manager';
    const reviewDateFormatted = formatReviewDateTime(reviewHistoryItem?.reviewedAt || serverCandidate?.review?.reviewedAt);
    const comment = reviewHistoryItem?.reviewComment || serverCandidate?.review?.rejectionReason || (isApproved ? 'Candidate approved and Company Profile created.' : undefined);
    const profileId = serverCandidate?.lifecycle?.convertedCompanyProfileId
      || serverCandidate?.deduplication?.existingProfileIdMatch;

    const barThemeClass = isApproved
      ? styles.unifiedTopBarApproved
      : isChangesRequested
      ? styles.unifiedTopBarChangesRequested
      : styles.unifiedTopBarNeutral;

    unifiedTopBar = (
      <div className={`${styles.unifiedTopBar} ${barThemeClass}`}>
        <div className={styles.unifiedTopBarLeft}>
          <div className={styles.unifiedTopBarIconCircle}>
            {isApproved ? (
              <CheckCircle size={15} />
            ) : isChangesRequested ? (
              <AlertTriangle size={15} />
            ) : (
              <CheckCircle size={15} />
            )}
          </div>

          <span className={styles.unifiedTopBarBadge}>
            {isApproved ? 'APPROVED' : isChangesRequested ? 'CHANGES REQUESTED' : 'REVIEWED'}
          </span>

          <span className={styles.unifiedTopBarDot}>•</span>

          <div className={styles.unifiedTopBarText}>
            <span>
              {isApproved ? 'Approved by' : isChangesRequested ? 'Changes requested by' : 'Reviewed by'}{' '}
              <strong>{reviewerName}</strong>
              {comment ? (
                <>: <span className={styles.unifiedTopBarQuote}>&ldquo;{comment}&rdquo;</span></>
              ) : null}
            </span>
            {reviewDateFormatted && (
              <>
                <span className={styles.unifiedTopBarDot}>•</span>
                <span className={styles.unifiedTopBarDate}>{reviewDateFormatted}</span>
              </>
            )}
          </div>
        </div>

        <div className={styles.unifiedTopBarRight}>
          {isApproved && onViewCompanyProfile && (
            <button
              type="button"
              className={styles.unifiedTopBarActionBtn}
              onClick={() => onViewCompanyProfile(profileId)}
              title="View official company profile"
            >
              <span>View Company Profile</span>
              <ExternalLink size={13} />
            </button>
          )}

          <div className={styles.unifiedTopBarDivider} />

          <button
            type="button"
            className={styles.unifiedTopBarCloseBtn}
            onClick={onCancel}
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading || !serverCandidate) {
    const skeletonContent = (
      <div className={styles.workspace} style={{ padding: 24, height: '100%' }}>
        {!unifiedTopBar && banner && <div style={{ marginBottom: 16 }}>{banner}</div>}
        <div className={styles.skeletonHeader} style={{ height: 60, background: '#e2e8f0', borderRadius: 8, marginBottom: 20 }} />
        <div className={styles.skeletonBody} style={{ height: 400, background: '#f1f5f9', borderRadius: 8 }} />
      </div>
    );
    return ReactDOM.createPortal(
      <div className={styles.managerReviewBackdrop} onClick={onCancel}>
        <div className={styles.managerReviewModal} onClick={(e) => e.stopPropagation()}>
          {unifiedTopBar}
          {skeletonContent}
        </div>
      </div>,
      document.body
    );
  }

  // ── Header Information ──
  const draftTitle = serverCandidate.draftName
    || (serverCandidate.draftSequence ? `Draft ${serverCandidate.draftSequence}` : 'Draft');
  const roundNumber = currentSubmission?.submittedRevisionNumber || serverCandidate.revisionNumber || 1;
  const submittedBy = currentSubmission?.submittedByName || serverCandidate.metadata?.createdBy || 'Staff';
  const submittedAt = currentSubmission?.submittedAt || currentSubmission?.createdAt || serverCandidate.lastSubmittedAt || serverCandidate.metadata?.createdAt;
  const companyLegalName = serverCandidate.identity?.legalName || 'Unknown Company';
  const reviewedAt = serverCandidate.review?.reviewedAt || currentSubmission?.reviewedAt || (isReadOnly ? serverCandidate.metadata?.updatedAt : null);

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
  if (serverCandidate.status === 'APPROVED') {
    sidebarMessage = (
      <div className={styles.sidebarSuccessBanner}>
        <CheckCircle size={14} /> Candidate approved & Company Profile created.
      </div>
    );
  } else if (serverCandidate.status === 'REJECTED') {
    sidebarMessage = (
      <div className={styles.sidebarWarnBanner}>
        Candidate was rejected.
      </div>
    );
  } else if (stats.total === 0) {
    sidebarMessage = (
      <div className={styles.sidebarWarnBanner}>
        No fields were submitted by Staff. Send back to Staff for revision.
      </div>
    );
  } else if (stats.pending > 0) {
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

      {!unifiedTopBar && banner && (
        <div style={{ marginBottom: 16 }}>
          {banner}
        </div>
      )}

      {/* ── Top Task Header (matches Staff Workspace inviteHead style) ── */}
      <div className={styles.managerTaskHeader}>
        <div className={styles.managerTaskHeaderInfo}>
          <h2 className={styles.managerTaskTitle}>
            {taskTitle || 'Research Basic Company Information'}
          </h2>
          <div className={styles.managerTaskMeta}>
            <span
              className={
                isReadOnly
                  ? (serverCandidate?.status === 'APPROVED' || currentSubmission?.status === 'APPROVED'
                      ? styles.managerReviewStatusDone
                      : serverCandidate?.status === 'REVISION_REQUIRED' || serverCandidate?.status === 'REJECTED' || currentSubmission?.status === 'CHANGES_REQUESTED'
                      ? styles.managerReviewStatusChanges
                      : styles.managerReviewStatusDefault)
                  : styles.inReviewBadge
              }
            >
              {isReadOnly
                ? (serverCandidate?.status === 'APPROVED' || currentSubmission?.status === 'APPROVED'
                    ? 'DONE'
                    : serverCandidate?.status === 'REVISION_REQUIRED'
                    ? 'CHANGES REQUESTED'
                    : serverCandidate?.status || currentSubmission?.status || 'DONE')
                : 'IN REVIEW'}
            </span>

            {taskDueDate && (
              <>
                <span className={styles.metaSeparator}>&bull;</span>
                <span className={styles.metaItem}>Due {formatReviewDate(taskDueDate)}</span>
              </>
            )}

            {companyLegalName && (
              <>
                <span className={styles.metaSeparator}>&bull;</span>
                <span className={styles.metaItem}>Target: <strong>{companyLegalName}</strong></span>
              </>
            )}
          </div>
        </div>

        {!unifiedTopBar && (
          <button
            type="button"
            className={styles.iconCloseButton}
            onClick={onCancel}
            aria-label="Close review workspace"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>

      {/* ── Submission Summary Card (matches Staff Workspace draft summary) ── */}
      <div className={styles.submissionSummaryCard}>
        <div className={styles.submissionSummaryTop}>
          <div className={styles.submissionSummaryBadges}>
            <span className={isManual ? styles.manualEntryBadge : styles.aiExtractedBadge}>
              {isManual ? 'MANUAL ENTRY' : 'AI EXTRACTED'}
            </span>
            <span className={styles.inReviewSubBadge}>
              {isReadOnly
                ? (serverCandidate?.status === 'APPROVED' || currentSubmission?.status === 'APPROVED'
                    ? 'APPROVED'
                    : serverCandidate?.status === 'REVISION_REQUIRED'
                    ? 'CHANGES REQUESTED'
                    : serverCandidate?.status || 'REVIEWED')
                : 'IN REVIEW'}
            </span>
            <span className={styles.metaSeparator}>&bull;</span>
            <span className={styles.summaryRoundText}>Round {roundNumber}</span>
          </div>
        </div>

        <h3 className={styles.submissionDraftTitle}>
          {draftTitle}
        </h3>

        <div className={styles.submissionSummaryMetaRow}>
          {submittedAt && (
            <span><strong>Submitted:</strong> {formatReviewDate(submittedAt)}</span>
          )}
          <span><strong>Submitted by:</strong> {submittedBy}</span>
          {isReadOnly && reviewedAt && (
            <span><strong>Reviewed:</strong> {formatReviewDate(reviewedAt)}</span>
          )}
          <span>
            <strong>Source:</strong>{' '}
            {isManual
              ? 'Manual Entry'
              : (sourceDocNames.length > 0 ? sourceDocNames.join(', ') : 'AI Extraction')}
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className={`${styles.layoutContainer} ${isReadOnly ? styles.layoutContainerReadOnly : ''}`}>
        {/* Left Column (Full width when read-only) */}
        <div className={styles.mainContent}>
          <div className={styles.tabsContainer}>
            {CANDIDATE_TABS.map(tab => {
              const summary = sectionSummaries[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.tab} ${styles.managerTab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{tab}</span>
                  <span className={styles.tabCount}>
                    {isManual ? summary.submittedCount : summary.totalFields}
                  </span>
                  {!isReadOnly && summary.pendingCount > 0 && (
                    <span className={styles.tabPendingDot}>{summary.pendingCount} pending</span>
                  )}
                  {!isReadOnly && summary.rejectedCount > 0 && (
                    <span className={styles.tabRejectedDot} title={`${summary.rejectedCount} field(s) rejected`}>
                      {summary.rejectedCount} rejected
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(() => {
            const hasPendingInTab = FIELD_DEFS[activeTab].some(f => {
              if (isManual && !isCandidateFieldProvided(serverCandidate, f.key)) return false;
              const field = effectiveFieldForKey(serverCandidate, f.key);
              return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
            });
            return (
              <div className={styles.quickFilterBar}>
                <div>
                  <span className={styles.quickFilterTitle}>Reviewed fields</span>
                  <small className={styles.quickFilterSubtitle}>
                    {stats.reviewed} / {stats.total} {isManual ? 'submitted fields reviewed' : 'reviewed'} &middot;{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{stats.approved} approved</span> &middot;{' '}
                    <span style={{ color: stats.rejected > 0 ? '#dc2626' : undefined, fontWeight: stats.rejected > 0 ? 600 : undefined }}>{stats.rejected} rejected</span>
                    {stats.pending > 0 && (
                      <> &middot; <span style={{ color: '#64748b' }}>{stats.pending} pending</span></>
                    )}
                  </small>
                </div>
                {!isReadOnly && !isEffectiveReadOnly && hasPendingInTab && (
                  <div className={styles.quickFilterActions}>
                    <button
                      type="button"
                      className={styles.approveAllBtn}
                      onClick={handleApproveAllInTab}
                      title={`Approve all pending fields in ${activeTab}`}
                    >
                      <CheckCheck size={14} /> Approve All
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <div className={styles.tabContent}>
            {renderTabContent()}

            {isReadOnly && (
              <div className={styles.readonlyHistorySection}>
                <h3 className={styles.readonlyHistoryTitle}>Review history</h3>
                <div className={styles.readonlyHistoryTimeline}>
                  {submissionHistory.length > 0 ? (
                    submissionHistory.map((sub, idx) => {
                      const isApproved = sub.status === 'APPROVED';
                      const isChanges = sub.status === 'CHANGES_REQUESTED' || sub.status === 'REVISION_REQUESTED' || sub.status === 'REJECTED';
                      return (
                        <article key={sub.id || idx} className={styles.readonlyHistoryItem}>
                          <div className={styles.readonlyHistoryItemHeader}>
                            <div className={styles.readonlyHistoryItemTitle}>
                              <strong>Round {sub.submittedRevisionNumber || idx + 1}</strong>
                              <span
                                className={styles.readonlyHistoryBadge}
                                style={{
                                  backgroundColor: isApproved ? '#dcfce7' : isChanges ? '#fee2e2' : '#dbeafe',
                                  color: isApproved ? '#166534' : isChanges ? '#991b1b' : '#1e40af',
                                }}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <span className={styles.readonlyHistoryDate}>
                              {formatReviewDate(sub.reviewedAt || sub.submittedAt || sub.createdAt)}
                            </span>
                          </div>
                          <div className={styles.readonlyHistorySubtext}>
                            {sub.reviewedAt ? 'Reviewed by Business Manager' : (sub.submittedByName ? `Submitted by ${sub.submittedByName}` : 'Business Manager')}
                          </div>
                          {sub.reviewComment && (
                            <div className={styles.readonlyHistoryComment}>
                              &ldquo;{sub.reviewComment}&rdquo;
                            </div>
                          )}
                        </article>
                      );
                    })
                  ) : (
                    <article className={styles.readonlyHistoryItem}>
                      <div className={styles.readonlyHistoryItemHeader}>
                        <div className={styles.readonlyHistoryItemTitle}>
                          <strong>Round {roundNumber}</strong>
                          <span
                            className={styles.readonlyHistoryBadge}
                            style={{
                              backgroundColor: serverCandidate.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                              color: serverCandidate.status === 'APPROVED' ? '#166534' : '#991b1b',
                            }}
                          >
                            {serverCandidate.status}
                          </span>
                        </div>
                        <span className={styles.readonlyHistoryDate}>
                          {formatReviewDate(serverCandidate.review?.reviewedAt || serverCandidate.metadata?.updatedAt)}
                        </span>
                      </div>
                      <div className={styles.readonlyHistorySubtext}>
                        Reviewed by {serverCandidate.review?.reviewedBy || 'Business Manager'}
                      </div>
                      {serverCandidate.review?.rejectionReason && (
                        <div className={styles.readonlyHistoryComment}>
                          &ldquo;{serverCandidate.review.rejectionReason}&rdquo;
                        </div>
                      )}
                    </article>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - ONLY in active review mode */}
        {!isReadOnly && (
          <div className={styles.sidebar}>
            <div className={styles.managerReviewPanel}>
              <h3 className={styles.managerPanelHeading}>Review Progress</h3>

            {/* Progress bar */}
            <div className={styles.progressBarWrap}>
              <div className={styles.managerProgressLabels}>
                <span>{stats.reviewed} / {stats.total} {isManual ? 'submitted fields reviewed' : 'reviewed'}</span>
                <strong>{stats.percentage}%</strong>
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
                <span className={styles.managerStatPending}><Clock size={13} /> Pending</span>
                <strong>{stats.pending}</strong>
              </div>

              {isManual && stats.notProvided > 0 && (
                <div className={styles.managerStatRow}>
                  <span className={styles.managerStatNotProvided}>
                    Not provided
                  </span>
                  <strong style={{ color: '#94a3b8' }}>{stats.notProvided}</strong>
                </div>
              )}
            </div>

            {/* Next Pending */}
            {stats.pending > 0 && (
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

              {!stats.canComplete && stats.pending === 0 && (stats.total === 0 || stats.rejected > 0 || stats.needsReview > 0) && (
                <button
                  className={styles.btnSendBack}
                  onClick={handleSendBack}
                  disabled={sendingBack}
                >
                  {sendingBack ? (
                    <><Loader2 size={15} className={styles.spin} /> Sending&hellip;</>
                  ) : (
                    <><Send size={15} /> Send Back to Staff</>
                  )}
                </button>
              )}

              {stats.pending > 0 && (
                <button
                  className={styles.btnCompleteDisabled}
                  disabled
                  title={isManual ? `${stats.pending} submitted field(s) still need a decision` : `${stats.pending} fields still need a decision`}
                >
                  <CheckCircle size={16} /> Approve Candidate
                </button>
              )}
            </div>

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
        )}
      </div>

    </div>
  );

  return ReactDOM.createPortal(
    <div className={styles.managerReviewBackdrop} onClick={onCancel}>
      <div className={styles.managerReviewModal} onClick={(e) => e.stopPropagation()}>
        {unifiedTopBar}
        {workspaceContent}
      </div>
    </div>,
    document.body
  );
};
