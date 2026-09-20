import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCheck, CheckCircle2, ChevronDown, ChevronUp, Edit2, Loader2 } from 'lucide-react';
import { candidateApi } from '../../API/candidateApi';
import type { AiFieldResult, CandidateResponse } from '../../types/domain';
import { CandidateQualitySummary } from './CandidateQualitySummary';
import { EditableScalarField } from './EditableScalarField';
import { EditableListField } from './EditableListField';
import { EditableIndustryField } from './EditableIndustryField';
import { EditableProductList } from './EditableProductList';
import styles from './CandidateReview.module.css';

const FLAT_TO_DOT: Record<string, string> = {
  tradeName: 'identity.tradeName',
  addresses: 'contact.addresses',
  address: 'contact.addresses',
  website: 'contact.website',
  emails: 'contact.emails',
  email: 'contact.emails',
  phones: 'contact.phones',
  phone: 'contact.phones',
  businessModel: 'business.businessModel',
  industries: 'business.industries',
  foundedYear: 'business.foundedYear',
  companyDescription: 'business.companyDescription',
  markets: 'business.markets',
  targetCustomers: 'business.targetCustomers',
  products: 'business.products',
  employeeCount: 'companySize.employeeCount',
};

function normalizeFieldResults(raw: Record<string, any> | undefined): Record<string, any> {
  if (!raw) return {};
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    const dotKey = FLAT_TO_DOT[key] || key;
    normalized[dotKey] = {
      ...value,
      reviewedValue: value.staffReviewedValue !== undefined ? value.staffReviewedValue : value.reviewedValue
    };
  }
  if (normalized['contact.address'] && !normalized['contact.addresses']) {
    normalized['contact.addresses'] = normalized['contact.address'];
  }
  return normalized;
}

interface CandidateReviewWorkspaceProps {
  projectId: string;
  candidateId: string;
  taskId?: number;
  role?: string;
  targetCompanyName?: string | null;
  onReviewed?: () => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLoading?: boolean;
  readOnly?: boolean;
  isResearchNewCompany?: boolean;
  onDraftRenamed?: (candidate: CandidateResponse) => void;
}

import {
  CANDIDATE_FIELD_GROUPS,
  type CandidateCategoryTab,
  isCandidateFieldEdited,
  areCandidateFieldValuesEqual,
  normalizeCandidateFieldValue,
  isManualCandidate,
  isValidCandidateEmail,
  isValidCandidateUrl,
  isValidCandidatePhone,
  isValidCandidateFoundedYear,
  isValidCandidateAddress,
} from './candidateFieldDefinitions';

type TabType = CandidateCategoryTab;
type ReviewFilter = 'ALL' | 'PENDING' | 'EDITED' | 'ISSUES' | 'LOW_CONFIDENCE' | 'FILLED' | 'EMPTY';

const TAB_FIELD_GROUPS = CANDIDATE_FIELD_GROUPS;
const TABS: TabType[] = ['Identity', 'Business', 'Market & Product'];

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

const normalizeManagerStatus = (status: unknown): 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' => {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'ACCEPTED' || value === 'APPROVED') return 'ACCEPTED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'CHANGES_REQUESTED' || value === 'NEEDS_REVIEW' || value === 'REVISION_REQUIRED') return 'CHANGES_REQUESTED';
  return 'PENDING';
};

const isManagerAccepted = (field?: AiFieldResult) => normalizeManagerStatus(field?.managerReviewStatus) === 'ACCEPTED';

const isReturnedByManager = (field?: AiFieldResult) => {
  const current = normalizeManagerStatus(field?.managerReviewStatus);
  const previous = normalizeManagerStatus(field?.previousManagerReviewStatus);
  return current === 'REJECTED' || current === 'CHANGES_REQUESTED' || previous === 'REJECTED' || previous === 'CHANGES_REQUESTED';
};

const allCandidateFields = Object.values(TAB_FIELD_GROUPS).flat();
const labelForField = (key: string) => allCandidateFields.find((field) => field.key === key)?.label || key;

