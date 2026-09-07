import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  ContractResearchResponse,
  ContractEntry,
  ContractFieldQualityStatus,
  ContractType,
  ExtractedContractField,
  ContractExtractionStage,
  ContractExtractionStatus,
} from '../../types/contractResearch';
import { contractResearchApi } from '../../API/contractResearchApi';
import { API_BASE_URL } from '../../services/api';
import AddContractModal from './AddContractModal';
import { ContractCard } from './ContractCard';
import { TypeResolutionModal } from './TypeResolutionModal';
import { EditScalarFieldModal } from './EditScalarFieldModal';
import { EditArrayItemModal } from './EditArrayItemModal';
import { EditContractModal } from './EditContractModal';
import { ContractEvidenceDrawer } from './ContractEvidenceDrawer';
import { ContractProgressBar } from './ContractProgressBar';
import {
  FileText,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Loader2,
  Eye,
  Scale,
  Briefcase,
  Users,
  Check,
  ShieldCheck,
  Edit3,
  Clock,
  X,
} from 'lucide-react';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';
import contractStyles from './ContractResearchWorkbench.module.css';

interface ContractResearchWorkbenchProps {
  projectId: number;
  taskId: number;
  taskTitle?: string | null;
  taskDescription?: string | null;
  taskStatus?: string | null;
  taskTypeLabel?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  assignedToName?: string | null;
  canEdit?: boolean;
  isManagerMode?: boolean;
  submissionId?: number;
  onRefreshWorkbench?: () => void;
  onRecallSuccess?: () => void;
  onSubmitSuccess?: () => void;
  onReviewCompleted?: () => void;
  onClose?: () => void;
}

interface FlattenedContractRow {
  id: string;
  fieldPath: string;
  label: string;
  value: string;
  unit?: string;
  section: 'General Terms' | 'Contracting Parties' | 'Subtype Specific';
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  isItem?: boolean;
  itemId?: string;
  rawField?: ExtractedContractField<any> | null;
  rawPayload?: Record<string, any>;
}

const formatContractType = (type?: string | null) => {
  if (!type || type === 'UNKNOWN' || type === 'AUTO_DETECT') return 'Auto Detect';
  if (type === 'COOPERATION_AGREEMENT') return 'Cooperation Agreement';
  if (type === 'PARTNERSHIP_AGREEMENT') return 'Strategic Partnership';
  if (type === 'JOINT_VENTURE_AGREEMENT') return 'Joint Venture (JVA)';
  if (type === 'BUSINESS_COOPERATION_CONTRACT') return 'Business Cooperation (BCC)';
  return type.replace(/_/g, ' ');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatNumericValue = (val?: number | string | null) => {
  if (val === undefined || val === null || val === '') return '—';
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return new Intl.NumberFormat('en-US').format(num);
  }
  return String(val);
};

