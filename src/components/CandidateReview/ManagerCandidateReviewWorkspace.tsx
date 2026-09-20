import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle, XCircle, Clock, Send, X as XIcon, Loader2, CheckCheck, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import { taskApi } from '../../API/taskApi';
import type { AiFieldResult, CandidateFieldEvidence, CandidateResponse, FieldApprovalRecord, FieldReviewDecision, ProjectTaskSubmissionResponse, ManagerReviewHistoryItem } from '../../types/domain';
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
  'contact.addresses': 'addresses',
  'contact.address': 'addresses',
  'contact.website': 'website',
  'contact.emails': 'emails',
  'contact.phones': 'phones',
  'business.businessModel': 'businessModel',
  'business.industries': 'industries',
  'business.foundedYear': 'foundedYear',
  'business.companyDescription': 'companyDescription',
  'business.markets': 'markets',
  'business.targetCustomers': 'targetCustomers',
  'business.products': 'products',
  'companySize.employeeCount': 'employeeCount',
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
    case 'contact.addresses':
    case 'contact.address': {
      const addrs = c.contact?.addresses ?? c.addresses;
      if (Array.isArray(addrs) && addrs.length > 0) {
        return addrs.map((item: any) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') return (item.fullAddress || item.address || '').trim();
          return String(item).trim();
        }).filter(Boolean);
      }
      const single = c.contact?.address ?? c.address;
      if (typeof single === 'string' && single.trim()) {
        return [single.trim()];
      }
      return [];
    }
    case 'contact.emails': return c.contact?.emails ?? c.emails ?? c.email;
    case 'contact.phones': return c.contact?.phones ?? c.phones ?? c.phone;
    case 'business.businessModel': return c.business?.businessModel ?? c.businessModel;
    case 'business.industries': return c.business?.industries ?? c.industries;
    case 'business.foundedYear': return c.business?.foundedYear ?? c.foundedYear;
    case 'business.companyDescription': return c.business?.companyDescription ?? c.companyDescription;
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

  const currentRound = candidate?.currentReviewRound ?? candidate?.revisionNumber ?? 1;

  const currentManagerStatus = approval ? normalizeManagerStatus(approval.status) : normalizeManagerStatus(field?.managerReviewStatus);
  const currentComment = approval?.comment ?? field?.managerReviewComment;
  const currentReviewedAt = approval?.reviewedAt ?? field?.managerReviewedAt;
  const currentReviewedRevision = approval?.reviewedRevision ?? field?.reviewedRevision;

  const currentDecision: FieldReviewDecision = field?.currentDecision ?? {
    roundNumber: currentRound,
    status: currentManagerStatus,
    comment: currentComment ?? null,
    submittedValue: effectiveValue,
    reviewedAt: currentReviewedAt ?? null,
    reviewedByUserId: (approval?.reviewedByAccountId as any) ?? field?.managerReviewedByUserId ?? null,
  };

  // Previous decision resolution: strictly earlier rounds only (< currentRound). Round 1 is strictly null!
  let previousDecision: FieldReviewDecision | null = null;
  if (currentRound > 1) {
    if (field?.previousDecision && field.previousDecision.roundNumber < currentRound) {
      previousDecision = {
        ...field.previousDecision,
        status: normalizeManagerStatus(field.previousDecision.status),
      };
    } else {
      const rawPrevStatus = approval?.previousStatus
        ? normalizeManagerStatus(approval.previousStatus)
        : (field?.previousManagerReviewStatus ? normalizeManagerStatus(field.previousManagerReviewStatus) : undefined);

      if (rawPrevStatus && rawPrevStatus !== 'PENDING') {
        const prevRound = approval?.previousReviewedRevision ?? field?.previousReviewedRevision ?? (currentRound - 1);
        if (prevRound < currentRound) {
          previousDecision = {
            roundNumber: prevRound,
            status: rawPrevStatus,
            comment: approval?.previousComment ?? field?.previousManagerReviewComment ?? null,
            submittedValue: field?.previousSubmittedValue ?? approval?.pendingValue,
            reviewedAt: (field as any)?.previousManagerReviewedAt ?? null,
            reviewedByUserId: null,
          };
        }
      }
    }
  }

  return {
    ...(field || { fieldName: key }),
    value: effectiveValue !== undefined ? effectiveValue : field?.value,
    staffReviewedValue: effectiveValue !== undefined ? effectiveValue : field?.staffReviewedValue,
    managerReviewStatus: currentManagerStatus,
    managerReviewComment: currentComment,
    managerReviewedAt: currentReviewedAt,
    reviewedRevision: currentReviewedRevision,
    currentDecision,
    previousDecision,
    previousManagerReviewStatus: previousDecision?.status,
    previousManagerReviewComment: previousDecision?.comment ?? undefined,
    previousSubmittedValue: previousDecision?.submittedValue,
    previousReviewedRevision: previousDecision?.roundNumber,
    submittedRound: field?.submittedRound ?? currentRound,
    resubmittedInCurrentRound: field?.resubmittedInCurrentRound ?? (currentRound > 1 && previousDecision !== null),
    changedInRevision: approval?.changedInRevision ?? field?.changedInRevision,
  };
};

