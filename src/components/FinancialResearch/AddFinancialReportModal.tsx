import React, { useState } from 'react';
import type { CreateFinancialReportRequest } from '../../types/domain';
import { UploadCloud } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFinancialReportRequest, file: File) => void;
}

export default function AddFinancialReportModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<string>('QUARTER');
  const [period, setPeriod] = useState('Q1');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !publicationDate || !year || !periodType || !file) return;

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
          periodType,
          period: periodType === 'QUARTER' ? period : undefined,
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
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };
  const modalStyle: React.CSSProperties = {
    background: 'white', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%',
    display: 'flex', flexDirection: 'column', gap: '20px'
  };
  const inputStyle: React.CSSProperties = { padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box', fontSize: '14px' };
  const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#374151' };

  return (
    <div style={overlayStyle}>
      <form style={modalStyle} onSubmit={handleSubmit}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Add Financial Report</h2>
        
        <label style={labelStyle}>
          Report Title
          <input required style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tài liệu nhà đầu tư Q2.2026" />
        </label>
        
        <label style={labelStyle}>
          Publication Date
          <input type="date" required style={inputStyle} value={publicationDate} onChange={e => setPublicationDate(e.target.value)} />
        </label>

        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Year
            <input type="number" required style={inputStyle} value={year} onChange={e => setYear(Number(e.target.value))} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Period Type
            <select style={inputStyle} value={periodType} onChange={e => setPeriodType(e.target.value as string)}>
              <option value="QUARTER">Quarter</option>
              <option value="HALF_YEAR">Half Year</option>
              <option value="FULL_YEAR">Full Year</option>
            </select>
          </label>
          {periodType === 'QUARTER' && (
            <label style={{ ...labelStyle, flex: 1 }}>
              Quarter
              <select style={inputStyle} value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
          )}
        </div>

        <label style={labelStyle}>
          Source Document (PDF)
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="file" 
              accept="application/pdf" 
              required 
              style={{...inputStyle, paddingLeft: '40px'}} 
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
            />
            <UploadCloud size={20} color="#6b7280" style={{ position: 'absolute', left: '12px' }} />
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} disabled={isSubmitting} style={{ padding: '8px 16px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" disabled={!title || !publicationDate || !file || isSubmitting} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            {isSubmitting ? 'Uploading & Creating...' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
