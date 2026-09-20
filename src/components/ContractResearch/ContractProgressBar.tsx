import React from 'react';
import type { ContractExtractionStage, ContractExtractionStatus } from '../../types/contractResearch';
import { AlertTriangle } from 'lucide-react';
import AiExtractionProgressBar from '../Shared/AiExtractionProgressBar';

interface Props {
  status: ContractExtractionStatus;
  stage?: ContractExtractionStage | null;
  progress?: number | null;
  jobId?: string | null;
  errorMessage?: string | null;
  compact?: boolean;
  contractTitle?: string | null;
  documentCount?: number | null;
  onCancel?: () => void;
  isCancelling?: boolean;
  onCompleted?: () => void;
}

const CONTRACT_STAGE_LABELS: Record<string, string> = {
  QUEUED: 'Queued for processing...',
  PARSING_DOCUMENT: 'Reading PDF document...',
  CLASSIFYING_CONTRACT: 'Classifying contract with Gemini AI...',
  EXTRACTING_FIELDS: 'Extracting clauses & party information...',
  VALIDATING_RESULTS: 'Validating extracted data...',
  SAVING_RESULTS: 'Finalizing results...',
  COMPLETED: 'Contract extraction completed',
  FAILED: 'Contract extraction failed',
};

const CONTRACT_BASE_PROGRESS: Record<string, number> = {
  QUEUED: 10,
  PARSING_DOCUMENT: 25,
  CLASSIFYING_CONTRACT: 45,
  EXTRACTING_FIELDS: 60,
  VALIDATING_RESULTS: 85,
  SAVING_RESULTS: 95,
  COMPLETED: 100,
};

export const ContractProgressBar: React.FC<Props> = ({
  status,
  stage,
  progress,
  jobId,
  errorMessage,
  documentCount,
  contractTitle,
  onCancel,
  isCancelling = false,
  onCompleted,
}) => {
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
          <strong>Confirmation required:</strong> Contract type confirmation needed to continue extraction.
        </span>
      </div>
    );
  }

  return (
    <AiExtractionProgressBar
      status={status}
      stage={stage}
      progress={progress}
      jobId={jobId}
      title={contractTitle ? `Contract AI Extraction: ${contractTitle}` : 'Contract AI Extraction'}
      documentCount={documentCount}
      stageLabels={CONTRACT_STAGE_LABELS}
      stageBaseProgress={CONTRACT_BASE_PROGRESS}
      showChecklist={false}
      errorMessage={errorMessage}
      onCancel={onCancel}
      isCancelling={isCancelling}
      onCompleted={onCompleted}
    />
  );
};

export default ContractProgressBar;
