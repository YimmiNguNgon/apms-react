import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, FileText, LayoutGrid, Newspaper, TrendingUp, Users, Shield } from 'lucide-react';
import type { ListingTabResponse } from '../../types/listingData';

export type ListingTabId =
  | 'overview'
  | 'swot'
  | 'business-fields'
  | 'relationship'
  | 'board'
  | 'financials'
  | 'news'
  | 'internal-news'
  | 'documents';

export interface ListingTabDef {
  id: ListingTabId;
  label: string;
  icon: React.ReactNode;
}

export const LISTING_TABS: ListingTabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { id: 'swot', label: 'SWOT', icon: <TrendingUp size={14} /> },
  { id: 'business-fields', label: 'Business Fields', icon: <Building2 size={14} /> },
  // { id: 'relationship', label: 'Relationship', icon: <Users size={14} /> },
  { id: 'board', label: 'Leadership', icon: <Shield size={14} /> },
  { id: 'financials', label: 'Financials', icon: <FileText size={14} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={14} /> },
  { id: 'internal-news', label: 'Internal News', icon: <Shield size={14} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
];

const tabDataCache = new Map<string, unknown>();

export interface TabDataState<T> {
  loading: boolean;
  error: string | null;
  data: ListingTabResponse<T> | null;
  reload: () => void;
}

export function useListingTabData<T>(
  cacheKey: string,
  companyId: string,
  fetcher: (id: string) => Promise<ListingTabResponse<T>>,
): TabDataState<T> {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: ListingTabResponse<T> | null }>(
    () => {
      const cached = tabDataCache.get(cacheKey) as ListingTabResponse<T> | undefined;
      return cached
        ? { loading: false, error: null, data: cached }
        : { loading: true, error: null, data: null };
    },
  );
  const seq = useRef(0);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcher(companyId)
      .then((res) => {
        if (seq.current !== mySeq) return;
        tabDataCache.set(cacheKey, res);
        setState({ loading: false, error: null, data: res });
      })
      .catch((err) => {
        if (seq.current !== mySeq) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Không thể tải dữ liệu niêm yết.',
          data: null,
        });
      });
  }, [cacheKey, companyId, fetcher]);

  useEffect(() => {
    // A tab revisits the persisted backend snapshot; it must not trigger a new crawl or AI run.
    if (!tabDataCache.has(cacheKey)) load();
  }, [load]);

  return { ...state, reload: load };
}

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatCurrency = (v?: number | null): string => {
  if (v == null) return '';
  return new Intl.NumberFormat('vi-VN').format(v);
};

const trimDecimals = (n: number): string =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export const formatFinancialValue = (v?: number | null): string => {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${trimDecimals(v / 1e9)} tỷ`;
  if (abs >= 1e6) return `${trimDecimals(v / 1e6)} triệu`;
  if (abs >= 1e3) return `${trimDecimals(v / 1e3)} nghìn`;
  return trimDecimals(v);
};

export const initialsOf = (name?: string | null): string => {
  const clean = (name || '').trim();
  if (!clean) return '?';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return clean.substring(0, 2).toUpperCase();
};

export const BOARD_GROUP_ORDER = [1, 2, 3, 4, 5];
export const BOARD_GROUP_LABELS: Record<number, string> = {
  1: 'Board of Directors',
  2: 'Executive Board / Chief Accountant',
  3: 'Supervisory Board',
  4: 'Supervisory Board',
  5: 'Other Positions',
};

export const PERIOD_LABELS: Record<string, string> = {
  NAM: 'Năm',
  QUY: 'Quý',
  LUYKE: 'Lũy kế',
  CHISO: 'Chỉ số tài chính',
};

export const DOC_TYPE_LABELS: Record<number, string> = {
  0: 'Chưa phân loại',
  1: 'Báo cáo tài chính',
  3: 'Báo cáo thường niên',
  4: 'Tài liệu kiểm toán',
  5: 'Tài liệu ĐHĐCĐ',
};
