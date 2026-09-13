import React from 'react';
import { formatFinancialUnit } from './canonicalFinancialTaxonomy';
import styles from './FinancialResearchWorkbench.module.css';

export interface FinancialTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

/**
 * Shared container wrapping the financial table with outer border, border-radius,
 * sticky header support, and unified scrollbar behavior.
 */
export function FinancialMetricsTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.metricsTableWrap} ${className || ''}`}>
      <table className={styles.metricsTable}>{children}</table>
    </div>
  );
}

/**
 * Shared table header rendering uppercase column titles with custom widths and alignments.
 */
export function FinancialTableHeader({
  columns,
}: {
  columns: FinancialTableColumn[];
}) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            style={{
              width: col.width,
              textAlign: col.align || 'left',
            }}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * Major statement section divider row (e.g. 1. BẢNG CÂN ĐỐI KẾ TOÁN).
 */
export function FinancialSectionRow({
  title,
  countText,
  colSpan,
}: {
  title: string;
  countText?: string | null;
  colSpan: number;
}) {
  return (
    <tr className={styles.tableSectionHeaderRow}>
      <td colSpan={colSpan}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{title}</span>
          {countText && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              {countText}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Subsection divider row for Balance Sheet breakdown (e.g. 1.1 TÀI SẢN NGẮN HẠN).
 */
export function FinancialSubSectionRow({
  title,
  countText,
  colSpan,
}: {
  title: string;
  countText?: string | null;
  colSpan: number;
}) {
  return (
    <tr className={styles.tableSubSectionHeaderRow}>
      <td colSpan={colSpan}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{title}</span>
          {countText && (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
              {countText}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Standardized pill badge for financial units using formatFinancialUnit.
 */
export function FinancialUnitBadge({ unit }: { unit?: string | null }) {
  const formatted = formatFinancialUnit(unit);
  if (!formatted || formatted === '—') {
    return <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>;
  }
  return <span className={styles.unitBadge}>{formatted}</span>;
}
