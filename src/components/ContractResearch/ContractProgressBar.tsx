import React, { useEffect, useState } from 'react';
import type { ContractExtractionStage, ContractExtractionStatus } from '../../types/contractResearch';
import { Loader2, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  status: ContractExtractionStatus;
  stage?: ContractExtractionStage | null;
  progress?: number | null;
  errorMessage?: string | null;
  compact?: boolean;
  contractTitle?: string | null;
  onCancel?: () => void;
  isCancelling?: boolean;
}

function getBaseProgressForStage(stage?: ContractExtractionStage | null): number {
  switch (stage) {
    case 'QUEUED':
      return 10;
    case 'PARSING_DOCUMENT':
      return 25;
    case 'CLASSIFYING_CONTRACT':
      return 45;
    case 'EXTRACTING_FIELDS':
      return 60;
    case 'VALIDATING_RESULTS':
      return 85;
    case 'SAVING_RESULTS':
      return 95;
    default:
      return 35;
  }
}

function getStageLabel(stage?: ContractExtractionStage | null): string {
  switch (stage) {
    case 'QUEUED':
      return 'Queued for processing...';
    case 'PARSING_DOCUMENT':
      return 'Reading PDF document...';
    case 'CLASSIFYING_CONTRACT':
      return 'Classifying contract with Gemini AI...';
    case 'EXTRACTING_FIELDS':
      return 'Extracting clauses & party information...';
    case 'VALIDATING_RESULTS':
      return 'Validating extracted data...';
    case 'SAVING_RESULTS':
      return 'Finalizing results...';
    default:
      return 'Extracting with Gemini AI...';
  }
}

export const ContractProgressBar: React.FC<Props> = ({
  status,
  stage,
  progress = 0,
  errorMessage,
  onCancel,
  isCancelling = false,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState<number>(() =>
    Math.max(progress || 0, getBaseProgressForStage(stage))
  );

  useEffect(() => {
    const base = getBaseProgressForStage(stage);
    const target = Math.max(progress || 0, base);
    setAnimatedProgress((prev) => Math.max(prev, target));
  }, [stage, progress]);

  // Smooth progress increment ticker while in PROCESSING
  useEffect(() => {
    if (status !== 'PROCESSING') return;

    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev >= 94) return prev;
        return prev + 1;
      });
    }, 850);

    return () => clearInterval(interval);
  }, [status]);

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
          <strong>Extraction error:</strong> {errorMessage || 'An error occurred during AI processing. Please try again.'}
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
          <strong>Confirmation required:</strong> Contract type confirmation needed to continue extraction.
        </span>
      </div>
    );
  }

  if (status === 'PROCESSING') {
    const stageLabel = getStageLabel(stage);
    const displayProgress = Math.min(Math.max(animatedProgress, 10), 98);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700 }}>{displayProgress}%</span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isCancelling}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  background: '#fff',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#dc2626',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                }}
                title="Cancel extraction"
              >
                {isCancelling ? (
                  <Loader2 size={11} style={{ animation: 'spin 1.2s linear infinite' }} />
                ) : (
                  <XCircle size={11} />
                )}
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ width: '100%', height: 5, background: '#dbeafe', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${displayProgress}%`,
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

export default ContractProgressBar;
