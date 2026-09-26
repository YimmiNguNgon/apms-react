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
  QUEUED: 'Queued for processing...',
  PARSING_DOCUMENT: 'Reading and analyzing PDF document structure...',
  EXTRACTING_METRICS: 'Extracting financial metrics with Gemini AI...',
  VALIDATING_RESULTS: 'Reconciling and validating financial figures...',
  SAVING_RESULTS: 'Saving and finalizing extraction results...',
  COMPLETED: 'Financial data extraction completed!',
  FAILED: 'Extraction failed',
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
