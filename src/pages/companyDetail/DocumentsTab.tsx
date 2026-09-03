import React, { useMemo, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { contractResearchApi } from '../../API/contractResearchApi';
import { API_BASE_URL } from '../../services/api';
import type { ContractEntry, ExtractedContractField, ContractValue } from '../../types/contractResearch';
import { SecureTotpAccessGate, type SecureTotpGateState } from '../../components/SecureTotpAccessGate';
import totpApi, { type StepUpVerifyResponse } from '../../API/totpApi';
import { ownerSecureAccess } from '../../utils/ownerSecureAccess';
import styles from './DocumentsTab.module.css';

const PAGE_SIZE = 5;
const DOCUMENTS_SCOPE = 'COMPANY_PROFILE_DOCUMENTS';

interface DocumentsTabProps {
  companyProfileId: string;
  userRole?: string | null;
  currentUserId?: number | string | null;
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

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ companyProfileId, userRole, currentUserId }) => {
  const [authState, setAuthState] = useState<SecureTotpGateState | 'VERIFIED'>('CHECKING');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);

  const checkInitialState = async () => {
    const isOwner = userRole === 'ROLE_BUSINESS_OWNER' || userRole === 'BUSINESS_OWNER' || userRole === 'ROLE_OWNER' || userRole === 'OWNER' || userRole === 'ROLE_SYSTEM_ADMIN' || userRole === 'SYSTEM_ADMIN' || userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';
    const isManager = userRole === 'ROLE_MANAGER' || userRole === 'MANAGER' || userRole === 'ROLE_BUSINESS_DEVELOPMENT_MANAGER' || userRole === 'BUSINESS_DEVELOPMENT_MANAGER';

    if (!isOwner && !isManager) {
      setAuthState('FORBIDDEN');
      return;
    }

    try {
      setAuthState('CHECKING');
      const storedSession = ownerSecureAccess.get(currentUserId);
      let secureStatus;
      try {
        secureStatus = await totpApi.getStepUpStatus(DOCUMENTS_SCOPE, companyProfileId, storedSession?.token);
      } catch (err: unknown) {
        const status = (err as { status?: number; response?: { status?: number } })?.status ?? (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setAuthState('FORBIDDEN');
          return;
        }
        console.warn('getStepUpStatus failed', err);
      }

      if (storedSession?.token && secureStatus?.data?.secureAccessActive) {
        setStepUpToken(storedSession.token);
        setAuthState('VERIFIED');
        return;
      }

      const statusRes = await totpApi.getStatus();

      if (!statusRes.data.enrolled || !statusRes.data.enabled) {
        setAuthState('NOT_ENROLLED');
      } else if (statusRes.data.locked) {
        setLockedUntil(statusRes.data.lockedUntil || 'Vài phút nữa');
        setAuthState('LOCKED');
      } else {
        setAuthState('TOTP_REQUIRED');
      }
    } catch (err) {
      console.error('Failed to check TOTP status', err);
      setAuthState('TOTP_REQUIRED');
    }
  };

  useEffect(() => {
    void checkInitialState();
  }, [companyProfileId, userRole, currentUserId]);

  const handleVerified = (secureSession: StepUpVerifyResponse) => {
    const savedSession = ownerSecureAccess.save(secureSession, currentUserId);
    setStepUpToken(savedSession.token);
    setAuthState('VERIFIED');
    setIsVerifyModalOpen(false);
    setIsSetupModalOpen(false);
  };

  // Fetch approved contracts from research API
  const {
    data: contracts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['approved-contracts', companyProfileId],
    queryFn: () => contractResearchApi.getApprovedContracts(companyProfileId),
    enabled: Boolean(companyProfileId) && authState === 'VERIFIED',
    staleTime: 30_000,
  });

  // Filtered list based on search and status
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
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
        const docNameMatch = (contract.documentName || '').toLowerCase().includes(query);
        const numberMatch = (contract.commonData?.contractNumber?.value || '').toLowerCase().includes(query);
        const partiesMatch = (contract.commonData?.parties || []).some(
          (p) =>
            (p.legalName || '').toLowerCase().includes(query) ||
            (p.taxCode || '').toLowerCase().includes(query) ||
            (p.representative || '').toLowerCase().includes(query),
        );
        return titleMatch || docNameMatch || numberMatch || partiesMatch;
      }

      return true;
    });
  }, [contracts, statusFilter, searchQuery]);

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
    return contracts.find((c) => c.id === selectedContractId) || paginatedContracts[0] || null;
  }, [contracts, selectedContractId, paginatedContracts]);

  // Open PDF file handler
  const handleViewPdf = async (contract: ContractEntry) => {
    if (!contract.documentId) return;
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
      if (contract.projectId) {
        try {
          res = await fetch(
            `${API_BASE_URL}/projects/${contract.projectId}/documents/${encodeURIComponent(contract.documentId)}/download?download=false`,
            { headers },
          );
        } catch (e) {
          console.warn('Project document fetch failed, trying direct endpoint', e);
        }
      }

      if (!res || !res.ok) {
        res = await fetch(
          `${API_BASE_URL}/documents/${encodeURIComponent(contract.documentId)}/download?download=false`,
          { headers },
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

  if (authState !== 'VERIFIED') {
    return (
      <SecureTotpAccessGate
        state={authState}
        lockedUntil={lockedUntil}
        setupOpen={isSetupModalOpen}
        verifyOpen={isVerifyModalOpen}
        scope={DOCUMENTS_SCOPE}
        resourceId={companyProfileId}
        forbiddenText={'Bạn không có quyền truy cập hợp đồng của doanh nghiệp này. Chỉ Quản lý phụ trách doanh nghiệp hoặc Business Owner mới có quyền truy cập.'}
        requiredText={'Bạn đang truy cập tài liệu hợp đồng đối tác bảo mật. Vui lòng xác thực Authenticator để tiếp tục.'}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onCloseSetup={() => setIsSetupModalOpen(false)}
        onSetupSuccess={handleVerified}
        onOpenVerify={() => setIsVerifyModalOpen(true)}
        onCloseVerify={() => setIsVerifyModalOpen(false)}
        onVerified={handleVerified}
      />
    );
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Hợp đồng đối tác</h2>
          </div>
          <p className={styles.subtitle}>Danh mục hợp đồng đã được thẩm định & phê duyệt.</p>
        </div>
        <div className={styles.emptyStateContainer}>
          <div className={styles.spinner} />
          <p className={styles.emptyTitle} style={{ marginTop: 10 }}>Đang tải hợp đồng đối tác...</p>
          <p className={styles.emptyDesc}>Đang truy xuất các hợp đồng chính thức đã được Manager phê duyệt.</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Hợp đồng đối tác</h2>
          </div>
          <p className={styles.subtitle}>Danh mục hợp đồng đã được thẩm định & phê duyệt.</p>
        </div>
        <div className={styles.emptyStateContainer}>
          <AlertCircle size={32} color="#DC2626" style={{ marginBottom: 6 }} />
          <p className={styles.emptyTitle}>Không thể tải danh sách hợp đồng</p>
          <p className={styles.emptyDesc}>Đã xảy ra lỗi khi tải dữ liệu hợp đồng. Vui lòng thử lại.</p>
          <button
            type="button"
            className={styles.paginationBtn}
            onClick={() => void refetch()}
            style={{ marginTop: 12, padding: '6px 14px' }}
          >
            <RefreshCw size={13} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  // 3. Global Empty State (No approved contracts yet)
  if (contracts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Hợp đồng đối tác</h2>
            <span className={styles.countBadge}>0 hợp đồng</span>
          </div>
          <p className={styles.subtitle}>Tài liệu hợp đồng đối tác đã được Manager phê duyệt.</p>
        </div>
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyIcon}>
            <FileText size={22} />
          </div>
          <p className={styles.emptyTitle}>Chưa có hợp đồng được phê duyệt</p>
          <p className={styles.emptyDesc}>
            Các hợp đồng đối tác sau khi được trích xuất bằng AI và Manager phê duyệt từ Partner Contract Collection sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Hợp đồng đối tác</h2>
          <span className={styles.countBadge}>{contracts.length} hợp đồng</span>
        </div>
        <p className={styles.subtitle}>
          Danh mục hợp đồng và các điều khoản pháp lý đã được thẩm định & phê duyệt cho doanh nghiệp này.
        </p>
      </div>

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
            Tất cả ({contracts.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${statusFilter === 'ACTIVE' ? styles.filterBtnActive : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Đang hiệu lực ({contracts.filter((c) => c.derivedContractStatus === 'ACTIVE').length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${statusFilter === 'EXPIRED' ? styles.filterBtnActive : ''}`}
            onClick={() => setStatusFilter('EXPIRED')}
          >
            Hết hiệu lực ({contracts.filter((c) => c.derivedContractStatus === 'EXPIRED').length})
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
                      ) : (
                        <span className={styles.statusChipOther}>
                          {status || 'Đã duyệt'}
                        </span>
                      )}

                      {signDate && <span className={styles.cardDate}>{signDate}</span>}
                    </div>

                    <h4 className={styles.cardTitle} title={contract.title || contract.documentName}>
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

          {/* Pagination Bar (4-5 items per page) */}
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
                    ) : (
                      <span className={styles.statusChipOther}>
                        {selectedContract.derivedContractStatus || 'Đã duyệt'}
                      </span>
                    )}

                    <span className={styles.approvedBadge}>
                      <ShieldCheck size={11} /> Manager Approved
                    </span>
                  </div>

                  <h3 className={styles.detailTitle}>
                    {selectedContract.title || selectedContract.documentName || 'Hợp đồng đối tác'}
                  </h3>

                  <div className={styles.detailSubtitle}>
                    {selectedContract.documentName && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={12} /> {selectedContract.documentName}
                      </span>
                    )}
                    {selectedContract.documentDate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        • <Calendar size={12} /> Ngày ký: {selectedContract.documentDate}
                      </span>
                    )}
                  </div>
                </div>

                {selectedContract.documentId && (
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
                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Số hiệu hợp đồng</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.contractNumber?.value || '—'}
                      </span>
                      {selectedContract.commonData?.contractNumber?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.contractNumber.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Ngày ký (Signing Date)</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.signingDate?.value || selectedContract.documentDate || '—'}
                      </span>
                      {selectedContract.commonData?.signingDate?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.signingDate.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Ngày hiệu lực</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.effectiveDate?.value || '—'}
                      </span>
                      {selectedContract.commonData?.effectiveDate?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.effectiveDate.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Ngày hết hạn</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.expiryDate?.value || '—'}
                      </span>
                      {selectedContract.commonData?.expiryDate?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.expiryDate.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Giá trị hợp đồng</span>
                      <span className={styles.termValue} style={{ color: '#059669' }}>
                        {formatContractValue(selectedContract.commonData?.contractValue)}
                      </span>
                      {selectedContract.commonData?.contractValue?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.contractValue.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Luật áp dụng</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.governingLaw?.value || '—'}
                      </span>
                      {selectedContract.commonData?.governingLaw?.sourcePage && (
                        <span className={styles.termEvidence}>
                          Trang {selectedContract.commonData.governingLaw.sourcePage}
                        </span>
                      )}
                    </div>

                    <div className={styles.termCard}>
                      <span className={styles.termLabel}>Mục đích hợp tác</span>
                      <span className={styles.termValue}>
                        {selectedContract.commonData?.purpose?.value || '—'}
                      </span>
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

                        // Check if party has specific responsibilities in cooperationAgreementData
                        const matchedResp = selectedContract.cooperationAgreementData?.responsibilities?.find(
                          (r) => r.party && (r.party.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(r.party.toLowerCase())),
                        );

                        return (
                          <div key={party.id || pIdx} className={styles.partyCard}>
                            <div className={styles.partyHeader}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span className={styles.partyRoleBadge}>{roleLabel}</span>
                                <span className={styles.partyName}>{name}</span>
                              </div>
                              {party.taxCode && (
                                <span className={styles.partyTaxCode}>MST: {party.taxCode}</span>
                              )}
                            </div>

                            <div className={styles.partyDetails}>
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
};

export default DocumentsTab;
