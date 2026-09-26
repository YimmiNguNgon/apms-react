import React, { useMemo } from 'react';
import {
  CANONICAL_FINANCIAL_TAXONOMY,
  formatFinancialUnit,
  type CanonicalMetricDefinition,
} from './canonicalFinancialTaxonomy';
import type { FinancialMetricResponse, FinancialReportEntry } from '../../types/domain';
import {
  FinancialMetricsTable,
  FinancialTableHeader,
  FinancialSectionRow,
  FinancialSubSectionRow,
  FinancialUnitBadge,
  type FinancialTableColumn,
} from './FinancialTableComponents';
import styles from './FinancialResearchWorkbench.module.css';

interface Props {
  report: FinancialReportEntry;
  existingMetrics: FinancialMetricResponse[];
  canEdit?: boolean;
  onEditMode?: () => void;
  onOpenAddMetric?: () => void;
  onDeleteMetric?: (metric: FinancialMetricResponse) => void;
  onViewPdf?: (documentId: string) => void;
  openingPdfId?: string | null;
  hasTopReviewBanner?: boolean;
}

const MANUAL_COLUMNS: FinancialTableColumn[] = [
  { key: 'label', label: 'Financial Metric', width: '55%', align: 'left' },
  { key: 'value', label: 'Value', width: '30%', align: 'right' },
  { key: 'unit', label: 'Unit', width: '15%', align: 'center' },
];

