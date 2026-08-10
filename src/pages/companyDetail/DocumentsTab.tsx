import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronLeft, ChevronRight, Download, Eye, FileText, RefreshCw } from 'lucide-react';
import { companyDocumentApi } from '../../API/companyDocumentApi';
import type { CompanyDocumentResponse } from '../../types/domain';
import { formatDateTime } from './utils';
import styles from '../CompanyDetail.module.css';

const PAGE_SIZE = 50;

interface DocumentsTabProps {
  companyProfileId: string;
}

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
  if (doc.documentType === 'AI_EXTRACTION_SOURCE') return 'Used for AI Extraction';
  if (doc.status === 'PUBLISHED') return 'Approved source';
  return 'Source document';
};

const DocumentsTab: React.FC<DocumentsTabProps> = ({ companyProfileId }) => {
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-profile-documents', companyProfileId, page],
    queryFn: async () => {
      const res = await companyDocumentApi.getCompanyDocuments(companyProfileId, { page, size: PAGE_SIZE });
      return res.data;
    },
    enabled: Boolean(companyProfileId),
    staleTime: 30_000,
  });

  const docs = query.data?.content ?? [];
  const totalPages = query.data?.totalPages ?? 0;
  const totalElements = query.data?.totalElements ?? 0;

  const handlePreview = async (doc: CompanyDocumentResponse) => {
    if (!doc.previewAvailable && !doc.downloadAvailable) return;
    setBusyId(doc.id);
    try {
      const blob = await companyDocumentApi.downloadCompanyDocument(companyProfileId, doc.id, false);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Preview failed:', err);
      alert('Không thể mở bản xem trước tài liệu.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (doc: CompanyDocumentResponse) => {
    if (!doc.downloadAvailable) return;
    setBusyId(doc.id);
    try {
      const blob = await companyDocumentApi.downloadCompanyDocument(companyProfileId, doc.id, true);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || doc.displayName || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Không thể tải xuống tài liệu.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReconcile = async () => {
    try {
      await companyDocumentApi.reconcileCompanyDocuments(companyProfileId);
      await queryClient.invalidateQueries({ queryKey: ['company-profile-documents', companyProfileId] });
    } catch (err) {
      console.error('Document reconcile failed:', err);
      alert('Không thể khôi phục liên kết tài liệu nguồn.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <FileText size={20} style={{ color: '#2563EB' }} />
            <div>
              <h2>Tài liệu</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Các tài liệu nguồn đã được dùng để xây dựng hồ sơ doanh nghiệp này.
              </p>
            </div>
          </div>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
            {query.isLoading ? 'Đang tải' : `${totalElements} tài liệu nguồn`}
          </span>
        </div>

        {query.isLoading ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <div className={styles.spinner} />
            <p className={styles.stateText}>Đang tải tài liệu nguồn...</p>
          </div>
        ) : query.error ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <AlertCircle size={22} color="#DC2626" style={{ marginBottom: 8 }} />
            <p className={styles.stateTitle}>Không thể tải tài liệu</p>
            <p className={styles.stateText} style={{ marginBottom: '16px' }}>
              API tài liệu đang gặp lỗi. Vui lòng thử lại.
            </p>
            <button className={styles.retryButton} onClick={() => void query.refetch()}>
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        ) : docs.length === 0 ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <FileText size={24} color="#94A3B8" style={{ marginBottom: 8 }} />
            <p className={styles.stateTitle}>Không có tài liệu nguồn</p>
            <p className={styles.stateText}>
              Hồ sơ công ty này hiện chưa có tài liệu nguồn được liên kết.
            </p>
            <button className={styles.retryButton} onClick={() => void handleReconcile()}>
              <RefreshCw size={14} /> Khôi phục liên kết từ Candidate đã duyệt
            </button>
          </div>
        ) : (
          <>
            <div className={styles.newsList}>
              {docs.map((doc) => {
                const title = doc.displayName || doc.originalFileName || 'Tài liệu không tên';
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
                        {doc.sourceProjectName || doc.sourceProjectId ? (
                          <span>Project: {doc.sourceProjectName || `#${doc.sourceProjectId}`}</span>
                        ) : null}
                        {doc.approvedAt ? <span>Approved with Candidate · {formatDateTime(doc.approvedAt)}</span> : null}
                        {doc.sourceCandidateId ? <span>Candidate #{doc.sourceCandidateId.slice(-8)}</span> : null}
                      </div>

                      <p className={styles.newsSummary} style={{ marginTop: 8, marginBottom: 0 }}>
                        This document contributed to the approved company data.
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
                  <ChevronLeft size={14} /> Trước
                </button>
                <span className={styles.pageInfo}>
                  Trang {query.data ? query.data.pageNumber + 1 : '-'} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages - 1 || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau <ChevronRight size={14} />
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
