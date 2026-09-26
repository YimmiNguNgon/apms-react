import React, { useEffect, useMemo, useState } from 'react';
import type { CreateFinancialMetricRequest, FinancialMetricResponse, FinancialReportEntry } from '../../types/domain';
import {
  CANONICAL_FINANCIAL_TAXONOMY,
  formatFinancialUnit,
  type CanonicalMetricDefinition,
} from './canonicalFinancialTaxonomy';
import {
  isFinancialValueEntered,
  isValidFinancialValue,
  parseFinancialValue,
  FINANCIAL_NUMERIC_ERROR_MESSAGE,
} from './financialValidation';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  LineChart,
  Loader2,
  PieChart,
  Plus,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import styles from './FinancialResearchWorkbench.module.css';

interface Props {
  report: FinancialReportEntry;
  existingMetrics?: FinancialMetricResponse[];
  targetYear?: number | null;
  onSaveBatch: (metrics: CreateFinancialMetricRequest[]) => Promise<void>;
  isSaving?: boolean;
  onOpenAddMetric: () => void;
  onDeleteMetric?: (metric: FinancialMetricResponse) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  canEdit?: boolean;
  onSaveSuccess?: () => void;
  onViewSummary?: () => void;
}

const UNIT_OPTIONS = [
  { value: 'MILLION_VND', label: 'Million VND' },
  { value: 'BILLION_VND', label: 'Billion VND' },
  { value: 'VND', label: 'VND' },
  { value: 'MILLION_USD', label: 'Million USD' },
  { value: 'USD', label: 'USD' },
  { value: 'PERCENT', label: '%' },
  { value: 'RATIO', label: 'Ratio' },
  { value: 'TIMES', label: 'Times' },
  { value: 'COUNT', label: 'Count' },
];