export const ContractResearchWorkbench: React.FC<ContractResearchWorkbenchProps> = ({
  projectId,
  taskId,
  taskStatus,
  taskTypeLabel,
  dueDate,
  targetCompanyName,
  canEdit = true,
  isManagerMode = false,
  submissionId,
  onRecallSuccess,
  onSubmitSuccess,
  onReviewCompleted,
  onClose,
}) => {
  const [research, setResearch] = useState<ContractResearchResponse | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Manager Review states
  const [isManagerProcessing, setIsManagerProcessing] = useState(false);
  const [managerRequestChangesModalOpen, setManagerRequestChangesModalOpen] = useState(false);
  const [managerReviewActionContractId, setManagerReviewActionContractId] = useState<string | null>(null);
  const [managerChangesReason, setManagerChangesReason] = useState('');

  // Selection for package submission
  const [selectedContractIdsForSubmission, setSelectedContractIdsForSubmission] = useState<string[]>([]);
  const hasInitializedSelection = useRef(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isRecalling, setIsRecalling] = useState(false);
  const [, setVerifyingRowId] = useState<string | null>(null);
  const [isReExtractingMap, setIsReExtractingMap] = useState<Record<string, boolean>>({});
  const [cancellingExtractId, setCancellingExtractId] = useState<string | null>(null);

  // Evidence Drawer state
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState<{
    fieldName: string;
    valueText?: string | number | null;
    sourcePage?: number | null;
    evidence?: string | null;
    confidence?: number | null;
    qualityStatus?: ContractFieldQualityStatus;
    verificationStatus?: 'VERIFIED' | 'UNVERIFIED';
    onVerify?: () => void;
    onEdit?: () => void;
  } | null>(null);

  // Type Resolution Modal
  const [typeResolutionModalOpen, setTypeResolutionModalOpen] = useState(false);

  // Edit Modals
  const [editScalarModal, setEditScalarModal] = useState<{
    open: boolean;
    contractId: string;
    fieldPath: string;
    fieldName: string;
    rawField?: ExtractedContractField<any> | null;
    fieldType?: 'text' | 'date' | 'number' | 'textarea';
  }>({ open: false, contractId: '', fieldPath: '', fieldName: '', rawField: null, fieldType: 'text' });

  const [editArrayItemModal, setEditArrayItemModal] = useState<{
    open: boolean;
    contractId: string;
    fieldPath: string;
    itemId: string;
    itemName: string;
    initialPayload: Record<string, any>;
    sourcePage?: number | null;
    evidence?: string | null;
  }>({
    open: false,
    contractId: '',
    fieldPath: '',
    itemId: '',
    itemName: '',
    initialPayload: {},
  });

  const [editContractModalContract, setEditContractModalContract] = useState<ContractEntry | null>(null);

  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [isConfirmingCompany, setIsConfirmingCompany] = useState(false);

  const pollingRef = useRef<any>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchResearch = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      try {
        const data = await contractResearchApi.getResearch(projectId, taskId);
        setResearch(data);

        // Auto-select contract if not selected
        if (data.contracts && data.contracts.length > 0) {
          setSelectedContractId((prev) => {
            if (prev && data.contracts.some((c) => c.id === prev)) return prev;
            return data.contracts[0].id;
          });
        }
      } catch (err: any) {
        setToast({
          message: err?.response?.data?.message || err?.message || 'Failed to load contract research.',
          type: 'error',
        });
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [projectId, taskId]
  );

  useEffect(() => {
    fetchResearch(true);
  }, [fetchResearch]);

  const contracts = useMemo(() => research?.contracts || [], [research?.contracts]);
  const isAnyExtracting = useMemo(
    () => contracts.some((c) => c.extractionStatus === 'PROCESSING'),
    [contracts]
  );

  // Polling when any contract is extracting
  useEffect(() => {
    if (isAnyExtracting) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          fetchResearch(false);
        }, 2000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isAnyExtracting, fetchResearch]);

  const isSubmitted = research?.status === 'SUBMITTED' || research?.status === 'APPROVED';
  const effectiveCanEdit = !isManagerMode && canEdit && !isSubmitted;

  // Selected contract
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) || null,
    [contracts, selectedContractId]
  );

  // Helper to extract structured rows for any contract
  const extractContractRows = (contract: ContractEntry | null | undefined): FlattenedContractRow[] => {
    if (!contract || contract.extractionStatus !== 'COMPLETED') return [];
    const rows: FlattenedContractRow[] = [];

    const common = contract.commonData;
    if (common) {
      // 1. Contract Number
      rows.push({
        id: 'gen-contractNumber',
        fieldPath: 'contractNumber',
        label: 'Contract Number',
        value: common.contractNumber?.value || 'N/A',
        section: 'General Terms',
        qualityStatus: common.contractNumber?.qualityStatus || 'VALID',
        verificationStatus: common.contractNumber?.verificationStatus || 'UNVERIFIED',
        rawField: common.contractNumber,
      });

      // 2. Signing Date
      rows.push({
        id: 'gen-signingDate',
        fieldPath: 'signingDate',
        label: 'Signing Date',
        value: common.signingDate?.value ? String(common.signingDate.value) : 'N/A',
        section: 'General Terms',
        qualityStatus: (common.signingDate?.value ? common.signingDate?.qualityStatus : 'VALID') || 'VALID',
        verificationStatus: common.signingDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.signingDate as any,
      });

      // 3. Effective Date
      rows.push({
        id: 'gen-effectiveDate',
        fieldPath: 'effectiveDate',
        label: 'Effective Date',
        value: common.effectiveDate?.value ? String(common.effectiveDate.value) : 'N/A',
        section: 'General Terms',
        qualityStatus: (common.effectiveDate?.value ? common.effectiveDate?.qualityStatus : 'VALID') || 'VALID',
        verificationStatus: common.effectiveDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.effectiveDate as any,
      });

      // 4. Expiry Date
      rows.push({
        id: 'gen-expiryDate',
        fieldPath: 'expiryDate',
        label: 'Expiry Date',
        value: common.expiryDate?.value ? String(common.expiryDate.value) : 'N/A',
        section: 'General Terms',
        qualityStatus: (common.expiryDate?.value ? common.expiryDate?.qualityStatus : 'VALID') || 'VALID',
        verificationStatus: common.expiryDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.expiryDate as any,
      });

      // 5. Contract Term
      rows.push({
        id: 'gen-term',
        fieldPath: 'term',
        label: 'Contract Term',
        value: common.term?.value || 'N/A',
        section: 'General Terms',
        qualityStatus: common.term?.qualityStatus || 'VALID',
        verificationStatus: common.term?.verificationStatus || 'UNVERIFIED',
        rawField: common.term,
      });

      // 6. Contract Value
      const cv = common.contractValue?.value;
      const cvDisplay = cv?.amount != null
        ? formatNumericValue(cv.amount)
        : (cv?.rawAmountText || 'N/A');
      const cvUnit = cv?.amount != null ? (cv.currency || 'VND') : '';
      rows.push({
        id: 'gen-contractValue',
        fieldPath: 'contractValue',
        label: 'Contract Value',
        value: cvDisplay,
        unit: cvUnit,
        section: 'General Terms',
        qualityStatus: common.contractValue?.qualityStatus || 'VALID',
        verificationStatus: common.contractValue?.verificationStatus || 'UNVERIFIED',
        rawField: common.contractValue as any,
      });

      // 7. Governing Law
      rows.push({
        id: 'gen-governingLaw',
        fieldPath: 'governingLaw',
        label: 'Governing Law & Dispute Resolution',
        value: common.governingLaw?.value || 'N/A',
        section: 'General Terms',
        qualityStatus: common.governingLaw?.qualityStatus || 'VALID',
        verificationStatus: common.governingLaw?.verificationStatus || 'UNVERIFIED',
        rawField: common.governingLaw,
      });

      // 8. Purpose
      rows.push({
        id: 'gen-purpose',
        fieldPath: 'purpose',
        label: 'Cooperation Purpose',
        value: common.purpose?.value || 'N/A',
        section: 'General Terms',
        qualityStatus: common.purpose?.qualityStatus || 'VALID',
        verificationStatus: common.purpose?.verificationStatus || 'UNVERIFIED',
        rawField: common.purpose,
      });

      // 9. Contracting Parties
      (common.parties || []).forEach((party, idx) => {
        rows.push({
          id: `party-${party.id || idx}`,
          fieldPath: 'parties',
          label: `Party: ${party.legalName}`,
          value: party.role || '',
          section: 'Contracting Parties',
          qualityStatus: party.qualityStatus || 'VALID',
          verificationStatus: party.verificationStatus || 'UNVERIFIED',
          isItem: true,
          itemId: party.id,
        });
      });
    }

    return rows;
  };

  // Flattened structured rows count for the selected contract
  const flattenedRows = useMemo<FlattenedContractRow[]>(
    () => extractContractRows(selectedContract),
    [selectedContract]
  );

  // Contracts to display (In Manager mode, only show submitted contracts)
  const contractsToDisplay = useMemo(() => {
    if (isManagerMode) {
      const activeIds = research?.activeSubmittedContractIds || [];
      return contracts.filter(
        (c) =>
          activeIds.includes(c.id) ||
          c.reviewStatus === 'PENDING_REVIEW' ||
          c.reviewStatus === 'CHANGES_REQUESTED' ||
          c.reviewStatus === 'APPROVED'
      );
    }
    return contracts;
  }, [isManagerMode, contracts, research?.activeSubmittedContractIds]);

  // Ensure active contract in Manager mode is within displayed contracts
  useEffect(() => {
    if (isManagerMode && contractsToDisplay.length > 0) {
      if (!selectedContractId || !contractsToDisplay.some((c) => c.id === selectedContractId)) {
        setSelectedContractId(contractsToDisplay[0].id);
      }
    }
  }, [isManagerMode, contractsToDisplay, selectedContractId]);

  // Eligible contracts for submission
  useEffect(() => {
    const draftIds = contracts.filter((c) => c.reviewStatus === 'DRAFT').map((c) => c.id);
    if (!hasInitializedSelection.current && contracts.length > 0) {
      setSelectedContractIdsForSubmission(draftIds);
      hasInitializedSelection.current = true;
    } else if (hasInitializedSelection.current) {
      setSelectedContractIdsForSubmission((prev) =>
        prev.filter((id) => draftIds.includes(id))
      );
    }
  }, [contracts]);

  // Submission Package Counts
  const hasMultipleContracts = contracts.length > 1;

  const effectiveSubmissionIds = useMemo(() => {
    if (!hasMultipleContracts) {
      return contracts.length === 1 && contracts[0].reviewStatus !== 'APPROVED'
        ? [contracts[0].id]
        : [];
    }
    return selectedContractIdsForSubmission;
  }, [hasMultipleContracts, contracts, selectedContractIdsForSubmission]);

  const selectedContractsForSubmission = useMemo(
    () => contracts.filter((c) => effectiveSubmissionIds.includes(c.id)),
    [contracts, effectiveSubmissionIds]
  );

  const packageCounts = useMemo(() => {
    const total = contracts.length;
    const extracted = contracts.filter((c) => c.extractionStatus === 'COMPLETED').length;
    const selected = effectiveSubmissionIds.length;
    const needsReview = selectedContractsForSubmission.filter(
      (c) => c.extractionStatus === 'COMPLETED' && (c.companyMatchStatus === 'MISMATCH' || c.typeValidationStatus === 'MISMATCH')
    ).length;

    return { total, extracted, selected, needsReview };
  }, [contracts, effectiveSubmissionIds, selectedContractsForSubmission]);

  const allApproved = contracts.length > 0 && contracts.every((c) => c.reviewStatus === 'APPROVED');
  const canSubmit = !allApproved && packageCounts.selected > 0 && packageCounts.needsReview === 0 && effectiveCanEdit;
  const canRecall = isSubmitted && research?.canRecallSubmission === true;

  // Actions
  const handleExtract = async (contractId: string) => {
    if (isAnyExtracting) {
      setToast({
        message: 'Another document is currently being processed by AI. Please wait for completion before proceeding.',
        type: 'error',
      });
      return;
    }

    setSelectedContractId(contractId);
    try {
      const updated = await contractResearchApi.extractContract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'AI contract data extraction started.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Extraction failed.', type: 'error' });
    }
  };

  const handleReExtract = async (contractId: string) => {
    const isAnyOtherExtracting = (research?.contracts || []).some(
      (c) => c.id !== contractId && c.extractionStatus === 'PROCESSING'
    );
    if (isAnyOtherExtracting) {
      setToast({
        message: 'Another document is currently being processed by AI. Please wait for completion before proceeding.',
        type: 'error',
      });
      return;
    }

    // Auto-select this contract so the workbench right panel shows its progress
    setSelectedContractId(contractId);
    setIsReExtractingMap((prev) => ({ ...prev, [contractId]: true }));

    // Optimistically update status to PROCESSING so UI switches immediately to progress bar
    setResearch((prev) => {
      if (!prev || !prev.contracts) return prev;
      return {
        ...prev,
        contracts: prev.contracts.map((c) =>
          c.id === contractId
            ? {
                ...c,
                extractionStatus: 'PROCESSING' as ContractExtractionStatus,
                extractionStage: 'EXTRACTING_FIELDS' as ContractExtractionStage,
                extractionProgress: 20,
                extractionErrorMessage: null,
              }
            : c
        ),
      };
    });

    try {
      const updated = await contractResearchApi.reExtractContract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'AI contract re-extraction started.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Re-extraction failed.', type: 'error' });
      fetchResearch(false);
    } finally {
      setIsReExtractingMap((prev) => ({ ...prev, [contractId]: false }));
    }
  };

  const handleCancelExtract = async (contractId: string) => {
    setCancellingExtractId(contractId);
    try {
      const updated = await contractResearchApi.cancelExtract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'Extraction process cancelled.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to cancel extraction.', type: 'error' });
    } finally {
      setCancellingExtractId(null);
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      const updated = await contractResearchApi.deleteContract(projectId, taskId, contractToDelete.id);
      setResearch(updated);
      setContractToDelete(null);
      setToast({ message: 'Contract deleted successfully.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to delete contract.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasUnresolvedNeedsReview = (c: ContractEntry) => {
    if (!c.commonData) return false;
    const common = c.commonData;
    const fields = [
      common.contractTitle,
      common.contractNumber,
      common.signingDate,
      common.effectiveDate,
      common.expiryDate,
      common.term,
      common.contractValue,
      common.governingLaw,
      common.purpose,
    ];
    for (const f of fields) {
      if (f && f.value != null && f.value !== '' && f.qualityStatus === 'NEEDS_REVIEW' && f.verificationStatus === 'UNVERIFIED') {
        const valStr = typeof f.value === 'object' && 'rawAmountText' in f.value ? (f.value.rawAmountText || '') : String(f.value);
        if (valStr.trim().toUpperCase() !== 'N/A') {
          return true;
        }
      }
    }
    if (common.parties) {
      for (const p of common.parties) {
        if (p && (p.legalName || p.role) && p.qualityStatus === 'NEEDS_REVIEW' && p.verificationStatus === 'UNVERIFIED') {
          if (p.legalName && p.legalName.trim().toUpperCase() !== 'N/A') {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleSubmitPackage = async () => {
    if (!effectiveCanEdit) return;

    if (effectiveSubmissionIds.length === 0) {
      setToast({
        message: contracts.length === 1
          ? 'This contract has already been approved and does not need to be submitted again.'
          : 'Please select at least one contract to submit for review.',
        type: 'error',
      });
      return;
    }

    const notCompletedContract = selectedContractsForSubmission.find(
      (c) => c.extractionStatus !== 'COMPLETED'
    );
    if (notCompletedContract) {
      setSelectedContractId(notCompletedContract.id);
      setToast({
        message: `Contract "${notCompletedContract.title}" has not completed AI extraction. Please wait or inspect before submitting.`,
        type: 'error',
      });
      return;
    }

    const unconfirmedMatch = selectedContractsForSubmission.find(
      (c) => c.extractionStatus === 'COMPLETED' && !c.companyMatchConfirmed && c.companyMatchStatus !== 'MATCH'
    );
    if (unconfirmedMatch) {
      setSelectedContractId(unconfirmedMatch.id);
      setToast({
        message: `Contract "${unconfirmedMatch.title}" has not been confirmed as matching the target company. Please confirm it in the warning banner before submitting.`,
        type: 'error',
      });
      return;
    }

    const typeMismatch = selectedContractsForSubmission.find(
      (c) => c.extractionStatus === 'COMPLETED' && c.typeValidationStatus === 'MISMATCH'
    );
    if (typeMismatch) {
      setSelectedContractId(typeMismatch.id);
      setToast({
        message: `Contract "${typeMismatch.title}" has an unresolved contract type mismatch. Please resolve it before submitting.`,
        type: 'error',
      });
      return;
    }

    const needsReviewContract = selectedContractsForSubmission.find(
      (c) => c.extractionStatus === 'COMPLETED' && hasUnresolvedNeedsReview(c)
    );
    if (needsReviewContract) {
      setSelectedContractId(needsReviewContract.id);
      setToast({
        message: `Contract "${needsReviewContract.title}" has unverified fields flagged as "Needs Review". Please review and verify before submitting.`,
        type: 'error',
      });
      return;
    }

    const unverifiedContract = selectedContractsForSubmission.find((c) => {
      if (c.extractionStatus !== 'COMPLETED') return false;
      const rows = extractContractRows(c);
      return rows.some((r) => r.verificationStatus !== 'VERIFIED');
    });
    if (unverifiedContract) {
      const rows = extractContractRows(unverifiedContract);
      const unverifiedCount = rows.filter((r) => r.verificationStatus !== 'VERIFIED').length;
      setSelectedContractId(unverifiedContract.id);
      setToast({
        message: `Contract "${unverifiedContract.title}" has unverified fields (${unverifiedCount}/${rows.length}). Please verify all fields before submitting for review.`,
        type: 'error',
      });
      return;
    }

    setIsSubmittingPackage(true);
    try {
      const noteToSend = selectedContractsForSubmission.some((c) => c.reviewStatus === 'CHANGES_REQUESTED')
        ? 'Completed revisions per Manager feedback.'
        : 'Partner contracts submitted for Manager review.';

      const updated = await contractResearchApi.submitResearch(
        projectId,
        taskId,
        effectiveSubmissionIds,
        noteToSend
      );
      setResearch(updated);
      setToast({ message: 'Contracts submitted for review successfully!', type: 'success' });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err: any) {
      const backendMsg = err?.payload?.message || err?.message || err?.response?.data?.message || '';
      const errorCode = err?.payload?.errorCode || '';

      let displayMsg = 'Failed to submit contracts for review.';
      if (errorCode === 'COMPANY_MATCH_UNCONFIRMED' || backendMsg.includes('requires company match confirmation')) {
        displayMsg = 'Contract is not confirmed for the target company. Please confirm before submitting.';
      } else if (errorCode === 'UNVERIFIED_FIELDS' || backendMsg.includes('chưa hoàn tất xác thực') || backendMsg.includes('unverified')) {
        displayMsg = 'Contract fields must be fully verified before submitting for review.';
      } else if (errorCode === 'UNRESOLVED_NEEDS_REVIEW' || backendMsg.includes('NEEDS_REVIEW')) {
        displayMsg = 'Contract still contains unverified "Needs Review" fields.';
      } else if (errorCode === 'TYPE_MISMATCH_UNRESOLVED' || backendMsg.includes('type mismatch')) {
        displayMsg = 'Contract has an unresolved contract type mismatch.';
      } else if (errorCode === 'ACTIVE_SUBMISSION_EXISTS' || backendMsg.includes('already active')) {
        displayMsg = 'This task already has an active submission awaiting Manager review.';
      } else if (errorCode === 'EMPTY_SUBMISSION') {
        displayMsg = 'Please select at least one contract to submit for review.';
      } else if (backendMsg && backendMsg !== 'An unexpected error occurred.') {
        displayMsg = backendMsg;
      }

      setToast({ message: displayMsg, type: 'error' });
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const handleRecallSubmission = async () => {
    setIsRecalling(true);
    try {
      const updated = await contractResearchApi.recallSubmission(projectId, taskId);
      setResearch(updated);
      setIsRecallModalOpen(false);
      setToast({ message: 'Submission successfully recalled. Task is now In Progress.', type: 'success' });
      if (onRecallSuccess) onRecallSuccess();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to recall submission.', type: 'error' });
    } finally {
      setIsRecalling(false);
    }
  };

  const handleVerifyRow = async (row: {
    id: string;
    fieldPath: string;
    label: string;
    value: string;
    section: 'General Terms' | 'Contracting Parties' | 'Subtype Specific';
    qualityStatus: ContractFieldQualityStatus;
    verificationStatus: 'VERIFIED' | 'UNVERIFIED';
    isItem?: boolean;
    itemId?: string;
    rawField?: ExtractedContractField<any> | null;
  }) => {
    if (!selectedContract) return;
    setVerifyingRowId(row.id);
    const isCurrentlyVerified = row.verificationStatus === 'UNVERIFIED' || row.rawField?.verificationStatus === 'VERIFIED';
    try {
      if (row.isItem && row.itemId) {
        const updated = isCurrentlyVerified
          ? await contractResearchApi.unverifyArrayItem(
              projectId,
              taskId,
              selectedContract.id,
              row.fieldPath,
              row.itemId
            )
          : await contractResearchApi.verifyArrayItem(
              projectId,
              taskId,
              selectedContract.id,
              row.fieldPath,
              row.itemId
            );
        setResearch(updated);
      } else {
        const updated = isCurrentlyVerified
          ? await contractResearchApi.unverifyScalarField(
              projectId,
              taskId,
              selectedContract.id,
              row.fieldPath
            )
          : await contractResearchApi.verifyScalarField(
              projectId,
              taskId,
              selectedContract.id,
              row.fieldPath
            );
        setResearch(updated);
      }
      setToast({
        message: isCurrentlyVerified ? 'Field unverified successfully.' : 'Field verified successfully.',
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || (isCurrentlyVerified ? 'Failed to unverify field.' : 'Failed to verify field.'),
        type: 'error',
      });
    } finally {
      setVerifyingRowId(null);
    }
  };

  const handleVerifyAllEligible = async () => {
    if (!selectedContract || !effectiveCanEdit) return;
    const unverifiedRows = flattenedRows.filter((r) => r.verificationStatus !== 'VERIFIED');
    const rowsToProcess = unverifiedRows.length > 0 ? unverifiedRows : flattenedRows;
    if (rowsToProcess.length === 0) return;

    setIsVerifyingAll(true);
    try {
      const updated = await contractResearchApi.verifyAllContractFields(
        projectId,
        taskId,
        selectedContract.id
      );
      if (updated) {
        setResearch(updated);
      }
      setToast({ message: 'All contract fields verified successfully.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error verifying contract fields.', type: 'error' });
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleUnverifyAll = async () => {
    if (!selectedContract || !effectiveCanEdit) return;
    setIsVerifyingAll(true);
    try {
      const updated = await contractResearchApi.unverifyAllContractFields(
        projectId,
        taskId,
        selectedContract.id
      );
      if (updated) {
        setResearch(updated);
      }
      setToast({ message: 'All contract fields unverified.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error unverifying contract fields.', type: 'error' });
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleConfirmCompanyMatch = async (contractId: string, confirmed: boolean) => {
    setIsConfirmingCompany(true);
    try {
      const updated = await contractResearchApi.confirmCompany(projectId, taskId, contractId, confirmed);
      setResearch(updated);
      setToast({ message: 'Target company confirmed for this contract.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to confirm target company.', type: 'error' });
    } finally {
      setIsConfirmingCompany(false);
    }
  };

  const handleManagerApprove = async (contractId: string) => {
    const effSubId = submissionId || research?.activeSubmissionId || 0;
    setIsManagerProcessing(true);
    try {
      const updated = await contractResearchApi.reviewContract(
        projectId,
        taskId,
        effSubId,
        contractId,
        'APPROVED'
      );
      setResearch(updated);
      setToast({ message: 'Contract approved successfully.', type: 'success' });
      const remainingPending = (updated.contracts || []).filter(
        (c) => (updated.activeSubmittedContractIds?.includes(c.id) || c.reviewStatus === 'PENDING_REVIEW') && c.reviewStatus === 'PENDING_REVIEW'
      );
      if (remainingPending.length === 0 && onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to approve contract.', type: 'error' });
    } finally {
      setIsManagerProcessing(false);
    }
  };

  const handleManagerRequestChanges = async (contractId: string, reason: string) => {
    if (!reason.trim()) {
      setToast({ message: 'Please provide a reason for requesting changes.', type: 'error' });
      return;
    }
    const effSubId = submissionId || research?.activeSubmissionId || 0;
    setIsManagerProcessing(true);
    try {
      const updated = await contractResearchApi.reviewContract(
        projectId,
        taskId,
        effSubId,
        contractId,
        'CHANGES_REQUESTED',
        reason.trim()
      );
      setResearch(updated);
      setManagerRequestChangesModalOpen(false);
      setManagerChangesReason('');
      setToast({ message: 'Revision request submitted to Staff successfully.', type: 'success' });
      if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to request changes.', type: 'error' });
    } finally {
      setIsManagerProcessing(false);
    }
  };

  const handleManagerApproveAll = async () => {
    const effSubId = submissionId || research?.activeSubmissionId || 0;
    const pendingContracts = contractsToDisplay.filter(
      (c) => c.reviewStatus === 'PENDING_REVIEW'
    );
    if (pendingContracts.length === 0) return;

    setIsManagerProcessing(true);
    try {
      let currentResearch: ContractResearchResponse | null = null;
      for (const contract of pendingContracts) {
        currentResearch = await contractResearchApi.reviewContract(
          projectId,
          taskId,
          effSubId,
          contract.id,
          'APPROVED'
        );
      }
      if (currentResearch) {
        setResearch(currentResearch);
      }
      setToast({ message: `Approved all ${pendingContracts.length} pending contract(s).`, type: 'success' });
      if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error approving contracts.', type: 'error' });
    } finally {
      setIsManagerProcessing(false);
    }
  };

  const handleOpenEdit = (row: {
    id: string;
    fieldPath: string;
    label: string;
    value: string;
    section: 'General Terms' | 'Contracting Parties' | 'Subtype Specific';
    qualityStatus: ContractFieldQualityStatus;
    verificationStatus: 'VERIFIED' | 'UNVERIFIED';
    fieldType?: 'text' | 'date' | 'number' | 'textarea';
    isItem?: boolean;
    itemId?: string;
    rawField?: ExtractedContractField<any> | null;
    rawPayload?: Record<string, any>;
    sourcePage?: number | null;
    evidence?: string | null;
  }) => {
    if (!selectedContract) return;
    if (row.isItem && row.itemId) {
      setEditArrayItemModal({
        open: true,
        contractId: selectedContract.id,
        fieldPath: row.fieldPath,
        itemId: row.itemId,
        itemName: row.label,
        initialPayload: row.rawPayload || {},
        sourcePage: row.sourcePage,
        evidence: row.evidence,
      });
    } else {
      setEditScalarModal({
        open: true,
        contractId: selectedContract.id,
        fieldPath: row.fieldPath,
        fieldName: row.label,
        rawField: row.rawField,
        fieldType: row.fieldType,
      });
    }
  };

  const handleOpenEvidence = (params: {
    fieldName: string;
    valueText?: string | number | null;
    sourcePage?: number | null;
    evidence?: string | null;
    confidence?: number | null;
    qualityStatus?: ContractFieldQualityStatus;
    verificationStatus?: 'VERIFIED' | 'UNVERIFIED';
    onVerify?: () => void;
    onEdit?: () => void;
  }) => {
    setEvidenceData(params);
    setEvidenceOpen(true);
  };

  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);

  const handleViewPdf = async (documentId?: string | null) => {
    if (!documentId) {
      setToast({ message: 'Original PDF document ID not found.', type: 'error' });
      return;
    }

    setOpeningPdfId(documentId);
    try {
      const token =
        localStorage.getItem('apms-token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let res: Response | null = null;
      if (projectId) {
        try {
          res = await fetch(
            `${API_BASE_URL}/projects/${projectId}/documents/${encodeURIComponent(documentId)}/download?download=false`,
            { headers }
          );
        } catch (e) {
          console.warn('Project document fetch failed, trying task endpoint', e);
        }
      }

      if (!res || !res.ok) {
        try {
          res = await fetch(
            `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/partner-contracts/documents/${encodeURIComponent(documentId)}/download?download=false`,
            { headers }
          );
        } catch (e) {
          console.warn('Task document fetch failed, trying direct endpoint', e);
        }
      }

      if (!res || !res.ok) {
        res = await fetch(
          `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download?download=false`,
          { headers }
        );
      }

      if (!res || !res.ok) {
        throw new Error(`Failed to load document (${res?.status || 'unknown'})`);
      }

      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 120_000);
    } catch (err) {
      console.error('Error opening PDF:', err);
      setToast({ message: 'Unable to open PDF document. Please check permissions or try again later.', type: 'error' });
    } finally {
      setOpeningPdfId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 450, color: '#64748b' }}>
        <Loader2 size={28} className={styles.spinIcon} />
        <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Loading contract research data...</span>
      </div>
    );
  }

  const typeLabel = formatContractType(selectedContract?.confirmedContractType || selectedContract?.declaredContractType);
  const common = selectedContract?.commonData;
  const coop = selectedContract?.cooperationAgreementData;
  const part = selectedContract?.partnershipAgreementData;
  const verifiedCount = flattenedRows.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const totalCount = flattenedRows.length;
  const percentVerified = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const renderKpiCard = (params: {
    id: string;
    fieldPath: string;
    label: string;
    displayValue: React.ReactNode;
    rawValue: any;
    rawField?: ExtractedContractField<any> | null;
    sourcePage?: number | null;
    evidence?: string | null;
    gridSpan?: number;
    fieldType?: 'text' | 'date' | 'number' | 'textarea';
  }) => {
    const isVerified = params.rawField?.verificationStatus === 'VERIFIED';
    const rawValStr = String(params.rawValue ?? '').trim();
    const isNa =
      !rawValStr ||
      rawValStr.toUpperCase() === 'N/A' ||
      rawValStr === '—' ||
      rawValStr.toUpperCase() === 'CHƯA CÓ THÔNG TIN';

    // A field that is N/A or unstated should NEVER be flagged as NEEDS_REVIEW
    const isNeedsReview = !isVerified && !isNa && params.rawField?.qualityStatus === 'NEEDS_REVIEW';

    const cardStatusClass = isVerified
      ? contractStyles.kpiCardVerified
      : isNeedsReview
      ? contractStyles.kpiCardNeedsReview
      : '';

    const handleVerify = () => {
      handleVerifyRow({
        id: params.id,
        fieldPath: params.fieldPath,
        label: params.label,
        value: String(params.rawValue || ''),
        section: 'General Terms',
        qualityStatus: params.rawField?.qualityStatus || 'VALID',
        verificationStatus: isVerified ? 'UNVERIFIED' : 'VERIFIED',
        rawField: params.rawField,
      });
    };

    const handleEdit = () => {
      handleOpenEdit({
        id: params.id,
        fieldPath: params.fieldPath,
        label: params.label,
        value: String(params.rawValue || ''),
        section: 'General Terms',
        qualityStatus: params.rawField?.qualityStatus || 'VALID',
        verificationStatus: params.rawField?.verificationStatus || 'UNVERIFIED',
        rawField: params.rawField,
        sourcePage: params.sourcePage,
        evidence: params.evidence,
        fieldType: params.fieldType,
      });
    };

    return (
      <div
        key={params.id}
        className={`${contractStyles.kpiCard} ${cardStatusClass}`}
        style={params.gridSpan ? { gridColumn: '1 / -1' } : undefined}
      >
        <div className={contractStyles.kpiCardHead}>
          <span className={contractStyles.kpiLabel}>{params.label}</span>
          <span
            className={`${contractStyles.kpiStatusTag} ${
              isVerified
                ? contractStyles.kpiStatusVerified
                : isNeedsReview
                ? contractStyles.kpiStatusReview
                : contractStyles.kpiStatusUnverified
            }`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 size={10} /> Verified
              </>
            ) : isNeedsReview ? (
              <>
                <AlertTriangle size={10} /> Needs Review
              </>
            ) : (
              <>
                <Clock size={10} /> Unverified
              </>
            )}
          </span>
        </div>

        <div className={contractStyles.kpiValue}>
          {params.displayValue != null &&
          params.displayValue !== '' &&
          String(params.displayValue).trim() !== '' &&
          String(params.displayValue).trim() !== '—' &&
          String(params.displayValue).trim().toUpperCase() !== 'CHƯA CÓ THÔNG TIN' ? (
            params.displayValue
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>N/A</span>
          )}
        </div>

        <div className={contractStyles.kpiFooter}>
          {params.sourcePage ? (
            <span className={styles.sourceTag}>Page {params.sourcePage}</span>
          ) : (
            <span />
          )}

          <div className={contractStyles.kpiActions}>
            {params.evidence && (
              <button
                type="button"
                className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnSecondary}`}
                onClick={() =>
                  handleOpenEvidence({
                    fieldName: params.label,
                    valueText: String(params.rawValue || ''),
                    sourcePage: params.sourcePage,
                    evidence: params.evidence,
                    confidence: params.rawField?.confidence,
                    qualityStatus: params.rawField?.qualityStatus,
                    verificationStatus: params.rawField?.verificationStatus,
                    onVerify: handleVerify,
                    onEdit: handleEdit,
                  })
                }
                title="View evidence from source document"
              >
                <Eye size={12} /> Evidence
              </button>
            )}

            {effectiveCanEdit && (
              <button
                type="button"
                className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnEdit}`}
                onClick={handleEdit}
                title="Edit field"
              >
                <Edit3 size={12} /> Edit
              </button>
            )}

            {effectiveCanEdit && (
              <button
                type="button"
                className={`${contractStyles.kpiBtn} ${
                  isVerified ? contractStyles.kpiBtnUnverify : contractStyles.kpiBtnVerify
                }`}
                onClick={handleVerify}
                title={isVerified ? 'Click to unverify' : 'Click to verify'}
              >
                {isVerified ? <RotateCcw size={12} /> : <Check size={12} />}
                {isVerified ? 'Unverify' : 'Verify'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.workbench}>
      {/* Floating Toast Notification via Portal */}
      {typeof document !== 'undefined' && toast && createPortal(
        <div
          className={`apms-toast ${toast.type}`}
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 280,
            maxWidth: 540,
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            borderRadius: 12,
            padding: '12px 18px',
            animation: 'apms-toast-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={19} color="#16a34a" style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={19} color="#dc2626" style={{ flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, margin: 0, lineHeight: 1.4 }}>
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              opacity: 0.65,
              borderRadius: 6,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>,
        document.body
      )}

      {/* Main Two-Column Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column: Contracts Sidebar */}
        <section className={`${styles.panel} ${styles.leftPanel}`}>
          <div className={styles.panelHead}>
            <div className={styles.panelTitleGroup}>
              <div className={styles.panelTitleWithBadge}>
                <h3>{isManagerMode ? 'Submitted Contracts' : 'Contracts'}</h3>
                <span className={styles.badgeCount}>{contractsToDisplay.length}</span>
              </div>
              <p>{isManagerMode ? 'Contracts submitted for review' : 'Add documents & extract terms'}</p>
            </div>

            {!isManagerMode ? (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                disabled={!effectiveCanEdit || isAnyExtracting}
                title={isAnyExtracting ? 'A document is currently being extracted. Please wait for completion.' : undefined}
                style={isAnyExtracting ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <Plus size={14} /> Add Contract
              </button>
            ) : contractsToDisplay.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length > 1 ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleManagerApproveAll}
                disabled={isManagerProcessing}
                style={{ padding: '5px 12px', fontSize: 12, color: '#15803d', borderColor: '#86efac', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                title="Approve all pending contracts"
              >
                <Check size={13} />
                Approve All ({contractsToDisplay.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length})
              </button>
            ) : null}
          </div>

          {contractsToDisplay.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>
                <FileText size={30} />
              </div>
              <h3 className={styles.emptyTitle}>No contracts yet</h3>
              <p className={styles.emptyDesc}>Create your first contract to begin extracting contract terms.</p>
            </div>
          ) : (
            <div className={styles.reportGroups}>
              <div className={styles.reportList}>
                {contractsToDisplay.map((contract) => {
                  const isSelected = contract.id === selectedContractId;
                  const isChecked = effectiveSubmissionIds.includes(contract.id);
                  const isEligible = contract.reviewStatus !== 'APPROVED';

                  return (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      selected={isSelected}
                      selectedForSubmission={isChecked}
                      isEligible={isEligible}
                      canEdit={effectiveCanEdit}
                      isManagerMode={isManagerMode}
                      hasMultipleContracts={hasMultipleContracts}
                      clauseCount={extractContractRows(contract).length}
                      needsReviewCount={0}
                      isAnyExtracting={isAnyExtracting}
                      onSelect={(id) => setSelectedContractId(id)}
                      onToggleSelection={(id) => {
                        setSelectedContractIdsForSubmission((prev) =>
                          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                        );
                      }}
                      onExtract={handleExtract}
                      onReExtract={handleReExtract}
                      onDelete={(c) => setContractToDelete(c)}
                      onEdit={(c) => setEditContractModalContract(c)}
                      onViewPdf={handleViewPdf}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Selected Contract Workspace */}
        <section className={`${styles.panel} ${styles.rightPanel}`} style={selectedContract ? { padding: 0 } : undefined}>
          <div className={styles.rightPanelBody}>
            {selectedContract ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
              {/* Top Contract Header */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  padding: '16px 20px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 }}>
                  {/* Title & Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {selectedContract.title}
                    </h3>
                    {effectiveCanEdit && (
                      <button
                        type="button"
                        onClick={() => setEditContractModalContract(selectedContract)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: 4,
                        }}
                        title="Edit contract details"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Metadata Chips Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* File Attachment Chip */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#475569',
                        maxWidth: 320,
                      }}
                      title={selectedContract.documentName || 'PDF Document'}
                    >
                      <FileText size={13} color="#64748b" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedContract.documentName || 'PDF Document'}
                      </span>
                    </div>

                    {/* Signing Date Chip */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#475569',
                      }}
                    >
                      <Calendar size={13} color="#64748b" />
                      <span>
                        Signing Date: <strong style={{ color: '#1e293b' }}>{common?.signingDate?.value ? formatDate(String(common.signingDate.value)) : '—'}</strong>
                      </span>
                    </div>

                    {/* Derived Status Badge */}
                    {selectedContract.derivedContractStatus && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            selectedContract.derivedContractStatus === 'ACTIVE'
                              ? '#f0fdf4'
                              : selectedContract.derivedContractStatus === 'EXPIRED'
                              ? '#fef2f2'
                              : '#fff7ed',
                          border: `1px solid ${
                            selectedContract.derivedContractStatus === 'ACTIVE'
                              ? '#bbf7d0'
                              : selectedContract.derivedContractStatus === 'EXPIRED'
                              ? '#fecdd3'
                              : '#fed7aa'
                          }`,
                          color:
                            selectedContract.derivedContractStatus === 'ACTIVE'
                              ? '#15803d'
                              : selectedContract.derivedContractStatus === 'EXPIRED'
                              ? '#b91c1c'
                              : '#c2410c',
                        }}
                      >
                        <span>●</span>
                        <span>
                          {selectedContract.derivedContractStatus === 'ACTIVE'
                            ? 'Active'
                            : selectedContract.derivedContractStatus === 'EXPIRED'
                            ? 'Expired'
                            : selectedContract.derivedContractStatus}
                        </span>
                      </div>
                    )}

                    {/* Company Match Badge */}
                    {selectedContract.companyMatchConfirmed && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Target Company Confirmed</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={contractStyles.contractHeaderActions}>
                  {effectiveCanEdit && (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => setEditContractModalContract(selectedContract)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      title="Edit contract details"
                    >
                      <Edit3 size={14} />
                      Edit Contract
                    </button>
                  )}
                  {selectedContract.documentId && (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => handleViewPdf(selectedContract.documentId)}
                      disabled={openingPdfId === selectedContract.documentId}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {openingPdfId === selectedContract.documentId ? (
                        <Loader2 size={14} className={styles.spinIcon} />
                      ) : (
                        <FileText size={14} />
                      )}
                      {openingPdfId === selectedContract.documentId ? 'Loading PDF...' : 'View Original PDF'}
                    </button>
                  )}
                  {effectiveCanEdit && (selectedContract.extractionStatus === 'COMPLETED' || selectedContract.extractionStatus === 'PROCESSING') && (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => handleReExtract(selectedContract.id)}
                      disabled={isAnyExtracting || isReExtractingMap[selectedContract.id]}
                      style={
                        isAnyExtracting && selectedContract.extractionStatus !== 'PROCESSING'
                          ? { display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6, cursor: 'not-allowed' }
                          : { display: 'flex', alignItems: 'center', gap: 6 }
                      }
                      title={
                        isAnyExtracting && selectedContract.extractionStatus !== 'PROCESSING'
                          ? 'Another document is currently being extracted by AI. Please wait for completion.'
                          : undefined
                      }
                    >
                      {selectedContract.extractionStatus === 'PROCESSING' || isReExtractingMap[selectedContract.id] ? (
                        <Loader2 size={14} className={styles.spinIcon} />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {selectedContract.extractionStatus === 'PROCESSING' || isReExtractingMap[selectedContract.id]
                        ? 'Re-extracting...'
                        : 'Re-extract'}
                    </button>
                  )}

                  {isManagerMode && selectedContract && (
                    <>
                      {selectedContract.reviewStatus === 'PENDING_REVIEW' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            style={{ padding: '6px 14px', fontSize: 13, color: '#c2410c', borderColor: '#fed7aa', background: '#fff7ed', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => {
                              setManagerReviewActionContractId(selectedContract.id);
                              setManagerRequestChangesModalOpen(true);
                            }}
                            disabled={isManagerProcessing}
                          >
                            <AlertTriangle size={14} />
                            Request Changes
                          </button>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            style={{ padding: '6px 16px', fontSize: 13, background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleManagerApprove(selectedContract.id)}
                            disabled={isManagerProcessing}
                          >
                            {isManagerProcessing ? <Loader2 size={14} className={styles.spinIcon} /> : <Check size={14} />}
                            Approve Contract
                          </button>
                        </div>
                      )}
                      {selectedContract.reviewStatus === 'APPROVED' && (
                        <span className={`${styles.statusBadge} ${styles.statusApproved}`} style={{ padding: '6px 12px', fontSize: 12.5 }}>
                          <CheckCircle2 size={14} />
                          Approved
                        </span>
                      )}
                      {selectedContract.reviewStatus === 'CHANGES_REQUESTED' && (
                        <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`} style={{ padding: '6px 12px', fontSize: 12.5 }}>
                          <AlertTriangle size={14} />
                          Changes Requested
                        </span>
                      )}
                    </>
                  )}

                  {!isManagerMode && (
                    <>
                      {selectedContract.extractionStatus === 'COMPLETED' ? (
                        <span className={`${styles.statusBadge} ${styles.statusExtracted}`}>
                          <CheckCircle2 size={13} />
                          Extracted
                        </span>
                      ) : selectedContract.extractionStatus === 'PROCESSING' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className={`${styles.statusBadge} ${styles.statusInProgress}`}>
                            <Loader2 size={13} className={styles.spinIcon} />
                            Extracting...
                          </span>
                          {effectiveCanEdit && (
                            <button
                              type="button"
                              onClick={() => handleCancelExtract(selectedContract.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 6,
                                color: '#b91c1c',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                              }}
                              title="Cancel AI extraction"
                            >
                              <X size={13} />
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                          ● Unextracted
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Workspace Body Scrollable Content */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: '1 0 auto' }}>
                {/* Changes Requested Banner */}
                {selectedContract.reviewStatus === 'CHANGES_REQUESTED' && (
                <div className={styles.managerFeedbackBanner} style={{ marginTop: 10 }}>
                  <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className={styles.managerFeedbackContent}>
                    <strong>Manager Feedback / Revision Request</strong>
                    <p>{selectedContract.reviewComment || 'Manager requested changes to this contract.'}</p>
                    <small>
                      {selectedContract.reviewedByName || 'Manager'}
                      {selectedContract.reviewedAt ? ` • ${formatDate(selectedContract.reviewedAt)}` : ''}
                    </small>
                  </div>
                </div>
              )}


              {/* Company Match Banner */}
              {selectedContract.extractionStatus === 'COMPLETED' &&
                !selectedContract.companyMatchConfirmed &&
                selectedContract.companyMatchStatus !== 'MATCH' && (
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
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Building2 size={20} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#b45309' }}>Target Company Confirmation Required:</strong>{' '}
                        The target company for this project is <strong>"{targetCompanyName || 'N/A'}"</strong>.
                        Detected contract signatories:{' '}
                        <strong>
                          {(common?.parties || []).map((p) => p.legalName).join(', ') || 'Unknown signatories'}
                        </strong>
                        . Please confirm that this contract belongs to the target company before submitting for review.
                      </div>
                    </div>

                    {effectiveCanEdit && (
                      <button
                        className={styles.primaryButton}
                        style={{ padding: '6px 14px', fontSize: 12.5, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                        type="button"
                        onClick={() => handleConfirmCompanyMatch(selectedContract.id, true)}
                        disabled={isConfirmingCompany}
                      >
                        {isConfirmingCompany ? (
                          <Loader2 size={13} className={styles.spinIcon} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {isConfirmingCompany ? 'Confirming...' : 'Confirm this contract'}
                      </button>
                    )}
                  </div>
                )}

              {/* Extraction Progress or Empty State */}
              {selectedContract.extractionStatus === 'PROCESSING' ? (
                <div style={{ padding: '8px 0' }}>
                  <ContractProgressBar
                    status={selectedContract.extractionStatus}
                    stage={selectedContract.extractionStage}
                    progress={selectedContract.extractionProgress}
                    errorMessage={selectedContract.extractionErrorMessage}
                    contractTitle={selectedContract.title}
                    onCancel={() => handleCancelExtract(selectedContract.id)}
                    isCancelling={cancellingExtractId === selectedContract.id}
                  />
                </div>
              ) : selectedContract.extractionStatus !== 'COMPLETED' ? (
                <div className={styles.inlineEmpty} style={{ flexDirection: 'column', gap: 14, minHeight: 220, padding: 30, margin: 'auto' }}>
                  <Sparkles size={32} color="#2563eb" />
                  <span style={{ maxWidth: 460, textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                    Click the button below to allow AI to classify and extract contract terms, parties, and obligations.
                  </span>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => handleExtract(selectedContract.id)}
                    disabled={!effectiveCanEdit || isAnyExtracting}
                    title={isAnyExtracting ? 'Another document is currently being processed by AI. Please wait for completion.' : undefined}
                    style={isAnyExtracting ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    <Sparkles size={14} />
                    {selectedContract.extractionStatus === 'FAILED' ? 'Retry Extraction' : 'Extract Contract Data'}
                  </button>

                  {selectedContract.extractionErrorMessage && (
                    <div className={`${styles.statusBadge} ${styles.statusError}`} style={{ marginTop: 8 }}>
                      {selectedContract.extractionErrorMessage}
                    </div>
                  )}
                </div>
              ) : (
                /* Extracted State: Structured Cards View */
                <div className={contractStyles.cardsScrollContainer}>
                    {/* Verification & Audit Summary Banner */}
                    <div className={contractStyles.verificationBanner}>
                      <div className={contractStyles.verificationStats}>
                        <ShieldCheck size={18} color={percentVerified === 100 ? '#16a34a' : '#2563eb'} />
                        <span>
                          Verification progress: <strong>{verifiedCount}/{totalCount}</strong> fields ({percentVerified}%)
                        </span>
                      </div>

                      <div className={contractStyles.verificationProgressContainer}>
                        <div className={contractStyles.verificationProgressBar}>
                          <div
                            className={contractStyles.verificationProgressFill}
                            style={{
                              width: `${percentVerified}%`,
                              background: percentVerified === 100 ? '#16a34a' : '#2563eb',
                            }}
                          />
                        </div>
                      </div>

                      <div className={contractStyles.verificationActions}>
                        {effectiveCanEdit && totalCount > 0 && (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            style={{
                              padding: '5px 14px',
                              fontSize: 12.5,
                              fontWeight: 600,
                              background: percentVerified === 100 ? '#fef2f2' : '#eff6ff',
                              color: percentVerified === 100 ? '#dc2626' : '#2563eb',
                              borderColor: percentVerified === 100 ? '#fca5a5' : '#bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={percentVerified === 100 ? handleUnverifyAll : handleVerifyAllEligible}
                            disabled={isVerifyingAll}
                            title={
                              percentVerified === 100
                                ? 'Unverify all contract fields'
                                : 'Verify all contract fields'
                            }
                          >
                            {isVerifyingAll ? (
                              <Loader2 size={13} className={styles.spinIcon} />
                            ) : percentVerified === 100 ? (
                              <RotateCcw size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {isVerifyingAll
                              ? percentVerified === 100
                                ? 'Unverifying...'
                                : 'Verifying...'
                              : percentVerified === 100
                              ? 'Unverify All'
                              : `Verify All (${totalCount - verifiedCount} fields)`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section 1: General Information & Legal Term */}
                    <div className={contractStyles.sectionBox}>
                      <div className={contractStyles.sectionBoxHead}>
                        <div className={contractStyles.sectionBoxTitle}>
                          <Scale size={16} color="#2563eb" />
                          <span>1. General Information & Legal Terms</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={contractStyles.sectionMeta}>
                            Contract status: <strong style={{ color: '#15803d' }}>{selectedContract.derivedContractStatus || 'ACTIVE'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className={contractStyles.kpiGrid}>
                        {renderKpiCard({
                          id: 'gen-contractNumber',
                          fieldPath: 'contractNumber',
                          label: 'Contract Number',
                          rawValue: common?.contractNumber?.value,
                          displayValue: common?.contractNumber?.value || 'N/A',
                          rawField: common?.contractNumber,
                          sourcePage: common?.contractNumber?.sourcePage,
                          evidence: common?.contractNumber?.evidence,
                        })}

                        {renderKpiCard({
                          id: 'gen-signingDate',
                          fieldPath: 'signingDate',
                          label: 'Signing Date',
                          rawValue: common?.signingDate?.value,
                          displayValue: common?.signingDate?.value ? formatDate(String(common.signingDate.value)) : 'N/A',
                          rawField: common?.signingDate as any,
                          sourcePage: common?.signingDate?.sourcePage,
                          evidence: common?.signingDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-effectiveDate',
                          fieldPath: 'effectiveDate',
                          label: 'Effective Date',
                          rawValue: common?.effectiveDate?.value ? String(common.effectiveDate.value) : 'N/A',
                          displayValue: common?.effectiveDate?.value ? formatDate(String(common.effectiveDate.value)) : 'N/A',
                          rawField: common?.effectiveDate as any,
                          sourcePage: common?.effectiveDate?.sourcePage,
                          evidence: common?.effectiveDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-expiryDate',
                          fieldPath: 'expiryDate',
                          label: 'Expiry Date',
                          rawValue: common?.expiryDate?.value ? String(common.expiryDate.value) : 'N/A',
                          displayValue: common?.expiryDate?.value ? formatDate(String(common.expiryDate.value)) : 'N/A',
                          rawField: common?.expiryDate as any,
                          sourcePage: common?.expiryDate?.sourcePage,
                          evidence: common?.expiryDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-term',
                          fieldPath: 'term',
                          label: 'Contract Term',
                          rawValue: common?.term?.value || 'N/A',
                          displayValue: common?.term?.value || 'N/A',
                          rawField: common?.term,
                          sourcePage: common?.term?.sourcePage,
                          evidence: common?.term?.evidence,
                        })}

                        {(() => {
                          const cv = common?.contractValue?.value;
                          const hasAmount = cv?.amount != null;
                          const rawText = cv?.rawAmountText ? cv.rawAmountText.trim() : '';
                          const isNa = !hasAmount && (!rawText || rawText.toUpperCase() === 'N/A');
                          const cvDisplay = hasAmount
                            ? `${formatNumericValue(cv.amount)} ${cv.currency || 'VND'}`
                            : (rawText && rawText.toUpperCase() !== 'N/A' ? rawText : 'N/A');
                          const cvRaw = hasAmount ? cv.amount : (isNa ? 'N/A' : rawText);
                          return renderKpiCard({
                            id: 'gen-contractValue',
                            fieldPath: 'contractValue',
                            label: 'Contract Value',
                            rawValue: cvRaw,
                            displayValue: cvDisplay,
                            rawField: common?.contractValue as any,
                            sourcePage: common?.contractValue?.sourcePage,
                            evidence: common?.contractValue?.evidence,
                          });
                        })()}

                        {(() => {
                          const val = common?.governingLaw?.value || 'N/A';
                          const parts = val !== 'N/A'
                            ? val.split('|').map((item: string) => item.trim()).filter(Boolean)
                            : [];
                          return renderKpiCard({
                            id: 'gen-governingLaw',
                            fieldPath: 'governingLaw',
                            label: 'Governing Law & Dispute Resolution',
                            rawValue: val,
                            displayValue: parts.length > 1 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, lineHeight: 1.45, whiteSpace: 'normal', color: '#1e293b' }}>
                                {parts.map((p: string, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ color: '#64748b', userSelect: 'none', lineHeight: 1.45 }}>•</span>
                                    <span>{p}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, whiteSpace: 'normal', color: '#1e293b' }}>
                                {val}
                              </span>
                            ),
                            rawField: common?.governingLaw,
                            sourcePage: common?.governingLaw?.sourcePage,
                            evidence: common?.governingLaw?.evidence,
                            fieldType: 'textarea',
                          });
                        })()}

                        {renderKpiCard({
                          id: 'gen-purpose',
                          fieldPath: 'purpose',
                          label: 'Cooperation Purpose',
                          rawValue: common?.purpose?.value,
                          displayValue: (
                            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'normal', color: '#1e293b' }}>
                              {common?.purpose?.value || 'N/A'}
                            </span>
                          ),
                          rawField: common?.purpose,
                          sourcePage: common?.purpose?.sourcePage,
                          evidence: common?.purpose?.evidence,
                          gridSpan: 2,
                        })}
                      </div>
                    </div>

                    {/* Section 2: Contracting Parties */}
                    <div className={contractStyles.sectionBox}>
                      <div className={contractStyles.sectionBoxHead}>
                        <div className={contractStyles.sectionBoxTitle}>
                          <Users size={16} color="#2563eb" />
                          <span>2. Contracting Parties ({(common?.parties || []).length} parties)</span>
                        </div>
                      </div>

                      <div className={contractStyles.partyGrid}>
                        {(common?.parties || []).map((party, idx) => {
                          const isVerified = party.verificationStatus === 'VERIFIED';
                          const isNa = !party.legalName || party.legalName.trim().toUpperCase() === 'N/A';
                          const isNeedsReview = !isVerified && !isNa && party.qualityStatus === 'NEEDS_REVIEW';

                          const handleVerifyParty = () => {
                            handleVerifyRow({
                              id: `party-${party.id}`,
                              fieldPath: 'parties',
                              label: party.legalName,
                              value: party.role || '',
                              section: 'Contracting Parties',
                              qualityStatus: party.qualityStatus,
                              verificationStatus: isVerified ? 'UNVERIFIED' : 'VERIFIED',
                              isItem: true,
                              itemId: party.id,
                            });
                          };

                          const handleEditParty = () => {
                            handleOpenEdit({
                              id: `party-${party.id}`,
                              fieldPath: 'parties',
                              label: `Party: ${party.legalName}`,
                              value: party.role || '',
                              section: 'Contracting Parties',
                              qualityStatus: party.qualityStatus,
                              verificationStatus: party.verificationStatus,
                              isItem: true,
                              itemId: party.id,
                              rawPayload: party,
                              sourcePage: party.sourcePage,
                              evidence: party.evidence,
                            });
                          };

                          return (
                            <div
                              key={party.id || idx}
                              className={`${contractStyles.partyCard} ${
                                isVerified
                                  ? contractStyles.partyCardVerified
                                  : isNeedsReview
                                  ? contractStyles.kpiCardNeedsReview
                                  : ''
                              }`}
                            >
                              <div className={contractStyles.partyHead}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div className={contractStyles.partyAvatar}>
                                    {idx === 0 ? 'A' : idx === 1 ? 'B' : String.fromCharCode(65 + idx)}
                                  </div>
                                  <div>
                                    <div className={contractStyles.partyTitle}>
                                      {party.legalName}
                                    </div>
                                    <div className={contractStyles.partySubtitle}>
                                      Contracting Party #{idx + 1}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`${contractStyles.kpiStatusTag} ${
                                    isVerified
                                      ? contractStyles.kpiStatusVerified
                                      : isNeedsReview
                                      ? contractStyles.kpiStatusReview
                                      : contractStyles.kpiStatusUnverified
                                  }`}
                                >
                                  {isVerified ? (
                                    <>
                                      <CheckCircle2 size={10} /> Verified
                                    </>
                                  ) : isNeedsReview ? (
                                    <>
                                      <AlertTriangle size={10} /> Needs Review
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={10} /> Unverified
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Structured Party Details Grid */}
                              <div className={contractStyles.partyInfoGrid}>
                                <div className={contractStyles.partyInfoItem}>
                                  <span className={contractStyles.partyInfoLabel}>Role</span>
                                  <span className={contractStyles.partyInfoValue}>{party.role || 'N/A'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem}>
                                  <span className={contractStyles.partyInfoLabel}>Tax Code</span>
                                  <span className={contractStyles.partyInfoValue}>{party.taxCode || 'N/A'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                                  <span className={contractStyles.partyInfoLabel}>Legal Representative</span>
                                  <span className={contractStyles.partyInfoValue}>{party.representative || 'N/A'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                                  <span className={contractStyles.partyInfoLabel}>Registered Address</span>
                                  <span className={contractStyles.partyInfoValue}>{party.address || 'N/A'}</span>
                                </div>
                              </div>

                              <div className={contractStyles.kpiFooter}>
                                <span className={styles.sourceTag}>Page {party.sourcePage || 1}</span>

                                <div className={contractStyles.kpiActions}>
                                  {party.evidence && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnSecondary}`}
                                      onClick={() => {
                                        const partySummary = [
                                          party.role ? `• Role: ${party.role}` : null,
                                          party.legalName ? `• Legal Name: ${party.legalName}` : null,
                                          party.taxCode ? `• Tax Code: ${party.taxCode}` : '• Tax Code: N/A',
                                          party.representative ? `• Legal Representative: ${party.representative}` : '• Legal Representative: N/A',
                                          party.address ? `• Registered Address: ${party.address}` : '• Registered Address: N/A',
                                        ].filter(Boolean).join('\n');

                                        const rawEv = party.evidence || '';
                                        const evParts = rawEv ? rawEv.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean) : [];
                                        
                                        if (party.taxCode && party.taxCode !== 'N/A' && !evParts.some((p) => p.includes(party.taxCode!))) {
                                          evParts.push(`Tax Code: ${party.taxCode}`);
                                        }
                                        if (party.representative && party.representative !== 'N/A') {
                                          const cleanRep = party.representative.replace(/\(.*?\)/g, '').trim();
                                          if (!evParts.some((p) => p.includes(cleanRep))) {
                                            evParts.push(`Legal Representative: ${party.representative}`);
                                          }
                                        }
                                        if (party.address && party.address !== 'N/A') {
                                          const addrSnippet = party.address.split(/[,;-]/)[0].trim();
                                          if (!evParts.some((p) => p.includes(addrSnippet))) {
                                            evParts.push(`Registered Address: ${party.address}`);
                                          }
                                        }
                                        const combinedEvidence = evParts.join(' | ');

                                        handleOpenEvidence({
                                          fieldName: `Party: ${party.legalName}`,
                                          valueText: partySummary,
                                          sourcePage: party.sourcePage,
                                          evidence: combinedEvidence,
                                          confidence: party.confidence,
                                          qualityStatus: party.qualityStatus,
                                          verificationStatus: party.verificationStatus,
                                          onVerify: handleVerifyParty,
                                          onEdit: handleEditParty,
                                        });
                                      }}
                                      title="View evidence from source document"
                                    >
                                      <Eye size={12} /> Evidence
                                    </button>
                                  )}

                                  {effectiveCanEdit && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnEdit}`}
                                      onClick={handleEditParty}
                                      title="Edit party details"
                                    >
                                      <Edit3 size={12} /> Edit
                                    </button>
                                  )}

                                  {effectiveCanEdit && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${
                                        isVerified ? contractStyles.kpiBtnUnverify : contractStyles.kpiBtnVerify
                                      }`}
                                      onClick={handleVerifyParty}
                                      title={isVerified ? 'Click to unverify' : 'Click to verify'}
                                    >
                                      {isVerified ? <RotateCcw size={12} /> : <Check size={12} />}
                                      {isVerified ? 'Unverify' : 'Verify'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>
                <Layers size={30} />
              </div>
              <h3 className={styles.emptyTitle}>No contract selected</h3>
              <p className={styles.emptyDesc}>Select a contract from the list or add a new contract.</p>
            </div>
          )}
          </div>
        </section>
      </div>

      {/* Package Summary Footer (Staff Only) */}
      {!isManagerMode && (
        <footer className={styles.packageSummary}>
          {canRecall ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsRecallModalOpen(true)}
              disabled={isRecalling}
              style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isRecalling ? (
                <>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Recalling...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={15} />
                  <span>Recall Submission</span>
                </>
              )}
            </button>
          ) : !isSubmitted && (
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmitPackage}
              disabled={!effectiveCanEdit || isSubmittingPackage || allApproved || isAnyExtracting || effectiveSubmissionIds.length === 0}
              title={
                isAnyExtracting
                  ? 'AI extraction is currently in progress. Please wait for completion before submitting.'
                  : effectiveSubmissionIds.length === 0
                  ? 'No eligible contracts ready for submission.'
                  : undefined
              }
            >
              {isSubmittingPackage ? (
                <>
                  <Loader2 size={16} className={styles.spinIcon} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit for Review</span>
                </>
              )}
            </button>
          )}
        </footer>
      )}

      {/* Add Contract Modal */}
      <AddContractModal
        open={isAddModalOpen}
        projectId={projectId}
        taskId={taskId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(updatedResearch, createdContractId) => {
          setResearch(updatedResearch);
          setIsAddModalOpen(false);
          if (createdContractId) {
            setSelectedContractId(createdContractId);
          }
          setToast({
            message: 'New contract added. Click "Extract Contract Data" to begin extracting terms.',
            type: 'success',
          });
        }}
      />

      {/* Type Resolution Modal */}
      {typeResolutionModalOpen && selectedContract && (
        <TypeResolutionModal
          isOpen={typeResolutionModalOpen}
          contract={selectedContract}
          onClose={() => setTypeResolutionModalOpen(false)}
          onResolve={async (confirmedType: ContractType) => {
            const updated = await contractResearchApi.resolveType(
              projectId,
              taskId,
              selectedContract.id,
              confirmedType
            );
            setResearch(updated);
            setTypeResolutionModalOpen(false);
            setToast({ message: 'Contract type confirmed successfully.', type: 'success' });
          }}
        />
      )}

      {/* Evidence Drawer */}
      {evidenceOpen && evidenceData && (
        <ContractEvidenceDrawer
          fieldName={evidenceData.fieldName}
          valueText={evidenceData.valueText != null ? String(evidenceData.valueText) : null}
          sourcePage={evidenceData.sourcePage}
          evidence={evidenceData.evidence}
          confidence={evidenceData.confidence}
          qualityStatus={evidenceData.qualityStatus || 'VALID'}
          verificationStatus={evidenceData.verificationStatus || 'UNVERIFIED'}
          isEditable={effectiveCanEdit}
          onVerify={evidenceData.onVerify}
          onEdit={evidenceData.onEdit}
          onClose={() => setEvidenceOpen(false)}
        />
      )}

      {/* Edit Scalar Field Modal */}
      {editScalarModal.open && (
        <EditScalarFieldModal
          isOpen={editScalarModal.open}
          fieldPath={editScalarModal.fieldPath}
          fieldLabel={editScalarModal.fieldName}
          fieldData={editScalarModal.rawField}
          fieldType={editScalarModal.fieldType}
          onClose={() => setEditScalarModal((prev) => ({ ...prev, open: false }))}
          onSubmit={async (data: { value: any; evidence?: string | null; sourcePage?: number | null }) => {
            const updated = await contractResearchApi.updateScalarField(
              projectId,
              taskId,
              editScalarModal.contractId,
              editScalarModal.fieldPath,
              {
                value: data.value,
                evidence: data.evidence,
                sourcePage: data.sourcePage,
              }
            );
            setResearch(updated);
            setEditScalarModal((prev) => ({ ...prev, open: false }));
            setToast({ message: 'Field updated successfully.', type: 'success' });
          }}
        />
      )}

      {/* Edit Array Item Modal */}
      {editArrayItemModal.open && (
        <EditArrayItemModal
          isOpen={editArrayItemModal.open}
          title={editArrayItemModal.itemName}
          itemType={
            editArrayItemModal.fieldPath === 'parties'
              ? 'party'
              : editArrayItemModal.fieldPath.includes('Sharing') || editArrayItemModal.fieldPath.includes('contributions')
              ? 'sharing'
              : editArrayItemModal.fieldPath === 'rightsAndObligations'
              ? 'rights_obligations'
              : 'generic'
          }
          initialPayload={editArrayItemModal.initialPayload}
          sourcePage={editArrayItemModal.sourcePage}
          evidence={editArrayItemModal.evidence}
          onClose={() => setEditArrayItemModal((prev) => ({ ...prev, open: false }))}
          onSubmit={async (data: { itemPayload: Record<string, any>; evidence?: string | null; sourcePage?: number | null }) => {
            const updated = await contractResearchApi.updateArrayItem(
              projectId,
              taskId,
              editArrayItemModal.contractId,
              editArrayItemModal.fieldPath,
              editArrayItemModal.itemId,
              {
                itemPayload: data.itemPayload,
                evidence: data.evidence,
                sourcePage: data.sourcePage,
              }
            );
            setResearch(updated);
            setEditArrayItemModal((prev) => ({ ...prev, open: false }));
            setToast({ message: 'Item updated successfully.', type: 'success' });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {contractToDelete && (
        <div className={styles.modalOverlay} onClick={() => setContractToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHead}>
              <div className={styles.deleteModalIcon}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Delete Contract</h3>
            </div>
            <p className={styles.deleteModalText}>
              Are you sure you want to delete contract <strong>{contractToDelete.title}</strong>? All associated extracted data will be removed.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setContractToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recall Confirmation Modal */}
      {isRecallModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRecallModalOpen(false)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className={styles.deleteModalHead}>
              <div className={styles.deleteModalIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Recall Contract Submission?</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Current submission: {(research?.activeSubmittedContractIds || []).length || packageCounts.selected} contract(s)
                </span>
              </div>
            </div>
            <p className={styles.deleteModalText}>
              This package is currently awaiting Manager review. Recalling will return the task to In Progress so you can make edits or re-extract.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsRecallModalOpen(false)}
                disabled={isRecalling}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRecallSubmission}
                disabled={isRecalling}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}
              >
                {isRecalling ? 'Recalling...' : 'Confirm Recall'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      <EditContractModal
        open={!!editContractModalContract}
        contract={editContractModalContract}
        projectId={projectId}
        taskId={taskId}
        onClose={() => setEditContractModalContract(null)}
        onSuccess={(updatedResearch) => {
          setResearch(updatedResearch);
          setToast({ message: 'Contract details updated successfully.', type: 'success' });
        }}
      />

      {/* Manager Request Changes Modal */}
      {managerRequestChangesModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
          }}
          onClick={() => setManagerRequestChangesModalOpen(false)}
        >
          <div
            style={{
              width: 500,
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff7ed',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#c2410c" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#9a3412' }}>
                  Request Revisions from Staff
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManagerRequestChangesModalOpen(false)}
                disabled={isManagerProcessing}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                Please specify the details, figures, or clauses that need to be reviewed or corrected in this contract.
              </p>
              <textarea
                className={styles.formInput}
                rows={4}
                value={managerChangesReason}
                onChange={(e) => setManagerChangesReason(e.target.value)}
                placeholder="e.g., Verify Party B representative, effective date in original document is September 10..."
                style={{ width: '100%', fontSize: 13.5, resize: 'vertical' }}
                disabled={isManagerProcessing}
                autoFocus
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setManagerRequestChangesModalOpen(false)}
                  disabled={isManagerProcessing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    if (managerReviewActionContractId) {
                      handleManagerRequestChanges(managerReviewActionContractId, managerChangesReason);
                    }
                  }}
                  disabled={isManagerProcessing || !managerChangesReason.trim()}
                  style={{ background: '#c2410c', borderColor: '#c2410c', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isManagerProcessing ? <Loader2 size={14} className={styles.spinIcon} /> : <AlertTriangle size={14} />}
                  {isManagerProcessing ? 'Submitting...' : 'Send Revision Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
