import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { companyDocumentApi } from '../../API/companyDocumentApi';
import type { CompanyDocumentResponse } from '../../types/domain';
import type { PageResponse } from '../../services/api';
import { formatDateTime } from './utils';
import styles from '../CompanyDetail.module.css';

const PAGE_SIZE = 50;

interface DocumentsTabProps {
  companyId: string; // This corresponds to companyProfileId in the API
}

interface LoadState {
  loading: boolean;
  error: string | null;
  data: PageResponse<CompanyDocumentResponse> | null;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ companyId }) => {
  const [page, setPage] = useState(0);
  const [state, setState] = useState<LoadState>({ loading: true, error: null, data: null });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    companyDocumentApi
      .getCompanyDocuments(companyId, { page, size: PAGE_SIZE })
      .then((res) => {
        if (seq.current !== mySeq) return;
        setState({ loading: false, error: null, data: res.data });
      })
      .catch((err) => {
        if (seq.current !== mySeq) return;
        setState({
          loading: false,
          error: 'Không thể tải danh sách tài liệu.',
          data: null,
        });
      });
  }, [companyId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (doc: CompanyDocumentResponse) => {
    if (!doc.downloadAvailable) return;
    
    setDownloadingId(doc.id);
    try {
      const blob = await companyDocumentApi.downloadCompanyDocument(companyId, doc.id);
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
      alert('Không thể tải xuống tài liệu. Vui lòng thử lại sau.');
    } finally {
      setDownloadingId(null);
    }
  };

  const docs = state.data?.content ?? [];
  const totalPages = state.data?.totalPages ?? 0;
  const totalElements = state.data?.totalElements ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <FileText size={20} style={{ color: '#2563EB' }} />
            <h2>Tài liệu</h2>
          </div>
          <span style={{ fontSize: '13px', color: '#64748B' }}>
            {totalElements > 0 ? `${totalElements} tài liệu` : ''}
          </span>
        </div>

        {state.loading && docs.length === 0 ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <div className={styles.spinner} />
            <p className={styles.stateText}>Đang tải tài liệu...</p>
          </div>
        ) : state.error ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <p className={styles.stateText} style={{ color: '#EF4444', marginBottom: '16px' }}>
              {state.error}
            </p>
            <button className={styles.primaryBtn} onClick={load}>
              Thử lại
            </button>
          </div>
        ) : docs.length === 0 ? (
          <div className={styles.stateBox} style={{ padding: '40px 16px' }}>
            <p className={styles.stateText} style={{ margin: 0 }}>
              Chưa có tài liệu được phê duyệt / Hiện chưa có tài liệu nào đã được Staff gửi và Manager phê duyệt cho doanh nghiệp này.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {docs.map((doc) => (
                <div key={doc.id} className={styles.docRow} style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className={styles.docIcon} style={{ flexShrink: 0, marginTop: '4px' }}>
                      <FileText size={24} color="#64748B" />
                    </div>
                    <div>
                      <p className={styles.docTitle} style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 500, color: '#0F172A' }}>
                        {doc.displayName || doc.originalFileName || 'Tài liệu không tên'}
                      </p>
                      <div className={styles.docMeta} style={{ fontSize: '13px', color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span className={styles.docBadge} style={{ backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {doc.documentType || 'Tài liệu'}
                        </span>
                        {doc.fileSize ? <span>{(doc.fileSize / 1024).toFixed(1)} KB</span> : null}
                        {doc.approvedBy ? <span>Duyệt bởi {doc.approvedBy.name}</span> : null}
                        {doc.approvedAt ? <span>Ngày duyệt: {formatDateTime(doc.approvedAt)}</span> : null}
                      </div>
                    </div>
                  </div>
                  {doc.downloadAvailable && (
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: downloadingId === doc.id ? 'not-allowed' : 'pointer' }}
                      title="Tải xuống"
                    >
                      <Download size={16} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {downloadingId === doc.id ? 'Đang tải...' : 'Tải xuống'}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination} style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 0 || state.loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: (page <= 0 || state.loading) ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span className={styles.pageInfo} style={{ fontSize: '13px', color: '#64748B' }}>
                  Trang {state.data ? state.data.pageNumber + 1 : '-'} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages - 1 || state.loading}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: (page >= totalPages - 1 || state.loading) ? 'not-allowed' : 'pointer' }}
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
