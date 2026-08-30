import React from 'react';
import type { FinancialReportEntry } from '../../types/domain';
import { FileText, Trash2, CheckCircle2, AlertCircle, Play, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  report: FinancialReportEntry;
  onExtract: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  onViewPdf: (documentId: string) => void;
  metricCount: number;
  needsReviewCount: number;
}

export default function FinancialReportCard({ report, onExtract, onDelete, onViewPdf, metricCount, needsReviewCount }: Props) {
  const isExtracting = report.extractionStatus === 'EXTRACTING';
  const isExtracted = report.extractionStatus === 'EXTRACTED' || report.extractionStatus === 'NEEDS_REVIEW';
  const isFailed = report.extractionStatus === 'FAILED';

  const cardStyle: React.CSSProperties = {
    border: isExtracting ? '1px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    background: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
  
  const actionContainerStyle: React.CSSProperties = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: '20px', 
    paddingTop: '16px', 
    borderTop: '1px solid #f3f4f6' 
  };
  
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px', 
    background: isExtracting ? '#eff6ff' : isExtracted || isFailed ? 'white' : '#3b82f6',
    color: isExtracting ? '#3b82f6' : isExtracted || isFailed ? '#3b82f6' : 'white',
    border: isExtracted || isFailed ? '1px solid #3b82f6' : '1px solid transparent',
    borderRadius: '8px',
    cursor: isExtracting ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    opacity: isExtracting ? 0.8 : 1
  };

  return (
    <div style={cardStyle}>
      {isExtracting && (
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '4px', width: '100%',
          background: '#e0e7ff', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: '50%', background: '#3b82f6',
            animation: 'slide 1.5s infinite linear',
            borderRadius: '4px'
          }} />
        </div>
      )}
      <style>
        {`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{report.publicationDate}</span>
            {report.reportType && (
              <>
                <span>•</span>
                <span style={{background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px'}}>{report.reportType.replace('_', ' ')}</span>
              </>
            )}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', margin: '8px 0', color: '#111827' }}>{report.title}</div>
          <div 
            style={{ fontSize: '14px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontWeight: 500 }} 
            onClick={() => onViewPdf(report.documentId)}
          >
            <FileText size={16} /> View Source PDF
          </div>
        </div>
        
        <button onClick={() => onDelete(report.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} title="Delete Report">
          <Trash2 size={18} />
        </button>
      </div>

      <div style={actionContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExtracting ? (
            <>
              <Loader2 size={18} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 500 }}>AI is extracting data...</span>
            </>
          ) : isExtracted ? (
            <>
              <CheckCircle2 size={18} color="#10b981" />
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Extracted Successfully</span>
                <span style={{ color: '#6b7280', marginLeft: '12px' }}>{metricCount} metrics ({needsReviewCount} need review)</span>
              </div>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle size={18} color="#ef4444" />
              <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 500 }}>Extraction Failed</span>
            </>
          ) : (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Ready for AI extraction</span>
          )}
        </div>
        
        <button 
          disabled={isExtracting}
          onClick={() => onExtract(report.id)}
          style={buttonStyle}
        >
          {isExtracting ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing
            </>
          ) : isExtracted ? (
            <>
              <RefreshCw size={16} /> Re-extract
            </>
          ) : (
            <>
              <Play size={16} /> {isFailed ? 'Retry Extract' : 'Extract Financial Data'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
