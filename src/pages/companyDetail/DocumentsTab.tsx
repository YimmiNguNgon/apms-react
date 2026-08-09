import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Download, Eye, ExternalLink } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyDocument, ListingPageResponse } from '../../types/listingData';
import { ListingTabShell } from './common';
import { DOC_TYPE_LABELS, formatDateTime } from './utils';

const PAGE_SIZE = 50;
const DOC_TYPES = ['Tất cả', 'BÁO CÁO TÀI CHÍNH', 'BÁO CÁO THƯỜNG NIÊN', 'NGHỊ QUYẾT ĐHĐCĐ', 'BÁO CÁO QUẢN TRỊ', 'Hợp đồng thương mại'];

interface DocumentsTabProps {
  companyId: string;
}

interface LoadState {
  loading: boolean;
  error: string | null;
  data: ListingPageResponse<CompanyDocument> | null;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ companyId }) => {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<LoadState>({ loading: true, error: null, data: null });
  const [activeDocModal, setActiveDocModal] = useState<CompanyDocument | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    listingDataApi
      .getDocumentYears(companyId)
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setYears(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    listingDataApi
      .getDocuments(companyId, { year, type: type === 'Tất cả' ? null : type, page, size: PAGE_SIZE })
      .then((res) => {
        if (seq.current !== mySeq) return;
        setState({ loading: false, error: null, data: res });
      })
      .catch((err) => {
        if (seq.current !== mySeq) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu.',
          data: null,
        });
      });
  }, [companyId, year, type, page]);

  useEffect(() => {
    load();
  }, [load]);

  const docs = state.data?.content ?? [];
  const totalPages = state.data?.totalPages ?? 0;
  const totalElements = state.data?.totalElements ?? 0;

  return (
    <ListingTabShell
      loading={state.loading}
      error={state.error}
      hasData={state.data?.hasData ?? false}
      crawledAt={state.data?.crawledAt}
      onRetry={() => load()}
      emptyHint="Chưa có tài liệu hoặc hợp đồng nào được tải lên cho hồ sơ doanh nghiệp này."
    >
      {/* Document Viewer Modal */}
      {activeDocModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setActiveDocModal(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '620px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px' }}>
                {String(activeDocModal.docType || 'TÀI LIỆU').toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setActiveDocModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.35 }}>
              {activeDocModal.docTitle || activeDocModal.fileName || 'Tài liệu Doanh nghiệp'}
            </h2>

            <p style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '16px' }}>
              Năm báo cáo: {activeDocModal.reportYear || 'Mới nhất'} • Ngày phát hành: {formatDateTime(activeDocModal.publishedAt) || 'Mới cập nhật'}
            </p>

            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <p style={{ fontSize: '0.78rem', color: '#334155', margin: '0 0 6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} style={{ color: '#2563EB' }} />
                <span>Chi tiết tài liệu xác thực:</span>
              </p>
              <p style={{ fontSize: '0.73rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Tài liệu đã được kiểm tra tính hợp lệ và cập nhật tự động trong kho quản lý APMS AI. Bạn có thể mở trực tiếp từ nguồn niêm yết hoặc tải về máy.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveDocModal(null)}
                style={{ padding: '7px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#334155' }}
              >
                Đóng
              </button>

              {activeDocModal.fileUrl && activeDocModal.fileUrl.startsWith('http') ? (
                <a
                  href={activeDocModal.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Xem trên Nguồn CafeF</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => alert(`Đang mở tải tài liệu: ${activeDocModal.docTitle}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={14} />
                  <span>Tải Báo cáo PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Document List View */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#2563EB' }} />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Kho Tài liệu & Công bố Thông tin ({totalElements} tài liệu)
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={year == null ? '' : String(year)}
              onChange={(e) => {
                setYear(e.target.value === '' ? null : Number(e.target.value));
                setPage(0);
              }}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.72rem', outline: 'none', background: '#F8FAFC', fontWeight: 600 }}
            >
              <option value="">Tất cả năm phát hành</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <select
              value={type == null ? '' : type}
              onChange={(e) => {
                setType(e.target.value === '' ? null : e.target.value);
                setPage(0);
              }}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.72rem', outline: 'none', background: '#F8FAFC', fontWeight: 600 }}
            >
              <option value="">Tất cả loại tài liệu</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {docs.length === 0 && !state.loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
            Không có tài liệu phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docs.map((doc) => (
              <div
                key={doc.id ?? doc.fileUrl}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveDocModal(doc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        lineHeight: 1.3,
                        display: 'block',
                      }}
                    >
                      {doc.docTitle || doc.fileName || 'Tài liệu công bố'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#E2E8F0', color: '#334155', fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                        {String(doc.docType || 'Tài liệu').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.63rem', color: '#64748B' }}>
                        {doc.reportYear ? `Năm ${doc.reportYear}` : ''} {doc.publishedAt ? `• ${formatDateTime(doc.publishedAt)}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDocModal(doc)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#2563EB',
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={12} />
                  <span>Xem Chi Tiết</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              disabled={page <= 0 || state.loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ padding: '4px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFF', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
              Trang {state.data ? state.data.pageNumber + 1 : '-'} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1 || state.loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '4px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFF', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default DocumentsTab;
