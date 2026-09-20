import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useSmoothProgress } from '../../hooks/useSmoothProgress';
import {
  type AiExtractionProgressBarProps,
  normalizeExtractionProgress,
  BASIC_COMPANY_STAGE_LABELS,
  BASIC_COMPANY_BASE_PROGRESS,
} from './aiExtractionProgressTypes';

export const AiExtractionProgressBar: React.FC<AiExtractionProgressBarProps> = ({
  status,
  stage,
  progress,
  jobId,
  title = 'AI Extraction',
  documentCount,
  stageLabels = BASIC_COMPANY_STAGE_LABELS,
  stageBaseProgress = BASIC_COMPANY_BASE_PROGRESS,
  errorMessage,
  subtext,
  onCancel,
  isCancelling = false,
  onCompleted,
}) => {
  const resolveServerProgress = (
    prog?: number | null,
    stg?: string | null,
    baseMap?: Record<string, number>
  ): number => {
    // 1. Backend progress is strictly authoritative when present
    if (prog != null && !Number.isNaN(prog)) {
      return normalizeExtractionProgress(prog);
    }
    // 2. Defensive fallback only when backend progress is missing
    if (stg && baseMap && baseMap[stg] != null) {
      return normalizeExtractionProgress(baseMap[stg]);
    }
    return 0;
  };

  const isCompleted = status === 'COMPLETED' || status === 'EXTRACTED';
  const serverTarget = isCompleted ? 100 : resolveServerProgress(progress, stage, stageBaseProgress);

  // Smooth visual progress interpolation toward the latest backend target
  const displayProgress = useSmoothProgress({
    targetProgress: serverTarget,
    jobId,
    status,
    onCompleteReached: onCompleted,
  });

  if (status === 'NOT_EXTRACTED') return null;

  // Failed state: standard APMS error card matching Financial and Contract
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
          margin: '10px 0',
        }}
      >
        <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>
            <strong>Extraction error:</strong> {errorMessage || 'An error occurred during AI processing. Please try again.'}
          </span>
        </div>
      </div>
    );
  }

  // Cancelled state: standard APMS warning card matching Financial and Contract
  if (status === 'CANCELLED') {
    return (
      <div
        style={{
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#92400e',
          fontSize: 13,
          margin: '10px 0',
        }}
      >
        <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>
            <strong>AI extraction was cancelled.</strong> You can restart extraction at any time.
          </span>
        </div>
      </div>
    );
  }

  const isFullyComplete = isCompleted && displayProgress >= 100;
  const currentStageLabel = stage && stageLabels?.[stage] ? stageLabels[stage] : 'AI analysis in progress...';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 16px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        margin: '10px 0',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <strong style={{ color: '#1e40af', fontSize: 13.5, fontWeight: 700 }}>
            {title}
          </strong>
          {documentCount != null && documentCount > 0 && (
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>
              Processing {documentCount} {documentCount === 1 ? 'document' : 'documents'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1d4ed8' }}>
            {displayProgress}%
          </span>
          {onCancel && !isCompleted && (
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
                transition: 'all 0.15s ease',
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

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: 6,
          background: '#dbeafe',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${displayProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
            borderRadius: 999,
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {/* Current Stage Indicator Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 12.5,
          fontWeight: 600,
          color: isFullyComplete ? '#16a34a' : '#1d4ed8',
        }}
      >
        {isFullyComplete ? (
          <>
            <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>Extraction completed</span>
          </>
        ) : (
          <>
            <Loader2 size={13} style={{ animation: 'spin 1.2s linear infinite', flexShrink: 0 }} />
            <span>{currentStageLabel}</span>
          </>
        )}
      </div>

      {/* Subtext info */}
      {subtext && !isCompleted && (
        <small
          style={{
            color: '#64748b',
            fontSize: 11.5,
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {subtext}
        </small>
      )}
    </div>
  );
};

export default AiExtractionProgressBar;