const isCandidateFieldProvided = (candidate: CandidateResponse | null | undefined, key: string): boolean => {
  if (!candidate) return false;
  const approval = fieldApprovalForKey(candidate, key);
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
    const isProvided = isCandidateFieldProvided(candidate, key);
    if (!isProvided) {
      notProvided++;
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

  const scrollBodyRef = React.useRef<HTMLDivElement>(null);
  const pendingScrollTargetRef = React.useRef<string | null>(null);
  const isNavigatingPendingRef = React.useRef<boolean>(false);
  const prevTabRef = React.useRef<TabType>(activeTab);

  const scrollFieldIntoView = useCallback((fieldId: string) => {
    const container = scrollBodyRef.current;
    const element = document.getElementById(`field-${fieldId}`);
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const targetTop =
      container.scrollTop +
      elementRect.top -
      containerRect.top -
      16;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, []);

  // Reset scroll to top when changing tabs manually (Section 5)
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if (!isNavigatingPendingRef.current) {
        scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  // Render-aware scroll for Next Pending Field navigation (Section 4)
  useEffect(() => {
    const target = pendingScrollTargetRef.current;
    if (!target) return;

    const el = document.getElementById(`field-${target}`);
    if (el && scrollBodyRef.current) {
      scrollFieldIntoView(target);
      setHighlightedField(target);
      window.setTimeout(() => setHighlightedField(current => current === target ? null : current), 1600);
      pendingScrollTargetRef.current = null;
      isNavigatingPendingRef.current = false;
    }
  }, [activeTab, serverCandidate, scrollFieldIntoView]);

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
      const submittedCount = tabFields.filter(f => isCandidateFieldProvided(serverCandidate, f.key)).length;
      let pendingCount = 0;
      let reviewedCount = 0;
      let rejectedCount = 0;

      for (const f of tabFields) {
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

      map[tab] = {
        tab,
        totalFields: tabFields.length,
        submittedCount,
        reviewedCount,
        pendingCount,
        rejectedCount,
        complete: tabFields.length > 0 && reviewedCount === tabFields.length,
        hasData: tabFields.length > 0,
      };
    }
    return map;
  }, [serverCandidate]);

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

  const [bulkConfirmTab, setBulkConfirmTab] = useState<TabType | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const handleConfirmBulkApproveInTab = useCallback(async () => {
    if (!bulkConfirmTab || isReadOnly || isEffectiveReadOnly || !serverCandidate || bulkApproving) return;

    const pendingFields = FIELD_DEFS[bulkConfirmTab].filter(f => {
      const field = effectiveFieldForKey(serverCandidate, f.key);
      return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
    });

    if (pendingFields.length === 0) {
      setBulkConfirmTab(null);
      return;
    }

    setBulkApproving(true);
    try {
      const res = await candidateApi.bulkApproveFields(
        projectId,
        candidateId,
        pendingFields.map(f => f.key)
      );
      if (res?.data) {
        setServerCandidate(res.data);
      }
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      addToast('Section Approved', `Approved ${pendingFields.length} fields in ${bulkConfirmTab}`);
      setBulkConfirmTab(null);
    } catch (e: any) {
      addToast('Error', e?.message || 'Could not batch approve fields', 'error');
    } finally {
      setBulkApproving(false);
    }
  }, [bulkConfirmTab, isReadOnly, isEffectiveReadOnly, serverCandidate, bulkApproving, projectId, candidateId, queryClient, addToast]);

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
        const field = effectiveFieldForKey(serverCandidate, f.key);
        return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
      });
      if (pendingFields.length > 0) {
        const nextField = pendingFields[0].key;

        if (activeTab !== tab) {
          isNavigatingPendingRef.current = true;
          pendingScrollTargetRef.current = nextField;
          setActiveTab(tab);
        } else {
          scrollFieldIntoView(nextField);
          setHighlightedField(nextField);
          window.setTimeout(() => setHighlightedField((current) => current === nextField ? null : current), 1600);
        }
        return;
      }
    }
    addToast('All Done', 'No pending fields remaining.', 'success');
  }, [activeTab, serverCandidate, addToast, scrollFieldIntoView]);

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
            currentRevisionNumber={serverCandidate?.currentReviewRound ?? serverCandidate?.revisionNumber ?? 1}
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
  const roundNumber = currentSubmission?.submittedRevisionNumber || serverCandidate.currentReviewRound || serverCandidate.revisionNumber || 1;
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
  const isZeroSubmitted = isManual && stats.notProvided === stats.total;
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
  } else if (isZeroSubmitted && stats.pending > 0) {
    sidebarMessage = (
      <div className={styles.sidebarInfoBanner}>
        Staff did not provide values for this submission. You can accept the missing optional information or request specific fields to be completed.
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

      {/* ── Fixed Header Zone (Title, Meta, Close, Compact Summary) ── */}
      <div className={styles.modalFixedHeader}>
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
      </div>

      {/* ── Fixed Section Tabs Zone (Permanently visible outside scroll body) ── */}
      <div className={styles.modalFixedTabs}>
        {!unifiedTopBar && banner && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            {banner}
          </div>
        )}
        {isZeroSubmitted && !isReadOnly && !isEffectiveReadOnly && (
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '8px 12px',
            marginTop: '8px',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#1e40af',
            fontSize: '13px',
            lineHeight: '1.4',
          }}>
            <AlertTriangle size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <div>
              Staff did not provide values for this submission. You can accept the missing optional information or request specific fields to be completed.
            </div>
          </div>
        )}
        <div className={styles.tabsContainer}>
          {CANDIDATE_TABS.map(tab => {
            const summary = sectionSummaries[tab];
            const isActive = activeTab === tab;
            const total = summary.totalFields;
            const reviewed = summary.reviewedCount;
            const hasChanges = summary.rejectedCount > 0;
            const isComplete = total > 0 && reviewed === total && !hasChanges;
            const isInProgress = reviewed > 0 && reviewed < total && !hasChanges;

            let statusClass = styles.tabUnreviewed;
            if (isComplete) statusClass = styles.tabComplete;
            else if (hasChanges) statusClass = styles.tabHasChanges;
            else if (isInProgress) statusClass = styles.tabInProgress;

            return (
              <button
                key={tab}
                type="button"
                className={`${styles.managerTab} ${statusClass} ${isActive ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span>{tab}</span>
                <span className={styles.tabFraction}>
                  {reviewed}/{total}
                </span>
                {isComplete && <span className={styles.tabCompleteCheck}>✓</span>}
                {hasChanges && (
                  <span className={styles.tabChangesWarning} title={`${summary.rejectedCount} field(s) have changes requested`}>
                    ⚠
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Single Vertical Scroll Area for Main Review Content & Sticky Sidebar ── */}
      <div ref={scrollBodyRef} className={styles.modalScrollBody}>
        {/* Main Layout */}
        <div className={`${styles.layoutContainer} ${isReadOnly ? styles.layoutContainerReadOnly : ''}`}>
        {/* Left Column (Full width when read-only) */}
        <div className={styles.mainContent}>

          {(() => {
            const pendingInActiveTab = FIELD_DEFS[activeTab].filter(f => {
              const field = effectiveFieldForKey(serverCandidate, f.key);
              return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
            });
            const pendingCount = pendingInActiveTab.length;
            const totalCount = FIELD_DEFS[activeTab].length;
            const showBulkBtn = !isReadOnly && !isEffectiveReadOnly && pendingCount > 0;
            const changesRequestedCount = stats.needsReview + stats.rejected;

            return (
              <div className={styles.quickFilterBar}>
                <div>
                  <span className={styles.quickFilterTitle}>Reviewed fields</span>
                  <small className={styles.quickFilterSubtitle}>
                    {stats.reviewed} / {stats.total} fields reviewed &middot;{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{stats.approved} approved</span> &middot;{' '}
                    <span style={{ color: changesRequestedCount > 0 ? '#c2410c' : undefined, fontWeight: changesRequestedCount > 0 ? 600 : undefined }}>
                      {changesRequestedCount} changes requested
                    </span>
                    {stats.pending > 0 && (
                      <> &middot; <span style={{ color: '#64748b' }}>{stats.pending} pending</span></>
                    )}
                  </small>
                </div>
                {showBulkBtn && (
                  <div className={styles.quickFilterActions}>
                    <button
                      type="button"
                      className={styles.approveAllBtn}
                      onClick={() => setBulkConfirmTab(activeTab)}
                      title={
                        pendingCount === totalCount
                          ? `Approve all ${totalCount} pending fields in ${activeTab}`
                          : `Approve remaining ${pendingCount} pending fields in ${activeTab}`
                      }
                    >
                      <CheckCheck size={15} />{' '}
                      {pendingCount === totalCount
                        ? `Approve All in ${activeTab} (${totalCount})`
                        : `Approve Remaining in ${activeTab} (${pendingCount})`}
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
                <span>{stats.reviewed} / {stats.total} {isManual ? 'fields reviewed' : 'reviewed'}</span>
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
                <span className={styles.managerStatChanges}><AlertTriangle size={13} /> Changes Requested</span>
                <strong>{stats.needsReview + stats.rejected}</strong>
              </div>

              <div className={styles.managerStatRow}>
                <span className={styles.managerStatPending}><Clock size={13} /> Pending</span>
                <strong>{stats.pending}</strong>
              </div>

              {isManual && stats.notProvided > 0 && (
                <div className={styles.managerStatRow}>
                  <span className={styles.managerStatNotProvided}>
                    Missing Values
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

              {!stats.canComplete && stats.pending === 0 && (stats.rejected > 0 || stats.needsReview > 0) && (
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
                  title={`${stats.pending} field(s) still need a decision`}
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

    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(
        <div className={styles.managerReviewBackdrop} onClick={onCancel}>
          <div className={styles.managerReviewModal} onClick={(e) => e.stopPropagation()}>
            {unifiedTopBar}
            {workspaceContent}
          </div>
        </div>,
        document.body
      )}

      {bulkConfirmTab && ReactDOM.createPortal(
        <div className={styles.bulkConfirmOverlay} onClick={() => { if (!bulkApproving) setBulkConfirmTab(null); }}>
          <div className={styles.bulkConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bulkConfirmHeader}>
              <h3>
                {(() => {
                  const pendingFields = FIELD_DEFS[bulkConfirmTab].filter(f => {
                    const field = effectiveFieldForKey(serverCandidate, f.key);
                    return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
                  });
                  return pendingFields.length === FIELD_DEFS[bulkConfirmTab].length
                    ? `Approve all pending fields in ${bulkConfirmTab}?`
                    : `Approve remaining pending fields in ${bulkConfirmTab}?`;
                })()}
              </h3>
            </div>
            <div className={styles.bulkConfirmBody}>
              {(() => {
                const count = FIELD_DEFS[bulkConfirmTab].filter(f => {
                  const field = effectiveFieldForKey(serverCandidate, f.key);
                  return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
                }).length;
                return (
                  <>
                    <p>
                      <strong>{count} pending field{count !== 1 ? 's' : ''}</strong> will be marked as Approved.
                    </p>
                    <p className={styles.bulkConfirmSubtext}>
                      Empty fields will remain empty; approval means the omission is accepted.
                    </p>
                  </>
                );
              })()}
            </div>
            <div className={styles.bulkConfirmActions}>
              <button
                type="button"
                className={styles.bulkConfirmCancelBtn}
                onClick={() => setBulkConfirmTab(null)}
                disabled={bulkApproving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.bulkConfirmApproveBtn}
                onClick={handleConfirmBulkApproveInTab}
                disabled={bulkApproving}
              >
                {bulkApproving ? (
                  <><Loader2 size={14} className={styles.spin} /> Approving&hellip;</>
                ) : (
                  (() => {
                    const count = FIELD_DEFS[bulkConfirmTab].filter(f => {
                      const field = effectiveFieldForKey(serverCandidate, f.key);
                      return normalizeManagerStatus(field?.managerReviewStatus) === 'PENDING';
                    }).length;
                    return `Approve ${count} Field${count !== 1 ? 's' : ''}`;
                  })()
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
