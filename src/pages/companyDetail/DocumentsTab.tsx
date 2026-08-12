import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { companyDocumentApi } from '../../API/companyDocumentApi';
import totpApi from '../../API/totpApi';
import type { CompanyDocumentResponse } from '../../types/domain';
import { formatDateTime } from './utils';
import { SecureTotpAccessGate, type SecureTotpGateState } from '../../components/SecureTotpAccessGate';
import { ownerSecureAccess } from '../../utils/ownerSecureAccess';
import type { StepUpVerifyResponse } from '../../API/totpApi';
import styles from '../CompanyDetail.module.css';

const PAGE_SIZE = 50;
const DOCUMENTS_SCOPE = 'COMPANY_PROFILE_DOCUMENTS';

interface DocumentsTabProps {
  companyProfileId: string;
  userRole?: string | null;
}

type AuthState = SecureTotpGateState | 'VERIFIED';

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (doc: CompanyDocumentResponse) => {
  const name = (doc.originalFileName || doc.displayName || '').toLowerCase();
  if (doc.mimeType?.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  if (doc.mimeType?.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'DATA';
  if (doc.mimeType?.includes('word') || name.endsWith('.docx')) return 'DOC';
  return 'FILE';
};

const statusLabel = (doc: CompanyDocumentResponse) => {
  return doc.documentType === 'PARTNER_CONTRACT' ? 'Approved Contract' : 'Approved Contract';
};

const errorStatus = (err: unknown) => (err as { status?: number } | null)?.status;

const resolveExpiresInSeconds = (expiresAt?: string, fallback?: number) => {
  if (!expiresAt) return fallback ?? 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
};

const DocumentsTab: React.FC<DocumentsTabProps> = ({ companyProfileId, userRole }) => {
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('CHECKING');
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isOwner = userRole === 'ROLE_BUSINESS_OWNER' || userRole === 'BUSINESS_OWNER';
  const baseQueryKey = ['company-profile-documents', companyProfileId];

  const clearSecureDocumentState = () => {
    setStepUpToken(null);
    setTokenExpiry(null);
    setBusyId(null);
    queryClient.removeQueries({ queryKey: baseQueryKey });
  };

  const checkInitialState = async (expired = false) => {
    if (!isOwner) {
      clearSecureDocumentState();
      setAuthState('FORBIDDEN');
      return;
    }

    try {
      setAuthState('CHECKING');
      const storedSession = ownerSecureAccess.get();
      const secureStatus = await totpApi.getStepUpStatus(DOCUMENTS_SCOPE, companyProfileId, storedSession?.token);
      if (storedSession?.token && secureStatus.data.secureAccessActive) {
        setStepUpToken(storedSession.token);
        setTokenExpiry(resolveExpiresInSeconds(secureStatus.data.expiresAt, storedSession.expiresInSeconds));
        setAuthState('VERIFIED');
        return;
      }

      const statusRes = await totpApi.getStatus();
      if (!statusRes.data.enrolled || !statusRes.data.enabled) {
        setAuthState('NOT_ENROLLED');
      } else if (statusRes.data.locked) {
        setLockedUntil(statusRes.data.lockedUntil || 'A few minutes');
        setAuthState('LOCKED');
      } else {
        setAuthState(expired ? 'SESSION_EXPIRED' : 'TOTP_REQUIRED');
      }
    } catch (err) {
      console.error('Failed to check TOTP status for documents', err);
      setAuthState(expired ? 'SESSION_EXPIRED' : 'TOTP_REQUIRED');
    }
  };

  useEffect(() => {
    setPage(0);
    clearSecureDocumentState();
    void checkInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfileId, userRole]);

  useEffect(() => {
    if (!stepUpToken || !tokenExpiry) return;

    const expiryTime = Date.now() + tokenExpiry * 1000;
    const timer = window.setInterval(() => {
      if (Date.now() > expiryTime) {
        clearSecureDocumentState();
        ownerSecureAccess.clear();
        void checkInitialState(true);
      }
    }, 5000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepUpToken, tokenExpiry, companyProfileId]);

  const query = useQuery({
    queryKey: [...baseQueryKey, page],
    queryFn: async () => {
      const res = await companyDocumentApi.getCompanyDocuments(
        companyProfileId,
        { page, size: PAGE_SIZE },
        stepUpToken || undefined,
      );
      return res.data;
    },
    enabled: Boolean(companyProfileId && isOwner && stepUpToken && authState === 'VERIFIED'),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.error) return;
    const status = errorStatus(query.error);
    if (status === 401 || status === 403) {
      clearSecureDocumentState();
      ownerSecureAccess.clear();
      void checkInitialState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.error]);

  const docs = query.data?.content ?? [];
  const totalPages = query.data?.totalPages ?? 0;
  const totalElements = query.data?.totalElements ?? 0;

  const handleVerified = (secureSession: StepUpVerifyResponse) => {
    const savedSession = ownerSecureAccess.save(secureSession);
    setStepUpToken(savedSession.token);
    setTokenExpiry(resolveExpiresInSeconds(savedSession.expiresAt, savedSession.expiresInSeconds));
    setAuthState('VERIFIED');
    setIsVerifyModalOpen(false);
    setIsSetupModalOpen(false);
  };

  const handleProtectedError = (err: unknown) => {
    console.error('Protected document action failed:', err);
    const status = errorStatus(err);
    if (status === 401 || status === 403) {
      clearSecureDocumentState();
      ownerSecureAccess.clear();
      void checkInitialState(true);
      return;
    }
    window.alert('Unable to complete this document action. Please try again.');
  };

  const handlePreview = async (doc: CompanyDocumentResponse) => {
    if (!stepUpToken || (!doc.previewAvailable && !doc.downloadAvailable)) return;
    setBusyId(doc.id);
    try {
      const blob = await companyDocumentApi.downloadCompanyDocument(companyProfileId, doc.id, false, stepUpToken);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      handleProtectedError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (doc: CompanyDocumentResponse) => {
    if (!stepUpToken || !doc.downloadAvailable) return;
    setBusyId(doc.id);
    try {
      const blob = await companyDocumentApi.downloadCompanyDocument(companyProfileId, doc.id, true, stepUpToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || doc.displayName || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      handleProtectedError(err);
    } finally {
      setBusyId(null);
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
        forbiddenText={'T\u00e0i li\u1ec7u h\u1ed3 s\u01a1 doanh nghi\u1ec7p l\u00e0 d\u1eef li\u1ec7u b\u1ea3o m\u1eadt. Ch\u1ec9 BUSINESS_OWNER m\u1edbi c\u00f3 quy\u1ec1n truy c\u1eadp.'}
        requiredText={'B\u1ea1n \u0111ang truy c\u1eadp t\u00e0i li\u1ec7u h\u1ed3 s\u01a1 doanh nghi\u1ec7p nh\u1ea1y c\u1ea3m. Vui l\u00f2ng x\u00e1c th\u1ef1c \u0111\u1ec3 ti\u1ebfp t\u1ee5c.'}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onCloseSetup={() => setIsSetupModalOpen(false)}
        onSetupSuccess={handleVerified}
        onOpenVerify={() => setIsVerifyModalOpen(true)}
        onCloseVerify={() => setIsVerifyModalOpen(false)}
        onVerified={handleVerified}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <FileText size={20} style={{ color: '#2563EB' }} />
            <div>
              <h2>Tài liệu</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Tài liệu hợp đồng đối tác đã được Manager phê duyệt.
              </p>
            </div>
          </div>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
            {query.isLoading ? 'Đang tải' : `${totalElements} hợp đồng`}
          </span>
        </div>

        {query.isLoading ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <div className={styles.spinner} />
            <p className={styles.stateText}>Đang tải hợp đồng bảo mật...</p>
          </div>
        ) : query.error ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <AlertCircle size={22} color="#DC2626" style={{ marginBottom: 8 }} />
            <p className={styles.stateTitle}>Không thể tải hợp đồng</p>
            <p className={styles.stateText} style={{ marginBottom: '16px' }}>
              Yêu cầu tải hợp đồng bảo mật thất bại. Vui lòng xác thực lại hoặc thử sau.
            </p>
            <button className={styles.retryButton} onClick={() => void query.refetch()}>
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        ) : docs.length === 0 ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <FileText size={24} color="#94A3B8" style={{ marginBottom: 8 }} />
            <p className={styles.stateTitle}>Chưa có hợp đồng được phê duyệt.</p>
            <p className={styles.stateText}>
              Các hợp đồng được phê duyệt từ Partner Contract Collection sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.newsList}>
              {docs.map((doc) => {
                const title = doc.displayName || doc.originalFileName || 'Hợp đồng chưa có tên';
                const fileSize = formatFileSize(doc.fileSize);
                const disabled = busyId === doc.id;

                return (
                  <article key={doc.id} className={styles.docRow} style={{ alignItems: 'flex-start' }}>
                    <div className={styles.docIcon} aria-hidden="true">
                      <FileText size={20} />
                    </div>

                    <div className={styles.docBody}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span className={styles.docBadge}>{fileTypeLabel(doc)}</span>
                        <span className={styles.newsBadgeNew}>{statusLabel(doc)}</span>
                      </div>

                      <h3 className={styles.docTitle}>{title}</h3>
                      {doc.originalFileName && doc.originalFileName !== title ? (
                        <div className={styles.docMeta}>{doc.originalFileName}</div>
                      ) : null}

                      <div className={styles.docMeta} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {fileSize ? <span>{fileSize}</span> : null}
                        {doc.uploadedAt ? <span>Uploaded {formatDateTime(doc.uploadedAt)}</span> : null}
                        {doc.approvedAt ? <span>Approved {formatDateTime(doc.approvedAt)}</span> : null}
                        <span>Source: Partner Contract Collection</span>
                        {doc.sourceProjectName || doc.sourceProjectId ? (
                          <span>Project: {doc.sourceProjectName || `#${doc.sourceProjectId}`}</span>
                        ) : null}
                      </div>

                      <p className={styles.newsSummary} style={{ marginTop: 8, marginBottom: 0 }}>
                        Approved from Partner Contract Collection.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={styles.pageBtn}
                        onClick={() => void handlePreview(doc)}
                        disabled={disabled || (!doc.previewAvailable && !doc.downloadAvailable)}
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <button
                        type="button"
                        className={styles.pageBtn}
                        onClick={() => void handleDownload(doc)}
                        disabled={disabled || !doc.downloadAvailable}
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 0 || query.isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {query.data ? query.data.pageNumber + 1 : '-'} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages - 1 || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;