export default function ManualFinancialSummaryTable({
  existingMetrics = [],
}: Props) {
  // 1. Balance Sheet Subgroups (29 metrics)
  const balanceSheetGroups = useMemo(() => {
    const bs = CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'BALANCE_SHEET');
    return [
      { subCategory: 'CURRENT_ASSETS', title: '1.1 CURRENT ASSETS', metrics: bs.filter((m) => m.subCategory === 'CURRENT_ASSETS') },
      { subCategory: 'NON_CURRENT_ASSETS', title: '1.2 NON-CURRENT ASSETS', metrics: bs.filter((m) => m.subCategory === 'NON_CURRENT_ASSETS') },
      { subCategory: 'TOTAL_ASSETS', title: '1.3 TOTAL ASSETS', metrics: bs.filter((m) => m.subCategory === 'TOTAL_ASSETS') },
      { subCategory: 'LIABILITIES', title: '1.4 LIABILITIES', metrics: bs.filter((m) => m.subCategory === 'LIABILITIES') },
      { subCategory: 'EQUITY', title: '1.5 OWNER EQUITY', metrics: bs.filter((m) => m.subCategory === 'EQUITY') },
    ];
  }, []);

  // 2. Income Statement Metrics (18 metrics)
  const incomeStatementMetrics = useMemo(() => {
    return CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'INCOME_STATEMENT');
  }, []);

  // 3. Banking Metrics (8 metrics)
  const bankingMetrics = useMemo(() => {
    return CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'BANKING');
  }, []);

  // 4. Ratio Metrics (6 metrics)
  const ratioMetrics = useMemo(() => {
    return CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'RATIOS');
  }, []);

  // 5. Custom Metrics (persisted non-canonical metrics)
  const customMetrics = useMemo(() => {
    const canonicalCodes = new Set(CANONICAL_FINANCIAL_TAXONOMY.map((m) => m.code));
    return existingMetrics.filter((m) => !m.metricCode || !canonicalCodes.has(m.metricCode));
  }, [existingMetrics]);

  // Fast lookup for persisted metrics by code
  const persistedByCode = useMemo(() => {
    const map = new Map<string, FinancialMetricResponse>();
    for (const m of existingMetrics) {
      if (m.metricCode) {
        map.set(m.metricCode, m);
      }
    }
    return map;
  }, [existingMetrics]);

  // Section counters
  const totalBalanceSheet = CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'BALANCE_SHEET');
  const bsFilledCount = totalBalanceSheet.filter((m) => persistedByCode.has(m.code)).length;
  const isFilledCount = incomeStatementMetrics.filter((m) => persistedByCode.has(m.code)).length;
  const bankFilledCount = bankingMetrics.filter((m) => persistedByCode.has(m.code)).length;
  const ratioFilledCount = ratioMetrics.filter((m) => persistedByCode.has(m.code)).length;
  const totalFilledCanonical = bsFilledCount + isFilledCount + bankFilledCount + ratioFilledCount;

  const formatDisplayValue = (val: string | number | undefined | null) => {
    if (val == null || val === '') return null;
    const str = String(val).trim();
    const num = Number(str.replace(/,/g, ''));
    if (!Number.isNaN(num)) {
      return num.toLocaleString('en-US');
    }
    return str;
  };

  const renderMetricRow = (metric: CanonicalMetricDefinition) => {
    const persisted = persistedByCode.get(metric.code);
    const hasValue = persisted != null && (
      (persisted.rawValue != null && String(persisted.rawValue).trim() !== '') ||
      (persisted.value != null && String(persisted.value).trim() !== '')
    );
    const rawVal = persisted ? (persisted.rawValue ?? persisted.value) : null;
    const displayVal = hasValue ? formatDisplayValue(rawVal) : null;
    const displayUnit = hasValue ? formatFinancialUnit(persisted?.rawUnit || persisted?.unit || metric.defaultUnit) : '—';

    return (
      <tr key={metric.code}>
        <td className={styles.metricLabelCell}>{metric.label}</td>
        <td className={styles.metricValueCell} style={{ textAlign: 'right' }}>
          {hasValue ? (
            displayVal
          ) : (
            <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>
              N/A
            </span>
          )}
        </td>
        <td style={{ textAlign: 'center' }}>
          <FinancialUnitBadge unit={displayUnit} />
        </td>
      </tr>
    );
  };

  return (
    <>
      <FinancialMetricsTable>
        <FinancialTableHeader columns={MANUAL_COLUMNS} />
        <tbody>
          {/* SECTION 1: BALANCE SHEET */}
          <FinancialSectionRow
            title="1. BALANCE SHEET"
            countText={`29 metrics (${bsFilledCount} entered)`}
            colSpan={3}
          />
          {balanceSheetGroups.map((group) => {
            const groupFilled = group.metrics.filter((m) => persistedByCode.has(m.code)).length;
            return (
              <React.Fragment key={group.subCategory}>
                <FinancialSubSectionRow
                  title={group.title}
                  countText={`(${groupFilled} / ${group.metrics.length} entered)`}
                  colSpan={3}
                />
                {group.metrics.map((metric) => renderMetricRow(metric))}
              </React.Fragment>
            );
          })}

          {/* SECTION 2: INCOME STATEMENT */}
          <FinancialSectionRow
            title="2. INCOME STATEMENT"
            countText={`18 metrics (${isFilledCount} entered)`}
            colSpan={3}
          />
          {incomeStatementMetrics.map((metric) => renderMetricRow(metric))}

          {/* SECTION 3: BANKING */}
          <FinancialSectionRow
            title="3. BANKING & CREDIT INSTITUTIONS"
            countText={`8 metrics (${bankFilledCount} entered)`}
            colSpan={3}
          />
          {bankingMetrics.map((metric) => renderMetricRow(metric))}

          {/* SECTION 4: RATIOS */}
          <FinancialSectionRow
            title="4. FINANCIAL & PRUDENTIAL RATIOS"
            countText={`6 metrics (${ratioFilledCount} entered)`}
            colSpan={3}
          />
          {ratioMetrics.map((metric) => renderMetricRow(metric))}

          {/* SECTION 5: CUSTOM METRICS (Rendered only if custom metrics exist) */}
          {customMetrics.length > 0 && (
            <>
              <FinancialSectionRow
                title="5. OTHER CUSTOM METRICS"
                countText={`${customMetrics.length} custom metrics`}
                colSpan={3}
              />
              {customMetrics.map((metric, idx) => {
                const displayVal = formatDisplayValue(metric.rawValue ?? metric.value);
                const displayUnit = formatFinancialUnit(metric.rawUnit ?? metric.unit);
                return (
                  <tr key={metric.id || `custom-${idx}`}>
                    <td className={styles.metricLabelCell}>
                      {metric.label || metric.originalLabel}
                    </td>
                    <td className={styles.metricValueCell} style={{ textAlign: 'right' }}>
                      {displayVal}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <FinancialUnitBadge unit={displayUnit} />
                    </td>
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </FinancialMetricsTable>

      <div className={styles.tableFooterSummary}>
        <span>
          Total: <strong>{totalFilledCanonical} / 61</strong> standard metrics entered
          {customMetrics.length > 0 && ` (+${customMetrics.length} custom metrics)`}
        </span>
        <span>Unentered metrics display <em>N/A</em></span>
      </div>
    </>
  );
}
