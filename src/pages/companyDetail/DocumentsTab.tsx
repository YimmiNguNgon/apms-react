import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyDocument, ListingPageResponse } from '../../types/listingData';
import { ListingTabShell } from './common';
import { DOC_TYPE_LABELS, formatDateTime } from './utils';
import styles from '../CompanyDetail.module.css';

const PAGE_SIZE = 50;

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
  const [type, setType] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<LoadState>({ loading: true, error: null, data: null });
  const seq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    listingDataApi
      .getDocumentYears(companyId)
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setYears(res);
      })
      .catch(() => {
        // years are optional metadata; document list still works
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    listingDataApi
      .getDocuments(companyId, { year, type, page, size: PAGE_SIZE })
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

  const docTypes = Object.keys(DOC_TYPE_LABELS)
    .map(Number)
    .sort((a, b) => a - b);

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
    >
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

        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={year == null ? '' : String(year)}
            onChange={(e) => {
              setYear(e.target.value === '' ? null : Number(e.target.value));
              setPage(0);
            }}
          >
            <option value="">Tất cả năm</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={type == null ? '' : String(type)}
            onChange={(e) => {
              setType(e.target.value === '' ? null : Number(e.target.value));
              setPage(0);
            }}
          >
            <option value="">Tất cả loại tài liệu</option>
            {docTypes.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t] || `Loại ${t}`}
              </option>
            ))}
          </select>
        </div>

        {docs.length === 0 && !state.loading ? (
          <div className={styles.stateBox} style={{ padding: '28px 16px' }}>
            <p className={styles.stateText} style={{ margin: 0 }}>
              Không có tài liệu phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <>
            {docs.map((doc) => (
              <div key={doc.id ?? doc.fileUrl} className={styles.docRow}>
                <div className={styles.docIcon}>
                  <FileText size={18} />
                </div>
                <div className={styles.docBody}>
                  {doc.fileUrl ? (
                    <a
                      className={styles.docTitle}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.docTitle || doc.fileName || 'Tài liệu'}
                    </a>
                  ) : (
                    <p className={styles.docTitle}>{doc.docTitle || doc.fileName || 'Tài liệu'}</p>
                  )}
                  <div className={styles.docMeta}>
                    <span className={styles.docBadge}>
                      {DOC_TYPE_LABELS[doc.docType ?? 0] || 'Tài liệu'}
                    </span>
                    {doc.reportYear ? `Năm ${doc.reportYear}` : ''}
                    {doc.publishedAt ? ` • ${formatDateTime(doc.publishedAt)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 0 || state.loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className={styles.pageInfo}>
              Trang {state.data ? state.data.pageNumber + 1 : '-'} / {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages - 1 || state.loading}
              onClick={() => setPage((p) => p + 1)}
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