export const CandidateReviewWorkspace: React.FC<CandidateReviewWorkspaceProps> = ({
  projectId,
  candidateId,
  taskId,
  role = 'STAFF',
  targetCompanyName,
  onReviewed,
  onCancel,
  onSubmit,
  submitLoading,
  readOnly,
  isResearchNewCompany,
  onDraftRenamed
}) => {
  const [serverCandidate, setServerCandidate] = useState<CandidateResponse | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { reviewedValue: any, reviewStatus: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Identity');
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingDraftName, setIsEditingDraftName] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [isRenamingDraft, setIsRenamingDraft] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showApproved, setShowApproved] = useState(false);
  const queryClient = useQueryClient();

  const handleSaveDraftName = async () => {
    if (!serverCandidate) return;
    const trimmed = draftNameInput.trim();
    if (!trimmed) {
      setRenameError('Draft name cannot be blank');
      return;
    }
    if (trimmed.length > 200) {
      setRenameError('Draft name cannot exceed 200 characters');
      return;
    }
    try {
      setIsRenamingDraft(true);
      setRenameError(null);
      const res = await candidateApi.renameCandidateDraft(serverCandidate.id, trimmed);
      const updated = (res as any)?.data || res;
      setServerCandidate(prev => prev ? ({
        ...prev,
        draftName: updated.draftName || trimmed,
        draftSequence: updated.draftSequence ?? prev.draftSequence,
      }) : null);
      setIsEditingDraftName(false);
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["projectTaskWorkbench", taskId] });
      if (onDraftRenamed) onDraftRenamed(updated);
    } catch (err: any) {
      setRenameError(err.response?.data?.message || err.message || 'Failed to rename draft');
    } finally {
      setIsRenamingDraft(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (flatUpdates: Record<string, any>) => candidateApi.reviewCandidateFields(projectId, candidateId, flatUpdates),
    onSuccess: (response) => {
      if (response?.data) {
        setServerCandidate(response.data);
        queryClient.setQueryData(["candidate", candidateId], response);
      }
      setPendingUpdates({});
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      if (onReviewed) onReviewed();
    },
    onError: () => {
      alert("Error saving changes");
    }
  });

  const confirmCompanyMutation = useMutation({
    mutationFn: (confirmed: boolean) => candidateApi.confirmCompanyMatch(candidateId, confirmed),
    onSuccess: (response) => {
      if (response?.data) {
        setServerCandidate(response.data);
        queryClient.setQueryData(["candidate", candidateId], response);
      }
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["projectTaskWorkbench", taskId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to confirm company match");
    },
  });

  useEffect(() => {
    fetchData();
  }, [candidateId]);

  useEffect(() => {
    if (!serverCandidate) return;
    const normResults = normalizeFieldResults(serverCandidate.fieldResults);
    const hasChg = allCandidateFields.some((f) => isReturnedByManager(normResults[f.key]));
    const isStaffRev = (role === 'STAFF' || !role) && (serverCandidate.status === 'REVISION_REQUIRED' || hasChg);
    if (isStaffRev) {
      const firstTabWithRev = TABS.find((tab) =>
        TAB_FIELD_GROUPS[tab].some((f) => !isManagerAccepted(normResults[f.key]))
      );
      if (firstTabWithRev) {
        setActiveTab(firstTabWithRev);
      }
    }
  }, [serverCandidate?.id, serverCandidate?.status, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const candidateRes = await candidateApi.getCandidateById(candidateId);
      if (candidateRes.success && candidateRes.data) {
        setServerCandidate(candidateRes.data);
        setPendingUpdates({});
      }
    } catch (err) {
      alert("Failed to load candidate data");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any, status: string = 'EDITED') => {
    setPendingUpdates((prev) => ({ ...prev, [key]: { reviewedValue: value, reviewStatus: status } }));
  };

  const handleApproveAllInTab = () => {
    const activeTabFields = TAB_FIELD_GROUPS[activeTab];
    const newPendingUpdates = { ...pendingUpdates };
    let hasChanges = false;

    for (const { key } of activeTabFields) {
      const field = fieldResults[key];
      const isConfirmed = field?.staffReviewStatus === 'CONFIRMED';

      if (!isConfirmed && !isManagerAccepted(field)) {
        newPendingUpdates[key] = {
          ...newPendingUpdates[key],
          reviewedValue: field?.reviewedValue !== undefined ? field.reviewedValue : (field?.staffReviewedValue !== undefined ? field.staffReviewedValue : field?.value),
          reviewStatus: 'CONFIRMED'
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setPendingUpdates(newPendingUpdates);
    }
  };

  const isManual = isManualCandidate(serverCandidate);

  const handleSave = () => {
    if (Object.keys(pendingUpdates).length === 0) return;
    const reviewUpdates: Record<string, any> = {};
    for (const [dotKey, val] of Object.entries(pendingUpdates)) {
      let staffStatus = val.reviewStatus;
      if (isManual) {
        const isValEmpty = normalizeCandidateFieldValue(val.reviewedValue) === null;
        const originalVal = fieldResults[dotKey]?.value;
        const isOrigEmpty = normalizeCandidateFieldValue(originalVal) === null;
        if (isValEmpty) {
          staffStatus = isOrigEmpty ? 'PENDING' : 'REMOVED';
        } else {
          staffStatus = isOrigEmpty ? 'ADDED' : 'EDITED';
        }
      } else {
        if (staffStatus === 'ACCEPTED') staffStatus = 'CONFIRMED';
        if (staffStatus === 'RESTORED') staffStatus = 'PENDING';

        const originalValue = fieldResults[dotKey]?.value;
        if (!isCandidateFieldEdited(originalValue, val.reviewedValue) && (staffStatus === 'EDITED' || staffStatus === 'ADDED' || staffStatus === 'REMOVED')) {
          staffStatus = 'CONFIRMED';
        }
      }

      reviewUpdates[dotKey] = {
        reviewedValue: val.reviewedValue,
        staffReviewStatus: staffStatus,
        isManager: false,
        manager: false
      };
    }
    saveMutation.mutate(reviewUpdates);
  };

  const handleDiscard = () => {
    setPendingUpdates({});
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading candidate...</div>;
  if (!serverCandidate) return <div>Not found</div>;

  const originalFieldResults = normalizeFieldResults(serverCandidate.fieldResults);
  const fieldResults = { ...originalFieldResults };
  Object.keys(pendingUpdates).forEach(key => {
    if (!fieldResults[key]) fieldResults[key] = { value: null };

    let staffStatus = pendingUpdates[key].reviewStatus;
    if (isManual) {
      const isValEmpty = normalizeCandidateFieldValue(pendingUpdates[key].reviewedValue) === null;
      const originalVal = fieldResults[key]?.value;
      const isOrigEmpty = normalizeCandidateFieldValue(originalVal) === null;
      if (isValEmpty) {
        staffStatus = isOrigEmpty ? 'PENDING' : 'REMOVED';
      } else {
        staffStatus = isOrigEmpty ? 'ADDED' : 'EDITED';
      }
    } else {
      if (staffStatus === 'ACCEPTED') staffStatus = 'CONFIRMED';
      if (staffStatus === 'RESTORED') staffStatus = 'PENDING';
    }

    fieldResults[key] = {
      ...fieldResults[key],
      reviewedValue: pendingUpdates[key].reviewedValue,
      staffReviewStatus: staffStatus,
    };
  });

  const activeTabFields = TAB_FIELD_GROUPS[activeTab];

  let tabTotalFields = 0;
  let tabConfirmedFields = 0;
  let tabEditedFields = 0;
  let tabPendingFields = 0;
  let tabIssueFields = 0;
  let tabLowConfidenceFields = 0;
  let tabReturnedFields = 0;

  for (const { key } of activeTabFields) {
    tabTotalFields++;
    const field = fieldResults[key];
    const staffStatus = field?.staffReviewStatus;
    const validationStatus = field?.validationStatus;
    const confidence = field?.confidence;

    const fieldOriginal = field?.value;
    const fieldCurrent = field?.reviewedValue !== undefined ? field.reviewedValue : field?.staffReviewedValue;
    const fieldChanged = isCandidateFieldEdited(fieldOriginal, fieldCurrent);

    if (staffStatus === 'CONFIRMED') tabConfirmedFields++;
    if (fieldChanged) tabEditedFields++;
    if (!fieldChanged && staffStatus !== 'CONFIRMED') tabPendingFields++;

    if (validationStatus === 'FAIL') tabIssueFields++;
    if (typeof confidence === 'number' && confidence > 0 && confidence < 0.6) tabLowConfidenceFields++;
    if (isReturnedByManager(field)) tabReturnedFields++;
  }

  const allCandidateKeys = allCandidateFields.map((f) => f.key);
  const resolvedFields = allCandidateKeys.filter((key) => fieldResults[key]?.staffReviewStatus === 'CONFIRMED').length;
  const totalFieldsGlobal = allCandidateKeys.length;
  const progressPercent = totalFieldsGlobal > 0 ? Math.round((resolvedFields / totalFieldsGlobal) * 100) : 0;
  const unsavedCount = Object.keys(pendingUpdates).length;
  const isRejected = serverCandidate.status === 'REJECTED';
  const isRevision = serverCandidate.status === 'REVISION_REQUIRED';
  const allFieldKeys = allCandidateKeys;
  const returnedFields = allFieldKeys
    .map((key) => ({ key, label: labelForField(key), field: fieldResults[key] }))
    .filter(({ field }) => isReturnedByManager(field));
  const hasChangesRequested = returnedFields.length > 0;
  const isStaffRevision = (role === 'STAFF' || !role) && (isRevision || hasChangesRequested);
  const allApprovedFields = allCandidateFields.filter((f) => isManagerAccepted(fieldResults[f.key]));
  const activeTabRevisionFields = activeTabFields.filter((f) => !isManagerAccepted(fieldResults[f.key]));

  const tabs = TABS;

  const tabRevisionCounts = tabs.reduce<Record<TabType, number>>((acc, tab) => {
    acc[tab] = TAB_FIELD_GROUPS[tab].filter((f) => !isManagerAccepted(fieldResults[f.key])).length;
    return acc;
  }, {} as Record<TabType, number>);

  const requiresCompanyConfirmation = Boolean(
    serverCandidate &&
    !isManual &&
    (serverCandidate.companyMatchStatus ?? 'UNKNOWN') !== 'MATCH' &&
    !serverCandidate.companyMatchConfirmed
  );

  const getFieldValue = (key: string) => {
    const field = fieldResults[key];
    if (field?.reviewedValue !== undefined) return field.reviewedValue;
    if (field?.staffReviewedValue !== undefined) return field.staffReviewedValue;
    return field?.value;
  };

  const isFieldFilled = (key: string) => {
    return normalizeCandidateFieldValue(getFieldValue(key)) !== null;
  };

  const filledCount = allCandidateKeys.filter(isFieldFilled).length;
  const emptyCount = totalFieldsGlobal - filledCount;
  const filledPercent = totalFieldsGlobal > 0 ? Math.round((filledCount / totalFieldsGlobal) * 100) : 0;

  const tabFilledStats = tabs.reduce<Record<TabType, { filled: number; total: number }>>((map, tab) => {
    const fields = TAB_FIELD_GROUPS[tab];
    map[tab] = {
      total: fields.length,
      filled: fields.filter((f) => isFieldFilled(f.key)).length,
    };
    return map;
  }, {} as Record<TabType, { filled: number; total: number }>);

  const areAllFieldsConfirmed = allFieldKeys.every((key) => {
    const field = fieldResults[key];
    if (isManagerAccepted(field)) return true;
    if (isStaffRevision) {
      return (
        field?.staffReviewStatus === 'CONFIRMED' ||
        field?.staffReviewStatus === 'EDITED' ||
        field?.staffReviewStatus === 'ADDED' ||
        field?.staffReviewStatus === 'REMOVED' ||
        isCandidateFieldEdited(field?.value, field?.reviewedValue)
      );
    }
    return field?.staffReviewStatus === 'CONFIRMED';
  });

  const isManualDataValid = (() => {
    if (!isManual) return true;
    const website = getFieldValue('contact.website');
    if (typeof website === 'string' && website.trim() && !isValidCandidateUrl(website)) {
      return false;
    }
    const emails = getFieldValue('contact.emails');
    if (Array.isArray(emails)) {
      for (const email of emails) {
        if (typeof email === 'string' && email.trim() && !isValidCandidateEmail(email)) return false;
      }
    }
    const phones = getFieldValue('contact.phones');
    if (Array.isArray(phones)) {
      for (const phone of phones) {
        if (typeof phone === 'string' && phone.trim() && !isValidCandidatePhone(phone)) return false;
      }
    }
    const addresses = getFieldValue('contact.addresses') ?? getFieldValue('contact.address');
    if (Array.isArray(addresses)) {
      for (const address of addresses) {
        if (typeof address === 'string' && address.trim() && !isValidCandidateAddress(address)) return false;
      }
    } else if (typeof addresses === 'string' && addresses.trim() && !isValidCandidateAddress(addresses)) {
      return false;
    }
    const foundedYear = getFieldValue('business.foundedYear');
    if (!isValidCandidateFoundedYear(foundedYear)) {
      return false;
    }
    return true;
  })();

  const isCandidateEditable = !readOnly && (serverCandidate.status === 'DRAFT' || serverCandidate.status === 'REVISION_REQUIRED');
  const isManualSubmitEnabled = isCandidateEditable && !requiresCompanyConfirmation && isManualDataValid;
  const isSubmitEnabled = isManual ? isManualSubmitEnabled : (areAllFieldsConfirmed && !requiresCompanyConfirmation);

  const isSaving = saveMutation.isPending;

  let tabFilledCount = 0;
  let tabEmptyCount = 0;
  for (const { key } of activeTabFields) {
    if (isFieldFilled(key)) tabFilledCount++;
    else tabEmptyCount++;
  }

  const reviewFilters: Array<{ id: ReviewFilter; label: string; count: number }> = isManual
    ? [
      { id: 'ALL', label: 'All', count: tabTotalFields },
      { id: 'FILLED', label: 'Filled', count: tabFilledCount },
      { id: 'EMPTY', label: 'Empty', count: tabEmptyCount },
      ...(tabIssueFields > 0 ? [{ id: 'ISSUES' as ReviewFilter, label: 'Issues', count: tabIssueFields }] : []),
    ]
    : [
      { id: 'ALL', label: 'All', count: tabTotalFields },
      { id: 'PENDING', label: 'Pending', count: tabPendingFields },
      { id: 'EDITED', label: 'Edited', count: tabEditedFields },
      { id: 'ISSUES', label: 'Issues', count: tabIssueFields },
      { id: 'LOW_CONFIDENCE', label: 'Low Confidence', count: tabLowConfidenceFields },
    ];

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const checkFilterMatch = (key: string, filterId: ReviewFilter) => {
    if (isManual) {
      if (filterId === 'FILLED') return isFieldFilled(key);
      if (filterId === 'EMPTY') return !isFieldFilled(key);
      if (filterId === 'ISSUES') return fieldResults[key]?.validationStatus === 'FAIL';
      return true;
    }

    const field = fieldResults[key];
    const staffStatus = field?.staffReviewStatus;
    const fieldOriginal = field?.value;
    const fieldCurrent = field?.reviewedValue !== undefined ? field.reviewedValue : field?.staffReviewedValue;
    const isEdited = isCandidateFieldEdited(fieldOriginal, fieldCurrent);
    const isConfirmed = staffStatus === 'CONFIRMED';
    const isPending = !isConfirmed && !isEdited;
    const confidence = field?.confidence;

    if (filterId === 'PENDING') return isPending;
    if (filterId === 'EDITED') return isEdited;
    if (filterId === 'ISSUES') return field?.validationStatus === 'FAIL';
    if (filterId === 'LOW_CONFIDENCE') return typeof confidence === 'number' && confidence > 0 && confidence < 0.6;
    return true;
  };

  const matchesReviewFilter = (key: string) => checkFilterMatch(key, activeFilter);

  const handleFilterClick = (filterId: ReviewFilter) => {
    setActiveFilter(filterId);
  };
  const matchesFieldSearch = (key: string, label: string) => {
    if (!normalizedSearch) return true;
    return `${label} ${fieldValueToText(getFieldValue(key))}`.toLowerCase().includes(normalizedSearch);
  };
  const shouldShowField = (key: string, label: string) => {
    if (isStaffRevision) {
      return !isManagerAccepted(fieldResults[key]);
    }
    return matchesReviewFilter(key) && matchesFieldSearch(key, label);
  };
  const visibleFieldCount = isStaffRevision
    ? activeTabRevisionFields.length
    : activeTabFields.filter((field) => shouldShowField(field.key, field.label)).length;
  const tabStats = tabs.reduce<Record<TabType, { total: number; issues: number }>>((map, tab) => {
    const fields = TAB_FIELD_GROUPS[tab];
    map[tab] = {
      total: fields.length,
      issues: fields.filter((field) => fieldResults[field.key]?.validationStatus === 'FAIL').length,
    };
    return map;
  }, {} as Record<TabType, { total: number; issues: number }>);
  const renderReviewField = (key: string, label: string, content: React.ReactNode, fullWidth = false) => {
    if (!shouldShowField(key, label)) return null;
    return fullWidth ? (
      <div className={styles.fieldGridFull} key={key}>{content}</div>
    ) : (
      <React.Fragment key={key}>{content}</React.Fragment>
    );
  };

  return (
    <div className={styles.workspace}>
      {isStaffRevision ? (
        <div className={styles.revisionSummaryCard}>
          <div className={styles.revisionSummaryTop}>
            <div>
              <h3 className={styles.revisionSummaryTitle}>Revision requested</h3>
              <p className={styles.revisionSummarySubtitle}>
                Manager requested changes to {returnedFields.length} field{returnedFields.length !== 1 ? 's' : ''}{serverCandidate.revisionNumber ? ` · Round ${serverCandidate.revisionNumber}` : ''}
              </p>
            </div>
            <span className={styles.revisionSummaryMeta}>
              {serverCandidate.draftName || (serverCandidate.draftSequence ? `Draft ${serverCandidate.draftSequence}` : 'Draft')} &middot; Round {serverCandidate.revisionNumber || 1}
            </span>
          </div>

          {returnedFields.length > 0 && (
            <div className={styles.revisionFeedbackList}>
              {returnedFields.map(({ key, label, field }) => (
                <div key={key} className={styles.revisionFeedbackItem}>
                  <strong>{label}</strong>
                  <span>"{field?.previousManagerReviewComment || field?.managerReviewComment || 'Manager requested a change.'}"</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !readOnly ? (
        <div className={styles.candidateHeader}>
          <div className={styles.candidateHeaderLeft}>
            <span className={styles.candidateEyebrow}>{isManual ? 'MANUAL ENTRY' : 'AI EXTRACTED'}</span>
            {isEditingDraftName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <input
                  autoFocus
                  style={{ fontSize: '1.25rem', fontWeight: 600, padding: '4px 8px', border: '1px solid #3b82f6', borderRadius: '4px', width: '280px' }}
                  value={draftNameInput}
                  onChange={(e) => setDraftNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveDraftName();
                    else if (e.key === 'Escape') {
                      setIsEditingDraftName(false);
                      setRenameError(null);
                    }
                  }}
                  disabled={isRenamingDraft}
                />
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => void handleSaveDraftName()}
                  disabled={isRenamingDraft || !draftNameInput.trim()}
                  style={{ padding: '4px 10px', fontSize: '13px' }}
                >
                  {isRenamingDraft ? 'Saving...' : 'Save'}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setIsEditingDraftName(false);
                    setRenameError(null);
                  }}
                  disabled={isRenamingDraft}
                  style={{ padding: '4px 10px', fontSize: '13px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2>{serverCandidate.draftName || (serverCandidate.draftSequence ? `Draft ${serverCandidate.draftSequence}` : 'Draft')}</h2>
                {!readOnly && (serverCandidate.status === 'DRAFT' || serverCandidate.status === 'REVISION_REQUIRED') && (
                  <button
                    type="button"
                    title="Rename Draft"
                    onClick={() => {
                      setDraftNameInput(serverCandidate.draftName || (serverCandidate.draftSequence ? `Draft ${serverCandidate.draftSequence}` : 'Draft'));
                      setRenameError(null);
                      setIsEditingDraftName(true);
                    }}
                    style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={13} />
                    <span>Rename</span>
                  </button>
                )}
              </div>
            )}
            {renameError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '2px' }}>
                {renameError}
              </div>
            )}
            <div className={styles.candidateSubline} title={`Candidate ID: ${serverCandidate.id}`}>
              Round {serverCandidate.revisionNumber || 1}{isRevision ? ' preparation' : ''}{!isManual && ` \u00B7 ${totalFieldsGlobal} fields extracted`}
            </div>
          </div>
          <div className={styles.candidateHeaderRight}>
            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
              {serverCandidate.status}
            </span>
          </div>
        </div>
      ) : null}

      {!isStaffRevision && (isRejected || hasChangesRequested) && (
        <div className={styles.feedbackBanner}>
          <AlertCircle size={20} />
          <div className={styles.feedbackBody}>
            <strong>Manager Feedback</strong>
            <p>{returnedFields.length} field{returnedFields.length !== 1 ? 's' : ''} require revision.</p>
            {returnedFields.length > 0 && (
              <ul className={styles.feedbackList}>
                {returnedFields.map(({ key, label, field }) => (
                  <li key={key}>
                    <strong>{label}</strong>
                    <span>{field?.previousManagerReviewComment || field?.managerReviewComment || 'Manager requested a change.'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Target Company Confirmation Banner */}
      {requiresCompanyConfirmation && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            color: '#92400e',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#b45309' }}>Target Company Confirmation Required:</strong>{' '}
              The target company for this project is <strong>"{targetCompanyName || 'N/A'}"</strong>.
              Detected company in document:{' '}
              <strong>
                {serverCandidate.detectedCompanyName || 'Unknown company'}
              </strong>
              . Please confirm that this basic company information candidate belongs to the target company before submitting for review.
            </div>
          </div>

          {!readOnly && (
            <button
              className={styles.btnPrimary}
              style={{ padding: '6px 14px', fontSize: 12.5, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              type="button"
              onClick={() => confirmCompanyMutation.mutate(true)}
              disabled={confirmCompanyMutation.isPending}
            >
              {confirmCompanyMutation.isPending ? (
                <Loader2 size={13} className={styles.spin} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {confirmCompanyMutation.isPending ? 'Confirming...' : 'Confirm this company'}
            </button>
          )}
        </div>
      )}

      {!isManual && !isStaffRevision && (
        <div className={styles.qualityBar}>
          <CandidateQualitySummary
            metrics={serverCandidate.qualityMetrics || {}}
            status={serverCandidate.qualityStatus || 'UNKNOWN'}
          />
        </div>
      )}

      <div className={styles.layoutContainer}>
        <div className={styles.mainContent}>
          <div className={styles.tabsContainer}>
            {tabs.map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {isStaffRevision ? (
                  tabRevisionCounts[tab] > 0 && <span className={styles.tabCount}>{tabRevisionCounts[tab]}</span>
                ) : (
                  <>
                    <span className={styles.tabCount}>{tabStats[tab].total}</span>
                    {tabStats[tab].issues > 0 && <span className={styles.tabIssueDot}>{tabStats[tab].issues} issue</span>}
                  </>
                )}
              </button>
            ))}
          </div>

          {!isStaffRevision && (
            <div className={styles.quickFilterBar} aria-label="Review field filters">
              <div>
                <span>Review fields</span>
                <small>{visibleFieldCount} visible in {activeTab}</small>
              </div>
              <div className={styles.quickFilterActions}>
                {reviewFilters.map(filter => (
                  <button
                    type="button"
                    key={filter.id}
                    className={`${styles.quickFilterButton} ${activeFilter === filter.id ? styles.quickFilterButtonActive : ''}`}
                    onClick={() => handleFilterClick(filter.id)}
                  >
                    {filter.label} <strong>{filter.count}</strong>
                  </button>
                ))}

                {!readOnly && !isManual && (
                  <button
                    type="button"
                    className={styles.approveAllBtn}
                    onClick={handleApproveAllInTab}
                    title={`Approve all unconfirmed fields in ${activeTab}`}
                  >
                    <CheckCheck size={16} /> Approve All
                  </button>
                )}
              </div>
            </div>
          )}

          {isStaffRevision && (
            <div className={styles.revisionSectionHeading}>
              Fields requiring revision ({activeTabRevisionFields.length})
            </div>
          )}

          <div className={styles.tabContent}>
            {activeTab === 'Identity' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('identity.tradeName', 'Trade Name', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['identity.tradeName'])} revisionMode={isStaffRevision} isManual={isManual} label="Trade Name" fieldKey="identity.tradeName" fieldResult={fieldResults['identity.tradeName']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.website', 'Website', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['contact.website'])} revisionMode={isStaffRevision} isManual={isManual} label="Website" fieldKey="contact.website" fieldResult={fieldResults['contact.website']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.addresses', 'Addresses', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['contact.addresses'] || fieldResults['contact.address'])} revisionMode={isStaffRevision} isManual={isManual} label="Addresses" fieldKey="contact.addresses" fieldResult={fieldResults['contact.addresses'] || fieldResults['contact.address']} onChange={handleFieldChange} />, true)}
                {renderReviewField('contact.emails', 'Emails', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['contact.emails'])} revisionMode={isStaffRevision} isManual={isManual} label="Emails" fieldKey="contact.emails" fieldResult={fieldResults['contact.emails']} onChange={handleFieldChange} />)}
                {renderReviewField('contact.phones', 'Phones', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['contact.phones'])} revisionMode={isStaffRevision} isManual={isManual} label="Phones" fieldKey="contact.phones" fieldResult={fieldResults['contact.phones']} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeTab === 'Business' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.businessModel', 'Business Model', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['business.businessModel'])} revisionMode={isStaffRevision} isManual={isManual} label="Business Model" fieldKey="business.businessModel" type="textarea" fieldResult={fieldResults['business.businessModel']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.industries', 'Industries', <EditableIndustryField disabled={readOnly || isManagerAccepted(fieldResults['business.industries'])} revisionMode={isStaffRevision} isManual={isManual} label="Industries" fieldKey="business.industries" fieldResult={fieldResults['business.industries']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.foundedYear', 'Founded Year', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['business.foundedYear'])} revisionMode={isStaffRevision} isManual={isManual} label="Founded Year" type="number" fieldKey="business.foundedYear" fieldResult={fieldResults['business.foundedYear']} onChange={handleFieldChange} />)}
                {renderReviewField('companySize.employeeCount', 'Employee Count', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['companySize.employeeCount'])} revisionMode={isStaffRevision} isManual={isManual} label="Employee Count" type="number" fieldKey="companySize.employeeCount" fieldResult={fieldResults["companySize.employeeCount"]} onChange={handleFieldChange} />)}
                {renderReviewField('business.companyDescription', 'Company Description', <EditableScalarField disabled={readOnly || isManagerAccepted(fieldResults['business.companyDescription'])} revisionMode={isStaffRevision} isManual={isManual} label="Company Description" fieldKey="business.companyDescription" type="textarea" fieldResult={fieldResults['business.companyDescription']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {activeTab === 'Market & Product' && (
              <div className={styles.fieldGrid}>
                {renderReviewField('business.markets', 'Markets (Regions)', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['business.markets'])} revisionMode={isStaffRevision} isManual={isManual} label="Markets (Regions)" fieldKey="business.markets" fieldResult={fieldResults['business.markets']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.targetCustomers', 'Target Customers', <EditableListField disabled={readOnly || isManagerAccepted(fieldResults['business.targetCustomers'])} revisionMode={isStaffRevision} isManual={isManual} label="Target Customers" fieldKey="business.targetCustomers" fieldResult={fieldResults['business.targetCustomers']} onChange={handleFieldChange} />, true)}
                {renderReviewField('business.products', 'Products & Services', <EditableProductList disabled={readOnly || isManagerAccepted(fieldResults['business.products'])} revisionMode={isStaffRevision} isManual={isManual} label="Products & Services" fieldKey="business.products" fieldResult={fieldResults['business.products']} onChange={handleFieldChange} />, true)}
              </div>
            )}

            {visibleFieldCount === 0 && (
              <div className={styles.emptyFilteredState}>
                {isStaffRevision ? `All fields in ${activeTab} were approved by Manager.` : 'No fields match the current search or filter.'}
              </div>
            )}

            {isStaffRevision && allApprovedFields.length > 0 && (
              <div className={styles.approvedSection}>
                <button
                  type="button"
                  className={styles.approvedSectionToggle}
                  onClick={() => setShowApproved(!showApproved)}
                >
                  <span className={styles.approvedCheckIcon}>✓</span>
                  <span><strong>{allApprovedFields.length}</strong> previously approved field{allApprovedFields.length !== 1 ? 's' : ''}</span>
                  <span className={styles.approvedActionText}>
                    {showApproved ? 'Hide approved fields' : 'View approved fields'}
                  </span>
                  {showApproved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showApproved && (
                  <div className={styles.compactApprovedList}>
                    {allApprovedFields.map(f => (
                      <div key={f.key} className={styles.compactApprovedRow}>
                        <span className={styles.compactApprovedLabel}>{f.label}</span>
                        <span className={styles.compactApprovedValue}>{fieldValueToText(getFieldValue(f.key)) || '—'}</span>
                        <span className={styles.compactApprovedBadge}>Approved</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isStaffRevision && (
          <div className={styles.sidebar}>
            {isManual ? (
              <div className={styles.staffReviewPanel}>
                <h3>Manual Entry</h3>

                <div className={styles.staffProgressBlock}>
                  <div className={styles.staffProgressTopline}>
                    <span>{filledCount} / {totalFieldsGlobal} fields filled</span>
                    <strong>{filledPercent}%</strong>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${filledPercent}%`, backgroundColor: '#2563eb' }}
                    />
                    <span className={styles.progressBarLabel}>{filledPercent}%</span>
                  </div>
                </div>

                <div className={styles.staffReviewStats}>
                  <div className={styles.staffReviewStat}>
                    <span>
                      <i className={styles.dotConfirmed}></i>
                      Filled Fields
                    </span>
                    <strong>{filledCount}</strong>
                  </div>

                  <div className={styles.staffReviewStat}>
                    <span>
                      <i className={styles.dotPending}></i>
                      Empty (Optional)
                    </span>
                    <strong>{emptyCount}</strong>
                  </div>

                  {tabIssueFields > 0 && (
                    <div className={`${styles.staffReviewStat} ${styles.staffReviewWarning}`}>
                      <span>
                        <AlertCircle size={14} />
                        Format Issues
                      </span>
                      <strong>{tabIssueFields}</strong>
                    </div>
                  )}
                </div>

                <div className={styles.sidebarSection}>
                  <h3>Sections</h3>
                  <div className={styles.staffReviewStats}>
                    {tabs.map((tab) => (
                      <div key={tab} className={styles.staffReviewStat}>
                        <span>{tab}</span>
                        <strong>{tabFilledStats[tab]?.filled ?? 0} / {tabFilledStats[tab]?.total ?? 0}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.staffReviewPanel}>
                <h3>Review</h3>

                <div className={styles.staffProgressBlock}>
                  <div className={styles.staffProgressTopline}>
                    <span>{resolvedFields} / {totalFieldsGlobal} confirmed</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#16a34a' : '#2563eb' }}
                    />
                    <span className={styles.progressBarLabel}>{progressPercent}%</span>
                  </div>
                </div>

                <div className={styles.staffReviewStats}>
                  <div className={styles.staffReviewStat}>
                    <span>
                      <i className={styles.dotConfirmed}></i>
                      Confirmed
                    </span>
                    <strong>{resolvedFields}</strong>
                  </div>

                  <div className={styles.staffReviewStat}>
                    <span>
                      <i className={styles.dotPending}></i>
                      Pending
                    </span>
                    <strong>{totalFieldsGlobal - resolvedFields}</strong>
                  </div>

                  {tabIssueFields > 0 && (
                    <div className={`${styles.staffReviewStat} ${styles.staffReviewWarning}`}>
                      <span>
                        <AlertCircle size={14} />
                        Validation Issues
                      </span>
                      <strong>{tabIssueFields}</strong>
                    </div>
                  )}

                  {tabLowConfidenceFields > 0 && (
                    <div className={`${styles.staffReviewStat} ${styles.staffReviewCaution}`}>
                      <span>
                        <AlertCircle size={14} />
                        Low Confidence
                      </span>
                      <strong>{tabLowConfidenceFields}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className={styles.actionBar}>
          <div className={styles.actionBarLeft}>
            {isSubmitEnabled && unsavedCount === 0 ? (
              <span className={styles.progressTitle} style={{ fontWeight: '600', color: '#16a34a' }}>
                ✓ Ready to submit
              </span>
            ) : !isManualDataValid ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                <AlertCircle size={15} />
                Please fix format issues (email, website, phone)
              </span>
            ) : unsavedCount > 0 ? (
              <span className={styles.actionBarDirty}>
                {unsavedCount} unsaved change{unsavedCount !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          <div className={styles.actionBarRight}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                if (unsavedCount > 0) {
                  handleDiscard();
                } else if (onCancel) {
                  onCancel();
                }
              }}
              disabled={isSaving || submitLoading}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSave}
              disabled={unsavedCount === 0 || isSaving || submitLoading}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>

            {onSubmit && (
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={onSubmit}
                disabled={unsavedCount > 0 || !isSubmitEnabled || submitLoading}
                title={
                  requiresCompanyConfirmation
                    ? "Target company confirmation required before submission"
                    : unsavedCount > 0
                      ? "Please save draft before submitting"
                      : !isManualDataValid
                        ? "Please provide valid format for filled fields (website, email, phone)"
                        : isSubmitEnabled
                          ? (isManual ? "Submit manual candidate to Manager" : "Submit to Manager")
                          : `${tabPendingFields} field${tabPendingFields !== 1 ? 's' : ''} still require confirmation`
                }
              >
                {submitLoading ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
