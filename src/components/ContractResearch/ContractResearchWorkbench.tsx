import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  ContractResearchResponse,
  ContractEntry,
  ContractFieldQualityStatus,
  ContractType,
  ExtractedContractField,
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
  if (type === 'COOPERATION_AGREEMENT') return 'Thỏa thuận hợp tác';
  if (type === 'PARTNERSHIP_AGREEMENT') return 'Đối tác chiến lược';
  if (type === 'JOINT_VENTURE_AGREEMENT') return 'Liên doanh (JVA)';
  if (type === 'BUSINESS_COOPERATION_CONTRACT') return 'Hợp tác KD (BCC)';
  return type.replace(/_/g, ' ');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatNumericValue = (val?: number | string | null) => {
  if (val === undefined || val === null || val === '') return '—';
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return new Intl.NumberFormat('vi-VN').format(num);
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
  }>({ open: false, contractId: '', fieldPath: '', fieldName: '', rawField: null });

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

  // Polling when any contract is extracting
  useEffect(() => {
    const isAnyExtracting = (research?.contracts || []).some(
      (c) => c.extractionStatus === 'PROCESSING'
    );

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
  }, [research?.contracts, fetchResearch]);

  const contracts = useMemo(() => research?.contracts || [], [research?.contracts]);
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
      // 1. Số hiệu hợp đồng
      rows.push({
        id: 'gen-contractNumber',
        fieldPath: 'contractNumber',
        label: 'Số hiệu hợp đồng',
        value: common.contractNumber?.value || '',
        section: 'General Terms',
        qualityStatus: common.contractNumber?.qualityStatus || 'VALID',
        verificationStatus: common.contractNumber?.verificationStatus || 'UNVERIFIED',
        rawField: common.contractNumber,
      });

      // 2. Ngày ký
      rows.push({
        id: 'gen-signingDate',
        fieldPath: 'signingDate',
        label: 'Ngày ký (Signing Date)',
        value: common.signingDate?.value ? String(common.signingDate.value) : '',
        section: 'General Terms',
        qualityStatus: common.signingDate?.qualityStatus || 'VALID',
        verificationStatus: common.signingDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.signingDate as any,
      });

      // 3. Ngày hiệu lực
      rows.push({
        id: 'gen-effectiveDate',
        fieldPath: 'effectiveDate',
        label: 'Ngày hiệu lực (Effective Date)',
        value: common.effectiveDate?.value ? String(common.effectiveDate.value) : '',
        section: 'General Terms',
        qualityStatus: common.effectiveDate?.qualityStatus || 'VALID',
        verificationStatus: common.effectiveDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.effectiveDate as any,
      });

      // 4. Ngày hết hạn
      rows.push({
        id: 'gen-expiryDate',
        fieldPath: 'expiryDate',
        label: 'Ngày hết hạn (Expiry Date)',
        value: common.expiryDate?.value ? String(common.expiryDate.value) : '',
        section: 'General Terms',
        qualityStatus: common.expiryDate?.qualityStatus || 'VALID',
        verificationStatus: common.expiryDate?.verificationStatus || 'UNVERIFIED',
        rawField: common.expiryDate as any,
      });

      // 5. Giá trị hợp đồng
      rows.push({
        id: 'gen-contractValue',
        fieldPath: 'contractValue',
        label: 'Giá trị hợp đồng (Contract Value)',
        value: common.contractValue?.value?.amount ? formatNumericValue(common.contractValue.value.amount) : '',
        unit: common.contractValue?.value?.currency || 'VND',
        section: 'General Terms',
        qualityStatus: common.contractValue?.qualityStatus || 'VALID',
        verificationStatus: common.contractValue?.verificationStatus || 'UNVERIFIED',
        rawField: common.contractValue as any,
      });

      // 6. Luật áp dụng
      rows.push({
        id: 'gen-governingLaw',
        fieldPath: 'governingLaw',
        label: 'Luật áp dụng (Governing Law)',
        value: common.governingLaw?.value || '',
        section: 'General Terms',
        qualityStatus: common.governingLaw?.qualityStatus || 'VALID',
        verificationStatus: common.governingLaw?.verificationStatus || 'UNVERIFIED',
        rawField: common.governingLaw,
      });

      // 7. Mục đích hợp tác
      rows.push({
        id: 'gen-purpose',
        fieldPath: 'purpose',
        label: 'Mục đích hợp tác (Purpose)',
        value: common.purpose?.value || '',
        section: 'General Terms',
        qualityStatus: common.purpose?.qualityStatus || 'VALID',
        verificationStatus: common.purpose?.verificationStatus || 'UNVERIFIED',
        rawField: common.purpose,
      });

      // 8. Các bên tham gia ký kết
      (common.parties || []).forEach((party, idx) => {
        rows.push({
          id: `party-${party.id || idx}`,
          fieldPath: 'parties',
          label: `Bên tham gia: ${party.legalName}`,
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
    try {
      const updated = await contractResearchApi.extractContract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'AI Extraction started.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Extraction failed.', type: 'error' });
    }
  };

  const handleReExtract = async (contractId: string) => {
    try {
      const updated = await contractResearchApi.reExtractContract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'AI Re-Extraction started.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Re-Extraction failed.', type: 'error' });
    }
  };

  const handleCancelExtract = async (contractId: string) => {
    try {
      const updated = await contractResearchApi.cancelExtract(projectId, taskId, contractId);
      setResearch(updated);
      setToast({ message: 'Đã hủy quá trình trích xuất.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Hủy trích xuất thất bại.', type: 'error' });
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
      common.contractValue,
      common.governingLaw,
      common.purpose,
    ];
    for (const f of fields) {
      if (f && f.qualityStatus === 'NEEDS_REVIEW' && f.verificationStatus === 'UNVERIFIED') {
        return true;
      }
    }
    if (common.parties) {
      for (const p of common.parties) {
        if (p.qualityStatus === 'NEEDS_REVIEW' && p.verificationStatus === 'UNVERIFIED') {
          return true;
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
          ? 'Hợp đồng này đã được phê duyệt, không cần nộp lại.'
          : 'Vui lòng tích chọn ít nhất 1 hợp đồng để nộp cho Manager.',
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
        message: `Hợp đồng "${notCompletedContract.title}" chưa hoàn tất bóc tách dữ liệu AI. Vui lòng kiểm tra trước khi nộp.`,
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
        message: `Hợp đồng "${unconfirmedMatch.title}" chưa được xác nhận thuộc doanh nghiệp mục tiêu. Vui lòng bấm "Xác nhận hợp đồng này" ở khung cảnh báo màu vàng trước khi nộp.`,
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
        message: `Hợp đồng "${typeMismatch.title}" chưa được giải quyết sự không khớp về loại hợp đồng. Vui lòng kiểm tra lại.`,
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
        message: `Hợp đồng "${needsReviewContract.title}" có trường dữ liệu được gắn cờ "Cần kiểm tra" chưa được xác thực. Vui lòng kiểm tra và xác thực trước khi nộp.`,
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
        message: `Hợp đồng "${unverifiedContract.title}" chưa hoàn tất thẩm định (còn ${unverifiedCount}/${rows.length} trường chưa xác thực). Vui lòng xác thực trước khi nộp cho Manager.`,
        type: 'error',
      });
      return;
    }

    setIsSubmittingPackage(true);
    try {
      const noteToSend = selectedContractsForSubmission.some((c) => c.reviewStatus === 'CHANGES_REQUESTED')
        ? 'Đã hoàn tất chỉnh sửa hợp đồng theo phản hồi của Manager.'
        : 'Partner contracts submitted for Manager review.';

      const updated = await contractResearchApi.submitResearch(
        projectId,
        taskId,
        effectiveSubmissionIds,
        noteToSend
      );
      setResearch(updated);
      setToast({ message: 'Đã nộp gói hợp đồng cho Manager phê duyệt thành công!', type: 'success' });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err: any) {
      const backendMsg = err?.payload?.message || err?.message || err?.response?.data?.message || '';
      const errorCode = err?.payload?.errorCode || '';

      let displayMsg = 'Nộp hồ sơ hợp đồng thất bại.';
      if (errorCode === 'COMPANY_MATCH_UNCONFIRMED' || backendMsg.includes('requires company match confirmation')) {
        displayMsg = 'Hợp đồng chưa được xác nhận thuộc phạm vi doanh nghiệp mục tiêu. Vui lòng bấm "Xác nhận hợp đồng này" trước khi nộp.';
      } else if (errorCode === 'UNVERIFIED_FIELDS' || backendMsg.includes('chưa hoàn tất xác thực')) {
        displayMsg = 'Hợp đồng chưa hoàn tất xác thực các trường dữ liệu trước khi nộp cho Manager.';
      } else if (errorCode === 'UNRESOLVED_NEEDS_REVIEW' || backendMsg.includes('NEEDS_REVIEW')) {
        displayMsg = 'Hợp đồng còn trường dữ liệu gắn cờ "Cần kiểm tra" chưa được xác thực.';
      } else if (errorCode === 'TYPE_MISMATCH_UNRESOLVED' || backendMsg.includes('type mismatch')) {
        displayMsg = 'Hợp đồng có loại hình chưa khớp cần được xử lý trước khi nộp.';
      } else if (errorCode === 'ACTIVE_SUBMISSION_EXISTS' || backendMsg.includes('already active')) {
        displayMsg = 'Nhiệm vụ này đã có gói nộp đang chờ Manager xét duyệt.';
      } else if (errorCode === 'EMPTY_SUBMISSION') {
        displayMsg = 'Vui lòng chọn ít nhất một hợp đồng để nộp cho Manager.';
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
    try {
      if (row.isItem && row.itemId) {
        const updated = await contractResearchApi.verifyArrayItem(
          projectId,
          taskId,
          selectedContract.id,
          row.fieldPath,
          row.itemId
        );
        setResearch(updated);
      } else {
        const updated = await contractResearchApi.verifyScalarField(
          projectId,
          taskId,
          selectedContract.id,
          row.fieldPath
        );
        setResearch(updated);
      }
      setToast({ message: 'Đã xác minh điều khoản.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Xác minh thất bại.', type: 'error' });
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
      let currentResearch: ContractResearchResponse | null = null;
      for (const row of rowsToProcess) {
        if (row.isItem && row.itemId) {
          currentResearch = await contractResearchApi.verifyArrayItem(
            projectId,
            taskId,
            selectedContract.id,
            row.fieldPath,
            row.itemId
          );
        } else {
          currentResearch = await contractResearchApi.verifyScalarField(
            projectId,
            taskId,
            selectedContract.id,
            row.fieldPath
          );
        }
      }
      if (currentResearch) {
        setResearch(currentResearch);
      }
      setToast({ message: `Đã xác thực thành công toàn bộ ${rowsToProcess.length} trường thông tin.`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Có lỗi khi xác thực các trường.', type: 'error' });
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleConfirmCompanyMatch = async (contractId: string, confirmed: boolean) => {
    setIsConfirmingCompany(true);
    try {
      const updated = await contractResearchApi.confirmCompany(projectId, taskId, contractId, confirmed);
      setResearch(updated);
      setToast({ message: 'Đã xác nhận đối tượng doanh nghiệp cho hợp đồng.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Xác nhận doanh nghiệp thất bại.', type: 'error' });
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
      setToast({ message: 'Đã phê duyệt hợp đồng thành công.', type: 'success' });
      const remainingPending = (updated.contracts || []).filter(
        (c) => (updated.activeSubmittedContractIds?.includes(c.id) || c.reviewStatus === 'PENDING_REVIEW') && c.reviewStatus === 'PENDING_REVIEW'
      );
      if (remainingPending.length === 0 && onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Phê duyệt hợp đồng thất bại.', type: 'error' });
    } finally {
      setIsManagerProcessing(false);
    }
  };

  const handleManagerRequestChanges = async (contractId: string, reason: string) => {
    if (!reason.trim()) {
      setToast({ message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa.', type: 'error' });
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
      setToast({ message: 'Đã gửi yêu cầu chỉnh sửa cho Staff thành công.', type: 'success' });
      if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Yêu cầu chỉnh sửa thất bại.', type: 'error' });
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
      setToast({ message: `Đã phê duyệt toàn bộ ${pendingContracts.length} hợp đồng.`, type: 'success' });
      if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Có lỗi khi phê duyệt tất cả hợp đồng.', type: 'error' });
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
      setToast({ message: 'Không tìm thấy ID tài liệu PDF gốc.', type: 'error' });
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
      setToast({ message: 'Không thể mở tài liệu PDF. Vui lòng kiểm tra quyền truy cập hoặc thử lại sau.', type: 'error' });
    } finally {
      setOpeningPdfId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 450, color: '#64748b' }}>
        <Loader2 size={28} className={styles.spinIcon} />
        <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Đang tải dữ liệu hồ sơ hợp đồng...</span>
      </div>
    );
  }

  const statusStr = (research?.status || taskStatus || 'IN_PROGRESS').toUpperCase();
  const isDoneOrApproved = statusStr === 'APPROVED' || statusStr === 'DONE' || statusStr === 'COMPLETED';
  const displayStatus = isDoneOrApproved
    ? { label: 'Hoàn thành', className: styles.statusApproved }
    : statusStr === 'CHANGES_REQUESTED'
    ? { label: 'Cần chỉnh sửa', className: styles.statusChangesRequested }
    : statusStr === 'SUBMITTED' || statusStr === 'IN_REVIEW' || isManagerMode
    ? { label: 'Đang chờ duyệt', className: styles.statusPendingReview }
    : statusStr === 'DRAFT'
    ? { label: 'Bản nháp', className: styles.statusDraft }
    : { label: 'Đang thực hiện', className: styles.statusInProgress };

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
    fieldType?: 'text' | 'date' | 'number';
  }) => {
    const isVerified = params.rawField?.verificationStatus === 'VERIFIED';
    const isNeedsReview = params.rawField?.qualityStatus === 'NEEDS_REVIEW';
    const hasValue =
      params.rawValue !== null &&
      params.rawValue !== undefined &&
      params.rawValue !== '' &&
      params.rawValue !== '—';

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
                <CheckCircle2 size={10} /> Đã xác thực
              </>
            ) : isNeedsReview ? (
              <>
                <AlertTriangle size={10} /> Cần kiểm tra
              </>
            ) : (
              <>
                <Clock size={10} /> Chờ duyệt
              </>
            )}
          </span>
        </div>

        <div className={contractStyles.kpiValue}>
          {hasValue ? (
            params.displayValue
          ) : (
            <span
              className={contractStyles.kpiValueEmpty}
              onClick={effectiveCanEdit ? handleEdit : undefined}
              title="Bấm để bổ sung thông tin"
            >
              Chưa có thông tin <Edit3 size={11} />
            </span>
          )}
        </div>

        <div className={contractStyles.kpiFooter}>
          {params.sourcePage ? (
            <span className={styles.sourceTag}>Trang {params.sourcePage}</span>
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
                title="Xem trích dẫn từ văn bản gốc"
              >
                <Eye size={12} /> Bằng chứng
              </button>
            )}

            {effectiveCanEdit && (
              <button
                type="button"
                className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnEdit}`}
                onClick={handleEdit}
                title="Chỉnh sửa trường này"
              >
                <Edit3 size={12} /> Sửa
              </button>
            )}

            {effectiveCanEdit && (
              <button
                type="button"
                className={`${contractStyles.kpiBtn} ${
                  isVerified ? contractStyles.kpiBtnVerified : contractStyles.kpiBtnVerify
                }`}
                onClick={handleVerify}
                title={isVerified ? 'Bấm để hủy xác thực' : 'Bấm để xác thực'}
              >
                {isVerified ? <CheckCircle2 size={12} /> : <Check size={12} />}
                {isVerified ? 'Đã duyệt' : 'Xác thực'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.workbench}>
      {/* Top Meta Bar */}
      <div className={styles.metaBar}>
        <div className={styles.metaGroup} style={{ flex: 1 }}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Trạng thái:</span>
            <span className={`${styles.statusBadge} ${displayStatus.className}`}>
              ● {displayStatus.label}
            </span>
          </div>

          <div className={styles.metaDivider} />

          <div className={styles.metaItem}>
            <Building2 size={14} className={styles.metaLabel} />
            <span className={styles.metaLabel}>Doanh nghiệp:</span>
            <strong>{targetCompanyName || 'Chưa có mục tiêu'}</strong>
          </div>

          <div className={styles.metaDivider} />

          <div className={styles.metaItem}>
            <Layers size={14} className={styles.metaLabel} />
            <span className={styles.metaLabel}>Nhiệm vụ:</span>
            <strong>{taskTypeLabel || 'Thu thập hợp đồng đối tác'}</strong>
          </div>

          <div className={styles.metaDivider} />

          <div className={styles.metaItem}>
            <Calendar size={14} className={styles.metaLabel} />
            <span className={styles.metaLabel}>Hạn chót:</span>
            <strong>{dueDate ? formatDate(dueDate) : 'Không có hạn chót'}</strong>
          </div>
        </div>
      </div>

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
            title="Đóng"
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
                <h3>{isManagerMode ? 'Hợp đồng cần thẩm định' : 'Danh sách hợp đồng'}</h3>
                <span className={styles.badgeCount}>{contractsToDisplay.length}</span>
              </div>
              <p>{isManagerMode ? 'Hợp đồng cần thẩm định' : 'Thêm tài liệu & Bóc tách điều khoản'}</p>
            </div>

            {!isManagerMode ? (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                disabled={!effectiveCanEdit}
              >
                <Plus size={14} /> Thêm hợp đồng
              </button>
            ) : contractsToDisplay.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length > 1 ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleManagerApproveAll}
                disabled={isManagerProcessing}
                style={{ padding: '5px 12px', fontSize: 12, color: '#15803d', borderColor: '#86efac', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                title="Phê duyệt tất cả các hợp đồng đang chờ"
              >
                <Check size={13} />
                Duyệt tất cả ({contractsToDisplay.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length})
              </button>
            ) : null}
          </div>

          <div className={styles.reportGroups}>
            <div className={styles.reportList}>
              {contractsToDisplay.length === 0 ? (
                <div className={styles.emptyCard} style={{ margin: '20px 0', padding: '30px 16px' }}>
                  <div className={styles.emptyIcon}>
                    <FileText size={24} />
                  </div>
                  <h3>Chưa có hợp đồng nào</h3>
                  <p>Bấm nút "+ Thêm hợp đồng" ở góc trên để bắt đầu trích xuất các điều khoản.</p>
                </div>
              ) : (
                contractsToDisplay.map((contract) => {
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
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Selected Contract Workspace */}
        <section className={styles.panel} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 }}>
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
                        title="Chỉnh sửa thông tin hợp đồng"
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
                        Ngày ký: <strong style={{ color: '#1e293b' }}>{common?.signingDate?.value ? formatDate(String(common.signingDate.value)) : '—'}</strong>
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
                            ? 'Đang hiệu lực'
                            : selectedContract.derivedContractStatus === 'EXPIRED'
                            ? 'Hết hiệu lực'
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
                        <span>Doanh nghiệp hợp lệ</span>
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
                      title="Chỉnh sửa tên và thông tin hợp đồng"
                    >
                      <Edit3 size={14} />
                      Sửa hợp đồng
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
                      {openingPdfId === selectedContract.documentId ? 'Đang tải PDF...' : 'Xem PDF gốc'}
                    </button>
                  )}
                  {effectiveCanEdit && selectedContract.extractionStatus === 'COMPLETED' && (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => handleReExtract(selectedContract.id)}
                    >
                      <RefreshCw size={14} />
                      Trích xuất lại
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
                            Yêu cầu chỉnh sửa
                          </button>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            style={{ padding: '6px 16px', fontSize: 13, background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleManagerApprove(selectedContract.id)}
                            disabled={isManagerProcessing}
                          >
                            {isManagerProcessing ? <Loader2 size={14} className={styles.spinIcon} /> : <Check size={14} />}
                            Phê duyệt hợp đồng
                          </button>
                        </div>
                      )}
                      {selectedContract.reviewStatus === 'APPROVED' && (
                        <span className={`${styles.statusBadge} ${styles.statusApproved}`} style={{ padding: '6px 12px', fontSize: 12.5 }}>
                          <CheckCircle2 size={14} />
                          Đã phê duyệt
                        </span>
                      )}
                      {selectedContract.reviewStatus === 'CHANGES_REQUESTED' && (
                        <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`} style={{ padding: '6px 12px', fontSize: 12.5 }}>
                          <AlertTriangle size={14} />
                          Đã yêu cầu chỉnh sửa
                        </span>
                      )}
                    </>
                  )}

                  {!isManagerMode && (
                    <>
                      {selectedContract.extractionStatus === 'COMPLETED' ? (
                        <span className={`${styles.statusBadge} ${styles.statusExtracted}`}>
                          <CheckCircle2 size={13} />
                          Đã trích xuất xong
                        </span>
                      ) : selectedContract.extractionStatus === 'PROCESSING' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className={`${styles.statusBadge} ${styles.statusInProgress}`}>
                            <Loader2 size={13} className={styles.spinIcon} />
                            Đang trích xuất...
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
                              title="Hủy quá trình trích xuất AI"
                            >
                              <X size={13} />
                              Hủy
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                          ● Chưa trích xuất
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
                    <strong>Ý kiến phản hồi / Yêu cầu sửa đổi từ Manager</strong>
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
                        <strong style={{ color: '#b45309' }}>Yêu cầu xác nhận doanh nghiệp:</strong>{' '}
                        Doanh nghiệp mục tiêu của dự án là <strong>"{targetCompanyName || 'N/A'}"</strong>.
                        Hợp đồng ghi nhận các bên ký kết:{' '}
                        <strong>
                          {(common?.parties || []).map((p) => p.legalName).join(', ') || 'Chưa rõ bên ký kết'}
                        </strong>
                        . Vui lòng xác nhận hợp đồng này thuộc phạm vi thu thập dữ liệu của doanh nghiệp trước khi nộp cho Manager.
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
                        {isConfirmingCompany ? 'Đang xác nhận...' : 'Xác nhận hợp đồng này'}
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
                  />
                </div>
              ) : selectedContract.extractionStatus !== 'COMPLETED' ? (
                <div className={styles.inlineEmpty} style={{ flexDirection: 'column', gap: 14, minHeight: 220, padding: 30, margin: 'auto' }}>
                  <Sparkles size={32} color="#2563eb" />
                  <span style={{ maxWidth: 460, textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                    Bấm nút bên dưới để AI tự động phân loại và trích xuất các điều khoản, thông tin các bên ký kết và trách nhiệm pháp lý từ hợp đồng.
                  </span>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => handleExtract(selectedContract.id)}
                    disabled={!effectiveCanEdit}
                  >
                    <Sparkles size={14} />
                    {selectedContract.extractionStatus === 'FAILED' ? 'Thử lại trích xuất' : 'Trích xuất dữ liệu hợp đồng'}
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
                          Tiến độ thẩm định: <strong>{verifiedCount}/{totalCount}</strong> trường ({percentVerified}%)
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
                              background: percentVerified === 100 ? '#f0fdf4' : '#eff6ff',
                              color: percentVerified === 100 ? '#15803d' : '#2563eb',
                              borderColor: percentVerified === 100 ? '#86efac' : '#bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={handleVerifyAllEligible}
                            disabled={isVerifyingAll}
                            title="Xác thực toàn bộ các trường thông tin hợp đồng"
                          >
                            {isVerifyingAll ? (
                              <Loader2 size={13} className={styles.spinIcon} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {isVerifyingAll
                              ? 'Đang xác thực...'
                              : percentVerified === 100
                              ? 'Đã xác thực tất cả'
                              : `Xác thực tất cả (${totalCount - verifiedCount} trường)`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section 1: Thông tin chung & Thời hạn pháp lý */}
                    <div className={contractStyles.sectionBox}>
                      <div className={contractStyles.sectionBoxHead}>
                        <div className={contractStyles.sectionBoxTitle}>
                          <Scale size={16} color="#2563eb" />
                          <span>1. Thông tin chung & Thời hạn pháp lý</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={contractStyles.sectionMeta}>
                            Trạng thái hợp đồng: <strong style={{ color: '#15803d' }}>{selectedContract.derivedContractStatus || 'ACTIVE'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className={contractStyles.kpiGrid}>
                        {renderKpiCard({
                          id: 'gen-contractNumber',
                          fieldPath: 'contractNumber',
                          label: 'Số hiệu hợp đồng',
                          rawValue: common?.contractNumber?.value,
                          displayValue: common?.contractNumber?.value,
                          rawField: common?.contractNumber,
                          sourcePage: common?.contractNumber?.sourcePage,
                          evidence: common?.contractNumber?.evidence,
                        })}

                        {renderKpiCard({
                          id: 'gen-signingDate',
                          fieldPath: 'signingDate',
                          label: 'Ngày ký (Signing Date)',
                          rawValue: common?.signingDate?.value,
                          displayValue: common?.signingDate?.value ? formatDate(String(common.signingDate.value)) : null,
                          rawField: common?.signingDate as any,
                          sourcePage: common?.signingDate?.sourcePage,
                          evidence: common?.signingDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-effectiveDate',
                          fieldPath: 'effectiveDate',
                          label: 'Ngày hiệu lực (Effective Date)',
                          rawValue: common?.effectiveDate?.value,
                          displayValue: common?.effectiveDate?.value ? formatDate(String(common.effectiveDate.value)) : null,
                          rawField: common?.effectiveDate as any,
                          sourcePage: common?.effectiveDate?.sourcePage,
                          evidence: common?.effectiveDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-expiryDate',
                          fieldPath: 'expiryDate',
                          label: 'Ngày hết hạn (Expiry Date)',
                          rawValue: common?.expiryDate?.value,
                          displayValue: common?.expiryDate?.value ? formatDate(String(common.expiryDate.value)) : null,
                          rawField: common?.expiryDate as any,
                          sourcePage: common?.expiryDate?.sourcePage,
                          evidence: common?.expiryDate?.evidence,
                          fieldType: 'date',
                        })}

                        {renderKpiCard({
                          id: 'gen-contractValue',
                          fieldPath: 'contractValue',
                          label: 'Giá trị hợp đồng (Contract Value)',
                          rawValue: common?.contractValue?.value?.amount,
                          displayValue: common?.contractValue?.value?.amount
                            ? `${formatNumericValue(common.contractValue.value.amount)} ${common.contractValue.value.currency || 'VND'}`
                            : (common?.contractValue?.value ? 'Phi tài chính (Hợp tác phi tiền tệ)' : null),
                          rawField: common?.contractValue as any,
                          sourcePage: common?.contractValue?.sourcePage,
                          evidence: common?.contractValue?.evidence,
                        })}

                        {renderKpiCard({
                          id: 'gen-governingLaw',
                          fieldPath: 'governingLaw',
                          label: 'Luật áp dụng (Governing Law)',
                          rawValue: common?.governingLaw?.value,
                          displayValue: common?.governingLaw?.value,
                          rawField: common?.governingLaw,
                          sourcePage: common?.governingLaw?.sourcePage,
                          evidence: common?.governingLaw?.evidence,
                        })}

                        {renderKpiCard({
                          id: 'gen-purpose',
                          fieldPath: 'purpose',
                          label: 'Mục đích hợp tác (Purpose)',
                          rawValue: common?.purpose?.value,
                          displayValue: (
                            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'normal', color: '#1e293b' }}>
                              {common?.purpose?.value}
                            </span>
                          ),
                          rawField: common?.purpose,
                          sourcePage: common?.purpose?.sourcePage,
                          evidence: common?.purpose?.evidence,
                          gridSpan: 2,
                        })}
                      </div>
                    </div>

                    {/* Section 2: Các bên tham gia ký kết */}
                    <div className={contractStyles.sectionBox}>
                      <div className={contractStyles.sectionBoxHead}>
                        <div className={contractStyles.sectionBoxTitle}>
                          <Users size={16} color="#2563eb" />
                          <span>2. Các bên tham gia ký kết ({(common?.parties || []).length} bên)</span>
                        </div>
                      </div>

                      <div className={contractStyles.partyGrid}>
                        {(common?.parties || []).map((party, idx) => {
                          const isVerified = party.verificationStatus === 'VERIFIED';
                          const isNeedsReview = party.qualityStatus === 'NEEDS_REVIEW';

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
                              label: `Bên tham gia: ${party.legalName}`,
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
                                      Bên tham gia ký kết #{idx + 1}
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
                                      <CheckCircle2 size={10} /> Đã xác thực
                                    </>
                                  ) : isNeedsReview ? (
                                    <>
                                      <AlertTriangle size={10} /> Cần kiểm tra
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={10} /> Chờ duyệt
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Structured Party Details Grid */}
                              <div className={contractStyles.partyInfoGrid}>
                                <div className={contractStyles.partyInfoItem}>
                                  <span className={contractStyles.partyInfoLabel}>Vai trò</span>
                                  <span className={contractStyles.partyInfoValue}>{party.role || '—'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem}>
                                  <span className={contractStyles.partyInfoLabel}>Mã số thuế</span>
                                  <span className={contractStyles.partyInfoValue}>{party.taxCode || '—'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                                  <span className={contractStyles.partyInfoLabel}>Người đại diện</span>
                                  <span className={contractStyles.partyInfoValue}>{party.representative || '—'}</span>
                                </div>
                                <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                                  <span className={contractStyles.partyInfoLabel}>Địa chỉ trụ sở</span>
                                  <span className={contractStyles.partyInfoValue}>{party.address || '—'}</span>
                                </div>
                              </div>

                              <div className={contractStyles.kpiFooter}>
                                <span className={styles.sourceTag}>Trang {party.sourcePage || 1}</span>

                                <div className={contractStyles.kpiActions}>
                                  {party.evidence && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnSecondary}`}
                                      onClick={() =>
                                        handleOpenEvidence({
                                          fieldName: `Bên tham gia: ${party.legalName}`,
                                          valueText: party.role ? `${party.role} • MST: ${party.taxCode || 'N/A'}` : `MST: ${party.taxCode || 'N/A'}`,
                                          sourcePage: party.sourcePage,
                                          evidence: party.evidence,
                                          confidence: party.confidence,
                                          qualityStatus: party.qualityStatus,
                                          verificationStatus: party.verificationStatus,
                                          onVerify: handleVerifyParty,
                                          onEdit: handleEditParty,
                                        })
                                      }
                                      title="Xem trích dẫn từ văn bản gốc"
                                    >
                                      <Eye size={12} /> Bằng chứng
                                    </button>
                                  )}

                                  {effectiveCanEdit && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${contractStyles.kpiBtnEdit}`}
                                      onClick={handleEditParty}
                                      title="Chỉnh sửa thông tin bên này"
                                    >
                                      <Edit3 size={12} /> Sửa
                                    </button>
                                  )}

                                  {effectiveCanEdit && (
                                    <button
                                      type="button"
                                      className={`${contractStyles.kpiBtn} ${
                                        isVerified ? contractStyles.kpiBtnVerified : contractStyles.kpiBtnVerify
                                      }`}
                                      onClick={handleVerifyParty}
                                      title={isVerified ? 'Bấm để hủy xác thực' : 'Bấm để xác thực'}
                                    >
                                      {isVerified ? <CheckCircle2 size={12} /> : <Check size={12} />}
                                      {isVerified ? 'Đã duyệt' : 'Xác thực'}
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
            <div className={styles.emptyCard} style={{ margin: 'auto' }}>
              <div className={styles.emptyIcon}>
                <Layers size={30} />
              </div>
              <h3>Chưa chọn hợp đồng</h3>
              <p>Chọn một hợp đồng từ danh sách bên trái hoặc bấm "+ Thêm hợp đồng" để tạo hợp đồng mới.</p>
            </div>
          )}
        </section>
      </div>

      {/* Package Summary Footer (Staff Only) */}
      {!isManagerMode && (
        <div className={styles.packageSummary}>
          <div className={styles.summaryStats}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
              {!hasMultipleContracts
                ? `${effectiveSubmissionIds.length} hợp đồng sẵn sàng để nộp cho Manager.`
                : `${packageCounts.selected} hợp đồng đã chọn để nộp cho Manager.`}
            </span>
          </div>

          <div className={styles.summaryActions}>
            {canRecall && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsRecallModalOpen(true)}
                style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
              >
                <RotateCcw size={14} /> Thu hồi gói nộp
              </button>
            )}

            {!isSubmitted && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSubmitPackage}
                disabled={!effectiveCanEdit || isSubmittingPackage || allApproved}
              >
                {isSubmittingPackage ? (
                  <>
                    <Loader2 size={14} className={styles.spinIcon} /> Đang nộp...
                  </>
                ) : (
                  'Nộp cho Manager'
                )}
              </button>
            )}
          </div>
        </div>
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
            message: 'Đã thêm hợp đồng mới. Bấm "Trích xuất dữ liệu hợp đồng" để trích xuất các điều khoản.',
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
            setToast({ message: 'Đã xác nhận loại hợp đồng thành công.', type: 'success' });
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
            setToast({ message: 'Đã cập nhật trường thông tin.', type: 'success' });
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
            setToast({ message: 'Đã cập nhật mục.', type: 'success' });
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Xóa hợp đồng</h3>
            </div>
            <p className={styles.deleteModalText}>
              Bạn có chắc chắn muốn xóa hợp đồng <strong>{contractToDelete.title}</strong>? Toàn bộ dữ liệu trích xuất liên quan sẽ bị xóa.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setContractToDelete(null)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa hợp đồng'}
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Thu hồi gói nộp hợp đồng?</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Gói nộp hiện tại: {(research?.activeSubmittedContractIds || []).length || packageCounts.selected} hợp đồng
                </span>
              </div>
            </div>
            <p className={styles.deleteModalText}>
              Gói này đang chờ Manager duyệt. Việc thu hồi sẽ chuyển task về trạng thái Đang thực hiện (In Progress) để bạn có thể chỉnh sửa hoặc trích xuất lại.
            </p>
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsRecallModalOpen(false)}
                disabled={isRecalling}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRecallSubmission}
                disabled={isRecalling}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}
              >
                {isRecalling ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}
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
          setToast({ message: 'Cập nhật thông tin hợp đồng thành công.', type: 'success' });
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
                  Yêu cầu nhân viên chỉnh sửa
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
                Vui lòng nêu rõ các nội dung, số liệu hoặc điều khoản cần nhân viên kiểm tra hoặc bổ sung lại trong hợp đồng.
              </p>
              <textarea
                className={styles.formInput}
                rows={4}
                value={managerChangesReason}
                onChange={(e) => setManagerChangesReason(e.target.value)}
                placeholder="VD: Kiểm tra lại người đại diện bên B, ngày hiệu lực trong văn bản gốc là ngày 10/09..."
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
                  Hủy
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
                  {isManagerProcessing ? 'Đang gửi...' : 'Gửi yêu cầu chỉnh sửa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