export default function ManualFinancialEntryTemplate({
  report,
  existingMetrics = [],
  targetYear,
  onSaveBatch,
  isSaving = false,
  onOpenAddMetric,
  onDeleteMetric,
  onDirtyChange,
  canEdit = true,
  onSaveSuccess,
  onViewSummary,
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

  // Build draft values helper from existingMetrics
  const buildInitialDraft = (metricsList: FinancialMetricResponse[]) => {
    const initial: Record<string, { value: string; unit: string }> = {};
    for (const def of CANONICAL_FINANCIAL_TAXONOMY) {
      const persisted = metricsList.find((m) => m.metricCode === def.code);
      initial[def.code] = {
        value: persisted?.rawValue != null ? String(persisted.rawValue) : '',
        unit: persisted?.rawUnit || def.defaultUnit,
      };
    }
    return initial;
  };

  // Draft values state: code -> { value, unit }
  const [draftValues, setDraftValues] = useState<Record<string, { value: string; unit: string }>>(() =>
    buildInitialDraft(existingMetrics)
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync draftValues when existingMetrics changes from server, preserving unsaved changes
  useEffect(() => {
    setDraftValues((prev) => {
      const next = { ...prev };
      for (const def of CANONICAL_FINANCIAL_TAXONOMY) {
        const persisted = existingMetrics.find((m) => m.metricCode === def.code);
        if (!next[def.code]) {
          next[def.code] = {
            value: persisted?.rawValue != null ? String(persisted.rawValue) : '',
            unit: persisted?.rawUnit || def.defaultUnit,
          };
        } else if (persisted && !next[def.code].value) {
          next[def.code] = {
            value: persisted.rawValue != null ? String(persisted.rawValue) : '',
            unit: persisted.rawUnit || def.defaultUnit,
          };
        }
      }
      return next;
    });
  }, [existingMetrics]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    for (const def of CANONICAL_FINANCIAL_TAXONOMY) {
      const current = draftValues[def.code];
      const persisted = existingMetrics.find((m) => m.metricCode === def.code);
      const persistedVal = (persisted?.rawValue != null ? String(persisted.rawValue) : '').trim();
      const persistedUnit = persisted?.rawUnit || def.defaultUnit;

      const currentVal = (current?.value ?? '').trim();
      const currentUnit = current?.unit || def.defaultUnit;

      if (currentVal !== persistedVal) {
        return true;
      }
      if (currentVal !== '' && currentUnit !== persistedUnit) {
        return true;
      }
    }
    return false;
  }, [draftValues, existingMetrics]);

  // Notify parent of dirty change
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleValueChange = (code: string, val: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        value: val,
      },
    }));
    if (validationError) setValidationError(null);
  };

  const handleUnitChange = (code: string, unit: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        unit,
      },
    }));
    if (validationError) setValidationError(null);
  };

  // Section filled counters
  const totalBalanceSheet = CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.statementType === 'BALANCE_SHEET');
  const bsFilledCount = totalBalanceSheet.filter((m) => isFinancialValueEntered(draftValues[m.code]?.value)).length;
  const isFilledCount = incomeStatementMetrics.filter((m) => isFinancialValueEntered(draftValues[m.code]?.value)).length;
  const bankFilledCount = bankingMetrics.filter((m) => isFinancialValueEntered(draftValues[m.code]?.value)).length;
  const ratioFilledCount = ratioMetrics.filter((m) => isFinancialValueEntered(draftValues[m.code]?.value)).length;

  const totalFilledCanonical = bsFilledCount + isFilledCount + bankFilledCount + ratioFilledCount;

  // Handle explicit deletion of persisted metric
  const handleDeletePersisted = (metric: FinancialMetricResponse) => {
    if (!canEdit || !onDeleteMetric) return;
    const confirmMsg = `Are you sure you want to remove metric "${metric.label}" from this financial report?`;
    if (window.confirm(confirmMsg)) {
      onDeleteMetric(metric);
      if (metric.metricCode) {
        const def = CANONICAL_FINANCIAL_TAXONOMY.find((m) => m.code === metric.metricCode);
        setDraftValues((prev) => ({
          ...prev,
          [metric.metricCode!]: {
            value: '',
            unit: def?.defaultUnit || 'MILLION_VND',
          },
        }));
      }
    }
  };

  const handleSave = async () => {
    setValidationError(null);

    // Filter meaningful rows only (Sparse persistence: entered values)
    const enteredEntries = Object.entries(draftValues)
      .map(([code, item]) => ({ code, item, parsed: parseFinancialValue(item?.value) }))
      .filter(({ parsed }) => parsed.entered);

    if (enteredEntries.length === 0 && customMetrics.length === 0) {
      setValidationError('Please enter a value for at least one metric to save.');
      return;
    }

    // Client-side strict numeric validation
    const invalidEntries = enteredEntries.filter(({ parsed }) => !parsed.valid);
    if (invalidEntries.length > 0) {
      const firstInvalid = invalidEntries[0];
      const inputEl = document.getElementById(`metric-input-${firstInvalid.code}`);
      inputEl?.focus();
      const rowEl = document.getElementById(`metric-row-${firstInvalid.code}`);
      rowEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const periodPayload = report.reportingPeriod ? {
      year: report.reportingPeriod.year || targetYear || null,
      periodType: report.reportingPeriod.periodType || null,
      period: report.reportingPeriod.period || null,
      asOfDate: report.reportingPeriod.asOfDate || null,
    } : null;

    const payload: CreateFinancialMetricRequest[] = enteredEntries.map(({ code, item, parsed }) => {
      const def = CANONICAL_FINANCIAL_TAXONOMY.find((m) => m.code === code);
      const normalizedStr = parsed.normalizedString ?? item.value.trim();
      const numVal = Number(normalizedStr);

      return {
        reportId: report.id,
        reportEntryId: report.id,
        metricCode: code,
        label: def?.label || code,
        originalLabel: def?.label || code,
        statementType: def?.statementType || 'BALANCE_SHEET',
        rawValue: normalizedStr,
        rawUnit: item.unit,
        value: Number.isNaN(numVal) ? undefined : numVal,
        unit: item.unit,
        period: periodPayload,
      };
    });

    try {
      await onSaveBatch(payload);
      onSaveSuccess?.();
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || err?.message || 'An error occurred while saving metrics.');
    }
  };

  const renderMetricRow = (metric: CanonicalMetricDefinition, idx: number, total: number) => {
    const current = draftValues[metric.code] || { value: '', unit: metric.defaultUnit };
    const parsed = parseFinancialValue(current.value);
    const isFilled = parsed.entered;
    const hasError = parsed.entered && !parsed.valid;
    const persisted = existingMetrics.find((m) => m.metricCode === metric.code);

    return (
      <tr
        key={metric.code}
        id={`metric-row-${metric.code}`}
        style={{
          borderBottom: idx < total - 1 ? '1px solid #f1f5f9' : 'none',
          background: isFilled ? '#f8fafc' : '#ffffff',
          height: '42px',
        }}
      >
        <td style={{ padding: '8px 16px', color: '#1e293b', fontWeight: isFilled ? 600 : 500, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isFilled && <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />}
            <span>{metric.label}</span>
          </div>
        </td>
        <td style={{ padding: '6px 12px', width: '220px' }}>
          <input
            type="text"
            inputMode="decimal"
            id={`metric-input-${metric.code}`}
            disabled={!canEdit || isSaving}
            value={current.value}
            onChange={(e) => handleValueChange(metric.code, e.target.value)}
            placeholder="Empty"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: hasError ? '1.5px solid #ef4444' : isFilled ? '1px solid #3b82f6' : '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
              background: canEdit ? '#ffffff' : '#f1f5f9',
              boxSizing: 'border-box',
              fontWeight: isFilled ? 600 : 400,
              color: hasError ? '#b91c1c' : isFilled ? '#0f172a' : '#475569',
            }}
          />
          {hasError && (
            <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span>{FINANCIAL_NUMERIC_ERROR_MESSAGE}</span>
            </div>
          )}
        </td>
        <td style={{ padding: '6px 12px', width: '130px' }}>
          <select
            disabled={!canEdit || isSaving}
            value={current.unit}
            onChange={(e) => handleUnitChange(metric.code, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12,
              background: canEdit ? '#ffffff' : '#f1f5f9',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#334155',
            }}
          >
            {!UNIT_OPTIONS.some((opt) => opt.value === current.unit) && current.unit && (
              <option key={current.unit} value={current.unit}>
                {formatFinancialUnit(current.unit)}
              </option>
            )}
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td style={{ padding: '6px 10px', textAlign: 'center', width: '44px' }}>
          {persisted && canEdit && (
            <button
              type="button"
              onClick={() => handleDeletePersisted(persisted)}
              title="Remove metric from report"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0px',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      {/* Validation Error Alert */}
      {validationError && (
        <div style={{ margin: '10px 16px 0', padding: '8px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flex: '0 0 auto' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* 
        Single Right-Panel Scroll Owner:
        display: block with natural flow so sections never squash or flex-shrink.
        overflowY: auto enables ONE smooth vertical scroll for all 61 fields.
      */}
      <div
        style={{
          display: 'block',
          flex: '1 1 0px',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 16px 28px',
        }}
      >
        {/* 1. BALANCE SHEET (29 metrics across 5 subsections) */}
        <section
          style={{
            display: 'block',
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            background: '#ffffff',
            marginBottom: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Static Section Header */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '11px 16px',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: '9px 9px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChart size={16} color="#2563eb" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Balance Sheet
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {totalBalanceSheet.length} metrics • {bsFilledCount} entered
            </span>
          </div>

          {/* 5 Balance Sheet Subsections */}
          <div style={{ display: 'block', height: 'auto', overflow: 'visible' }}>
            {balanceSheetGroups.map((group, gIdx) => (
              <div
                key={group.subCategory}
                style={{
                  display: 'block',
                  height: 'auto',
                  overflow: 'visible',
                  borderBottom: gIdx < balanceSheetGroups.length - 1 ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <div style={{ background: '#f8fafc', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {group.title}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, height: 'auto', overflow: 'visible' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: 600 }}>Financial Metric</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '220px' }}>Value</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Unit</th>
                      <th style={{ padding: '6px 10px', width: '44px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.metrics.map((m, idx) => renderMetricRow(m, idx, group.metrics.length))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* 2. INCOME STATEMENT (18 metrics) */}
        <section
          style={{
            display: 'block',
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            background: '#ffffff',
            marginBottom: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Static Section Header */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '11px 16px',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: '9px 9px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#16a34a" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Income Statement
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {incomeStatementMetrics.length} metrics • {isFilledCount} entered
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, height: 'auto', overflow: 'visible' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: 600 }}>Financial Metric</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '220px' }}>Value</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Unit</th>
                <th style={{ padding: '6px 10px', width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {incomeStatementMetrics.map((m, idx) => renderMetricRow(m, idx, incomeStatementMetrics.length))}
            </tbody>
          </table>
        </section>

        {/* 3. BANKING & CREDIT INSTITUTIONS (8 metrics) */}
        <section
          style={{
            display: 'block',
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            background: '#ffffff',
            marginBottom: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Static Section Header */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '11px 16px',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: '9px 9px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="#8b5cf6" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Banking & Credit Institutions
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {bankingMetrics.length} metrics • {bankFilledCount} entered
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, height: 'auto', overflow: 'visible' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: 600 }}>Financial Metric</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '220px' }}>Value</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Unit</th>
                <th style={{ padding: '6px 10px', width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {bankingMetrics.map((m, idx) => renderMetricRow(m, idx, bankingMetrics.length))}
            </tbody>
          </table>
        </section>

        {/* 4. FINANCIAL & SAFETY RATIOS (6 metrics) */}
        <section
          style={{
            display: 'block',
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            background: '#ffffff',
            marginBottom: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {/* Static Section Header */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '11px 16px',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: '9px 9px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LineChart size={16} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Financial & Safety Ratios
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {ratioMetrics.length} metrics • {ratioFilledCount} entered
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, height: 'auto', overflow: 'visible' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: 600 }}>Financial Metric</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '220px' }}>Value</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Unit</th>
                <th style={{ padding: '6px 10px', width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {ratioMetrics.map((m, idx) => renderMetricRow(m, idx, ratioMetrics.length))}
            </tbody>
          </table>
        </section>

        {/* 5. CUSTOM METRICS SECTION (Only rendered if custom metrics exist) */}
        {customMetrics.length > 0 && (
          <section
            style={{
              display: 'block',
              height: 'auto',
              maxHeight: 'none',
              overflow: 'visible',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: '#ffffff',
              marginBottom: 20,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {/* Static Section Header */}
            <div
              style={{
                background: '#f1f5f9',
                padding: '11px 16px',
                borderBottom: '1px solid #e2e8f0',
                borderRadius: '9px 9px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color="#0284c7" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  5. Custom Indicators
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                {customMetrics.length} metrics
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, height: 'auto', overflow: 'visible' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 16px', textAlign: 'left', fontWeight: 600 }}>Metric Name</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '220px' }}>Value</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Unit</th>
                  <th style={{ padding: '6px 10px', width: '44px' }}></th>
                </tr>
              </thead>
              <tbody>
                {customMetrics.map((metric, idx) => (
                  <tr
                    key={metric.id}
                    style={{
                      borderBottom: idx < customMetrics.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: '#ffffff',
                      height: '42px',
                    }}
                  >
                    <td style={{ padding: '8px 16px', color: '#1e293b', fontWeight: 600, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>{metric.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 12px', color: '#0f172a', fontWeight: 600, fontSize: 13, width: '220px' }}>
                      {metric.rawValue}
                    </td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontSize: 12, width: '130px' }}>
                      {formatFinancialUnit(metric.rawUnit || metric.unit)}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', width: '44px' }}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeletePersisted(metric)}
                          title="Remove custom metric"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

      </div>

      {/* Pinned Bottom Actions Footer */}
      <div
        style={{
          flex: '0 0 auto',
          padding: '12px 16px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#475569' }}>
            Entered: <strong>{totalFilledCanonical + customMetrics.length}</strong> metrics
            {isDirty && (
              <span style={{ marginLeft: 8, color: '#ea580c', fontWeight: 600, fontSize: 12 }}>
                (Unsaved changes)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onViewSummary && existingMetrics.length > 0 && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onViewSummary}
              style={{ fontSize: 13, height: 36, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Eye size={15} />
              <span>View Summary Table</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onOpenAddMetric}
              style={{ fontSize: 13, height: 36, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              <span>Add Custom Metric</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSave}
              disabled={isSaving || (!isDirty && totalFilledCanonical === 0)}
              style={{ fontSize: 13, height: 36, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Metrics ({totalFilledCanonical})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
