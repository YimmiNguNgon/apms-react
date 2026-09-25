import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { companyProfileContractApi } from '../../API/companyProfileContractApi';
import { API_BASE_URL } from '../../services/api';
import { CompanyDetailEmptyState } from './CompanyDetailEmptyState';
import type {
  CompanyProfileContractDto,
  UpdateCompanyProfileContractRequest,
} from '../../types/companyProfileContract';
import type {
  ContractStatus,
  ExtractedContractField,
  ContractValue,
  ContractParty,
} from '../../types/contractResearch';
import styles from './DocumentsTab.module.css';

const PAGE_SIZE = 5;

export interface ContractTabHandle {
  isDirty: () => boolean;
  save: () => Promise<void>;
  cancel: () => void;
}

interface DocumentsTabProps {
  companyProfileId: string;
  projectId?: number | null;
  userRole?: string | null;
  currentUserId?: number | string | null;
  editable?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED';

const formatContractValue = (cv?: ExtractedContractField<ContractValue> | null): string => {
  if (!cv || !cv.value) return '—';
  if (typeof cv.value === 'string') return cv.value;
  if (cv.value.rawAmountText) return cv.value.rawAmountText;
  if (cv.value.amount != null && cv.value.amount !== '') {
    const num = Number(cv.value.amount);
    if (!Number.isNaN(num)) {
      return `${num.toLocaleString('vi-VN')} ${cv.value.currency || ''}`.trim();
    }
    return `${cv.value.amount} ${cv.value.currency || ''}`.trim();
  }
  return '—';
};

const normStr = (val: string | null | undefined): string => {
  return (val ?? '').trim();
};

const computeDerivedContractStatus = (
  effectiveDate?: string | null,
  expiryDate?: string | null
): ContractStatus => {
  if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
    return 'UNKNOWN';
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  if (expiryDate && expiryDate < todayStr) {
    return 'EXPIRED';
  }
  if (effectiveDate && effectiveDate > todayStr) {
    return 'NOT_EFFECTIVE';
  }
  if (effectiveDate && (!expiryDate || expiryDate >= todayStr)) {
    return 'ACTIVE';
  }
  return 'UNKNOWN';
};

const isContractModified = (
  orig: CompanyProfileContractDto,
  draft: CompanyProfileContractDto
): boolean => {
  if (normStr(orig.title) !== normStr(draft.title)) return true;
  if (normStr(orig.documentDate) !== normStr(draft.documentDate)) return true;

  const oCommon = orig.commonData;
  const dCommon = draft.commonData;

  if (normStr(oCommon?.contractNumber?.value) !== normStr(dCommon?.contractNumber?.value)) return true;
  if (normStr(oCommon?.signingDate?.value) !== normStr(dCommon?.signingDate?.value)) return true;
  if (normStr(oCommon?.effectiveDate?.value) !== normStr(dCommon?.effectiveDate?.value)) return true;
  if (normStr(oCommon?.expiryDate?.value) !== normStr(dCommon?.expiryDate?.value)) return true;
  if (normStr(oCommon?.term?.value) !== normStr(dCommon?.term?.value)) return true;
  if (normStr(oCommon?.governingLaw?.value) !== normStr(dCommon?.governingLaw?.value)) return true;
  if (normStr(oCommon?.purpose?.value) !== normStr(dCommon?.purpose?.value)) return true;

  // Compare contract value
  const oVal = oCommon?.contractValue?.value;
  const dVal = dCommon?.contractValue?.value;
  if (normStr(oVal?.amount != null ? String(oVal.amount) : '') !== normStr(dVal?.amount != null ? String(dVal.amount) : '')) return true;
  if (normStr(oVal?.currency) !== normStr(dVal?.currency)) return true;
  if (normStr(oVal?.rawAmountText) !== normStr(dVal?.rawAmountText)) return true;

  // Compare parties
  const oParties = oCommon?.parties || [];
  const dParties = dCommon?.parties || [];
  if (oParties.length !== dParties.length) return true;
  for (let i = 0; i < oParties.length; i++) {
    const op = oParties[i];
    const dp = dParties[i];
    if (normStr(op.legalName) !== normStr(dp.legalName)) return true;
    if (normStr(op.taxCode) !== normStr(dp.taxCode)) return true;
    if (normStr(op.address) !== normStr(dp.address)) return true;
    if (normStr(op.representative) !== normStr(dp.representative)) return true;
    if (normStr(op.role) !== normStr(dp.role)) return true;
  }

  return false;
};

export const DocumentsTab = forwardRef<ContractTabHandle, DocumentsTabProps>(
  ({ companyProfileId, projectId, userRole, currentUserId, editable = false, onDirtyChange }, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);

    const backfillAttemptedRef = useRef(false);

    const isOwner =
      userRole === 'ROLE_BUSINESS_OWNER' ||
      userRole === 'BUSINESS_OWNER' ||
      userRole === 'ROLE_OWNER' ||
      userRole === 'OWNER' ||
      userRole === 'ROLE_SYSTEM_ADMIN' ||
      userRole === 'SYSTEM_ADMIN' ||
      userRole === 'ROLE_ADMIN' ||
      userRole === 'ADMIN';
    const isManager =
      userRole === 'ROLE_MANAGER' ||
      userRole === 'MANAGER' ||
      userRole === 'ROLE_BUSINESS_DEVELOPMENT_MANAGER' ||
      userRole === 'BUSINESS_DEVELOPMENT_MANAGER';
    const isStaff =
      userRole === 'ROLE_STAFF' ||
      userRole === 'STAFF' ||
      userRole === 'ROLE_BUSINESS_DEVELOPMENT_STAFF' ||
      userRole === 'BUSINESS_DEVELOPMENT_STAFF';

    const hasAccess = isOwner || isManager || isStaff;

    // Fetch canonical contracts from profile contract API (strictly read-only)
    const {
      data: canonicalContracts = [],
      isLoading,
      isError,
      refetch,
    } = useQuery({
      queryKey: ['canonical-company-contracts', companyProfileId, projectId],
      queryFn: () => companyProfileContractApi.getCompanyContracts(companyProfileId, projectId),
      enabled: Boolean(companyProfileId) && hasAccess,
      staleTime: 30_000,
    });

    // Idempotent migration trigger: if profile has no canonical contracts, attempt one profile-scoped backfill
    useEffect(() => {
      if (
        hasAccess &&
        !isStaff &&
        !isLoading &&
        canonicalContracts.length === 0 &&
        !backfillAttemptedRef.current
      ) {
        backfillAttemptedRef.current = true;
        companyProfileContractApi
          .backfillCompanyContracts(companyProfileId)
          .then((promotedCount) => {
            if (promotedCount > 0) {
              void refetch();
            }
          })
          .catch((err) => {
            console.warn('Idempotent profile backfill check:', err);
          });
      }
    }, [hasAccess, isLoading, canonicalContracts.length, companyProfileId, refetch]);

    // Draft state for inline editing
    const [draftContracts, setDraftContracts] = useState<CompanyProfileContractDto[]>([]);

    useEffect(() => {
      if (!editable) {
        setDraftContracts(JSON.parse(JSON.stringify(canonicalContracts)));
      }
    }, [canonicalContracts, editable]);

    // Active dataset: draft in edit mode, canonical in view mode
    const displayContracts = editable ? draftContracts : canonicalContracts;

    // Check dirty state
    const isDirty = useMemo(() => {
      if (!editable) return false;
      if (canonicalContracts.length !== draftContracts.length) return true;
      for (const draft of draftContracts) {
        const orig = canonicalContracts.find((c) => c.id === draft.id);
        if (!orig || isContractModified(orig, draft)) {
          return true;
        }
      }
      return false;
    }, [editable, canonicalContracts, draftContracts]);

    useEffect(() => {
      if (editable) {
        onDirtyChange?.(isDirty);
      }
    }, [editable, isDirty, onDirtyChange]);

    // Expose handle to CompanyDetail
    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => isDirty,
        save: async () => {
          const dirtyRequests: UpdateCompanyProfileContractRequest[] = [];
          for (const draft of draftContracts) {
            const orig = canonicalContracts.find((c) => c.id === draft.id);
            if (!orig || isContractModified(orig, draft)) {
              dirtyRequests.push({
                id: draft.id,
                title: draft.title || undefined,
                documentDate: draft.documentDate || undefined,
                contractNumber: draft.commonData?.contractNumber?.value || undefined,
                signingDate: draft.commonData?.signingDate?.value || undefined,
                effectiveDate: draft.commonData?.effectiveDate?.value || undefined,
                expiryDate: draft.commonData?.expiryDate?.value || undefined,
                term: draft.commonData?.term?.value || undefined,
                contractValue: draft.commonData?.contractValue?.value
                  ? {
                      amount: draft.commonData.contractValue.value.amount ?? null,
                      currency: draft.commonData.contractValue.value.currency || 'VND',
                      rawAmountText: draft.commonData.contractValue.value.rawAmountText || undefined,
                    }
                  : undefined,
                governingLaw: draft.commonData?.governingLaw?.value || undefined,
                purpose: draft.commonData?.purpose?.value || undefined,
                parties: draft.commonData?.parties?.map((p) => ({
                  id: p.id,
                  legalName: p.legalName,
                  taxCode: p.taxCode || null,
                  address: p.address || null,
                  representative: p.representative || null,
                  role: p.role || null,
                  confidence: p.confidence ?? null,
                  sourcePage: p.sourcePage ?? null,
                  evidence: p.evidence ?? null,
                  qualityStatus: p.qualityStatus,
                  verificationStatus: p.verificationStatus,
                  inputMethod: p.inputMethod,
                })),
                cooperationAgreementData: draft.cooperationAgreementData || undefined,
                partnershipAgreementData: draft.partnershipAgreementData || undefined,
                jointVentureAgreementData: draft.jointVentureAgreementData || undefined,
                businessCooperationContractData: draft.businessCooperationContractData || undefined,
              });
            }
          }

          if (dirtyRequests.length > 0) {
            await companyProfileContractApi.batchUpdateCompanyContracts(companyProfileId, {
              contracts: dirtyRequests,
            });
            await refetch();
          }
        },
        cancel: () => {
          setDraftContracts(JSON.parse(JSON.stringify(canonicalContracts)));
          onDirtyChange?.(false);
        },
      }),
      [isDirty, draftContracts, canonicalContracts, companyProfileId, refetch, onDirtyChange]
    );

    // Helpers to mutate draft
    const updateCurrentDraft = useCallback(
      (updater: (contract: CompanyProfileContractDto) => void) => {
        if (!selectedContractId) return;
        setDraftContracts((prev) =>
          prev.map((c) => {
            if (c.id !== selectedContractId) return c;
            const clone: CompanyProfileContractDto = JSON.parse(JSON.stringify(c));
            updater(clone);
            // Recompute derivedContractStatus strictly from dates
            const eff = clone.commonData?.effectiveDate?.value;
            const exp = clone.commonData?.expiryDate?.value;
            clone.derivedContractStatus = computeDerivedContractStatus(eff, exp);
            return clone;
          })
        );
      },
      [selectedContractId]
    );

    // Filtered list based on search and status
    const filteredContracts = useMemo(() => {
      return displayContracts.filter((contract) => {
        // Status filter
        if (statusFilter === 'ACTIVE' && contract.derivedContractStatus !== 'ACTIVE') {
          return false;
        }
        if (statusFilter === 'EXPIRED' && contract.derivedContractStatus !== 'EXPIRED') {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const titleMatch = (contract.title || '').toLowerCase().includes(query);
          const docNameMatch = (contract.documentName || contract.sourceDocumentName || '').toLowerCase().includes(query);
          const numberMatch = (contract.commonData?.contractNumber?.value || '').toLowerCase().includes(query);
          const partiesMatch = (contract.commonData?.parties || []).some(
            (p) =>
              (p.legalName || '').toLowerCase().includes(query) ||
              (p.taxCode || '').toLowerCase().includes(query) ||
              (p.representative || '').toLowerCase().includes(query)
          );
          return titleMatch || docNameMatch || numberMatch || partiesMatch;
        }

        return true;
      });
    }, [displayContracts, statusFilter, searchQuery]);

    // Total pages and paginated items for left column
    const totalPages = Math.max(1, Math.ceil(filteredContracts.length / PAGE_SIZE));
    const paginatedContracts = useMemo(() => {
      const start = currentPage * PAGE_SIZE;
      return filteredContracts.slice(start, start + PAGE_SIZE);
    }, [filteredContracts, currentPage]);

    // Reset page to 0 when filter/search changes
    useEffect(() => {
      setCurrentPage(0);
    }, [searchQuery, statusFilter]);

    // Auto-select first contract on page if current selection is invalid
    useEffect(() => {
      if (paginatedContracts.length > 0) {
        const isStillInPage = paginatedContracts.some((c) => c.id === selectedContractId);
        if (!isStillInPage) {
          setSelectedContractId(paginatedContracts[0].id);
        }
      } else {
        setSelectedContractId(null);
      }
    }, [paginatedContracts, selectedContractId]);

    // Currently selected contract
    const selectedContract = useMemo(() => {
      if (!selectedContractId) return paginatedContracts[0] || null;
      return displayContracts.find((c) => c.id === selectedContractId) || paginatedContracts[0] || null;
    }, [displayContracts, selectedContractId, paginatedContracts]);

    // Open PDF file handler
    const handleViewPdf = async (contract: CompanyProfileContractDto) => {
      const docId = contract.documentId || contract.sourceDocumentId;
      if (!docId) return;
      setOpeningPdfId(contract.id);
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
        const effectiveProjectId = projectId || contract.projectId;
        const projectParam = effectiveProjectId ? `&projectId=${effectiveProjectId}` : '';

        if (companyProfileId) {
          try {
            res = await fetch(
              `${API_BASE_URL}/company-profiles/${encodeURIComponent(companyProfileId)}/documents/${encodeURIComponent(docId)}/download?download=false${projectParam}`,
              { headers }
            );
          } catch (e) {
            console.warn('Company profile document fetch failed, trying project endpoint', e);
          }
        }

        if ((!res || !res.ok) && effectiveProjectId) {
          try {
            res = await fetch(
              `${API_BASE_URL}/projects/${effectiveProjectId}/documents/${encodeURIComponent(docId)}/download?download=false`,
              { headers }
            );
          } catch (e) {
            console.warn('Project document fetch failed, trying direct endpoint', e);
          }
        }

        if (!res || !res.ok) {
          res = await fetch(
            `${API_BASE_URL}/documents/${encodeURIComponent(docId)}/download?download=false`,
            { headers }
          );
        }

        if (!res.ok) {
          throw new Error(`Failed to load document (${res.status})`);
        }

        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const fileUrl = window.URL.createObjectURL(pdfBlob);
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 120_000);
      } catch (err) {
        console.error('Error opening PDF:', err);
        window.alert('Không thể tải tài liệu PDF. Vui lòng kiểm tra quyền truy cập hoặc thử lại sau.');
      } finally {
        setOpeningPdfId(null);
      }
    };

    if (!hasAccess) {
      return (
        <div className={styles.container}>
          <CompanyDetailEmptyState
            icon={<AlertCircle size={22} color="#DC2626" />}
            title="Access Denied"
            description="You do not have permission to view contracts for this company."
          />
        </div>
      );
    }

    // 1. Loading State
    if (isLoading) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyStateContainer} style={{ minHeight: '210px', justifyContent: 'center' }}>
            <div className={styles.spinner} />
            <p className={styles.emptyTitle} style={{ marginTop: 10 }}>Loading contracts...</p>
            <p className={styles.emptyDesc}>Retrieving official contracts from enterprise database.</p>
          </div>
        </div>
      );
    }

    // 2. Error State
    if (isError) {
      return (
        <div className={styles.container}>
          <CompanyDetailEmptyState
            icon={<AlertCircle size={22} color="#DC2626" />}
            title="Unable to load contracts"
            description="An error occurred while loading contract data. Please try again."
            action={
              <button
                type="button"
                className={styles.paginationBtn}
                onClick={() => void refetch()}
                style={{ marginTop: 4, padding: '6px 14px' }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            }
          />
        </div>
      );
    }

    // 3. Global Empty State (No approved contracts yet)
    if (displayContracts.length === 0) {
      return (
        <div className={styles.container}>
          <CompanyDetailEmptyState
            icon={<FileText size={22} />}
            title="No approved contracts yet"
            description="Approved contract information will appear here after contract research has been reviewed and approved."
          />
        </div>
      );
    }

    return (
      <div className={styles.container}>
        {/* Toolbar: Search & Status Filter */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên HĐ, số hiệu, đối tác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <button
              type="button"
              className={`${styles.filterBtn} ${statusFilter === 'ALL' ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả ({displayContracts.length})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${statusFilter === 'ACTIVE' ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Đang hiệu lực ({displayContracts.filter((c) => c.derivedContractStatus === 'ACTIVE').length})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${statusFilter === 'EXPIRED' ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter('EXPIRED')}
            >
              Hết hiệu lực ({displayContracts.filter((c) => c.derivedContractStatus === 'EXPIRED').length})
            </button>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className={styles.masterDetailLayout}>
          {/* Left Column: Master List */}
          <div className={styles.masterColumn}>
            <div className={styles.masterHeader}>
              <span>Danh sách ({filteredContracts.length})</span>
              <span>Trang {currentPage + 1}/{totalPages}</span>
            </div>

            <div className={styles.masterList}>
              {paginatedContracts.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  <FileSearch size={24} style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy hợp đồng</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px' }}>Thử thay đổi từ khóa hoặc bộ lọc</p>
                </div>
              ) : (
                paginatedContracts.map((contract) => {
                  const isActive = selectedContract?.id === contract.id;
                  const status = contract.derivedContractStatus;
                  const contractNumber = contract.commonData?.contractNumber?.value;
                  const signDate = contract.commonData?.signingDate?.value || contract.documentDate;
                  const valueText = formatContractValue(contract.commonData?.contractValue);
                  const term = contract.commonData?.term?.value;

                  return (
                    <div
                      key={contract.id}
                      className={`${styles.contractCard} ${isActive ? styles.contractCardActive : ''}`}
                      onClick={() => setSelectedContractId(contract.id)}
                    >
                      <div className={styles.cardTopRow}>
                        {status === 'ACTIVE' ? (
                          <span className={styles.statusChipActive}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                            Đang hiệu lực
                          </span>
                        ) : status === 'EXPIRED' ? (
                          <span className={styles.statusChipExpired}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
                            Hết hiệu lực
                          </span>
                        ) : status === 'NOT_EFFECTIVE' ? (
                          <span className={styles.statusChipOther} style={{ color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316' }} />
                            Chưa có hiệu lực
                          </span>
                        ) : (
                          <span className={styles.statusChipOther}>
                            {status || 'Đã duyệt'}
                          </span>
                        )}

                        {signDate && <span className={styles.cardDate}>{signDate}</span>}
                      </div>

                      <h4 className={styles.cardTitle} title={contract.title || contract.documentName || undefined}>
                        {contract.title || contract.documentName || 'Hợp đồng chưa đặt tên'}
                      </h4>

                      {contractNumber && (
                        <div className={styles.cardNumber}>
                          Số HĐ: <strong>{contractNumber}</strong>
                        </div>
                      )}

                      <div className={styles.cardBottomRow}>
                        <span className={styles.cardValue}>
                          {valueText !== '—' ? valueText : 'Thỏa thuận nguyên tắc'}
                        </span>
                        {term && <span className={styles.cardTerm}>{term}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Bar */}
            <div className={styles.paginationBar}>
              <button
                type="button"
                className={styles.paginationBtn}
                disabled={currentPage <= 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={13} /> Trước
              </button>
              <span className={styles.paginationInfo}>
                Trang {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationBtn}
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Sau <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Detail Workspace */}
          <div className={styles.detailColumn}>
            {selectedContract ? (
              <>
                {/* Detail Header */}
                <div className={styles.detailHeader}>
                  <div className={styles.detailHeaderLeft}>
                    <div className={styles.detailBadges}>
                      {selectedContract.derivedContractStatus === 'ACTIVE' ? (
                        <span className={styles.statusChipActive}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                          Đang hiệu lực
                        </span>
                      ) : selectedContract.derivedContractStatus === 'EXPIRED' ? (
                        <span className={styles.statusChipExpired}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
                          Hết hiệu lực
                        </span>
                      ) : selectedContract.derivedContractStatus === 'NOT_EFFECTIVE' ? (
                        <span className={styles.statusChipOther} style={{ color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316' }} />
                          Chưa có hiệu lực
                        </span>
                      ) : (
                        <span className={styles.statusChipOther}>
                          {selectedContract.derivedContractStatus || 'Đã duyệt'}
                        </span>
                      )}

                      <span className={styles.approvedBadge}>
                        <ShieldCheck size={11} /> Manager Approved
                      </span>

                      {editable && (
                        <span className={styles.editingBadge}>
                          <Edit3 size={11} /> Đang chỉnh sửa
                        </span>
                      )}
                    </div>

                    {editable ? (
                      <div style={{ marginTop: 4, marginBottom: 6 }}>
                        <input
                          type="text"
                          className={styles.editInput}
                          style={{ fontSize: 15, fontWeight: 700 }}
                          value={selectedContract.title || ''}
                          placeholder="Tiêu đề hợp đồng..."
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentDraft((c) => {
                              c.title = val;
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <h3 className={styles.detailTitle}>
                        {selectedContract.title || selectedContract.documentName || 'Hợp đồng đối tác'}
                      </h3>
                    )}

                    <div className={styles.detailSubtitle}>
                      {(selectedContract.documentName || selectedContract.sourceDocumentName) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={12} /> {selectedContract.documentName || selectedContract.sourceDocumentName}
                        </span>
                      )}
                      {selectedContract.documentDate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          • <Calendar size={12} /> Ngày ký: {selectedContract.documentDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {(selectedContract.documentId || selectedContract.sourceDocumentId) && (
                    <button
                      type="button"
                      className={styles.pdfBtn}
                      onClick={() => void handleViewPdf(selectedContract)}
                      disabled={openingPdfId === selectedContract.id}
                      title="Mở toàn văn file PDF gốc"
                    >
                      {openingPdfId === selectedContract.id ? (
                        <>
                          <Loader2 size={13} className={styles.spinner} style={{ width: 13, height: 13, borderWidth: 2 }} />
                          <span>Đang mở PDF...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink size={13} />
                          <span>Xem PDF gốc</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Detail Body */}
                <div className={styles.detailContent}>
                  {/* 1. Legal & General Terms */}
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionNumber}>1</span>
                      Thông tin điều khoản chung & Pháp lý
                    </div>

                    <div className={styles.termsGrid}>
                      {/* Contract Number */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Số hiệu hợp đồng</span>
                        {editable ? (
                          <input
                            type="text"
                            className={styles.editInput}
                            value={selectedContract.commonData?.contractNumber?.value || ''}
                            placeholder="Số hợp đồng..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.contractNumber) {
                                  c.commonData.contractNumber = {
                                    value: val,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.contractNumber.value = val;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.contractNumber?.value || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.contractNumber?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.contractNumber.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Signing Date */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Ngày ký (Signing Date)</span>
                        {editable ? (
                          <input
                            type="date"
                            className={styles.editInput}
                            value={selectedContract.commonData?.signingDate?.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.signingDate) {
                                  c.commonData.signingDate = {
                                    value: val || null,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.signingDate.value = val || null;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.signingDate?.value || selectedContract.documentDate || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.signingDate?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.signingDate.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Effective Date */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Ngày hiệu lực</span>
                        {editable ? (
                          <input
                            type="date"
                            className={styles.editInput}
                            value={selectedContract.commonData?.effectiveDate?.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.effectiveDate) {
                                  c.commonData.effectiveDate = {
                                    value: val || null,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.effectiveDate.value = val || null;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.effectiveDate?.value || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.effectiveDate?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.effectiveDate.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Ngày hết hạn</span>
                        {editable ? (
                          <input
                            type="date"
                            className={styles.editInput}
                            value={selectedContract.commonData?.expiryDate?.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.expiryDate) {
                                  c.commonData.expiryDate = {
                                    value: val || null,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.expiryDate.value = val || null;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.expiryDate?.value || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.expiryDate?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.expiryDate.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Term */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Thời hạn (Term)</span>
                        {editable ? (
                          <input
                            type="text"
                            className={styles.editInput}
                            value={selectedContract.commonData?.term?.value || ''}
                            placeholder="Thời hạn (vd: 12 tháng, 3 năm)..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.term) {
                                  c.commonData.term = {
                                    value: val,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.term.value = val;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.term?.value || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.term?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.term.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Contract Value */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Giá trị hợp đồng</span>
                        {editable ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="text"
                              className={styles.editInput}
                              style={{ flex: 1 }}
                              value={
                                selectedContract.commonData?.contractValue?.value?.amount != null
                                  ? String(selectedContract.commonData.contractValue.value.amount)
                                  : selectedContract.commonData?.contractValue?.value?.rawAmountText || ''
                              }
                              placeholder="Số tiền hoặc giá trị..."
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentDraft((c) => {
                                  if (!c.commonData) c.commonData = { parties: [] };
                                  if (!c.commonData.contractValue) {
                                    c.commonData.contractValue = {
                                      value: {
                                        amount: val,
                                        currency: 'VND',
                                        rawAmountText: val,
                                      },
                                      sourcePage: null,
                                      evidence: null,
                                      confidence: null,
                                      qualityStatus: 'VALID',
                                      verificationStatus: 'UNVERIFIED',
                                      inputMethod: 'MANUAL',
                                    };
                                  } else {
                                    if (!c.commonData.contractValue.value) {
                                      c.commonData.contractValue.value = {
                                        amount: val,
                                        currency: 'VND',
                                        rawAmountText: val,
                                      };
                                    } else {
                                      c.commonData.contractValue.value.amount = val;
                                      c.commonData.contractValue.value.rawAmountText = val;
                                    }
                                  }
                                });
                              }}
                            />
                            <input
                              type="text"
                              className={styles.editInput}
                              style={{ width: 64 }}
                              value={selectedContract.commonData?.contractValue?.value?.currency || 'VND'}
                              placeholder="VND"
                              onChange={(e) => {
                                const curr = e.target.value;
                                updateCurrentDraft((c) => {
                                  if (!c.commonData) c.commonData = { parties: [] };
                                  if (c.commonData.contractValue?.value) {
                                    c.commonData.contractValue.value.currency = curr;
                                  }
                                });
                              }}
                            />
                          </div>
                        ) : (
                          <span className={styles.termValue} style={{ color: '#059669' }}>
                            {formatContractValue(selectedContract.commonData?.contractValue)}
                          </span>
                        )}
                        {selectedContract.commonData?.contractValue?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.contractValue.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Governing Law */}
                      <div className={styles.termCard}>
                        <span className={styles.termLabel}>Luật áp dụng & Giải quyết tranh chấp</span>
                        {editable ? (
                          <input
                            type="text"
                            className={styles.editInput}
                            value={selectedContract.commonData?.governingLaw?.value || ''}
                            placeholder="Luật Việt Nam | Tòa án..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.governingLaw) {
                                  c.commonData.governingLaw = {
                                    value: val,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.governingLaw.value = val;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {(() => {
                              const val = selectedContract.commonData?.governingLaw?.value;
                              if (!val) return '—';
                              const parts = val.split('|').map((item: string) => item.trim()).filter(Boolean);
                              if (parts.length <= 1) return val;
                              return (
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {parts.map((p: string, idx: number) => (
                                    <span key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                      <span style={{ color: '#94a3b8' }}>•</span>
                                      <span>{p}</span>
                                    </span>
                                  ))}
                                </span>
                              );
                            })()}
                          </span>
                        )}
                        {selectedContract.commonData?.governingLaw?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.governingLaw.sourcePage}
                          </span>
                        )}
                      </div>

                      {/* Purpose */}
                      <div className={styles.termCard} style={{ gridColumn: '1 / -1' }}>
                        <span className={styles.termLabel}>Mục đích hợp tác</span>
                        {editable ? (
                          <textarea
                            className={styles.editTextarea}
                            value={selectedContract.commonData?.purpose?.value || ''}
                            placeholder="Mục đích và nội dung hợp tác cốt lõi..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentDraft((c) => {
                                if (!c.commonData) c.commonData = { parties: [] };
                                if (!c.commonData.purpose) {
                                  c.commonData.purpose = {
                                    value: val,
                                    sourcePage: null,
                                    evidence: null,
                                    confidence: null,
                                    qualityStatus: 'VALID',
                                    verificationStatus: 'UNVERIFIED',
                                    inputMethod: 'MANUAL',
                                  };
                                } else {
                                  c.commonData.purpose.value = val;
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className={styles.termValue}>
                            {selectedContract.commonData?.purpose?.value || '—'}
                          </span>
                        )}
                        {selectedContract.commonData?.purpose?.sourcePage && (
                          <span className={styles.termEvidence}>
                            Trang {selectedContract.commonData.purpose.sourcePage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Contracting Parties & Responsibilities */}
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionNumber}>2</span>
                      Các bên tham gia ký kết & Cam kết pháp lý
                    </div>

                    {selectedContract.commonData?.parties && selectedContract.commonData.parties.length > 0 ? (
                      <div className={styles.partiesList}>
                        {selectedContract.commonData.parties.map((party, pIdx) => {
                          const roleLabel = party.role || `BÊN ${String.fromCharCode(65 + pIdx)}`;
                          const name = party.legalName || 'Đối tác chưa xác định';

                          const matchedResp = selectedContract.cooperationAgreementData?.responsibilities?.find(
                            (r) =>
                              r.party &&
                              (r.party.toLowerCase().includes(name.toLowerCase()) ||
                                name.toLowerCase().includes(r.party.toLowerCase()))
                          );

                          return (
                            <div key={party.id || pIdx} className={styles.partyCard}>
                              <div className={styles.partyHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                                  {editable ? (
                                    <input
                                      type="text"
                                      className={styles.editInput}
                                      style={{ width: 120 }}
                                      value={party.role || ''}
                                      placeholder="Vai trò..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateCurrentDraft((c) => {
                                          if (c.commonData?.parties?.[pIdx]) {
                                            c.commonData.parties[pIdx].role = val;
                                          }
                                        });
                                      }}
                                    />
                                  ) : (
                                    <span className={styles.partyRoleBadge}>{roleLabel}</span>
                                  )}

                                  {editable ? (
                                    <input
                                      type="text"
                                      className={styles.editInput}
                                      style={{ flex: 1, minWidth: 200, fontWeight: 700 }}
                                      value={party.legalName || ''}
                                      placeholder="Tên pháp lý bên tham gia..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateCurrentDraft((c) => {
                                          if (c.commonData?.parties?.[pIdx]) {
                                            c.commonData.parties[pIdx].legalName = val;
                                          }
                                        });
                                      }}
                                    />
                                  ) : (
                                    <span className={styles.partyName}>{name}</span>
                                  )}
                                </div>

                                {editable ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11.5, color: '#64748b' }}>MST:</span>
                                    <input
                                      type="text"
                                      className={styles.editInput}
                                      style={{ width: 140, fontFamily: 'monospace' }}
                                      value={party.taxCode || ''}
                                      placeholder="Mã số thuế..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateCurrentDraft((c) => {
                                          if (c.commonData?.parties?.[pIdx]) {
                                            c.commonData.parties[pIdx].taxCode = val;
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                ) : (
                                  party.taxCode && (
                                    <span className={styles.partyTaxCode}>MST: {party.taxCode}</span>
                                  )
                                )}
                              </div>

                              <div className={styles.partyDetails}>
                                {editable ? (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, width: '100%' }}>
                                    <div>
                                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>Người đại diện:</span>
                                      <input
                                        type="text"
                                        className={styles.editInput}
                                        value={party.representative || ''}
                                        placeholder="Đại diện pháp luật..."
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateCurrentDraft((c) => {
                                            if (c.commonData?.parties?.[pIdx]) {
                                              c.commonData.parties[pIdx].representative = val;
                                            }
                                          });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>Địa chỉ trụ sở:</span>
                                      <input
                                        type="text"
                                        className={styles.editInput}
                                        value={party.address || ''}
                                        placeholder="Địa chỉ trụ sở..."
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateCurrentDraft((c) => {
                                            if (c.commonData?.parties?.[pIdx]) {
                                              c.commonData.parties[pIdx].address = val;
                                            }
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {party.representative && (
                                      <div>
                                        <span style={{ color: '#94a3b8' }}>Đại diện: </span>
                                        <strong>{party.representative}</strong>
                                      </div>
                                    )}
                                    {party.address && (
                                      <div>
                                        <span style={{ color: '#94a3b8' }}>Địa chỉ: </span>
                                        <span>{party.address}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {(matchedResp?.responsibility || party.evidence) && (
                                <div className={styles.partyQuote}>
                                  <strong>Cam kết / Trách nhiệm: </strong>
                                  {matchedResp?.responsibility || party.evidence}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 12 }}>
                        Chưa ghi nhận thông tin chi tiết các bên ký kết.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyDetailPrompt}>
                <FileText size={32} />
                <span>Chọn một hợp đồng từ danh sách bên trái để xem chi tiết</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

DocumentsTab.displayName = 'DocumentsTab';

export default DocumentsTab;
