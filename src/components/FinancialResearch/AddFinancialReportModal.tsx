import React, { useState } from 'react';
import type { CreateFinancialReportRequest } from '../../types/domain';
import { FileUp, Loader2, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFinancialReportRequest, file: File) => void;
}

export default function AddFinancialReportModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [period, setPeriod] = useState('Q1');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !publicationDate || !year || !period || !file) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        publicationDate,
        documentId: '', 
        reportType: 'FINANCIAL_STATEMENT',
        statementScope: 'CONSOLIDATED',
        reportingPeriod: {
          year,
          periodType: 'QUARTER',
          period,
        },
      }, file);
      
      setTitle('');
      setPublicationDate('');
      setFile(null);
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
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            Add Financial Report
          </h3>
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
          Report Title
          <input
            required
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Báo cáo tài chính Q2 2026"
          />
        </label>
        
        <label style={labelStyle}>
          Publication Date
          <input
            type="date"
            required
            style={inputStyle}
            value={publicationDate}
            onChange={(e) => setPublicationDate(e.target.value)}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
        </div>

        <label style={labelStyle}>
          Source Document (PDF)
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="file" 
              accept="application/pdf" 
              required 
              style={{ ...inputStyle, paddingLeft: '38px', cursor: 'pointer' }} 
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
            />
            <FileUp size={18} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
          </div>
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
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title || !publicationDate || !file || isSubmitting}
            style={{
              padding: '8px 18px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting || !title || !publicationDate || !file ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              opacity: isSubmitting || !title || !publicationDate || !file ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading & Creating...
              </>
            ) : (
              'Create Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
