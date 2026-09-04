import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  status: string;
  stage?: string | null;
  progress?: number | null;
  startedAt?: string | null;
  errorMessage?: string | null;
  compact?: boolean;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export default function ExtractionProgressBar({
  status,
  stage,
  progress = 0,
  errorMessage,
  onCancel,
  isCancelling = false,
}: Props) {
  const [animatedProgress, setAnimatedProgress] = useState<number>(() =>
    Math.max(progress || 0, getInitialStageProgress(stage))
  );

  useEffect(() => {
    const stageBase = getInitialStageProgress(stage);
    const target = Math.max(progress || 0, stageBase);
    setAnimatedProgress(prev => Math.max(prev, target));
  }, [stage, progress]);

  // Smooth progress tick while running
  useEffect(() => {
    if (status !== 'EXTRACTING' && status !== 'PROCESSING') return;

    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        if (prev >= 92) return prev;
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'NOT_EXTRACTED') return null;

  if (status === 'FAILED') {
    return (
      <div
        style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecdd3',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#991b1b',
          fontSize: 13,
          margin: '12px 0',
        }}
      >
        <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
        <span>
          <strong>Lỗi trích xuất:</strong> {errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý AI. Vui lòng thử lại.'}
        </span>
      </div>
    );
  }

  if (status === 'EXTRACTING' || status === 'PROCESSING') {
    const stageLabel = getStageLabel(stage);
    const displayProgress = Math.min(Math.max(animatedProgress, 10), 98);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '14px 18px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          margin: '14px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: '#1d4ed8',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={15} style={{ animation: 'spin 1.2s linear infinite' }} />
            <span>{stageLabel}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{displayProgress}%</span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isCancelling}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  background: '#fff',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Hủy quá trình trích xuất AI"
              >
                {isCancelling ? (
                  <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} />
                ) : (
                  <XCircle size={12} />
                )}
                {isCancelling ? 'Đang hủy...' : 'Hủy trích xuất'}
              </button>
            )}
          </div>
        </div>
        <div style={{ width: '100%', height: 6, background: '#dbeafe', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${displayProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}

function getInitialStageProgress(stage?: string | null): number {
  switch (stage) {
    case 'QUEUED':
      return 15;
    case 'PARSING_DOCUMENT':
      return 35;
    case 'EXTRACTING_METRICS':
      return 65;
    case 'VALIDATING_RESULTS':
      return 85;
    case 'SAVING_RESULTS':
      return 92;
    default:
      return 15;
  }
}

function getStageLabel(stage?: string | null): string {
  switch (stage) {
    case 'QUEUED':
      return 'Đang xếp hàng chờ xử lý...';
    case 'PARSING_DOCUMENT':
      return 'Đang đọc và phân tích cấu trúc tài liệu PDF...';
    case 'EXTRACTING_METRICS':
      return 'Đang trích xuất các chỉ số tài chính với Gemini AI...';
    case 'VALIDATING_RESULTS':
      return 'Đang đối chiếu và kiểm chuẩn số liệu tài chính...';
    case 'SAVING_RESULTS':
      return 'Đang lưu trữ và hoàn tất kết quả...';
    case 'COMPLETED':
      return 'Đã hoàn tất trích xuất dữ liệu!';
    case 'FAILED':
      return 'Trích xuất thất bại';
    default:
      return 'Đang trích xuất chỉ số tài chính với Gemini AI...';
  }
}
