import React, { useEffect, useState } from 'react';
import type { FinancialMetricResponse, ReportingPeriodType, UpdateFinancialMetricRequest } from '../../types/domain';
import { Edit3, Loader2, X } from 'lucide-react';

interface Props {
  open: boolean;
  metric: FinancialMetricResponse | null;
  onClose: () => void;
  onSave: (metricId: string, data: UpdateFinancialMetricRequest) => Promise<void> | void;
  isSaving?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'VND', label: 'VND (Đồng)' },
  { value: 'BILLION_VND', label: 'Tỷ VND (BILLION_VND)' },
  { value: 'MILLION_VND', label: 'Triệu VND (MILLION_VND)' },
  { value: 'USD', label: 'USD (Đô la Mỹ)' },
  { value: 'MILLION_USD', label: 'Triệu USD' },
  { value: 'PERCENT', label: '% (Phần trăm)' },
  { value: 'RATIO', label: 'Tỷ lệ (Ratio)' },
  { value: 'COUNT', label: 'Số lượng' },
];

export default function EditFinancialMetricModal({
  open,
  metric,
  onClose,
  onSave,
  isSaving = false,
}: Props) {
  const [label, setLabel] = useState('');
  const [value, setValue] = useState<string>('');
  const [unit, setUnit] = useState('VND');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<ReportingPeriodType>('QUARTER');
  const [period, setPeriod] = useState('Q1');
  const [evidence, setEvidence] = useState('');

  const unitOptions = React.useMemo(() => {
    if (unit && !UNIT_OPTIONS.some(opt => opt.value === unit)) {
      return [{ value: unit, label: unit }, ...UNIT_OPTIONS];
    }
    return UNIT_OPTIONS;
  }, [unit]);

  useEffect(() => {
    if (open && metric) {
      setLabel(metric.label || '');

      // Check all possible value fields returned by backend
      const rawVal = metric.rawValue ?? metric.normalizedValue ?? (metric as any).value ?? '';
      setValue(rawVal !== '' && rawVal !== null && rawVal !== undefined ? String(rawVal) : '');

      const rawUnit = metric.rawUnit ?? metric.normalizedUnit ?? metric.unit ?? metric.currency ?? 'VND';
      setUnit(rawUnit);

      const p = metric.period;
      if (p) {
        if (p.year) setYear(Number(p.year));
        let pt = (p.periodType as ReportingPeriodType) || 'QUARTER';
        if (typeof pt === 'string') {
          const u = pt.toUpperCase();
          if (['QUARTER', 'HALF_YEAR', 'FULL_YEAR'].includes(u)) {
            pt = u as ReportingPeriodType;
          } else {
            pt = 'QUARTER';
          }
        }
        setPeriodType(pt);

        let periodStr = p.period || 'Q1';
        if (periodStr.includes(' ')) {
          periodStr = periodStr.split(' ')[0];
        }
        setPeriod(periodStr.toUpperCase());
      } else {
        setYear(new Date().getFullYear());
        setPeriodType('QUARTER');
        setPeriod('Q1');
      }

      setEvidence(metric.evidence || '');
    }
  }, [open, metric]);

  if (!open || !metric) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || value === '') return;

    const rawStr = value.replace(/,/g, '').trim();
    const numValue = Number(rawStr);

    const updateData: UpdateFinancialMetricRequest = {
      label: label.trim(),
      rawValue: rawStr,
      rawUnit: unit,
      value: Number.isNaN(numValue) ? undefined : numValue,
      unit,
      currency: ['VND', 'BILLION_VND', 'MILLION_VND'].includes(unit) ? 'VND' : ['USD', 'MILLION_USD'].includes(unit) ? 'USD' : unit,
      period: {
        year: Number(year),
        periodType,
        period: periodType === 'QUARTER' || periodType === 'HALF_YEAR' ? period : undefined,
      },
      evidence: evidence.trim() || null,
    };

    await onSave(metric.id, updateData);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
    width: '560px',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
    border: '1px solid #e2e8f0',
    fontFamily: 'Inter, -apple-system, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form style={modalStyle} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit3 size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Edit Financial Metric
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <label style={labelStyle}>
          Metric Label / Indicator Name
          <input
            required
            style={inputStyle}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Total Assets, Customer Loans, etc."
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <label style={labelStyle}>
            Value
            <input
              type="text"
              required
              style={inputStyle}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 2657441000"
            />
          </label>

          <label style={labelStyle}>
            Unit / Currency
            <select
              style={inputStyle}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: periodType === 'QUARTER' || periodType === 'HALF_YEAR' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
          <label style={labelStyle}>
            Year
            <input
              type="number"
              required
              style={inputStyle}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label style={labelStyle}>
            Period Type
            <select
              style={inputStyle}
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as ReportingPeriodType)}
            >
              <option value="QUARTER">Quarter</option>
              <option value="HALF_YEAR">Half Year</option>
              <option value="FULL_YEAR">Full Year</option>
            </select>
          </label>
          {periodType === 'QUARTER' && (
            <label style={labelStyle}>
              Quarter
              <select
                style={inputStyle}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
          )}
          {periodType === 'HALF_YEAR' && (
            <label style={labelStyle}>
              Half
              <select
                style={inputStyle}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="H1">H1</option>
                <option value="H2">H2</option>
              </select>
            </label>
          )}
        </div>

        <label style={labelStyle}>
          Evidence / Document Excerpt
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Quote or context from the financial report..."
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!label.trim() || value === '' || isSaving}
            style={{
              padding: '8px 18px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving || !label.trim() || value === '' ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              opacity: isSaving || !label.trim() || value === '' ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

