import React, { useState } from 'react';
import type { CreateFinancialReportRequest } from '../../types/domain';
import { Bot, FileText, FileUp, Loader2, Sparkles, X } from 'lucide-react';
import { validatePdfUpload, PDF_ACCEPT_ATTRIBUTE } from '../../utils/pdfValidation';

interface Props {
  open: boolean;
  targetYear?: number | null;
  onClose: () => void;
  onSubmit: (data: CreateFinancialReportRequest, file?: File | null) => Promise<void> | void;
}

export default function AddFinancialReportModal({ open, targetYear, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'>('Q1');
  const [dataEntryMethod, setDataEntryMethod] = useState<'AI_EXTRACTION' | 'MANUAL'>('AI_EXTRACTION');
  const [file, setFile] = useState<File | null>(null);
  const [customYear, setCustomYear] = useState<number | ''>(targetYear || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setPeriod('Q1');
      setDataEntryMethod('AI_EXTRACTION');
      setFile(null);
      setErrorMessage(null);
      setCustomYear(targetYear || '');
    }
  }, [open, targetYear]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const err = validatePdfUpload(selectedFile);
      if (err) {
        setErrorMessage(err);
        e.target.value = '';
        setFile(null);
        return;
      }
      setErrorMessage(null);
      setFile(selectedFile);
      if (!title.trim()) {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(baseName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter the report title.');
      return;
    }

    if (dataEntryMethod === 'AI_EXTRACTION' && !file) {
      setErrorMessage('Source document (PDF) is required for AI Extraction.');
      return;
    }

    if (file) {
      const err = validatePdfUpload(file);
      if (err) {
        setErrorMessage(err);
        return;
      }
    }

    const finalYear = targetYear || (customYear ? Number(customYear) : undefined);
    if (!finalYear) {
      setErrorMessage('Financial Year is required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        dataEntryMethod,
        documentId: '',
        reportType: 'FINANCIAL_STATEMENT',
        statementScope: 'UNKNOWN',
        reportingPeriod: {
          year: finalYear,
          periodType: period === 'FY' ? 'FULL_YEAR' : 'QUARTER',
          period,
        },
      }, file);
      
      setTitle('');
      setPeriod('Q1');
      setDataEntryMethod('AI_EXTRACTION');
      setFile(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to create financial report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
    width: '520px',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
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
    transition: 'border-color 150ms ease',
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
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Add Financial Report
            </h3>
            {targetYear && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>Financial Year: {targetYear}</span>
            )}
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

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}
        
        {/* Report Title */}
        <label style={labelStyle}>
          Report Title *
          <input
            required
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q2 2026 Financial Report"
            disabled={isSubmitting}
          />
        </label>
        
        {/* Reporting Period */}
        <label style={labelStyle}>
          Reporting Period *
          <select
            style={inputStyle}
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            disabled={isSubmitting}
          >
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="FY">FY (Full Year)</option>
          </select>
        </label>

        {!targetYear && (
          <label style={labelStyle}>
            Financial Year *
            <input
              type="number"
              required
              style={inputStyle}
              value={customYear}
              onChange={(e) => setCustomYear(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="e.g. 2026"
              disabled={isSubmitting}
            />
          </label>
        )}

        {/* Data Entry Method Selection */}
        <div style={labelStyle}>
          <span>Data Entry Method *</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${dataEntryMethod === 'AI_EXTRACTION' ? '#3b82f6' : '#e2e8f0'}`,
                background: dataEntryMethod === 'AI_EXTRACTION' ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="dataEntryMethod"
                  value="AI_EXTRACTION"
                  checked={dataEntryMethod === 'AI_EXTRACTION'}
                  onChange={() => setDataEntryMethod('AI_EXTRACTION')}
                  style={{ accentColor: '#2563eb' }}
                />
                <Bot size={16} color={dataEntryMethod === 'AI_EXTRACTION' ? '#2563eb' : '#64748b'} />
                <span>AI Extraction</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '24px', lineHeight: 1.4 }}>
                Upload a financial document and extract metrics using AI.
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${dataEntryMethod === 'MANUAL' ? '#3b82f6' : '#e2e8f0'}`,
                background: dataEntryMethod === 'MANUAL' ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="dataEntryMethod"
                  value="MANUAL"
                  checked={dataEntryMethod === 'MANUAL'}
                  onChange={() => setDataEntryMethod('MANUAL')}
                  style={{ accentColor: '#2563eb' }}
                />
                <FileText size={16} color={dataEntryMethod === 'MANUAL' ? '#2563eb' : '#64748b'} />
                <span>Manual Entry</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '24px', lineHeight: 1.4 }}>
                Enter financial metrics manually.
              </span>
            </label>
          </div>
        </div>

        {/* Source or Reference Document */}
        <label style={labelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{dataEntryMethod === 'AI_EXTRACTION' ? 'Source Document (PDF) *' : 'Reference Document (Optional)'}</span>
            {file && dataEntryMethod === 'MANUAL' && (
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Remove attached file
              </button>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="file" 
              accept={PDF_ACCEPT_ATTRIBUTE} 
              required={dataEntryMethod === 'AI_EXTRACTION'}
              disabled={isSubmitting}
              style={{ ...inputStyle, paddingLeft: '38px', cursor: 'pointer' }} 
              onChange={handleFileChange} 
            />
            <FileUp size={18} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
            {dataEntryMethod === 'AI_EXTRACTION'
              ? 'PDF only, maximum 50 MB. Metrics will be extracted using AI.'
              : 'Optional reference document (PDF only, maximum 50 MB) for viewing alongside metrics. Will not trigger AI extraction.'}
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '8px 18px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            <span>{isSubmitting ? 'Creating...' : 'Create Report'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
