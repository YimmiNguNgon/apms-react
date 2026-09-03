import React from 'react';
import type { ContractExtractionStage, ContractExtractionStatus } from '../../types/contractResearch';
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

interface Props {
  status: ContractExtractionStatus;
  stage?: ContractExtractionStage | null;
  progress?: number | null;
  errorMessage?: string | null;
  compact?: boolean;
}

export const ContractProgressBar: React.FC<Props> = ({
  status,
  stage,
  progress = 0,
  errorMessage,
}) => {
  if (status === 'NOT_EXTRACTED') return null;

  if (status === 'FAILED') {
    return (
      <div
        style={{
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fecdd3',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#991b1b',
          fontSize: 13,
          margin: '10px 0',
        }}
      >
        <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
        <span>
          <strong>Lỗi trích xuất:</strong> {errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý AI. Vui lòng thử lại.'}
        </span>
      </div>
    );
  }

  if (status === 'AWAITING_TYPE_CONFIRMATION') {
    return (
      <div
        style={{
          padding: '10px 14px',
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#9a3412',
          fontSize: 13,
          margin: '10px 0',
        }}
      >
        <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
        <span>
          <strong>Yêu cầu xác nhận:</strong> Cần xác nhận loại hợp đồng để tiếp tục trích xuất.
        </span>
      </div>
    );
  }

  if (status === 'PROCESSING') {
    const stageLabel = getStageLabel(stage);
    const numericProgress = Math.max(progress || 0, 5);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 14px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          margin: '10px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#1d4ed8',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Loader2 size={13} style={{ animation: 'spin 1.2s linear infinite' }} />
            <span>{stageLabel}</span>
          </span>
          <span style={{ fontWeight: 700 }}>{numericProgress}%</span>
        </div>
        <div style={{ width: '100%', height: 5, background: '#dbeafe', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${numericProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
          />
        </div>
      </div>
    );
  }

  return null;
};

function getStageLabel(stage?: ContractExtractionStage | null): string {
  switch (stage) {
    case 'QUEUED':
      return 'Đang xếp hàng chờ xử lý...';
    case 'PARSING_DOCUMENT':
      return 'Đang đọc tài liệu PDF...';
    case 'CLASSIFYING_CONTRACT':
      return 'Đang phân loại hợp đồng với Gemini AI...';
    case 'EXTRACTING_FIELDS':
      return 'Đang trích xuất điều khoản & thông tin các bên...';
    case 'VALIDATING_RESULTS':
      return 'Đang đối chiếu dữ liệu trích xuất...';
    case 'SAVING_RESULTS':
      return 'Đang hoàn tất kết quả...';
    default:
      return 'Đang trích xuất với Gemini AI...';
  }
}

export default ContractProgressBar;
