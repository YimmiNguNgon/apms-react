export interface StageDefinition {
  id: string;
  label: string;
}

export interface AiExtractionProgressBarProps {
  status: string;
  stage?: string | null;
  progress?: number | null;
  jobId?: string | null;
  title?: string;
  documentCount?: number | null;
  stages?: StageDefinition[];
  stageLabels?: Record<string, string>;
  stageBaseProgress?: Record<string, number>;
  showChecklist?: boolean;
  errorMessage?: string | null;
  subtext?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  onCompleted?: () => void;
}

export function isActiveExtractionStatus(status?: string | null): boolean {
  if (!status) return false;
  return status === 'PENDING' || status === 'PROCESSING' || status === 'EXTRACTING';
}

export function isTerminalExtractionStatus(status?: string | null): boolean {
  if (!status) return false;
  return status === 'COMPLETED' || status === 'EXTRACTED' || status === 'FAILED' || status === 'CANCELLED';
}

export function normalizeExtractionProgress(progress?: number | null): number {
  if (progress == null || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export const BASIC_COMPANY_EXTRACTION_STAGES: StageDefinition[] = [
  { id: 'PREPARING', label: 'Preparing documents' },
  { id: 'EXTRACTING', label: 'AI analysis' },
  { id: 'MERGING', label: 'Merging results' },
  { id: 'CREATING_CANDIDATE', label: 'Creating candidate draft' },
];

export const BASIC_COMPANY_STAGE_LABELS: Record<string, string> = {
  PREPARING: 'Preparing documents...',
  EXTRACTING: 'AI analysis in progress...',
  MERGING: 'Merging results...',
  CREATING_CANDIDATE: 'Creating candidate draft...',
  COMPLETED: 'Extraction completed',
  FAILED: 'Extraction failed',
  CANCELLED: 'Extraction cancelled',
};

export const BASIC_COMPANY_BASE_PROGRESS: Record<string, number> = {
  PREPARING: 15,
  EXTRACTING: 30,
  MERGING: 70,
  CREATING_CANDIDATE: 90,
  COMPLETED: 100,
};
