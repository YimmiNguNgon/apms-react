import React from 'react';
import AiExtractionProgressBar from '../Shared/AiExtractionProgressBar';

interface Props {
  status: string;
  stage?: string | null;
  progress?: number | null;
  jobId?: string | null;
  startedAt?: string | null;
  errorMessage?: string | null;
  compact?: boolean;
  documentCount?: number | null;
  onCancel?: () => void;
  isCancelling?: boolean;
  onCompleted?: () => void;
}

const FINANCIAL_STAGE_LABELS: Record<string, string> = {
  QUEUED: 'Đang xếp hàng chờ xử lý...',
  PARSING_DOCUMENT: 'Đang đọc và phân tích cấu trúc tài liệu PDF...',
  EXTRACTING_METRICS: 'Đang trích xuất các chỉ số tài chính với Gemini AI...',
  VALIDATING_RESULTS: 'Đang đối chiếu và kiểm chuẩn số liệu tài chính...',
  SAVING_RESULTS: 'Đang lưu trữ và hoàn tất kết quả...',
  COMPLETED: 'Đã hoàn tất trích xuất dữ liệu!',
  FAILED: 'Trích xuất thất bại',
};

const FINANCIAL_BASE_PROGRESS: Record<string, number> = {
  QUEUED: 15,
  PARSING_DOCUMENT: 35,
  EXTRACTING_METRICS: 65,
  VALIDATING_RESULTS: 85,
  SAVING_RESULTS: 92,
  COMPLETED: 100,
};

export default function ExtractionProgressBar({
  status,
  stage,
  progress,
  jobId,
  errorMessage,
  documentCount,
  onCancel,
  isCancelling = false,
  onCompleted,
}: Props) {
  return (
    <AiExtractionProgressBar
      status={status}
      stage={stage}
      progress={progress}
      jobId={jobId}
      title="Financial AI Extraction"
      documentCount={documentCount}
      stageLabels={FINANCIAL_STAGE_LABELS}
      stageBaseProgress={FINANCIAL_BASE_PROGRESS}
      showChecklist={false}
      errorMessage={errorMessage}
      onCancel={onCancel}
      isCancelling={isCancelling}
      onCompleted={onCompleted}
    />
  );
}
