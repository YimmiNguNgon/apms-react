import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  emptyState?: React.ReactNode;
  pageSize?: number;
  compact?: boolean;
  exportFilename?: string;
  loading?: boolean;
}

type SortDir = 'asc' | 'desc' | null;

function exportCSV<T>(columns: ColumnDef<T>[], data: T[], filename: string) {
  const headers = columns.map((c) => c.header).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = (row as Record<string, unknown>)[c.key];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<T = Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectable = false,
  emptyState,
  pageSize: defaultPageSize = 10,
  compact = false,
  exportFilename = 'export',
  loading = false,
}: DataTableProps<T>) {
  const { t } = useTranslation('common');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [compactMode, setCompactMode] = useState(compact);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  const getKey = useCallback(
    (row: T, index: number): string | number => (rowKey ? rowKey(row, index) : index),
    [rowKey]
  );

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const toggleRow = (key: string | number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === pagedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pagedData.map((row, i) => getKey(row, i))));
    }
  };

  const rowH = compactMode ? '32px' : '48px';
  const headH = compactMode ? '32px' : '40px';

  const thStyle = (col: ColumnDef<T>): React.CSSProperties => ({
    padding: compactMode ? '0 12px' : '0 16px',
    height: headH,
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--cds-text-secondary)',
    textAlign: col.align ?? 'left',
    whiteSpace: 'nowrap',
    background: 'var(--cds-layer-01)',
    borderBottom: '2px solid var(--cds-border-subtle-01)',
    cursor: col.sortable ? 'pointer' : 'default',
    userSelect: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    width: col.width,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  });

  const tdStyle = (col: ColumnDef<T>): React.CSSProperties => ({
    padding: compactMode ? '0 12px' : '0 16px',
    height: rowH,
    fontSize: '14px',
    color: 'var(--cds-text-primary)',
    textAlign: col.align ?? 'left',
    borderBottom: '1px solid var(--cds-border-subtle-00)',
    verticalAlign: 'middle',
    whiteSpace: col.render ? undefined : 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: col.width ?? '0',
  });

  const sortIndicator = (key: string) => {
    if (sortKey !== key) return <span style={{ color: 'var(--cds-text-disabled)', marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: 'var(--cds-interactive)', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>
          {loading ? 'Loading...' : `${data.length} item${data.length !== 1 ? 's' : ''}`}
          {selectable && selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setCompactMode((v) => !v)}
            style={{
              height: '32px',
              padding: '0 12px',
              border: '1px solid var(--cds-border-subtle-01)',
              borderRadius: 'var(--cds-border-radius)',
              background: compactMode ? 'var(--cds-interactive-selected)' : 'var(--cds-background)',
              color: compactMode ? 'var(--cds-interactive)' : 'var(--cds-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {compactMode ? t('table.normal') : t('table.compact')}
          </button>
          <button
            type="button"
            onClick={() => exportCSV(columns, sortedData, exportFilename)}
            style={{
              height: '32px',
              padding: '0 12px',
              border: '1px solid var(--cds-border-subtle-01)',
              borderRadius: 'var(--cds-border-radius)',
              background: 'var(--cds-background)',
              color: 'var(--cds-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('table.exportCsv')}
          </button>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              height: '32px',
              padding: '0 8px',
              border: '1px solid var(--cds-border-subtle-01)',
              borderRadius: 'var(--cds-border-radius)',
              background: 'var(--cds-field-01)',
              color: 'var(--cds-text-primary)',
              fontSize: '12px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{t('table.perPage', { count: s })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          border: '1px solid var(--cds-border-subtle-01)',
          borderRadius: 'var(--cds-border-radius)',
          overflow: 'auto',
          maxHeight: '600px',
          background: 'var(--cds-background)',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--cds-text-helper)',
              fontSize: '14px',
            }}
          >
            {t('table.loadingData')}
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: '0' }}>{emptyState}</div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr>
                {selectable && (
                  <th
                    style={{
                      ...thStyle(columns[0]),
                      width: '44px',
                      padding: '0 12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={pagedData.length > 0 && selectedRows.size === pagedData.length}
                      onChange={toggleAll}
                      style={{ accentColor: 'var(--cds-interactive)', cursor: 'pointer' }}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={thStyle(col)}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    {col.header}
                    {col.sortable && sortIndicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row, rowIndex) => {
                const key = getKey(row, rowIndex);
                const isSelected = selectable && selectedRows.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      background: isSelected
                        ? 'var(--cds-interactive-selected)'
                        : 'var(--cds-background)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--cds-background-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--cds-background)';
                    }}
                  >
                    {selectable && (
                      <td
                        style={{
                          ...tdStyle(columns[0]),
                          width: '44px',
                          padding: '0 12px',
                        }}
                        onClick={(e) => { e.stopPropagation(); toggleRow(key); }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          style={{ accentColor: 'var(--cds-interactive)', cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} style={tdStyle(col)}>
                        {col.render
                          ? col.render((row as Record<string, unknown>)[col.key], row, rowIndex)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data.length > 0 && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>
            Page {currentPage} of {totalPages} •{' '}
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} of{' '}
            {data.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              style={paginationBtnStyle(currentPage === 1)}
            >
              «
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={paginationBtnStyle(currentPage === 1)}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  style={{
                    ...paginationBtnStyle(false),
                    background:
                      currentPage === page ? 'var(--cds-interactive)' : 'var(--cds-background)',
                    color:
                      currentPage === page ? '#ffffff' : 'var(--cds-text-primary)',
                    borderColor:
                      currentPage === page ? 'var(--cds-interactive)' : 'var(--cds-border-subtle-01)',
                    fontWeight: currentPage === page ? 600 : 400,
                  }}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={paginationBtnStyle(currentPage === totalPages)}
            >
              ›
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={paginationBtnStyle(currentPage === totalPages)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '32px',
    minWidth: '32px',
    padding: '0 8px',
    border: '1px solid var(--cds-border-subtle-01)',
    borderRadius: 'var(--cds-border-radius)',
    background: 'var(--cds-background)',
    color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.1s, border-color 0.1s',
  };
}
