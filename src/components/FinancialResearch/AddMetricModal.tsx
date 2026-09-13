import React, { useEffect, useState } from 'react';
import type { CreateFinancialMetricRequest, FinancialMetricResponse, FinancialReportEntry } from '../../types/domain';
import { findCanonicalByCodeOrAlias } from './canonicalFinancialTaxonomy';
import { AlertCircle, ArrowRight, Check, Loader2, Plus, X } from 'lucide-react';

interface Props {
  open: boolean;
  report: FinancialReportEntry | null;
  existingMetrics?: FinancialMetricResponse[];
  initialLabel?: string;
  onClose: () => void;
  onSave: (data: CreateFinancialMetricRequest) => Promise<void> | void;
  isSaving?: boolean;
  onNavigateToCanonical?: (metricCode: string) => void;
}

const UNIT_OPTIONS = [
  { value: 'MILLION_VND', label: 'Triệu VNĐ' },
  { value: 'BILLION_VND', label: 'Tỷ VNĐ' },
  { value: 'VND', label: 'VNĐ' },
  { value: 'MILLION_USD', label: 'Triệu USD' },
  { value: 'USD', label: 'USD' },
  { value: 'PERCENT', label: '%' },
  { value: 'RATIO', label: 'Tỷ lệ' },
  { value: 'TIMES', label: 'Lần' },
  { value: 'COUNT', label: 'Số lượng' },
];

export default function AddMetricModal({
  open,
  report,
  existingMetrics = [],
  initialLabel = '',
  onClose,
  onSave,
  isSaving = false,
  onNavigateToCanonical,
}: Props) {
  const [metricLabel, setMetricLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('MILLION_VND');
  const [evidence, setEvidence] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [matchedCanonicalCode, setMatchedCanonicalCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMetricLabel(initialLabel || '');
      setValue('');
      setUnit('MILLION_VND');
      setEvidence('');
      setValidationError(null);
      setMatchedCanonicalCode(null);
    }
  }, [open, initialLabel]);

  if (!open || !report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setMatchedCanonicalCode(null);

    const trimmedLabel = metricLabel.trim();
    if (!trimmedLabel) {
      setValidationError('Vui lòng nhập tên chỉ số.');
      return;
    }

    // 1. Prevent duplicate of canonical taxonomy metric via labels or Vietnamese aliases
    const canonicalMatch = findCanonicalByCodeOrAlias(trimmedLabel);
    if (canonicalMatch) {
      setMatchedCanonicalCode(canonicalMatch.code);
      setValidationError(
        `Chỉ số này đã có sẵn trong biểu mẫu ("${canonicalMatch.label}"). Vui lòng nhập trực tiếp trên biểu mẫu thay vì thêm chỉ số tùy chỉnh.`
      );
      return;
    }

    // 2. Prevent duplicate of existing metric in this report
    const normalizedEntered = trimmedLabel.toLowerCase().replace(/\s+/g, ' ');
    const isDuplicate = existingMetrics.some((m) => {
      const existingNormalized = (m.label || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return existingNormalized === normalizedEntered;
    });

    if (isDuplicate) {
      setValidationError(`Chỉ số "${trimmedLabel}" đã tồn tại trong báo cáo này.`);
      return;
    }

    // 3. Validate numeric value
    if (!value || value.trim() === '') {
      setValidationError('Vui lòng nhập giá trị cho chỉ số.');
      return;
    }

    const rawStr = value.replace(/,/g, '').trim();
    const numValue = Number(rawStr);
    if (Number.isNaN(numValue)) {
      setValidationError(`Giá trị "${value}" không phải là số hợp lệ.`);
      return;
    }

    const periodPayload = report.reportingPeriod ? {
      year: report.reportingPeriod.year,
      periodType: report.reportingPeriod.periodType,
      period: report.reportingPeriod.period,
      asOfDate: report.reportingPeriod.asOfDate,
    } : null;

    const createData: CreateFinancialMetricRequest = {
      reportId: report.id,
      reportEntryId: report.id,
      sourceDocumentId: report.documentId || null,
      metricCode: null, // Custom metrics have no canonical code
      label: trimmedLabel,
      originalLabel: trimmedLabel,
      statementType: 'BALANCE_SHEET', // Fallback for DTO contract
      rawValue: rawStr,
      rawUnit: unit,
      value: numValue,
      unit,
      currency: ['VND', 'BILLION_VND', 'MILLION_VND'].includes(unit)
        ? 'VND'
        : ['USD', 'MILLION_USD'].includes(unit)
        ? 'USD'
        : unit,
      period: periodPayload,
      evidence: evidence.trim() || null,
    };

    try {
      await onSave(createData);
      onClose();
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi thêm chỉ số.');
    }
  };

  const reportPeriodStr = [
    report.reportingPeriod?.period,
    report.reportingPeriod?.year,
  ].filter(Boolean).join(' ');

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '520px',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e2e8f0',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Thêm Chỉ Số Khác
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Chỉ số bổ sung ngoài danh mục chỉ số tài chính chuẩn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation error banner */}
        {validationError && (
          <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
            {matchedCanonicalCode && onNavigateToCanonical && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToCanonical(matchedCanonicalCode);
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: '#ffffff',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Đi tới chỉ số</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tên chỉ số */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Tên chỉ số *
            </label>
            <input
              type="text"
              required
              value={metricLabel}
              onChange={(e) => {
                setMetricLabel(e.target.value);
                if (validationError) {
                  setValidationError(null);
                  setMatchedCanonicalCode(null);
                }
              }}
              placeholder="Ví dụ: Chi phí chuyển đổi số, Chi phí ESG..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Giá trị và Đơn vị */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giá trị *
              </label>
              <input
                type="text"
                required
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Ví dụ: 1250000"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Đơn vị *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 13,
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kỳ báo cáo (Read-only) */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
              Kỳ báo cáo
            </label>
            <div
              style={{
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                color: '#334155',
                fontWeight: 500,
              }}
            >
              {reportPeriodStr || 'Theo kỳ báo cáo của tài liệu'}
            </div>
          </div>

          {/* Ghi chú nguồn (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Ghi chú nguồn (Tùy chọn)
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Ví dụ: Thuyết minh BCTC trang 18..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 12,
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '8px 18px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang thêm...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Thêm chỉ số</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
