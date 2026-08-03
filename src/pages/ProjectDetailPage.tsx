import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Globe2,
  Lightbulb,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  type LucideIcon,
  UserPlus,
  X,
} from 'lucide-react';
import styles from './ProjectDetailPage.module.css';
import {
  columns,
  members,
  projectDetail,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from '../data/projectDetailMock';
import { projectApi } from '../API/projectApi';
import { accountApi } from '../API/accountApi';
import { taskApi } from '../API/taskApi';
import { candidateApi } from '../API/candidateApi';
import { companyMemberResearchApi } from '../API/companyMemberResearchApi';
import { ROLES, useUser } from '../context/UserContext';
import { API_BASE_URL, api } from '../services/api';
import { RoleEvaluationWorkspace } from '../components/RoleEvaluationWorkspace';
import type {
  AiExtractionResult,
  CandidateResponse,
  CandidateStatus,
  CompanyMemberResearchDraftResponse,
  CompanyMemberResearchItem,
  CreateProjectTaskRequest,
  MergeCandidateResponse,
  PageResult,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus as ApiProjectStatus,
  ProjectType as ApiProjectType,
  ProjectTaskResponse,
  ProjectTaskSubmissionResponse,
  RelationshipType,
  TaskPriority as ApiTaskPriority,
  TaskStatus as ApiTaskStatus,
  TaskType,
  UserSearchResponse,
  WorkbenchDocumentResponse,
  ProjectTaskWorkbenchResponse,
  UpdateCandidateRequest,
} from '../types/domain';

const tabs = ['Kanban Board', 'Candidates', 'Documents', 'Members'];
const SELECTED_PROJECT_STORAGE_KEY = 'apms-selected-project';
const PROJECT_DETAIL_TAB_STORAGE_KEY = 'apms-project-detail-active-tab';

const priorityClass: Record<TaskPriority, string> = {
  Highest: styles.priorityHighest,
  High: styles.priorityHigh,
  Medium: styles.priorityMedium,
  Low: styles.priorityLow,
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));

const formatOptionalDate = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatFileSize = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
};

const formatMemberDate = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const projectStatusLabel: Record<ApiProjectStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

const projectTypeLabel: Record<ApiProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New Company Research',
  UPDATE_EXISTING_COMPANY: 'Update Existing Company',
};

const toProjectKey = (project: ProjectResponse | null) =>
  project ? `APMS-${String(project.id).padStart(2, '0')}` : projectDetail.key;

const isProjectResponse = (value: unknown): value is ProjectResponse => {
  const project = value as ProjectResponse | null;
  return Boolean(project && typeof project.id === 'number' && typeof project.projectName === 'string');
};

const readSelectedProjectSnapshot = () => {
  const activeProjectId = Number(localStorage.getItem('apms-active-project'));
  const rawSnapshot = sessionStorage.getItem(SELECTED_PROJECT_STORAGE_KEY);
  if (!rawSnapshot || !Number.isFinite(activeProjectId)) return null;

  try {
    const snapshot = JSON.parse(rawSnapshot) as unknown;
    if (isProjectResponse(snapshot) && snapshot.id === activeProjectId) {
      return snapshot;
    }
  } catch {
    return null;
  }

  return null;
};

const unwrapProject = (payload: unknown) => {
  if (isProjectResponse(payload)) return payload;

  const wrapped = payload as { data?: unknown } | null;
  if (wrapped?.data && isProjectResponse(wrapped.data)) {
    return wrapped.data;
  }

  return null;
};

const unwrapList = <T,>(payload: unknown) => {
  const wrapped = payload as { data?: unknown } | null;
  const value = wrapped?.data ?? payload;
  if (Array.isArray(value)) return value as T[];

  const page = value as { content?: unknown } | null;
  if (Array.isArray(page?.content)) return page.content as T[];

  return [];
};

const accountName = (account: UserSearchResponse) =>
  account.fullName || account.email;

const roleName = (account: UserSearchResponse) =>
  account.roles?.[0] || 'User';

const memberDisplayName = (member: ProjectMemberResponse) =>
  member.fullName || member.email || `Account #${member.accountId}`;

const memberInitials = (member: ProjectMemberResponse) =>
  memberDisplayName(member)
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

const memberRoleLabel = (member: ProjectMemberResponse) =>
  member.memberRole === 'MANAGER' ? 'Project owner' : 'Staff';

const candidateStatusLabel: Record<CandidateStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  REJECTED: 'Rejected',
  CORRECTED: 'Corrected',
  APPROVED: 'Approved',
};

const candidateStatusClass: Record<CandidateStatus, string> = {
  DRAFT: styles.candidateDRAFT,
  PENDING_REVIEW: styles.candidatePENDING_REVIEW,
  REJECTED: styles.candidateREJECTED,
  CORRECTED: styles.candidateCORRECTED,
  APPROVED: styles.candidateAPPROVED,
};

const visibleCandidateStatuses = new Set<CandidateStatus>(['PENDING_REVIEW', 'APPROVED', 'REJECTED']);

type CandidateReviewTab = 'profile' | 'swot' | 'evidence';
type ManagerCandidateTab = 'overview' | 'swot' | 'evidence' | 'decision';

const candidateReviewTabs: Array<{ id: CandidateReviewTab; label: string; helper: string }> = [
  { id: 'profile', label: 'Profile', helper: 'Identity and contact' },
  { id: 'swot', label: 'SWOT', helper: 'AI insight items' },
  { id: 'evidence', label: 'Evidence', helper: 'Business fields' },
];

const managerCandidateTabs: Array<{ id: ManagerCandidateTab; label: string; helper: string }> = [
  { id: 'overview', label: 'Overview', helper: 'Identity and contact' },
  { id: 'swot', label: 'SWOT', helper: 'AI signals' },
  { id: 'evidence', label: 'Business Fields', helper: 'Products, markets, customers' },
  { id: 'decision', label: 'Decision', helper: 'Approve or reject' },
];

const candidateName = (candidate: CandidateResponse) => {
  const identity = candidate.identity as { tradeName?: string; legalName?: string } | undefined;
  return identity?.tradeName || identity?.legalName || `Candidate ${candidate.id.slice(-6)}`;
};

const candidateIndustry = (candidate: CandidateResponse) => {
  const business = candidate.business as { industries?: string[]; businessModel?: string } | undefined;
  return business?.industries?.filter(Boolean).join(', ') || business?.businessModel || 'Industry not specified';
};

const candidateCompleteness = (candidate: CandidateResponse) => {
  const validation = candidate.validation as { isComplete?: boolean; dataQualityScore?: string; missingCriticalFields?: string } | undefined;
  if (validation?.isComplete) return 'Complete';
  if (validation?.dataQualityScore) return validation.dataQualityScore;
  return validation?.missingCriticalFields ? 'Needs review' : 'Not checked';
};

const candidateContact = (candidate: CandidateResponse) => {
  const contact = candidate.contact as { website?: string; emails?: string[]; phones?: string[] } | undefined;
  return {
    website: contact?.website || 'No website',
    email: contact?.emails?.[0] || 'No email',
    phone: contact?.phones?.[0] || 'No phone',
  };
};

const candidateField = (value: unknown, fallback = 'No data'): string => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.map((item) => candidateField(item, '')).filter(Boolean).join(', ') || fallback;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const formatInsightTitle = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const toInsightItems = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => candidateField(item)).filter(Boolean);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatInsightTitle(key)}: ${candidateField(item)}`)
      .filter(Boolean);
  }
  return [String(value)];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const formatPanelValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map((item) => candidateField(item)).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const formatAddressValue = (value: unknown) => {
  if (!value) return '';
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (!item || typeof item !== 'object') return formatPanelValue(item);
      const address = item as { fullAddress?: unknown; city?: unknown; country?: unknown; type?: unknown };
      return [address.fullAddress, address.city, address.country]
        .map((part) => formatPanelValue(part))
        .filter(Boolean)
        .join(', ') || formatPanelValue(address.type);
    })
    .filter(Boolean)
    .join('\n');
};

const formatCompanySizeValue = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return formatPanelValue(value);
  const size = value as { employeeTier?: unknown; employeeCount?: unknown; revenueTier?: unknown };
  return [
    formatPanelValue(size.employeeTier),
    size.employeeCount ? `${formatPanelValue(size.employeeCount)} employees` : '',
    size.revenueTier ? `Revenue tier: ${formatPanelValue(size.revenueTier)}` : '',
  ].filter(Boolean).join('\n');
};

const CandidateProductPanel: React.FC<{ title: string; data: unknown }> = ({ title, data }) => {
  const items = Array.isArray(data) ? data : [];

  return (
    <section className={styles.structuredPanel}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <div className={styles.productCardList}>
          {items.map((item, index) => {
            const product: Record<string, unknown> = isRecord(item) ? item : { name: item };
            const name = formatPanelValue(product.name) || `Item ${index + 1}`;
            const category = formatPanelValue(product.category);
            const description = formatPanelValue(product.description);

            return (
              <article className={styles.productReviewCard} key={`${title}-${index}`}>
                <div className={styles.productReviewHead}>
                  <strong>{name}</strong>
                  {category && <span>{category}</span>}
                </div>
                {description && <p>{description}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const CandidateInfoPanel: React.FC<{ title: string; data: unknown; preferredOrder?: string[] }> = ({ title, data, preferredOrder }) => {
  const source = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;

  const entries = source
    ? [
        ...(preferredOrder ?? []).filter((key) => key in source).map((key) => [key, source[key]] as const),
        ...Object.entries(source).filter(([key]) => !(preferredOrder ?? []).includes(key)),
      ]
    : [['summary', data] as const];

  const visibleEntries = entries
    .map(([key, value]) => ({
      key,
      value: formatPanelValue(value),
      items: Array.isArray(value) ? value.map((item) => formatPanelValue(item)).filter(Boolean) : [],
    }))
    .filter((entry) => entry.value || entry.items.length > 0);

  return (
    <section className={styles.structuredPanel}>
      <h3>{title}</h3>
      {visibleEntries.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <dl className={styles.keyValueList}>
          {visibleEntries.map((entry) => (
            <div className={styles.keyValueRow} key={entry.key}>
              <dt>{entry.key === 'summary' ? title : formatInsightTitle(entry.key)}</dt>
              <dd>
                {entry.items.length > 0 ? (
                  <span className={styles.valueChipList}>
                    {entry.items.map((item, index) => (
                      <i key={`${entry.key}-${index}`}>{item}</i>
                    ))}
                  </span>
                ) : entry.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

const splitNarrativeSentences = (value: string) =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const businessModelSegments = [
  'B2C',
  'B2B',
  'B2G',
  'Infrastructure',
  'Construction',
  'IT',
  'Technical services',
  'Government',
  'Enterprise',
  'Integrated solutions',
  'Investment',
  'Operation',
];

const LongTextInsightCard: React.FC<{ title: string; value?: string; emptyText?: string }> = ({ title, value, emptyText = 'No data' }) => {
  const text = value?.trim();
  if (!text) {
    return (
      <article className={styles.longTextInsightCard}>
        <div className={styles.longTextInsightHead}>
          <span>{title}</span>
          <strong>{emptyText}</strong>
        </div>
      </article>
    );
  }

  const chips = businessModelSegments.filter((segment) => text.toLowerCase().includes(segment.toLowerCase()));
  const fallbackChips = splitNarrativeSentences(text)
    .flatMap((sentence) => sentence.split(/,|;|\band\b|\bas well as\b/i))
    .map((item) => item.trim().replace(/[.]+$/, ''))
    .filter((item) => item.length > 1 && item.length <= 42);
  const displayChips = chips.length > 0 ? chips : fallbackChips.slice(0, 12);

  return (
    <article className={styles.longTextInsightCard}>
      <div className={styles.longTextInsightHead}>
        <span>{title}</span>
        <strong>{displayChips.length} signal(s)</strong>
      </div>
      {displayChips.length > 0 ? (
        <div className={styles.longTextChipList}>
          {displayChips.map((chip) => <i key={chip}>{chip}</i>)}
        </div>
      ) : (
        <div className={styles.insightEmpty}>No readable signals</div>
      )}
    </article>
  );
};

const chipFieldKeys = new Set<StaffCandidateEditKey>(['industry', 'markets', 'targetCustomers', 'email', 'phone']);
const editableListFieldKeys = new Set<StaffCandidateEditKey>([
  'industry',
  'markets',
  'targetCustomers',
  'email',
  'phone',
  'strengths',
  'weaknesses',
  'opportunities',
  'threats',
]);
const swotFieldKeys = new Set<StaffCandidateEditKey>(['strengths', 'weaknesses', 'opportunities', 'weaknesses', 'threats']);
const urlFieldKeys = new Set<StaffCandidateEditKey>(['website']);
const listJoinValue = (items: string[]) => items.map((item) => item.trim()).filter(Boolean).join('\n');

const stripListMarker = (value: string) =>
  value
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\d+[\).\-\s]+/, '')
    .replace(/^["']|["']$/g, '')
    .trim();

const normalizeExtractedListValue = (value: unknown, splitCommas = false): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeExtractedListValue(item, splitCommas))
      .map(stripListMarker)
      .filter(Boolean);
  }
  if (typeof value === 'object') return [candidateField(value, '')].filter(Boolean);

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return normalizeExtractedListValue(parsed);
  } catch {
    // Continue with tolerant text parsing for AI output that is not strict JSON.
  }

  const withoutBrackets = raw
    .replace(/^\[\s*/, '')
    .replace(/\s*\]$/, '')
    .replace(/^["']|["']$/g, '');
  const lineItems = withoutBrackets
    .split(/\r?\n/)
    .map(stripListMarker)
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems;
  if (splitCommas && withoutBrackets.includes(',')) {
    return withoutBrackets.split(',').map(stripListMarker).filter(Boolean);
  }

  return lineItems;
};

const normalizeUrlItems = (value: unknown): string[] => {
  const text = normalizeExtractedListValue(value).join('\n') || String(value ?? '');
  const matches = text.match(/(?:https?:\/\/|www\.)[^\s,\]\["']+/gi);
  if (matches?.length) {
    return Array.from(new Set(matches.map((item) => item.replace(/[).;]+$/g, '').trim()).filter(Boolean)));
  }
  return normalizeExtractedListValue(value);
};

const normalizePhoneItems = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizePhoneItems(item))
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  if (typeof value === 'object') return [candidateField(value, '')].filter(Boolean);

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return normalizePhoneItems(parsed);
  } catch {
    // Keep tolerant parsing for phone values returned as plain text.
  }

  const withoutBrackets = raw
    .replace(/^\[\s*/, '')
    .replace(/\s*\]$/, '')
    .replace(/^["']|["']$/g, '');
  const lineItems = withoutBrackets
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems;
  if (withoutBrackets.includes(',')) {
    return withoutBrackets
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return lineItems;
};

const urlDomainLabel = (value: string) => {
  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    const url = new URL(normalized);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname !== '/' ? url.pathname.replace(/\/$/, '') : ''}`;
  } catch {
    return value;
  }
};

const fieldVariantClass = (key: StaffCandidateEditKey) => {
  if (key === 'strengths') return styles.extractedListStrengths;
  if (key === 'weaknesses') return styles.extractedListWeaknesses;
  if (key === 'opportunities') return styles.extractedListOpportunities;
  if (key === 'threats') return styles.extractedListThreats;
  return '';
};

const listEmptyText = (label: string) => `No ${label.toLowerCase()} were extracted`;

const EvidencePanel: React.FC<{ evidence?: StaffExtractionEvidence }> = ({ evidence }) => {
  const [open, setOpen] = useState(false);
  if (!evidence) return null;

  const score = evidenceScoreLabel(evidence.confidenceScore);
  const hasEvidence = Boolean(evidence.evidenceText?.trim());
  const messages = Array.isArray(evidence.validationMessages)
    ? evidence.validationMessages.join(', ')
    : evidence.validationMessages;
  const sources = evidence.sources?.length
    ? evidence.sources
    : evidence.sourceFileName
      ? [{
          fileName: evidence.sourceFileName,
          importJobId: evidence.sourceImportJobId,
          rawDocumentId: evidence.sourceRawDocumentId,
          extractionId: evidence.sourceExtractionId,
          confidenceScore: evidence.confidenceScore,
          evidenceText: evidence.evidenceText,
          pageNumber: evidence.pageNumber,
          validationStatus: evidence.validationStatus,
          validationMessages: evidence.validationMessages,
          reviewStatus: evidence.reviewStatus,
        }]
      : [];

  return (
    <div className={styles.itemEvidencePanel}>
      <button type="button" onClick={() => setOpen((current) => !current)}>
        <FileText size={14} />
        {open ? 'Hide evidence' : 'View evidence'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.itemEvidenceCard}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            {sources.length > 0 && (
              <div className={styles.itemEvidenceSources}>
                <span>Used source documents</span>
                {sources.map((source, index) => (
                  <article key={`${source.extractionId || source.importJobId || source.fileName}-${index}`}>
                    <strong>{source.fileName}</strong>
                    <footer>
                      {source.pageNumber ? <small>Page {source.pageNumber}</small> : <small>Page unavailable</small>}
                      {typeof source.confidenceScore === 'number' && <small>{source.confidenceScore}% confidence</small>}
                      {source.importJobId && <small>Import job #{source.importJobId}</small>}
                    </footer>
                    {source.evidenceText && <p>{source.evidenceText}</p>}
                  </article>
                ))}
              </div>
            )}
            <div>
              <span>Source evidence</span>
              <p>{hasEvidence ? evidence.evidenceText : 'No source quote returned for this field.'}</p>
            </div>
            <footer>
              <small>{evidence.pageNumber ? `Page ${evidence.pageNumber}` : 'Page unavailable'}</small>
              <small>Confidence: {score}</small>
            </footer>
            {messages && <strong>{messages}</strong>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExtractedListItem: React.FC<{
  item: string;
  index: number;
  evidence?: StaffExtractionEvidence;
  editable?: boolean;
  onEdit: (value: string) => void;
  onDelete: () => void;
}> = ({ item, index, evidence, editable = true, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(item);
  const isLong = item.length > 180;

  const save = () => {
    onEdit(draft.trim());
    setEditing(false);
  };

  return (
    <motion.article className={styles.extractedListItem} layout whileHover={{ y: -2 }}>
      <div className={styles.extractedListItemIndex}>{index + 1}</div>
      <div className={styles.extractedListItemBody}>
        {editing ? (
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
        ) : (
          <>
            <p className={expanded || !isLong ? '' : styles.extractedListItemClamp}>{item}</p>
            {isLong && (
              <button className={styles.inlineTextButton} type="button" onClick={() => setExpanded((current) => !current)}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
        <EvidencePanel evidence={evidence} />
      </div>
      {editable && (
        <div className={styles.extractedListItemActions}>
          <span className={styles.reviewStatusBadge}>{editing ? 'EDITED' : 'PENDING'}</span>
          {editing ? (
            <>
              <button type="button" onClick={save}><CheckCircle2 size={14} />Save</button>
              <button type="button" onClick={() => { setDraft(item); setEditing(false); }}><X size={14} />Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)}><Edit3 size={14} />Edit</button>
              <button type="button" onClick={onDelete}><Trash2 size={14} />Delete</button>
            </>
          )}
        </div>
      )}
    </motion.article>
  );
};

const ExtractedListField: React.FC<{
  label: string;
  fieldKey: StaffCandidateEditKey;
  value: string;
  evidence?: StaffExtractionEvidence;
  editable?: boolean;
  showMeta?: boolean;
  onChange: (value: string) => void;
}> = ({ label, fieldKey, value, evidence, editable = true, showMeta = false, onChange }) => {
  const items = fieldKey === 'phone'
    ? normalizePhoneItems(value)
    : normalizeExtractedListValue(value, !swotFieldKeys.has(fieldKey));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const replaceItem = (index: number, nextValue: string) => {
    const next = items.map((item, itemIndex) => itemIndex === index ? nextValue : item).filter(Boolean);
    onChange(listJoinValue(next));
  };
  const deleteItem = (index: number) => onChange(listJoinValue(items.filter((_, itemIndex) => itemIndex !== index)));
  const addItem = () => {
    const next = draft.trim();
    if (!next) return;
    onChange(listJoinValue([...items, next]));
    setDraft('');
    setAdding(false);
  };

  return (
    <div className={`${styles.extractedListField} ${fieldVariantClass(fieldKey)}`}>
      <div className={styles.extractedListFieldHead}>
        <div>
          <span>{label}</span>
          <strong>{items.length} extracted item(s)</strong>
        </div>
        {showMeta && <small>{evidenceScoreLabel(evidence?.confidenceScore)} confidence</small>}
      </div>
      {items.length === 0 ? (
        <div className={styles.extractedEmptyState}>
          <span>{listEmptyText(label)}</span>
          {editable && <button type="button" onClick={() => setAdding(true)}><Plus size={14} />Add manually</button>}
        </div>
      ) : (
        <div className={styles.extractedListItems}>
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <ExtractedListItem
                key={`${fieldKey}-${index}-${item.slice(0, 20)}`}
                item={item}
                index={index}
                evidence={evidence}
                editable={editable}
                onEdit={(nextValue) => replaceItem(index, nextValue)}
                onDelete={() => deleteItem(index)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      {editable && adding ? (
        <div className={styles.extractedAddRow}>
          <textarea value={draft} placeholder={`Add new ${label.toLowerCase()}`} onChange={(event) => setDraft(event.target.value)} />
          <button type="button" onClick={addItem}><CheckCircle2 size={14} />Save</button>
          <button type="button" onClick={() => { setDraft(''); setAdding(false); }}><X size={14} />Cancel</button>
        </div>
      ) : (
        editable && items.length > 0 && <button className={styles.extractedAddButton} type="button" onClick={() => setAdding(true)}><Plus size={14} />Add new {label.toLowerCase()}</button>
      )}
    </div>
  );
};

const WebsiteListField: React.FC<{
  label: string;
  value: string;
  evidence?: StaffExtractionEvidence;
  editable?: boolean;
  showMeta?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, evidence, editable = true, showMeta = false, onChange }) => {
  const items = normalizeUrlItems(value);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const editItem = (index: number) => {
    setEditingIndex(index);
    setDraft(items[index] || '');
  };
  const saveItem = () => {
    if (editingIndex === null) return;
    const next = items.map((item, index) => index === editingIndex ? draft.trim() : item).filter(Boolean);
    onChange(listJoinValue(next));
    setEditingIndex(null);
    setDraft('');
  };
  const deleteItem = (index: number) => onChange(listJoinValue(items.filter((_, itemIndex) => itemIndex !== index)));
  const addItem = () => {
    setEditingIndex(items.length);
    setDraft('');
  };

  return (
    <div className={styles.websiteListField}>
      <div className={styles.extractedListFieldHead}>
        <div>
          <span>{label}</span>
          <strong>{items.length} URL(s)</strong>
        </div>
        {showMeta && <small>{evidenceScoreLabel(evidence?.confidenceScore)} confidence</small>}
      </div>
      {items.length === 0 && editingIndex === null ? (
        <div className={styles.extractedEmptyState}>
          <span>No websites were extracted</span>
          {editable && <button type="button" onClick={addItem}><Plus size={14} />Add website manually</button>}
        </div>
      ) : (
        <div className={styles.websiteListItems}>
          {items.map((item, index) => {
            const href = item.startsWith('http') ? item : `https://${item}`;
            const isEditing = editingIndex === index;
            return (
              <motion.article className={styles.websiteListItem} key={`${item}-${index}`} layout whileHover={{ y: -2 }}>
                <Globe2 size={18} />
                <div>
                  {isEditing ? (
                    <input value={draft} onChange={(event) => setDraft(event.target.value)} />
                  ) : (
                    <>
                      <strong>{urlDomainLabel(item)}</strong>
                      <a href={href} target="_blank" rel="noreferrer">{item}</a>
                    </>
                  )}
                  <EvidencePanel evidence={evidence} />
                </div>
                <div className={styles.websiteActions}>
                  {isEditing ? (
                    <>
                      <button type="button" onClick={saveItem}><CheckCircle2 size={14} />Save</button>
                      <button type="button" onClick={() => setEditingIndex(null)}><X size={14} />Cancel</button>
                    </>
                  ) : (
                    <>
                      <a href={href} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open</a>
                      <button type="button" onClick={() => void navigator.clipboard?.writeText(item)}><Copy size={14} />Copy</button>
                      {editable && <button type="button" onClick={() => editItem(index)}><Edit3 size={14} />Edit</button>}
                      {editable && <button type="button" onClick={() => deleteItem(index)}><Trash2 size={14} />Delete</button>}
                    </>
                  )}
                </div>
              </motion.article>
            );
          })}
          {editable && editingIndex === items.length && (
            <article className={styles.websiteListItem}>
              <Globe2 size={18} />
              <div><input value={draft} placeholder="https://example.com" onChange={(event) => setDraft(event.target.value)} /></div>
              <div className={styles.websiteActions}>
                <button type="button" onClick={() => { onChange(listJoinValue([...items, draft.trim()].filter(Boolean))); setEditingIndex(null); setDraft(''); }}><CheckCircle2 size={14} />Save</button>
                <button type="button" onClick={() => setEditingIndex(null)}><X size={14} />Cancel</button>
              </div>
            </article>
          )}
        </div>
      )}
      {editable && editingIndex === null && <button className={styles.extractedAddButton} type="button" onClick={addItem}><Plus size={14} />Add website</button>}
    </div>
  );
};

const ParsedProductsPreview: React.FC<{ value: string }> = ({ value }) => {
  const parsed = parseProductsText(value);
  const items = Array.isArray(parsed) ? parsed as Array<{ name?: unknown; category?: unknown; description?: unknown }> : [];

  if (items.length === 0) {
    return <div className={styles.insightEmpty}>No products / services</div>;
  }

  return (
    <div className={styles.extractionProductGrid}>
      {items.map((product, index) => {
        const name = formatPanelValue(product.name) || `Item ${index + 1}`;
        const category = formatPanelValue(product.category);
        const description = formatPanelValue(product.description);

        return (
          <article className={styles.extractionProductCard} key={`${name}-${index}`}>
            <div className={styles.extractionProductHead}>
              <strong>{name}</strong>
              {category && <span>{category}</span>}
            </div>
            {description && <p>{description}</p>}
          </article>
        );
      })}
    </div>
  );
};

const ExtractionCurrentValue: React.FC<{
  field: { key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string };
  value: string;
  onChange: (value: string) => void;
}> = ({ field, value, onChange }) => {
  const trimmedValue = value.trim();

  if (urlFieldKeys.has(field.key)) {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <WebsiteListField label={field.label} value={value} onChange={onChange} />
      </div>
    );
  }

  if (editableListFieldKeys.has(field.key)) {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <ExtractedListField label={field.label} fieldKey={field.key} value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.key === 'businessModel') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <LongTextInsightCard title="Business model summary" value={value} />
        <details className={styles.rawValueEditor}>
          <summary>Edit raw text</summary>
          <textarea
            value={value}
            placeholder={field.placeholder}
            aria-label={`${field.label} current value`}
            onChange={(event) => onChange(event.target.value)}
          />
        </details>
      </div>
    );
  }

  if (field.key === 'products') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <EditableProductList value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.key === 'financial') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <MetricChartPanel title="Financial" value={value} tone="blue" />
        <details className={styles.rawValueEditor}>
          <summary>Edit financial values</summary>
          <textarea
            value={value}
            placeholder={field.placeholder}
            aria-label={`${field.label} current value`}
            onChange={(event) => onChange(event.target.value)}
          />
        </details>
      </div>
    );
  }

  if (field.key === 'innovation') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <MetricChartPanel title="Innovation" value={value} tone="green" />
        <EditableKeyValuePanel
          title="Innovation fields"
          value={value}
          placeholderLabel="Technology capability"
          placeholderValue="Describe technology, R&D, patents, or digital transformation signals"
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.key === 'risk') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <EditableKeyValuePanel
          title="Risk fields"
          value={value}
          placeholderLabel="Operational risk"
          placeholderValue="Describe the risk signal found in the document"
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.key === 'compliance') {
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <EditableKeyValuePanel
          title="Compliance fields"
          value={value}
          placeholderLabel="Certification"
          placeholderValue="Describe compliance, governance, certification, or regulation evidence"
          onChange={onChange}
        />
      </div>
    );
  }

  if (chipFieldKeys.has(field.key) && trimmedValue) {
    const items = splitComma(value);
    return (
      <div className={styles.extractionReadableValue}>
        <span>Current value</span>
        <div className={styles.currentValueChipBox}>
          {items.map((item, index) => <i key={`${field.key}-${index}`}>{item}</i>)}
        </div>
        <details className={styles.rawValueEditor}>
          <summary>Edit list</summary>
          <input
            value={value}
            placeholder={field.placeholder}
            aria-label={`${field.label} current value`}
            onChange={(event) => onChange(event.target.value)}
          />
        </details>
      </div>
    );
  }

  return (
    <label className={styles.extractionEditField}>
      <span>Current value</span>
      {field.multiline ? (
        <textarea
          value={value}
          placeholder={field.placeholder}
          aria-label={`${field.label} current value`}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          placeholder={field.placeholder}
          aria-label={`${field.label} current value`}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
};

const hasExtractedFieldValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return Boolean(trimmed && !/^no data$/i.test(trimmed) && !/^n\/a$/i.test(trimmed));
};

const groupStatusLabel = (score: number | null, visibleFieldCount: number) => {
  if (visibleFieldCount === 0) return 'No data';
  if (score === null) return 'Needs review';
  if (score >= 85) return 'High confidence';
  if (score >= 70) return 'Medium confidence';
  return 'Low confidence';
};

const AiExtractEmptyState: React.FC<{ group: StaffExtractionGroup }> = ({ group }) => {
  const Icon = group.icon;

  return (
    <div className={styles.aiExtractEmptyState}>
      <Icon size={20} />
      <strong>No information extracted</strong>
      <span>AI could not find {group.title.toLowerCase()} data in the selected document.</span>
    </div>
  );
};

const AiExtractCard: React.FC<{
  group: StaffExtractionGroup;
  field: { key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string };
  review: StaffExtractionReview;
  onChange: (key: StaffCandidateEditKey, value: string) => void;
  onAskAi?: (field: { key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string }, review: StaffExtractionReview) => void;
}> = ({ group, field, review, onChange, onAskAi }) => {
  const evidence = review.evidence[field.key];
  const score = evidence?.confidenceScore ?? null;
  const hasValue = hasExtractedFieldValue(review.edit[field.key]);
  const Icon = group.icon;

  return (
    <motion.article
      className={`${styles.aiExtractCard} ${styles[`aiExtractCard${formatInsightTitle(group.tone)}`] || ''}`}
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <header className={styles.aiExtractCardHeader}>
        <div className={styles.aiExtractCardTitleRow}>
          <span className={styles.aiExtractIcon}><Icon size={18} /></span>
          <div>
            <small>{group.eyebrow}</small>
            <h4>{field.label}</h4>
          </div>
        </div>
        <div className={styles.aiExtractCardActions}>
          <button
            className={styles.aiFieldAssistButton}
            type="button"
            onClick={() => onAskAi?.(field, review)}
            title={`Ask AI to research ${field.label}`}
          >
            <Sparkles size={14} /> AI
          </button>
          <span className={`${styles.aiExtractStatusBadge} ${styles[`aiExtractStatus${formatInsightTitle(confidenceTone(score))}`] || ''}`}>
            {score === null ? groupStatusLabel(score, hasValue ? 1 : 0) : `${score}%`}
          </span>
        </div>
      </header>

      <p className={styles.aiExtractCardDescription}>
        <strong>{group.title}</strong>
        {group.description}
      </p>

      <div className={styles.aiExtractCardContent}>
        <ExtractionCurrentValue
          field={field}
          value={review.edit[field.key]}
          onChange={(value) => onChange(field.key, value)}
        />
        <EvidencePanel evidence={evidence} />
        {!hasValue && !evidence && <AiExtractEmptyState group={group} />}
      </div>
    </motion.article>
  );
};

const StaffAiExtractResult: React.FC<{
  review: StaffExtractionReview;
  onChange: (key: StaffCandidateEditKey, value: string) => void;
  onAskAi?: (field: { key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string }, review: StaffExtractionReview) => void;
}> = ({ review, onChange, onAskAi }) => (
  <div className={styles.aiExtractResult}>
    <div className={styles.aiExtractSummary}>
      <div>
        <span>AI extract result</span>
        <strong>Field-by-field review workspace</strong>
      </div>
    </div>
    <div className={styles.aiExtractGrid}>
      {staffExtractionGroups.flatMap((group) =>
        group.fields
          .map((key) => staffReviewFieldByKey.get(key))
          .filter((field): field is NonNullable<typeof field> => Boolean(field))
          .map((field) => (
            <AiExtractCard
              key={`${review.id}-${group.id}-${field.key}`}
              group={group}
              field={field}
              review={review}
              onChange={onChange}
              onAskAi={onAskAi}
            />
          ))
      )}
    </div>
  </div>
);

const CandidateInsightField: React.FC<{ title: string; data: unknown }> = ({ title, data }) => {
  const items = toInsightItems(data);

  return (
    <section className={styles.signalPanel}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <div className={styles.signalCardList}>
          {items.map((item, index) => (
            <article className={styles.signalCard} key={`${title}-${index}`}>
              <b>{index + 1}</b>
              <p>{item}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const CandidatePeoplePanel: React.FC<{ title?: string; data: unknown }> = ({ title = 'Key people', data }) => {
  const people = toInsightItems(data);

  return (
    <section className={styles.peoplePanel}>
      <h3>{title}</h3>
      {people.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <div className={styles.peopleGrid}>
          {people.map((person, index) => {
            const roleMatch = person.match(/^(.*?)\s*\((.*?)\)\s*$/);
            const name = roleMatch ? roleMatch[1].trim() : person;
            const role = roleMatch ? roleMatch[2].trim() : '';

            return (
              <article className={styles.peopleCard} key={`${person}-${index}`}>
                <b>{name.slice(0, 1).toUpperCase()}</b>
                <div>
                  <strong>{name}</strong>
                  {role && <span>{role}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const CandidateAdvancedPreview: React.FC<{ candidate: CandidateResponse }> = ({ candidate }) => {
  const business = candidate.business as {
    industries?: unknown;
    businessModel?: string;
    products?: unknown;
    markets?: unknown;
    targetCustomers?: unknown;
  } | undefined;
  const identity = candidate.identity as { legalName?: unknown; taxCode?: unknown; taxId?: unknown } | undefined;
  const companySize = candidate.companySize as { employeeTier?: unknown; employeeCount?: unknown; revenueTier?: unknown } | undefined;
  const contact = candidate.contact as { website?: unknown; emails?: unknown; phones?: unknown; addresses?: unknown } | undefined;
  const insights = candidate.insights as Record<string, unknown> | undefined;
  const candidateExtra = candidate as CandidateResponse & { keyPeople?: unknown };

  return (
    <div className={styles.candidateInsightGrid}>
      <CandidateInfoPanel title="Identity" data={{ legalName: identity?.legalName, taxCode: identity?.taxCode ?? identity?.taxId }} />
      <CandidateInfoPanel title="Business scope" data={{ industries: business?.industries, markets: business?.markets, targetCustomers: business?.targetCustomers }} />
      <LongTextInsightCard title="Business model" value={formatPanelValue(business?.businessModel)} />
      <CandidateProductPanel title="Products" data={business?.products} />
      <CandidateInfoPanel title="Company facts" data={{
        employeeTier: companySize?.employeeTier,
        companySize: formatCompanySizeValue(companySize),
        website: contact?.website,
        email: contact?.emails,
        phone: contact?.phones,
        address: formatAddressValue(contact?.addresses),
      }} />
      <CandidatePeoplePanel data={candidateExtra.keyPeople} />
      <CandidateInsightField title="Strengths" data={insights?.strengths} />
      <CandidateInsightField title="Opportunities" data={insights?.opportunities} />
      <CandidateInsightField title="Weaknesses" data={insights?.weaknesses} />
      <CandidateInsightField title="Threats" data={insights?.threats} />
      <MetricChartPanel title="Financial" value={objectToText(candidate.financial, Object.values(financialKeyMap))} tone="blue" />
      <div className={styles.visualEditorStack}>
        <MetricChartPanel title="Innovation" value={objectToText(candidate.innovation, Object.values(innovationKeyMap))} tone="green" />
        <CandidateInfoPanel title="Innovation details" data={innovationDetailData(candidate.innovation)} />
      </div>
    </div>
  );
};

const candidateTaxId = (candidate: CandidateResponse) => {
  const identity = candidate.identity as { taxCode?: string; taxId?: string; registrationNumber?: string } | undefined;
  return identity?.taxCode || identity?.taxId || identity?.registrationNumber || 'No tax ID';
};

const isCandidateIncomplete = (candidate: CandidateResponse) => {
  const validation = candidate.validation as { isComplete?: boolean; missingCriticalFields?: string[] | string } | undefined;
  return validation?.isComplete === false || Boolean(validation?.missingCriticalFields);
};

const statusToColumn: Record<ApiTaskStatus, TaskStatus> = {
  TODO: 'todo',
  IN_PROGRESS: 'progress',
  IN_REVIEW: 'review',
  DONE: 'done',
  BLOCKED: 'todo',
  CANCELLED: 'done',
};

const priorityToCard: Record<ApiTaskPriority, TaskPriority> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const toInputDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const Avatar: React.FC<{ name: string; initials: string; color: string; small?: boolean }> = ({ name, initials, color, small }) => (
  <span className={small ? styles.smallAvatar : styles.avatar} title={name} style={{ background: color }}>
    {initials}
  </span>
);

const makeTaskMember = (member?: ProjectMemberResponse | null) => {
  const fallback = members[2];
  if (!member) return fallback;
  return {
    id: member.accountId,
    name: memberDisplayName(member),
    role: memberRoleLabel(member),
    avatar: memberInitials(member),
    color: member.memberRole === 'MANAGER' ? '#2563EB' : '#22C55E',
    workload: 0,
  };
};

const mapApiTaskToCard = (task: ProjectTaskResponse, projectMembers: ProjectMemberResponse[]): ProjectTask => {
  const assignedMember = projectMembers.find((member) => member.accountId === task.assignedToUserId);
  const fallbackMember = assignedMember
    ? makeTaskMember(assignedMember)
    : {
        ...members[2],
        id: task.assignedToUserId ?? task.id,
        name: task.assignedToName || 'Unassigned',
        avatar: (task.assignedToName || 'UN').slice(0, 2).toUpperCase(),
      };

  return {
    id: `APMS-${task.id}`,
    title: task.title,
    description: task.description || 'No description provided.',
    status: statusToColumn[task.status] ?? 'todo',
    priority: priorityToCard[task.priority ?? 'MEDIUM'],
    assignee: fallbackMember,
    reporter: members[0],
    dueDate: task.dueDate || task.createdAt || new Date().toISOString(),
    labels: [task.taskType?.replace(/_/g, ' ') || 'GENERAL TASK'],
    attachments: [],
    comments: [],
    activity: [
      { id: task.id, actor: task.assignedToName || 'APMS', action: `created task with status ${task.status}`, time: formatOptionalDate(task.createdAt) },
    ],
    aiGenerated: false,
    aiSummary: 'This task was loaded from the project task API.',
    aiSuggestions: ['Use the task detail modal for future workflow details.'],
    aiRiskAnalysis: task.status === 'BLOCKED' ? 'Task is currently blocked.' : 'No risk analysis available yet.',
    aiNextSteps: ['Update task status as work progresses.'],
  };
};

const TaskCard: React.FC<{
  task: ProjectTask;
  onOpen: (task: ProjectTask) => void;
  onDelete?: (task: ProjectTask) => void;
  deleting?: boolean;
}> = ({
  task,
  onOpen,
  onDelete,
  deleting = false,
}) => (
  <motion.article
    layout
    className={`${styles.taskCard} ${task.status === 'done' ? styles.taskCardDone : ''}`}
    onClick={() => onOpen(task)}
    whileHover={{ y: -3 }}
    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
  >
    <div className={styles.taskTop}>
      <span className={styles.taskKey}>{task.id}</span>
      <div className={styles.taskCardActions}>
        {task.aiGenerated && (
          <span className={styles.aiDot} title="AI generated task">
            <Bot size={15} />
          </span>
        )}
        {onDelete && (
          <button
            className={styles.taskDeleteButton}
            type="button"
            title="Delete task"
            aria-label={`Delete ${task.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task);
            }}
            disabled={deleting}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
    <h4 className={styles.taskTitle}>{task.title}</h4>
    <div className={styles.labels}>
      <span className={`${styles.priority} ${priorityClass[task.priority]}`}>{task.priority}</span>
      {task.labels.map((label) => (
        <span className={styles.label} key={label}>{label}</span>
      ))}
    </div>
    <div className={styles.taskFooter}>
      <Avatar small name={task.assignee.name} initials={task.assignee.avatar} color={task.assignee.color} />
      <div className={styles.taskStats}>
        <span title="Due date"><CalendarDays size={14} />{formatDate(task.dueDate)}</span>
        <span title="Attachments"><Paperclip size={14} />{task.attachments.length}</span>
        <span title="Comments"><MessageSquare size={14} />{task.comments.length}</span>
      </div>
    </div>
  </motion.article>
);

const TaskDetailModal: React.FC<{ task: ProjectTask | null; onClose: () => void }> = ({ task, onClose }) => (
  <AnimatePresence>
    {task && (
      <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.aside
          className={styles.drawer}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.drawerHeader}>
            <div>
              <span className={styles.taskKey}>{task.id}</span>
              <h2>{task.title}</h2>
            </div>
            <button className={styles.iconButton} type="button" aria-label="Close task detail modal" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <section className={styles.drawerSection}>
            <h3><FileText size={16} /> Basic Information</h3>
            <p className={styles.description}>{task.description}</p>
            <div className={styles.infoGrid}>
              <div><span>Status</span><strong>{columns.find((column) => column.id === task.status)?.title}</strong></div>
              <div><span>Priority</span><strong>{task.priority}</strong></div>
              <div><span>Assignee</span><strong>{task.assignee.name}</strong></div>
              <div><span>Reporter</span><strong>{task.reporter.name}</strong></div>
              <div><span>Due date</span><strong>{formatDate(task.dueDate)}</strong></div>
              <div><span>Labels</span><strong>{task.labels.join(', ')}</strong></div>
            </div>
          </section>

          <section className={styles.drawerSection}>
            <h3><Activity size={16} /> Activity History</h3>
            <ul className={styles.historyList}>
              {task.activity.map((item) => (
                <li key={item.id}><strong>{item.actor}</strong> {item.action} <span>{item.time}</span></li>
              ))}
            </ul>
          </section>
        </motion.aside>
      </motion.div>
    )}
  </AnimatePresence>
);

interface ProjectDetailPageProps {
  setActivePage?: (page: string) => void;
}

interface StaffCandidateEditForm {
  legalName: string;
  tradeName: string;
  taxId: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  businessModel: string;
  products: string;
  markets: string;
  targetCustomers: string;
  employeeTier: string;
  companySize: string;
  keyPeople: string;
  financial: string;
  market: string;
  innovation: string;
  risk: string;
  compliance: string;
  validation: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
}

type StaffCandidateEditKey = keyof StaffCandidateEditForm;

interface StaffExtractionEvidence {
  fieldName: string;
  extractedValue?: string;
  confidenceScore?: number | null;
  evidenceText?: string | null;
  pageNumber?: number | null;
  validationStatus?: string | null;
  validationMessages?: string | string[] | null;
  reviewStatus?: string | null;
  sourceFileName?: string | null;
  sourceImportJobId?: number | null;
  sourceRawDocumentId?: string | null;
  sourceExtractionId?: string | null;
  sources?: StaffExtractionEvidenceSource[];
}

interface StaffExtractionEvidenceSource {
  fileName: string;
  importJobId?: number | null;
  rawDocumentId?: string | null;
  extractionId?: string | null;
  confidenceScore?: number | null;
  evidenceText?: string | null;
  pageNumber?: number | null;
  validationStatus?: string | null;
  validationMessages?: string | string[] | null;
  reviewStatus?: string | null;
}

interface StaffExtractionReview {
  id: string;
  importJobId?: number;
  rawDocumentId?: string;
  fileName: string;
  qualityStatus?: string | null;
  evidenceCoverageRate?: number | null;
  evidence: Partial<Record<StaffCandidateEditKey, StaffExtractionEvidence>>;
  edit: StaffCandidateEditForm;
}

interface FieldAiSourceReference {
  documentId: string;
  documentTitle: string;
  snippet: string;
  relevanceScore: number;
}

interface FieldAiAssistState {
  fieldKey: StaffCandidateEditKey;
  fieldLabel: string;
  companyName: string;
  currentValue: string;
  prompt: string;
  answer?: string;
  sessionId?: string;
  sources?: FieldAiSourceReference[];
  suggestedActions?: string[];
}

interface FieldAiChatResponse {
  sessionId?: string;
  answer?: string;
  sources?: FieldAiSourceReference[];
  suggestedActions?: string[];
}

const staffReviewFields: Array<{ key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string }> = [
  { key: 'legalName', label: 'Legal name' },
  { key: 'taxId', label: 'Tax code' },
  { key: 'industry', label: 'Industries' },
  { key: 'businessModel', label: 'Business model' },
  { key: 'products', label: 'Products / services', multiline: true, placeholder: 'One item per line: Name | Category | Description' },
  { key: 'markets', label: 'Markets' },
  { key: 'targetCustomers', label: 'Target customers' },
  { key: 'employeeTier', label: 'Employee tier' },
  { key: 'website', label: 'Website' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Hotline' },
  { key: 'address', label: 'Address', multiline: true },
  { key: 'companySize', label: 'Company size' },
  { key: 'financial', label: 'Financial', multiline: true, placeholder: 'Revenue: ...\nProfit margin: ...\nFinancial stability: ...' },
  { key: 'innovation', label: 'Innovation', multiline: true, placeholder: 'Technology capability: ...\nR&D investment percent: ...' },
  { key: 'risk', label: 'Risk', multiline: true, placeholder: 'Financial risk: ...\nOperational risk: ...\nOverall risk level: ...' },
  { key: 'compliance', label: 'Compliance', multiline: true, placeholder: 'Legal compliance: ...\nCertifications: ...\nGovernance: ...' },
  { key: 'strengths', label: 'Strengths', multiline: true, placeholder: 'One item per line' },
  { key: 'opportunities', label: 'Opportunities', multiline: true, placeholder: 'One item per line' },
  { key: 'weaknesses', label: 'Weaknesses', multiline: true, placeholder: 'One item per line' },
  { key: 'threats', label: 'Threats', multiline: true, placeholder: 'One item per line' },
];

type StaffExtractionGroupTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

interface StaffExtractionGroup {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  tone: StaffExtractionGroupTone;
  fields: StaffCandidateEditKey[];
}

const staffExtractionGroups: StaffExtractionGroup[] = [
  {
    id: 'company-overview',
    title: 'Company Overview',
    eyebrow: 'Identity',
    description: 'Legal identity and contact data extracted from the document.',
    icon: Building2,
    tone: 'blue',
    fields: ['legalName', 'taxId', 'website', 'email', 'phone', 'address'],
  },
  {
    id: 'business-information',
    title: 'Business Information',
    eyebrow: 'Business',
    description: 'What the company does, sells, and who it serves.',
    icon: Target,
    tone: 'blue',
    fields: ['industry', 'businessModel', 'products', 'markets', 'targetCustomers', 'employeeTier', 'companySize'],
  },
  {
    id: 'financial',
    title: 'Financial',
    eyebrow: 'Numbers',
    description: 'Revenue, profit, growth, funding, and financial stability signals.',
    icon: DollarSign,
    tone: 'green',
    fields: ['financial'],
  },
  {
    id: 'innovation',
    title: 'Innovation',
    eyebrow: 'Capability',
    description: 'Technology, R&D, patents, products, and transformation signals.',
    icon: Lightbulb,
    tone: 'green',
    fields: ['innovation'],
  },
  {
    id: 'strengths',
    title: 'Strengths',
    eyebrow: 'SWOT',
    description: 'Positive signals extracted for business review.',
    icon: TrendingUp,
    tone: 'green',
    fields: ['strengths'],
  },
  {
    id: 'weaknesses',
    title: 'Weaknesses',
    eyebrow: 'SWOT',
    description: 'Internal limitations or weak signals found by AI.',
    icon: AlertTriangle,
    tone: 'amber',
    fields: ['weaknesses'],
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    eyebrow: 'SWOT',
    description: 'Potential growth or partnership opportunities.',
    icon: Sparkles,
    tone: 'blue',
    fields: ['opportunities'],
  },
  {
    id: 'risk',
    title: 'Risk',
    eyebrow: 'Risk',
    description: 'Operational, legal, financial, market, and reputation risks.',
    icon: AlertTriangle,
    tone: 'red',
    fields: ['risk', 'threats'],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    eyebrow: 'Governance',
    description: 'Legal, tax, certification, governance, and regulatory signals.',
    icon: ShieldCheck,
    tone: 'slate',
    fields: ['compliance'],
  },
];

const staffReviewFieldByKey = new Map(staffReviewFields.map((field) => [field.key, field]));

const extractionEvidenceAliases: Record<StaffCandidateEditKey, string[]> = {
  legalName: ['legalName', 'identity.legalName'],
  tradeName: ['tradeName', 'identity.tradeName'],
  taxId: ['taxCode', 'taxId', 'identity.taxCode', 'identity.taxId'],
  website: ['website', 'contact.website'],
  email: ['email', 'emails', 'contact.email', 'contact.emails'],
  phone: ['phone', 'phones', 'contact.phone', 'contact.phones'],
  address: ['address', 'contact.address', 'contact.addresses'],
  industry: ['industries', 'industry', 'business.industries', 'business.industry'],
  businessModel: ['businessModel', 'business.businessModel'],
  products: ['products', 'productsServices', 'services', 'business.products', 'business.services'],
  markets: ['markets', 'targetMarkets', 'business.markets'],
  targetCustomers: ['targetCustomers', 'business.targetCustomers'],
  employeeTier: ['employeeTier', 'companySize.employeeTier'],
  companySize: ['companySize', 'companySize.employeeTier'],
  keyPeople: ['keyPeople'],
  financial: ['financial'],
  market: ['market'],
  innovation: ['innovation'],
  risk: ['risk'],
  compliance: ['compliance'],
  validation: ['validation'],
  strengths: ['strengths', 'insights.strengths'],
  weaknesses: ['weaknesses', 'insights.weaknesses'],
  opportunities: ['opportunities', 'insights.opportunities'],
  threats: ['threats', 'insights.threats'],
};

const emptyStaffCandidateEdit: StaffCandidateEditForm = {
  legalName: '',
  tradeName: '',
  taxId: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  industry: '',
  businessModel: '',
  products: '',
  markets: '',
  targetCustomers: '',
  employeeTier: '',
  companySize: '',
  keyPeople: '',
  financial: '',
  market: '',
  innovation: '',
  risk: '',
  compliance: '',
  validation: '',
  strengths: '',
  weaknesses: '',
  opportunities: '',
  threats: '',
};

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const EditableInsightList: React.FC<{
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ title, value, placeholder, onChange }) => {
  const items = splitLines(value);
  const rows = items.length ? items : [''];

  const updateItem = (index: number, nextValue: string) => {
    const next = [...rows];
    next[index] = nextValue;
    onChange(next.map((item) => item.trim()).filter(Boolean).join('\n'));
  };

  const removeItem = (index: number) => {
    const next = rows.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.map((item) => item.trim()).filter(Boolean).join('\n'));
  };

  const addItem = () => {
    onChange([...items, ''].join('\n'));
  };

  return (
    <article className={styles.insightEditorCard}>
      <div className={styles.insightEditorHead}>
        <div>
          <span>{title}</span>
          <strong>{items.length} item(s)</strong>
        </div>
        <button className={styles.iconButton} type="button" aria-label={`Add ${title}`} onClick={addItem}>
          <Plus size={16} />
        </button>
      </div>
      <div className={styles.insightEditorList}>
        {rows.map((item, index) => (
          <div className={styles.insightEditorItem} key={`${title}-${index}`}>
            <b>{index + 1}</b>
            <textarea
              value={item}
              placeholder={index === 0 ? placeholder : 'Add another clear evidence-backed point'}
              onChange={(event) => updateItem(index, event.target.value)}
              rows={Math.min(5, Math.max(2, Math.ceil((item.length || 80) / 90)))}
            />
            <button
              className={styles.insightRemoveButton}
              type="button"
              aria-label={`Remove ${title} item ${index + 1}`}
              onClick={() => removeItem(index)}
              disabled={items.length === 0}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};

const productRowsFromText = (value: string) => {
  const rows = splitLines(value).map((line) => {
    const [name = '', category = '', ...descriptionParts] = line.split('|').map((part) => part.trim());
    return { name, category, description: descriptionParts.join(' | ') };
  });
  return rows.length ? rows : [{ name: '', category: '', description: '' }];
};

const productRowsToText = (rows: Array<{ name: string; category: string; description: string }>) =>
  rows
    .map((row) => [row.name, row.category, row.description].map((part) => part.trim()).filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n');

const EditableProductList: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const rows = productRowsFromText(value);
  const filledCount = rows.filter((row) => row.name.trim()).length;

  const updateRow = (index: number, patch: Partial<{ name: string; category: string; description: string }>) => {
    const next = rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    onChange(productRowsToText(next));
  };

  const addRow = () => {
    onChange(productRowsToText([...rows, { name: '', category: '', description: '' }]));
  };

  const removeRow = (index: number) => {
    onChange(productRowsToText(rows.filter((_, rowIndex) => rowIndex !== index)));
  };

  return (
    <article className={styles.structuredEditorPanel}>
      <div className={styles.structuredEditorHead}>
        <div>
          <span>Products / services</span>
          <strong>{filledCount} item(s)</strong>
        </div>
        <button className={styles.iconButton} type="button" aria-label="Add product or service" onClick={addRow}>
          <Plus size={16} />
        </button>
      </div>
      <div className={styles.productEditorList}>
        {rows.map((row, index) => (
          <div className={styles.productEditorCard} key={`product-editor-${index}`}>
            <div className={styles.productEditorCardHead}>
              <b>{index + 1}</b>
              <button
                className={styles.insightRemoveButton}
                type="button"
                aria-label={`Remove product or service ${index + 1}`}
                onClick={() => removeRow(index)}
                disabled={filledCount === 0}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <label>
              <span>Name</span>
              <input value={row.name} placeholder="Exynos 2600" onChange={(event) => updateRow(index, { name: event.target.value })} />
            </label>
            <label>
              <span>Category</span>
              <input value={row.category} placeholder="System LSI Semiconductor" onChange={(event) => updateRow(index, { category: event.target.value })} />
            </label>
            <label>
              <span>Description</span>
              <textarea value={row.description} placeholder="Short description from AI evidence" onChange={(event) => updateRow(index, { description: event.target.value })} />
            </label>
          </div>
        ))}
      </div>
    </article>
  );
};

const EditableTagList: React.FC<{
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ title, value, placeholder, onChange }) => {
  const rows = splitComma(value);
  const editableRows = rows.length ? rows : [''];

  const updateRow = (index: number, nextValue: string) => {
    const next = editableRows.map((row, rowIndex) => rowIndex === index ? nextValue : row);
    onChange(next.map((item) => item.trim()).filter(Boolean).join(', '));
  };

  const addRow = () => {
    onChange([...rows, ''].join(', '));
  };

  const removeRow = (index: number) => {
    onChange(editableRows.filter((_, rowIndex) => rowIndex !== index).map((item) => item.trim()).filter(Boolean).join(', '));
  };

  return (
    <article className={styles.structuredEditorPanel}>
      <div className={styles.structuredEditorHead}>
        <div>
          <span>{title}</span>
          <strong>{rows.length} item(s)</strong>
        </div>
        <button className={styles.iconButton} type="button" aria-label={`Add ${title}`} onClick={addRow}>
          <Plus size={16} />
        </button>
      </div>
      <div className={styles.tagEditorList}>
        {editableRows.map((item, index) => (
          <div className={styles.tagEditorItem} key={`${title}-${index}`}>
            <input value={item} placeholder={index === 0 ? placeholder : 'Add another item'} onChange={(event) => updateRow(index, event.target.value)} />
            <button
              className={styles.insightRemoveButton}
              type="button"
              aria-label={`Remove ${title} item ${index + 1}`}
              onClick={() => removeRow(index)}
              disabled={rows.length === 0}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};

const keyValueRowsFromText = (value: string) => {
  const rows = splitLines(value).map((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) return { label: line, value: '' };
    return {
      label: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    };
  });
  return rows.length ? rows : [{ label: '', value: '' }];
};

const keyValueRowsToText = (rows: Array<{ label: string; value: string }>) =>
  rows
    .map((row) => {
      const label = row.label.trim();
      const value = row.value.trim();
      if (!label && !value) return '';
      return `${label || 'Field'}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');

const metricPercentLabels = ['percent', 'percentage', 'rate', 'ratio', 'margin', 'growth', 'share'];
const metricAllowedLabels = [
  'revenue',
  'revenue growth',
  'debt ratio',
  'profit margin',
  'market share',
  'brand rank',
  'client count',
  'patents',
  'rd investment percent',
  'r&d investment percent',
  'tech maturity level',
  'product innovation rate',
  'data quality score',
];

const compactMetricNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const currencySymbols: Record<string, string> = {
  KRW: 'KRW ',
  USD: '$',
  EUR: 'EUR ',
  GBP: 'GBP ',
  JPY: 'JPY ',
  VND: 'VND ',
  CNY: 'CNY ',
};

const formatMoneyMetric = (value: number, currency?: string) => {
  const normalizedCurrency = currency?.trim().toUpperCase();
  const compactValue = compactMetricNumber(value);
  if (!normalizedCurrency) return compactValue;

  const symbol = currencySymbols[normalizedCurrency];
  if (symbol) return `${symbol}${compactValue}`;
  return `${compactValue} ${normalizedCurrency}`;
};

const metricDisplayValue = (label: string, rawValue: string, normalizedValue: number, isPercent: boolean, currency?: string) => {
  const lowerLabel = label.toLowerCase().trim();
  if (isPercent) return `${Number(normalizedValue.toFixed(2))}%`;
  if (lowerLabel === 'revenue') return formatMoneyMetric(normalizedValue, currency);
  return rawValue.trim();
};

const parseMetricNumber = (label: string, value: string, currency?: string) => {
  const lowerLabel = label.toLowerCase().trim();
  const isAllowedMetric = metricAllowedLabels.some((metricLabel) => lowerLabel === metricLabel);
  const looksNumeric = /^[-+]?[\d\s,.$%]+(?:\.\d+)?\s*[a-zA-Z%]*$/.test(value.trim());
  if (!isAllowedMetric && !looksNumeric) return null;

  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const numericValue = Number(match[0]);
  if (!Number.isFinite(numericValue)) return null;

  const lowerValue = value.toLowerCase();
  const isPercent = lowerValue.includes('%') || metricPercentLabels.some((keyword) => lowerLabel.includes(keyword));
  const normalizedValue = isPercent && Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue;

  return {
    label: label.trim() || 'Metric',
    rawValue: value.trim(),
    displayValue: metricDisplayValue(label, value, normalizedValue, isPercent, currency),
    value: normalizedValue,
    isPercent,
  };
};

const MetricChartPanel: React.FC<{
  title: string;
  value: string;
  tone: 'blue' | 'green';
}> = ({ title, value, tone }) => {
  const rows = keyValueRowsFromText(value);
  const currency = rows.find((row) => row.label.trim().toLowerCase() === 'revenue currency')?.value.trim();
  const metrics = rows
    .map((row) => parseMetricNumber(row.label, row.value, currency))
    .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric));

  const nonPercentMax = Math.max(1, ...metrics.filter((metric) => !metric.isPercent).map((metric) => Math.abs(metric.value)));

  return (
    <div className={`${styles.metricChartPanel} ${styles[`metricChart${formatInsightTitle(tone)}`] || ''}`}>
      <div className={styles.metricChartHead}>
        <span>{title} chart</span>
        <strong>{metrics.length} numeric metric(s)</strong>
      </div>
      {metrics.length === 0 ? (
        <div className={styles.metricChartEmpty}>No numeric values to visualize</div>
      ) : (
        <div className={styles.metricSummaryLayout}>
          <div className={styles.metricVisualGrid}>
            {metrics.slice(0, 6).map((metric, index) => {
              const chartPercent = metric.isPercent
                ? Math.max(0, Math.min(100, Math.abs(metric.value)))
                : Math.max(3, Math.min(100, (Math.abs(metric.value) / nonPercentMax) * 100));
              const displayPercent = metric.isPercent ? `${Math.round(chartPercent)}%` : `${Math.round(chartPercent)}%`;

              return (
                <div className={styles.metricPrimaryCard} key={`${title}-${metric.label}-${index}`}>
                  <div className={styles.metricDonut} style={{ '--metric-value': `${chartPercent}%` } as React.CSSProperties}>
                    <strong>{displayPercent}</strong>
                  </div>
                  <div className={styles.metricPrimaryText}>
                    <span>{metric.label}</span>
                    <strong>{metric.displayValue}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {metrics.length > 6 && (
            <div className={styles.metricKpiList}>
              {metrics.slice(6).map((metric, index) => (
                <div className={styles.metricKpiItem} key={`${title}-${metric.label}-extra-${index}`}>
                  <span>{metric.label}</span>
                  <strong>{metric.displayValue}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EditableKeyValuePanel: React.FC<{
  title: string;
  value: string;
  placeholderLabel: string;
  placeholderValue: string;
  onChange: (value: string) => void;
}> = ({ title, value, placeholderLabel, placeholderValue, onChange }) => {
  const rows = keyValueRowsFromText(value);
  const filledCount = rows.filter((row) => row.label.trim() || row.value.trim()).length;

  const updateRow = (index: number, patch: Partial<{ label: string; value: string }>) => {
    const next = rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    onChange(keyValueRowsToText(next));
  };

  const addRow = () => {
    onChange(keyValueRowsToText([...rows, { label: '', value: '' }]));
  };

  const removeRow = (index: number) => {
    onChange(keyValueRowsToText(rows.filter((_, rowIndex) => rowIndex !== index)));
  };

  return (
    <article className={styles.structuredEditorPanel}>
      <div className={styles.structuredEditorHead}>
        <div>
          <span>{title}</span>
          <strong>{filledCount} field(s)</strong>
        </div>
        <button className={styles.iconButton} type="button" aria-label={`Add ${title} field`} onClick={addRow}>
          <Plus size={16} />
        </button>
      </div>
      <div className={styles.keyValueEditorList}>
        {rows.map((row, index) => (
          <div className={styles.keyValueEditorRow} key={`${title}-${index}`}>
            <input value={row.label} placeholder={index === 0 ? placeholderLabel : 'Field name'} onChange={(event) => updateRow(index, { label: event.target.value })} />
            <textarea value={row.value} placeholder={index === 0 ? placeholderValue : 'Value'} onChange={(event) => updateRow(index, { value: event.target.value })} />
            <button
              className={styles.insightRemoveButton}
              type="button"
              aria-label={`Remove ${title} field ${index + 1}`}
              onClick={() => removeRow(index)}
              disabled={filledCount === 0}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};

const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const jsonText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  return JSON.stringify(value, null, 2);
};

const parseJsonField = (label: string, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
};

const formatTextValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map((item) => candidateField(item)).filter(Boolean).join(', ');
  if (typeof value === 'object') return candidateField(value);
  return String(value);
};

const objectToText = (value: unknown, order: string[] = []) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const source = value as Record<string, unknown>;
  const entries = [
    ...order.filter((key) => key in source).map((key) => [key, source[key]] as const),
    ...Object.entries(source).filter(([key]) => !order.includes(key)),
  ];
  return entries
    .map(([key, item]) => {
      const formatted = formatTextValue(item);
      return formatted ? `${formatInsightTitle(key)}: ${formatted}` : null;
    })
    .filter(Boolean)
    .join('\n');
};

const productsToText = (value: unknown) => {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return candidateField(item, '');
      const product = item as { name?: unknown; category?: unknown; description?: unknown };
      return [product.name, product.category, product.description]
        .map((part) => formatTextValue(part))
        .filter(Boolean)
        .join(' | ');
    })
    .filter(Boolean)
    .join('\n');
};

const parseHumanValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || /^none$/i.test(trimmed) || /^n\/a$/i.test(trimmed)) return null;
  if (/^(yes|true)$/i.test(trimmed)) return true;
  if (/^(no|false)$/i.test(trimmed)) return false;
  return trimmed;
};

const parseTextObject = (
  label: string,
  value: string,
  keyMap: Record<string, string>,
  listKeys: string[] = []
) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return parseJsonField(label, trimmed);

  const result: Record<string, unknown> = {};
  splitLines(trimmed).forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) return;
    const rawKey = line.slice(0, separatorIndex).trim().toLowerCase();
    const key = keyMap[rawKey] || rawKey.replace(/\s+([a-z])/g, (_, char: string) => char.toUpperCase());
    const rawValue = line.slice(separatorIndex + 1).trim();
    result[key] = listKeys.includes(key)
      ? splitComma(rawValue)
      : parseHumanValue(rawValue);
  });

  return Object.keys(result).length ? result : null;
};

const parseProductsText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) return parseJsonField('Products / services', trimmed);

  return splitLines(trimmed).map((line) => {
    const [name, category, ...descriptionParts] = line.split('|').map((part) => part.trim());
    return {
      name: name || null,
      category: category || null,
      description: descriptionParts.join(' | ') || null,
    };
  }).filter((item) => item.name);
};

const financialKeyMap: Record<string, string> = {
  revenue: 'revenue',
  'revenue currency': 'revenueCurrency',
  'revenue growth': 'revenueGrowth',
  'debt ratio': 'debtRatio',
  'profit margin': 'profitMargin',
  'funding stage': 'fundingStage',
  profitability: 'profitability',
};

const marketKeyMap: Record<string, string> = {
  'market share': 'marketShare',
  'brand rank': 'brandRank',
  'client count': 'clientCount',
  'main markets': 'mainMarkets',
};

const innovationKeyMap: Record<string, string> = {
  patents: 'patents',
  'rd investment percent': 'rdInvestmentPercent',
  'r&d investment percent': 'rdInvestmentPercent',
  'tech stack': 'techStack',
  'tech maturity level': 'techMaturityLevel',
  'product innovation rate': 'productInnovationRate',
  'technology capabilities': 'technologyCapabilities',
};

const innovationMetricKeys = new Set(['patents', 'rdInvestmentPercent', 'techMaturityLevel', 'productInnovationRate']);

const innovationDetailData = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => !innovationMetricKeys.has(key) && formatTextValue(item));
  return entries.length ? Object.fromEntries(entries) : null;
};

const riskKeyMap: Record<string, string> = {
  'legal risk': 'legalRisk',
  'financial risk': 'financialRisk',
  'reputation risk': 'reputationRisk',
  'security risk': 'securityRisk',
  'conflict of interest risk': 'conflictOfInterestRisk',
  'supply interruption risk': 'supplyInterruptionRisk',
  'dependency risk': 'dependencyRisk',
  'overall risk level': 'overallRiskLevel',
};

const complianceKeyMap: Record<string, string> = {
  status: 'status',
  'quality certifications': 'qualityCertifications',
  'security certifications': 'securityCertifications',
  'anti corruption policy': 'antiCorruptionPolicy',
  'anti-corruption policy': 'antiCorruptionPolicy',
  'labor compliance': 'laborCompliance',
  'environmental policy': 'environmentalPolicy',
};

const validationKeyMap: Record<string, string> = {
  complete: 'isComplete',
  'data quality score': 'dataQualityScore',
  'missing critical fields': 'missingCriticalFields',
  warnings: 'warnings',
};

const insightAliasMap = {
  strengths: ['strengths', 'strength', 'insights.strengths', 'insights.strength'],
  weaknesses: ['weaknesses', 'weakness', 'weakneses', 'weekness', 'weeknesses', 'insights.weaknesses', 'insights.weakness', 'insights.weekness', 'insights.weeknesses'],
  opportunities: ['opportunities', 'opportunity', 'insights.opportunities', 'insights.opportunity'],
  threats: ['threats', 'threat', 'insights.threats', 'insights.threat'],
} as const;

const getNestedValue = (source: Record<string, any> | undefined | null, path: string) => {
  if (!source) return undefined;
  if (path.includes('.')) {
    return path.split('.').reduce<any>((current, key) => current && typeof current === 'object' ? current[key] : undefined, source);
  }
  return source[path];
};

const insightList = (source: Record<string, any> | undefined | null, key: keyof typeof insightAliasMap) => {
  for (const alias of insightAliasMap[key]) {
    const value = getNestedValue(source, alias);
    if (Array.isArray(value) && value.length > 0) return value.filter(Boolean).map(String);
    if (typeof value === 'string' && value.trim()) return splitLines(value);
  }
  return [];
};

const candidateToEditForm = (candidate: CandidateResponse | null): StaffCandidateEditForm => {
  if (!candidate) return emptyStaffCandidateEdit;
  const identity = candidate.identity as { legalName?: string; tradeName?: string; taxCode?: string; taxId?: string } | undefined;
  const business = candidate.business as { industries?: string[]; businessModel?: string; products?: unknown; markets?: string[]; targetCustomers?: string[] } | undefined;
  const companySize = candidate.companySize as { employeeTier?: string; employeeCount?: number; revenueTier?: string } | undefined;
  const contact = candidate.contact as { website?: string; emails?: string[]; phones?: string[]; addresses?: unknown } | undefined;
  const insights = candidate.insights as Record<string, any> | undefined;
  const candidateExtra = candidate as CandidateResponse & { keyPeople?: string[] | string };

  return {
    legalName: identity?.legalName || '',
    tradeName: identity?.tradeName || '',
    taxId: identity?.taxCode || identity?.taxId || '',
    website: listJoinValue(normalizeUrlItems(contact?.website)),
    email: listJoinValue(normalizeExtractedListValue(contact?.emails, true)),
    phone: listJoinValue(normalizePhoneItems(contact?.phones)),
    address: formatAddressValue(contact?.addresses),
    industry: listJoinValue(normalizeExtractedListValue(business?.industries, true)),
    businessModel: business?.businessModel || '',
    products: productsToText(business?.products),
    markets: listJoinValue(normalizeExtractedListValue(business?.markets, true)),
    targetCustomers: listJoinValue(normalizeExtractedListValue(business?.targetCustomers, true)),
    employeeTier: companySize?.employeeTier || '',
    companySize: formatCompanySizeValue(companySize),
    keyPeople: Array.isArray(candidateExtra.keyPeople) ? candidateExtra.keyPeople.join('\n') : candidateExtra.keyPeople || '',
    financial: objectToText(candidate.financial, Object.values(financialKeyMap)),
    market: objectToText(candidate.market, Object.values(marketKeyMap)),
    innovation: objectToText(candidate.innovation, Object.values(innovationKeyMap)),
    risk: objectToText(candidate.risk, Object.values(riskKeyMap)),
    compliance: objectToText(candidate.compliance, Object.values(complianceKeyMap)),
    validation: objectToText(candidate.validation, Object.values(validationKeyMap)),
    strengths: listJoinValue(normalizeExtractedListValue(insightList(insights, 'strengths'))),
    weaknesses: listJoinValue(normalizeExtractedListValue(insightList(insights, 'weaknesses'))),
    opportunities: listJoinValue(normalizeExtractedListValue(insightList(insights, 'opportunities'))),
    threats: listJoinValue(normalizeExtractedListValue(insightList(insights, 'threats'))),
  };
};

const extractionToEditForm = (extraction: Record<string, any>): StaffCandidateEditForm => {
  const data = extraction.extractedData ?? extraction;
  const products = data?.products ?? data?.productsServices;
  const markets = data?.markets ?? data?.targetMarkets;
  return {
    legalName: data?.legalName || '',
    tradeName: data?.tradeName || '',
    taxId: data?.taxCode || data?.taxId || '',
    website: listJoinValue(normalizeUrlItems(data?.website)),
    email: listJoinValue(normalizeExtractedListValue(data?.email, true)),
    phone: listJoinValue(normalizePhoneItems(data?.phone)),
    address: data?.address || formatAddressValue(data?.addresses),
    industry: listJoinValue(normalizeExtractedListValue(data?.industries, true)),
    businessModel: data?.businessModel || '',
    products: productsToText(products),
    markets: listJoinValue(normalizeExtractedListValue(markets, true)),
    targetCustomers: listJoinValue(normalizeExtractedListValue(data?.targetCustomers, true)),
    employeeTier: data?.employeeTier || '',
    companySize: data?.companySize || data?.employeeTier || '',
    keyPeople: Array.isArray(data?.keyPeople) ? data.keyPeople.join('\n') : data?.keyPeople || '',
    financial: objectToText(data?.financial, Object.values(financialKeyMap)),
    market: objectToText(data?.market, Object.values(marketKeyMap)),
    innovation: objectToText(data?.innovation, Object.values(innovationKeyMap)),
    risk: objectToText(data?.risk, Object.values(riskKeyMap)),
    compliance: objectToText(data?.compliance, Object.values(complianceKeyMap)),
    validation: '',
    strengths: listJoinValue(normalizeExtractedListValue(insightList(data, 'strengths'))),
    weaknesses: listJoinValue(normalizeExtractedListValue(insightList(data, 'weaknesses'))),
    opportunities: listJoinValue(normalizeExtractedListValue(insightList(data, 'opportunities'))),
    threats: listJoinValue(normalizeExtractedListValue(insightList(data, 'threats'))),
  };
};

const normalizeConfidenceScore = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const score = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const candidateConfidenceScore = (candidate: CandidateResponse) => {
  const candidateWithScores = candidate as CandidateResponse & {
    confidenceScore?: number;
    scorePreview?: {
      confidenceScore?: number;
      relationshipConfidenceScore?: number;
    };
  };

  return normalizeConfidenceScore(
    candidate.relationshipConfidenceScore
      ?? candidateWithScores.confidenceScore
      ?? candidateWithScores.scorePreview?.relationshipConfidenceScore
      ?? candidateWithScores.scorePreview?.confidenceScore
  );
};

const candidateConfidenceLabel = (candidate: CandidateResponse) => {
  const score = candidateConfidenceScore(candidate);
  return score === null ? 'N/A' : `${score}%`;
};

const candidateConfidenceClass = (candidate: CandidateResponse) => {
  const score = candidateConfidenceScore(candidate);
  if (score === null) return styles.candidateConfidenceUnknown;
  if (score >= 85) return styles.candidateConfidenceHigh;
  if (score >= 70) return styles.candidateConfidenceMedium;
  return styles.candidateConfidenceLow;
};

const normalizeEvidenceField = (
  field: Record<string, any>,
  source?: {
    fileName?: string;
    importJobId?: number;
    rawDocumentId?: string;
    extractionId?: string;
  }
): StaffExtractionEvidence => {
  const fieldName = field.fieldName || field.name || 'Unknown field';
  const normalized: StaffExtractionEvidence = {
    fieldName,
    extractedValue: formatEvidenceValue(fieldName, field.value ?? field.extractedValue),
    confidenceScore: normalizeConfidenceScore(field.confidence ?? field.confidenceScore),
    evidenceText: field.evidenceText || field.evidence || field.sourceText || null,
    pageNumber: typeof field.pageNumber === 'number' ? field.pageNumber : null,
    validationStatus: field.validationStatus || null,
    validationMessages: field.validationMessages || null,
    reviewStatus: field.reviewStatus || null,
    sourceFileName: source?.fileName || null,
    sourceImportJobId: source?.importJobId || null,
    sourceRawDocumentId: source?.rawDocumentId || null,
    sourceExtractionId: source?.extractionId || null,
  };

  normalized.sources = source?.fileName ? [{
    fileName: source.fileName,
    importJobId: source.importJobId,
    rawDocumentId: source.rawDocumentId,
    extractionId: source.extractionId,
    confidenceScore: normalized.confidenceScore,
    evidenceText: normalized.evidenceText,
    pageNumber: normalized.pageNumber,
    validationStatus: normalized.validationStatus,
    validationMessages: normalized.validationMessages,
    reviewStatus: normalized.reviewStatus,
  }] : [];

  return normalized;
};

const extractionToEvidenceMap = (
  extraction: Record<string, any>,
  source?: {
    fileName?: string;
    importJobId?: number;
    rawDocumentId?: string;
    extractionId?: string;
  }
): Partial<Record<StaffCandidateEditKey, StaffExtractionEvidence>> => {
  const rawFieldResults = extraction.fieldResults && typeof extraction.fieldResults === 'object'
    ? Object.values(extraction.fieldResults as Record<string, Record<string, any>>)
    : [];
  const fieldResults = rawFieldResults
    .filter((field): field is Record<string, any> => Boolean(field && typeof field === 'object'))
    .map((field) => normalizeEvidenceField(field, source));
  const byFieldName = new Map(fieldResults.map((field) => [field.fieldName, field]));

  return staffReviewFields.reduce<Partial<Record<StaffCandidateEditKey, StaffExtractionEvidence>>>((map, field) => {
    const matched = extractionEvidenceAliases[field.key]
      .map((alias) => byFieldName.get(alias))
      .find(Boolean);

    if (matched) {
      map[field.key] = matched;
    }

    return map;
  }, {});
};

const normalizedCompareValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const uniqueTextItems = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = normalizedCompareValue(item);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const mergeStructuredLines = (values: string[]) => {
  const rows = new Map<string, string>();
  values.flatMap(splitLines).forEach((line) => {
    const separatorIndex = line.indexOf(':');
    const key = separatorIndex >= 0 ? normalizedCompareValue(line.slice(0, separatorIndex)) : normalizedCompareValue(line);
    if (!key || rows.has(key)) return;
    rows.set(key, line);
  });
  return Array.from(rows.values()).join('\n');
};

const mergeProductsReviewValue = (values: string[]) => {
  const rows = new Map<string, string>();
  values
    .flatMap((value) => normalizeExtractedListValue(value))
    .forEach((line) => {
      const [name] = line.split('|').map((part) => part.trim());
      const key = normalizedCompareValue(name || line);
      if (!key || rows.has(key)) return;
      rows.set(key, line);
    });
  return Array.from(rows.values()).join('\n');
};

const bestSingleValue = (values: string[]) => {
  const unique = uniqueTextItems(values.filter(hasExtractedFieldValue));
  if (unique.length === 0) return '';
  return unique.sort((a, b) => b.length - a.length)[0];
};

const mergeReviewFieldValue = (key: StaffCandidateEditKey, values: string[]) => {
  const availableValues = values.filter(hasExtractedFieldValue);
  if (availableValues.length === 0) return '';

  if (key === 'website') return listJoinValue(uniqueTextItems(availableValues.flatMap(normalizeUrlItems)));
  if (key === 'phone') return listJoinValue(uniqueTextItems(availableValues.flatMap(normalizePhoneItems)));
  if (key === 'products') return mergeProductsReviewValue(availableValues);
  if (editableListFieldKeys.has(key) || chipFieldKeys.has(key) || key === 'keyPeople') {
    return listJoinValue(uniqueTextItems(availableValues.flatMap((value) => normalizeExtractedListValue(value, !swotFieldKeys.has(key)))));
  }
  if (['financial', 'market', 'innovation', 'risk', 'compliance', 'validation'].includes(key)) {
    return mergeStructuredLines(availableValues);
  }
  if (key === 'businessModel') {
    return uniqueTextItems(availableValues.flatMap(splitLines)).join('\n');
  }

  return bestSingleValue(availableValues);
};

const mergeFieldEvidence = (
  key: StaffCandidateEditKey,
  reviews: StaffExtractionReview[]
): StaffExtractionEvidence | undefined => {
  const evidenceItems = reviews
    .reduce<Array<{ evidence?: StaffExtractionEvidence; source: StaffExtractionEvidenceSource }>>((items, review) => {
      const evidence = review.evidence[key];
      const hasValue = hasExtractedFieldValue(review.edit[key]);
      if (!evidence && !hasValue) return items;

      const source: StaffExtractionEvidenceSource = {
        fileName: evidence?.sourceFileName || review.fileName,
        importJobId: evidence?.sourceImportJobId ?? review.importJobId ?? null,
        rawDocumentId: evidence?.sourceRawDocumentId ?? review.rawDocumentId ?? null,
        extractionId: evidence?.sourceExtractionId ?? review.id,
        confidenceScore: evidence?.confidenceScore ?? null,
        evidenceText: evidence?.evidenceText || null,
        pageNumber: evidence?.pageNumber ?? null,
        validationStatus: evidence?.validationStatus || null,
        validationMessages: evidence?.validationMessages || null,
        reviewStatus: evidence?.reviewStatus || null,
      };

      items.push({
        evidence,
        source,
      });
      return items;
    }, []);

  if (evidenceItems.length === 0) return undefined;

  const sources = uniqueTextItems(evidenceItems.map((item) => item.source.fileName))
    .map((fileName) => evidenceItems.find((item) => item.source.fileName === fileName)?.source)
    .filter((source): source is StaffExtractionEvidenceSource => Boolean(source));
  const bestEvidence = evidenceItems
    .map((item) => item.evidence)
    .filter((item): item is StaffExtractionEvidence => Boolean(item))
    .sort((a, b) => (b.confidenceScore ?? -1) - (a.confidenceScore ?? -1))[0];
  const evidenceText = sources
    .map((source) => source.evidenceText ? `${source.fileName}: ${source.evidenceText}` : `${source.fileName}: No source quote returned.`)
    .join('\n\n');

  return {
    fieldName: bestEvidence?.fieldName || key,
    extractedValue: bestEvidence?.extractedValue,
    confidenceScore: bestEvidence?.confidenceScore ?? null,
    evidenceText,
    pageNumber: bestEvidence?.pageNumber ?? null,
    validationStatus: bestEvidence?.validationStatus || null,
    validationMessages: bestEvidence?.validationMessages || null,
    reviewStatus: bestEvidence?.reviewStatus || null,
    sourceFileName: sources[0]?.fileName || null,
    sourceImportJobId: sources[0]?.importJobId ?? null,
    sourceRawDocumentId: sources[0]?.rawDocumentId ?? null,
    sourceExtractionId: sources[0]?.extractionId ?? null,
    sources,
  };
};

const mergeStaffExtractionReviews = (reviews: StaffExtractionReview[]): StaffExtractionReview | null => {
  if (reviews.length === 0) return null;
  const edit = staffReviewFields.reduce<StaffCandidateEditForm>((form, field) => ({
    ...form,
    [field.key]: mergeReviewFieldValue(field.key, reviews.map((review) => review.edit[field.key])),
  }), { ...emptyStaffCandidateEdit });
  const evidence = staffReviewFields.reduce<Partial<Record<StaffCandidateEditKey, StaffExtractionEvidence>>>((map, field) => {
    const mergedEvidence = mergeFieldEvidence(field.key, reviews);
    if (mergedEvidence) map[field.key] = mergedEvidence;
    return map;
  }, {});
  const coverageScores = reviews
    .map((review) => review.evidenceCoverageRate)
    .filter((score): score is number => typeof score === 'number');

  return {
    id: reviews.map((review) => review.id).join('|'),
    importJobId: reviews[0]?.importJobId,
    rawDocumentId: reviews[0]?.rawDocumentId,
    fileName: `Merged from ${reviews.length} document(s)`,
    qualityStatus: reviews.every((review) => review.qualityStatus === 'REVIEWED') ? 'REVIEWED' : 'Pending staff review',
    evidenceCoverageRate: coverageScores.length
      ? Math.round(coverageScores.reduce((sum, score) => sum + score, 0) / coverageScores.length)
      : null,
    evidence,
    edit,
  };
};

const buildFieldAiAssistPrompt = (
  companyName: string,
  fieldLabel: string,
  currentValue: string,
  evidence?: StaffExtractionEvidence
) => {
  const sourceNames = evidence?.sources?.map((source) => source.fileName).filter(Boolean) ?? [];
  const sourceSummary = uniqueTextItems(sourceNames).join(', ') || evidence?.sourceFileName || 'No source document attached';
  const valueText = currentValue.trim() || 'No current value has been extracted yet.';
  const evidenceText = evidence?.evidenceText?.trim() || 'No extracted evidence text is available for this field.';

  return [
    `Please help verify and enrich the "${fieldLabel}" field for company "${companyName}".`,
    '',
    'Task:',
    '- Search reliable public/company information if your environment supports web research.',
    '- If live web search is not available, clearly say so and answer only from APMS/project context.',
    '- Return a concise, staff-friendly answer with the recommended value, supporting reason, source names or URLs, and any uncertainty.',
    '',
    `Current extracted value:\n${valueText}`,
    '',
    `Current APMS evidence/source documents:\n${sourceSummary}`,
    '',
    `Evidence text:\n${evidenceText}`,
  ].join('\n');
};

const confidenceTone = (score?: number | null) => {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
};

const evidenceMetaText = (evidence: StaffExtractionEvidence) => {
  const parts = [
    evidence.pageNumber ? `Page ${evidence.pageNumber}` : 'Page unavailable',
  ].filter(Boolean);

  return parts.join(' | ');
};

const evidenceScoreLabel = (score?: number | null) =>
  score === null || score === undefined ? 'No score' : `${score}%`;

const evidenceConfidenceLabel = (score?: number | null) => {
  if (score === null || score === undefined) return 'Needs source check';
  if (score >= 85) return 'High confidence';
  if (score >= 70) return 'Medium confidence';
  return 'Low confidence';
};

const formatEvidenceValue = (fieldName: string, value: unknown) => {
  const normalizedField = fieldName.includes('.') ? fieldName.split('.').pop() || fieldName : fieldName;

  if (normalizedField === 'products' || normalizedField === 'productsServices' || normalizedField === 'services') {
    return productsToText(value) || candidateField(value, '');
  }
  if (normalizedField === 'financial') return objectToText(value, Object.values(financialKeyMap)) || candidateField(value, '');
  if (normalizedField === 'market') return objectToText(value, Object.values(marketKeyMap)) || candidateField(value, '');
  if (normalizedField === 'innovation') return objectToText(value, Object.values(innovationKeyMap)) || candidateField(value, '');
  if (normalizedField === 'risk') return objectToText(value, Object.values(riskKeyMap)) || candidateField(value, '');
  if (normalizedField === 'compliance') return objectToText(value, Object.values(complianceKeyMap)) || candidateField(value, '');
  if (normalizedField === 'validation') return objectToText(value, Object.values(validationKeyMap)) || candidateField(value, '');

  if (Array.isArray(value)) {
    return value.map((item) => candidateField(item, '')).filter(Boolean).join('\n');
  }

  return candidateField(value, '');
};

const FieldEvidencePanel: React.FC<{ evidence?: StaffExtractionEvidence; fieldKey?: StaffCandidateEditKey }> = ({ evidence, fieldKey }) => {
  if (!evidence) {
    return (
      <div className={`${styles.extractionEvidenceBox} ${styles.extractionEvidenceUnknown}`}>
        <div className={styles.extractionEvidenceHead}>
          <div>
            <span>Evidence review</span>
            <strong>No evidence returned</strong>
          </div>
          <span className={styles.extractionEvidenceScore}><AlertTriangle size={14} /> N/A</span>
        </div>
        <p>AI did not return source evidence for this field. Staff should verify it manually in the original document.</p>
      </div>
    );
  }

  const score = evidence.confidenceScore;
  const tone = confidenceTone(score);
  const messages = Array.isArray(evidence.validationMessages)
    ? evidence.validationMessages.join(', ')
    : evidence.validationMessages;
  const hasEvidence = Boolean(evidence.evidenceText?.trim());
  const statusItems = [
    evidenceMetaText(evidence),
    evidence.validationStatus ? `Validation: ${evidence.validationStatus}` : null,
    evidence.reviewStatus ? `Review: ${evidence.reviewStatus}` : null,
  ].filter(Boolean);

  return (
    <div className={`${styles.extractionEvidenceBox} ${styles[`extractionEvidence${formatInsightTitle(tone)}`] || ''}`}>
      <div className={styles.extractionEvidenceHead}>
        <div>
          <span>Evidence review</span>
          <strong>{evidenceConfidenceLabel(score)}</strong>
        </div>
        <span className={styles.extractionEvidenceScore}>
          {hasEvidence ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {evidenceScoreLabel(score)}
        </span>
      </div>
      {score !== null && score !== undefined && (
        <div className={styles.extractionEvidenceTrack} aria-hidden="true">
          <i style={{ width: `${score}%` }} />
        </div>
      )}
      <div className={`${styles.extractionEvidenceCompact} ${hasEvidence ? '' : styles.extractionEvidenceMissing}`}>
        <div>
          <span>Source evidence</span>
          <strong>{hasEvidence ? 'Evidence available for this field' : 'No source quote returned'}</strong>
        </div>
        <p>{evidence.evidenceText || 'AI returned a value, but no supporting quote was attached. Staff should verify it in the original document.'}</p>
      </div>
      <div className={styles.extractionEvidenceMeta}>
        {statusItems.map((item) => <small key={item}>{item}</small>)}
      </div>
      {messages && <small className={styles.extractionEvidenceWarning}>{messages}</small>}
    </div>
  );
};

const buildExtractedCompanyDataPayload = (form: StaffCandidateEditForm) => ({
  legalName: form.legalName.trim() || null,
  taxCode: form.taxId.trim() || null,
  industries: normalizeExtractedListValue(form.industry, true),
  businessModel: form.businessModel.trim() || null,
  products: parseProductsText(form.products),
  markets: normalizeExtractedListValue(form.markets, true),
  targetCustomers: normalizeExtractedListValue(form.targetCustomers, true),
  employeeTier: form.employeeTier.trim() || null,
  website: normalizeUrlItems(form.website).join(', ') || null,
  email: normalizeExtractedListValue(form.email, true),
  phone: normalizePhoneItems(form.phone),
  address: form.address.trim() || null,
  companySize: form.companySize.trim() || null,
  financial: parseTextObject('Financial', form.financial, financialKeyMap),
  innovation: parseTextObject('Innovation', form.innovation, innovationKeyMap, ['techStack', 'technologyCapabilities']),
  risk: parseTextObject('Risk', form.risk, riskKeyMap),
  compliance: parseTextObject('Compliance', form.compliance, complianceKeyMap),
  strengths: normalizeExtractedListValue(form.strengths),
  weaknesses: normalizeExtractedListValue(form.weaknesses),
  opportunities: normalizeExtractedListValue(form.opportunities),
  threats: normalizeExtractedListValue(form.threats),
});

const buildCandidateUpdatePayload = (form: StaffCandidateEditForm): UpdateCandidateRequest => ({
  identity: {
    legalName: form.legalName.trim() || null,
    tradeName: form.tradeName.trim() || null,
    taxCode: form.taxId.trim() || null,
  },
  business: {
    industries: normalizeExtractedListValue(form.industry, true),
    businessModel: form.businessModel.trim() || null,
    products: parseProductsText(form.products),
    markets: normalizeExtractedListValue(form.markets, true),
    targetCustomers: normalizeExtractedListValue(form.targetCustomers, true),
  },
  contact: {
    website: normalizeUrlItems(form.website).join(', ') || null,
    emails: normalizeExtractedListValue(form.email, true),
    phones: normalizePhoneItems(form.phone),
    addresses: form.address.trim() ? [{ fullAddress: form.address.trim() }] : [],
  },
  companySize: {
    employeeTier: form.employeeTier.trim() || form.companySize.trim() || null,
  },
  insights: {
    strengths: normalizeExtractedListValue(form.strengths),
    weaknesses: normalizeExtractedListValue(form.weaknesses),
    opportunities: normalizeExtractedListValue(form.opportunities),
    threats: normalizeExtractedListValue(form.threats),
  },
  financial: parseTextObject('Financial', form.financial, financialKeyMap),
  innovation: parseTextObject('Innovation', form.innovation, innovationKeyMap, ['techStack', 'technologyCapabilities']),
  risk: parseTextObject('Risk', form.risk, riskKeyMap),
  compliance: parseTextObject('Compliance', form.compliance, complianceKeyMap),
});

const taskTypeText: Record<TaskType, { title: string; description: string; steps: string[] }> = {
  DOCUMENT_COLLECTION: {
    title: 'Document collection',
    description: 'Collect and upload evidence documents, then submit them directly to the project.',
    steps: ['Start work', 'Upload evidence', 'Check documents', 'Complete task'],
  },
  COMPANY_DATA_PREPARATION: {
    title: 'Company data preparation',
    description: 'Select project documents, run AI extraction, create a candidate draft, correct data, then submit to manager.',
    steps: ['AI extraction', 'Candidate draft', 'Submit review'],
  },
  ROLE_EVALUATION: {
    title: 'Role evaluation',
    description: 'Review the company context, prepare evaluation notes, attach supporting files, then submit the evaluation.',
    steps: ['Start work', 'Review context', 'Prepare evaluation', 'Submit review'],
  },
  COMPANY_MEMBER_RESEARCH: {
    title: 'Company member research',
    description: 'Research leadership and key company members, record sources, save a draft, then submit it for manager review.',
    steps: ['Start work', 'Review target', 'Add members', 'Submit review'],
  },
  GENERAL_TASK: {
    title: 'General task',
    description: 'Work on the assigned request, add a completion note, attach evidence if needed, then submit review.',
    steps: ['Start work', 'Add result', 'Submit review'],
  },
};

const emptyCompanyMemberForm: CompanyMemberResearchItem = {
  fullName: '',
  position: '',
  imageUrl: '',
  sourceUrl: '',
  notes: '',
};

type CompanyMemberLayerId = 'board' | 'executive' | 'management' | 'other';

const companyMemberLayerMeta: Record<CompanyMemberLayerId, { title: string; description: string }> = {
  board: {
    title: 'Board of directors',
    description: 'Chairperson, board members, and governance representatives.',
  },
  executive: {
    title: 'Executive management',
    description: 'CEO, general director, CFO, CTO, and executive operators.',
  },
  management: {
    title: 'Functional leaders',
    description: 'Department heads, managers, founders, and public representatives.',
  },
  other: {
    title: 'Other verified members',
    description: 'People that do not clearly belong to another leadership layer.',
  },
};

const companyMemberInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${Array.from(words[0])[0] || ''}${Array.from(words[words.length - 1])[0] || ''}`.toUpperCase();
  return Array.from(name.trim()).slice(0, 2).join('').toUpperCase() || 'NA';
};

const companyMemberLayerId = (position: string): CompanyMemberLayerId => {
  const normalized = position.toLowerCase();
  if (/(hđqt|hdqt|hội đồng|hoi dong|board|chairman|chairwoman|chairperson)/i.test(normalized)) return 'board';
  if (/(ceo|cfo|coo|cto|chief|tổng giám|tong giam|phó tổng|pho tong|general director|giám đốc|giam doc|president|kế toán trưởng|ke toan truong)/i.test(normalized)) return 'executive';
  if (/(founder|co-founder|manager|head|leader|trưởng|truong|phó|pho|director|representative|đại diện|dai dien)/i.test(normalized)) return 'management';
  return 'other';
};

const groupCompanyMemberLayers = (members: CompanyMemberResearchItem[]) => {
  const buckets: Record<CompanyMemberLayerId, CompanyMemberResearchItem[]> = {
    board: [],
    executive: [],
    management: [],
    other: [],
  };
  members.forEach((member) => buckets[companyMemberLayerId(member.position || '')].push(member));
  return (Object.keys(buckets) as CompanyMemberLayerId[])
    .map((id) => ({ id, ...companyMemberLayerMeta[id], members: buckets[id] }))
    .filter((layer) => layer.members.length > 0);
};

const CompanyMemberLayerCard: React.FC<{
  member: CompanyMemberResearchItem;
  variant?: 'lead' | 'compact';
  statusLabel?: string;
  actions?: React.ReactNode;
}> = ({ member, variant = 'compact', statusLabel, actions }) => (
  <article className={`${styles.memberLayerCard} ${variant === 'lead' ? styles.memberLayerLeadCard : ''}`}>
    <div className={styles.memberLayerAvatar}>
      {member.imageUrl ? (
        <img src={member.imageUrl} alt={member.fullName} />
      ) : (
        <span>{companyMemberInitials(member.fullName)}</span>
      )}
    </div>
    <div className={styles.memberLayerInfo}>
      <strong>{member.fullName || 'Unnamed member'}</strong>
      <span>{member.position || 'Position not provided'}</span>
      {member.notes && <p>{member.notes}</p>}
      <div className={styles.memberLayerFooter}>
        {member.sourceUrl ? (
          <a href={member.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Source
          </a>
        ) : (
          <small>No source URL</small>
        )}
        {statusLabel && <small>{statusLabel}</small>}
      </div>
    </div>
    {actions && <div className={styles.memberLayerActions}>{actions}</div>}
  </article>
);

const CompanyMemberLayerBoard: React.FC<{
  members: CompanyMemberResearchItem[];
  emptyText: string;
  statusLabel?: string;
  renderActions?: (member: CompanyMemberResearchItem, index: number) => React.ReactNode;
}> = ({ members, emptyText, statusLabel, renderActions }) => {
  const layers = groupCompanyMemberLayers(members);
  const memberIndex = (target: CompanyMemberResearchItem) => members.findIndex((member) => member === target);

  if (layers.length === 0) return <div className={styles.empty}>{emptyText}</div>;

  return (
    <div className={styles.memberLayerBoard}>
      {layers.map((layer) => {
        const [lead, ...rest] = layer.members;
        return (
          <section className={styles.memberLayerSection} key={layer.id}>
            <div className={styles.memberLayerSectionHead}>
              <div>
                <h4>{layer.title}</h4>
                <p>{layer.description}</p>
              </div>
              <span>{layer.members.length} member(s)</span>
            </div>
            <div className={styles.memberLayerGrid}>
              <CompanyMemberLayerCard
                member={lead}
                variant="lead"
                statusLabel={statusLabel}
                actions={renderActions?.(lead, memberIndex(lead))}
              />
              {rest.length > 0 && (
                <div className={styles.memberLayerCompactGrid}>
                  {rest.map((member) => {
                    const index = memberIndex(member);
                    return (
                      <CompanyMemberLayerCard
                        member={member}
                        key={`${member.fullName}-${member.position}-${index}`}
                        statusLabel={statusLabel}
                        actions={renderActions?.(member, index)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const isManager = currentUser?.role === ROLES.MANAGER || currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.ADMIN;
  const isStaffView = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.KEY_MEMBER;
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(PROJECT_DETAIL_TAB_STORAGE_KEY) || 'Kanban Board');
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [apiTasks, setApiTasks] = useState<ProjectTaskResponse[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskRefreshTick, setTaskRefreshTick] = useState(0);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<ProjectTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [selectedStaffTask, setSelectedStaffTask] = useState<ProjectTaskResponse | null>(null);
  const [selectedManagerReviewTask, setSelectedManagerReviewTask] = useState<ProjectTaskResponse | null>(null);
  const [cancelTaskConfirmOpen, setCancelTaskConfirmOpen] = useState(false);
  const [cancelTaskLoading, setCancelTaskLoading] = useState(false);
  const [candidateReviewTaskContext, setCandidateReviewTaskContext] = useState<{
    projectId: number;
    taskId: number;
    submissionId?: number | null;
  } | null>(null);
  const [managerCandidateTab, setManagerCandidateTab] = useState<ManagerCandidateTab>('overview');
  const [workbench, setWorkbench] = useState<ProjectTaskWorkbenchResponse | null>(null);
  const [workbenchLoading, setWorkbenchLoading] = useState(false);
  const [workbenchError, setWorkbenchError] = useState<string | null>(null);
  const [workbenchMessage, setWorkbenchMessage] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [extractingImportJobId, setExtractingImportJobId] = useState<number | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<WorkbenchDocumentResponse[]>([]);
  const [projectDocumentsLoading, setProjectDocumentsLoading] = useState(false);
  const [documentsTabItems, setDocumentsTabItems] = useState<WorkbenchDocumentResponse[]>([]);
  const [documentsTabLoading, setDocumentsTabLoading] = useState(false);
  const [documentsTabError, setDocumentsTabError] = useState<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentSort, setDocumentSort] = useState<'newest' | 'oldest' | 'name' | 'type' | 'size'>('newest');
  const [selectedProjectDocumentIds, setSelectedProjectDocumentIds] = useState<number[]>([]);
  const [extractingSelectedDocuments, setExtractingSelectedDocuments] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ percent: number; label: string } | null>(null);
  const [pendingExtractionReviews, setPendingExtractionReviews] = useState<StaffExtractionReview[]>([]);
  const [lastExtractionReviews, setLastExtractionReviews] = useState<StaffExtractionReview[]>([]);
  const mergedPendingExtractionReview = useMemo(
    () => mergeStaffExtractionReviews(pendingExtractionReviews),
    [pendingExtractionReviews]
  );
  const [fieldAiAssist, setFieldAiAssist] = useState<FieldAiAssistState | null>(null);
  const [fieldAiLoading, setFieldAiLoading] = useState(false);
  const [fieldAiError, setFieldAiError] = useState<string | null>(null);
  const [staffCandidate, setStaffCandidate] = useState<CandidateResponse | null>(null);
  const [staffCandidateEdit, setStaffCandidateEdit] = useState<StaffCandidateEditForm>(emptyStaffCandidateEdit);
  const [candidateReviewTab, setCandidateReviewTab] = useState<CandidateReviewTab>('profile');
  const [staffCandidateLoading, setStaffCandidateLoading] = useState(false);
  const [staffSubmitLoading, setStaffSubmitLoading] = useState(false);
  const [deletingCandidateDraftId, setDeletingCandidateDraftId] = useState<string | null>(null);
  const [candidateDraftPendingDelete, setCandidateDraftPendingDelete] = useState<{
    candidateId: string;
    label: string;
    status: CandidateStatus;
  } | null>(null);
  const [staffTaskNote, setStaffTaskNote] = useState('');
  const [companyMemberDraft, setCompanyMemberDraft] = useState<CompanyMemberResearchDraftResponse | null>(null);
  const [companyMemberItems, setCompanyMemberItems] = useState<CompanyMemberResearchItem[]>([]);
  const [companyMemberForm, setCompanyMemberForm] = useState<CompanyMemberResearchItem>(emptyCompanyMemberForm);
  const [editingCompanyMemberIndex, setEditingCompanyMemberIndex] = useState<number | null>(null);
  const [companyMemberLoading, setCompanyMemberLoading] = useState(false);
  const [companyMemberSaving, setCompanyMemberSaving] = useState(false);
  const [companyMemberSubmitting, setCompanyMemberSubmitting] = useState(false);
  const [managerCompanyMemberDraft, setManagerCompanyMemberDraft] = useState<CompanyMemberResearchDraftResponse | null>(null);
  const [managerCompanyMemberLoading, setManagerCompanyMemberLoading] = useState(false);
  const [roleEvaluationForm, setRoleEvaluationForm] = useState({
    relationship: '',
    evidenceSummary: '',
    riskLevel: 'MEDIUM',
    recommendation: '',
  });
  const [generalTaskForm, setGeneralTaskForm] = useState({
    resultSummary: '',
    nextStep: '',
    blocker: '',
    checklist: {
      workDone: false,
      evidenceAttached: false,
      readyForReview: false,
    },
  });
  const [managerReviewComment, setManagerReviewComment] = useState('');
  const [managerReviewLoading, setManagerReviewLoading] = useState(false);
  const [apiProject, setApiProject] = useState<ProjectResponse | null>(() => readSelectedProjectSnapshot());
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [accounts, setAccounts] = useState<UserSearchResponse[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<UserSearchResponse | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [createTaskForm, setCreateTaskForm] = useState({
    title: '',
    description: '',
    assignedToUserId: '',
    priority: 'MEDIUM' as ApiTaskPriority,
    dueDate: '',
    taskType: 'GENERAL_TASK' as TaskType,
  });
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResponse | null>(null);
  const [candidateActionLoading, setCandidateActionLoading] = useState(false);
  const [candidateActionMessage, setCandidateActionMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Insufficient evidence');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<CandidateStatus | 'ALL'>('PENDING_REVIEW');
  const [candidateRelationshipFilter, setCandidateRelationshipFilter] = useState('ALL');
  const currentProjectId = apiProject?.id ?? Number(localStorage.getItem('apms-active-project'));
  const isDraftProject = apiProject?.status === 'DRAFT';
  const staffTaskStatus = workbench?.taskStatus || selectedStaffTask?.status;
  const canUseStaffWorkbench = staffTaskStatus === 'IN_PROGRESS';
  const isStaffWorkbenchStepActive = (step: string) => {
    const hasSubmittedReview = workbench?.submissions?.some((submission) => submission.status === 'IN_REVIEW' || submission.status === 'APPROVED');
    const hasCandidateDraft = Boolean(staffCandidate) || (workbench?.candidateDrafts?.length ?? 0) > 0;
    const hasAiExtraction = pendingExtractionReviews.length > 0
      || lastExtractionReviews.length > 0
      || hasCandidateDraft
      || Boolean(workbench?.documents?.some((document) => document.latestExtractionId));

    if (selectedStaffTask?.taskType === 'COMPANY_DATA_PREPARATION') {
      if (step === 'AI extraction') return extractingSelectedDocuments || selectedProjectDocumentIds.length > 0 || hasAiExtraction;
      if (step === 'Candidate draft') return hasCandidateDraft;
      if (step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (selectedStaffTask?.taskType === 'COMPANY_MEMBER_RESEARCH') {
      if (step === 'Start work') return staffTaskStatus !== 'TODO';
      if (step === 'Review target') return Boolean(workbench?.targetCompanyName || displayedProject.targetCompanyName || workbench?.targetCompanyProfileId);
      if (step === 'Add members') return companyMemberItems.length > 0;
      if (step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (step === 'Start work') return staffTaskStatus !== 'TODO';
    if (step === 'Upload evidence') return (workbench?.documents?.length ?? 0) > 0;
    if (step === 'Complete task' || step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
    return false;
  };
  const visibleTabs = useMemo(() => (isStaffView ? ['Kanban Board', 'Documents', 'Members'] : tabs), [isStaffView]);
  const staffAccountId = useMemo(() => {
    if (!isStaffView) return null;
    if (currentUser?.id && currentUser.id > 0) return currentUser.id;
    const currentEmail = currentUser?.email?.toLowerCase();
    const matchedMember = apiProject?.members?.find((member) => member.email?.toLowerCase() === currentEmail);
    return matchedMember?.accountId ?? null;
  }, [currentUser, apiProject?.members, isStaffView]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setCandidateReviewTab('profile');
  }, [staffCandidate?.id]);

  useEffect(() => {
    setManagerCandidateTab('overview');
  }, [selectedCandidate?.id]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('Kanban Board');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (visibleTabs.includes(activeTab)) {
      localStorage.setItem(PROJECT_DETAIL_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const rawProjectId = localStorage.getItem('apms-active-project');
    const projectId = rawProjectId ? Number(rawProjectId) : NaN;

    if (!Number.isFinite(projectId) || projectId <= 0) {
      setApiProject(null);
      setProjectError('No project selected. Please open a project from Project Management.');
      return;
    }

    const snapshot = readSelectedProjectSnapshot();
    if (snapshot) {
      setApiProject(snapshot);
    }

    let cancelled = false;
    setProjectLoading(true);
    setProjectError(null);

    projectApi.getProjectById(projectId)
      .then((payload) => {
        if (cancelled) return;
        const project = unwrapProject(payload);
        if (project && project.id === projectId) {
          setApiProject(project);
          sessionStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(project));
        } else {
          setProjectError(payload?.message || 'Cannot load the selected project detail.');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setProjectError(error instanceof Error ? error.message : 'Cannot load project detail.');
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) return;

    let cancelled = false;
    setTasksLoading(true);
    setTaskError(null);

    taskApi.getProjectTasks(currentProjectId, isStaffView && staffAccountId ? { assignedToUserId: staffAccountId } : undefined)
      .then((payload) => {
        if (cancelled) return;
        const rows = unwrapList<ProjectTaskResponse>(payload).filter((task) => (
          !isStaffView ||
          (staffAccountId ? task.assignedToUserId === staffAccountId : task.assignedToName?.toLowerCase() === currentUser?.email?.toLowerCase())
        ));
        setApiTasks(rows);
        setSelectedStaffTask((current) => current ? rows.find((task) => task.id === current.id) ?? current : current);
        setSelectedManagerReviewTask((current) => current ? rows.find((task) => task.id === current.id) ?? current : current);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiTasks([]);
        setTaskError(error instanceof Error ? error.message : 'Cannot load project tasks.');
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, currentUser?.email, isStaffView, staffAccountId, taskRefreshTick]);

  useEffect(() => {
    const refreshProjectTasks = () => setTaskRefreshTick((current) => current + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshProjectTasks();
    };
    const interval = window.setInterval(refreshProjectTasks, 8000);
    window.addEventListener('focus', refreshProjectTasks);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshProjectTasks);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) return;
    if (isStaffView) {
      setCandidates([]);
      setCandidatesLoading(false);
      setCandidateError(null);
      return;
    }

    let cancelled = false;
    setCandidatesLoading(true);
    setCandidateError(null);

    candidateApi.getProjectCandidates(currentProjectId)
      .then((payload) => {
        if (!cancelled) setCandidates(unwrapList<CandidateResponse>(payload));
      })
      .catch((error) => {
        if (cancelled) return;
        setCandidates([]);
        setCandidateError(error instanceof Error ? error.message : 'Cannot load project candidates.');
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, isStaffView]);

  useEffect(() => {
    if (!showInviteModal) return;
    const email = inviteEmail.trim();
    if (!email) {
      setAccounts([]);
      setSelectedAccount(null);
      setAccountsLoading(false);
      return;
    }

    let cancelled = false;
    setAccountsLoading(true);
    setInviteError(null);

    accountApi.searchAccountsByEmail(email)
      .then((payload) => {
        if (!cancelled) setAccounts(unwrapList<UserSearchResponse>(payload));
      })
      .catch((error) => {
        if (!cancelled) {
          setAccounts([]);
          setInviteError(error instanceof Error ? error.message : 'Cannot load account list.');
        }
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inviteEmail, showInviteModal]);

  const displayedProject = useMemo(() => ({
    name: apiProject?.projectName || projectDetail.name,
    key: toProjectKey(apiProject),
    status: apiProject ? projectStatusLabel[apiProject.status] : projectDetail.status,
    type: apiProject ? projectTypeLabel[apiProject.projectType] : projectDetail.type,
    priority: projectDetail.priority,
    owner: projectDetail.owner,
    startDate: formatOptionalDate(apiProject?.createdAt || projectDetail.startDate),
    dueDate: formatOptionalDate(apiProject?.updatedAt || projectDetail.dueDate),
    targetCompanyName: apiProject?.targetCompanyName,
    description: apiProject?.description,
  }), [apiProject]);

  const projectMembers = useMemo(() => {
    const rows = apiProject?.members ?? [];
    return [...rows].sort((a, b) => {
      if (a.memberRole === b.memberRole) return a.accountId - b.accountId;
      return a.memberRole === 'MANAGER' ? -1 : 1;
    });
  }, [apiProject]);

  useEffect(() => {
    setTasks(apiTasks.map((task) => mapApiTaskToCard(task, projectMembers)));
  }, [apiTasks, projectMembers]);

  useEffect(() => {
    if (!selectedStaffTask || !['COMPANY_DATA_PREPARATION', 'ROLE_EVALUATION'].includes(selectedStaffTask.taskType)) {
      setProjectDocuments([]);
      setSelectedProjectDocumentIds([]);
      return;
    }

    let cancelled = false;
    setProjectDocumentsLoading(true);

    api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${selectedStaffTask.projectId}/documents`, {
      params: { includeHidden: false, page: 0, size: 100 },
    })
      .then((payload) => {
        if (cancelled) return;
        const documents = unwrapList<WorkbenchDocumentResponse>(payload);
        setProjectDocuments(documents);
        setSelectedProjectDocumentIds([]);
      })
      .catch((error) => {
        if (cancelled) return;
        setProjectDocuments([]);
        setWorkbenchError(error instanceof Error ? error.message : 'Cannot load project documents.');
      })
      .finally(() => {
        if (!cancelled) setProjectDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStaffTask?.id, selectedStaffTask?.projectId, selectedStaffTask?.taskType]);

  useEffect(() => {
    if (activeTab !== 'Documents' || !currentProjectId) return;

    let cancelled = false;
    setDocumentsTabLoading(true);
    setDocumentsTabError(null);

    api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${currentProjectId}/documents`, {
      params: { includeHidden: false, page: 0, size: 200 },
    })
      .then((payload) => {
        if (!cancelled) setDocumentsTabItems(unwrapList<WorkbenchDocumentResponse>(payload));
      })
      .catch((error) => {
        if (!cancelled) {
          setDocumentsTabItems([]);
          setDocumentsTabError(error instanceof Error ? error.message : 'Cannot load project documents.');
        }
      })
      .finally(() => {
        if (!cancelled) setDocumentsTabLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentProjectId]);

  const assignableMembers = useMemo(
    () => projectMembers.filter((member) => member.memberRole === 'STAFF'),
    [projectMembers]
  );

  const candidateStats = useMemo(() => {
    const reviewCandidates = candidates.filter((candidate) => visibleCandidateStatuses.has(candidate.status));
    const pending = reviewCandidates.filter((candidate) => candidate.status === 'PENDING_REVIEW').length;
    const approved = reviewCandidates.filter((candidate) => candidate.status === 'APPROVED').length;
    const rejected = reviewCandidates.filter((candidate) => candidate.status === 'REJECTED').length;
    const incomplete = reviewCandidates.filter(isCandidateIncomplete).length;
    const confidenceScores = reviewCandidates
      .map(candidateConfidenceScore)
      .filter((score): score is number => score !== null);
    const averageConfidence = confidenceScores.length
      ? Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
      : null;

    return {
      pending,
      approved,
      rejected,
      incomplete,
      averageConfidence,
      totalVisible: reviewCandidates.length,
    };
  }, [candidates]);

  const candidateRelationshipOptions = useMemo(() => {
    const values = candidates
      .map((candidate) => candidate.suggestedRelationshipType || candidate.relationshipTypeOverride)
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const term = candidateSearch.trim().toLowerCase();

    return candidates.filter((candidate) => {
      if (!visibleCandidateStatuses.has(candidate.status)) return false;
      const effectiveStatusFilter = candidateStatusFilter !== 'ALL' && !visibleCandidateStatuses.has(candidateStatusFilter)
        ? 'ALL'
        : candidateStatusFilter;
      const matchesStatus = effectiveStatusFilter === 'ALL' || candidate.status === effectiveStatusFilter;
      const relationship = candidate.suggestedRelationshipType || candidate.relationshipTypeOverride || '';
      const matchesRelationship = candidateRelationshipFilter === 'ALL' || relationship === candidateRelationshipFilter;
      const searchable = [
        candidateName(candidate),
        candidateIndustry(candidate),
        candidateTaxId(candidate),
        relationship,
        candidateCompleteness(candidate),
      ].join(' ').toLowerCase();
      return matchesStatus && matchesRelationship && (!term || searchable.includes(term));
    });
  }, [candidateRelationshipFilter, candidateSearch, candidateStatusFilter, candidates]);

  const filteredDocuments = useMemo(() => {
    const term = documentSearch.trim().toLowerCase();
    const rows = documentsTabItems.filter((document) => {
      const searchable = [
        document.fileName,
        document.sourceType,
        document.mimeType,
        document.status,
        document.uploadedByName,
        document.uploadedBy,
        document.taskId,
      ].filter(Boolean).join(' ').toLowerCase();
      return !term || searchable.includes(term);
    });

    return [...rows].sort((a, b) => {
      if (documentSort === 'name') return (a.fileName || '').localeCompare(b.fileName || '');
      if (documentSort === 'type') return (a.sourceType || '').localeCompare(b.sourceType || '');
      if (documentSort === 'size') return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
      const aTime = new Date(a.uploadedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.uploadedAt || b.createdAt || 0).getTime();
      return documentSort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [documentSearch, documentSort, documentsTabItems]);

  const suggestedAccounts = useMemo(() => {
    const term = inviteEmail.trim().toLowerCase();
    if (!term) return accounts.slice(0, 6);

    return accounts
      .filter((account) => {
        const haystack = [
          account.email,
          account.fullName,
          ...(account.roles ?? []),
        ].join(' ').toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 8);
  }, [accounts, inviteEmail]);

  const selectSuggestedAccount = (account: UserSearchResponse) => {
    setSelectedAccount(account);
    setInviteEmail(account.email);
    setInviteError(null);
  };

  const showDraftToast = (action: string) => {
    setToast({
      kind: 'error',
      message: `Project is still Draft. Please activate it before ${action}.`,
    });
  };

  const ensureProjectIsActive = (action: string) => {
    if (!isDraftProject) return true;
    showDraftToast(action);
    return false;
  };

  const handleActivateProject = async () => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) {
      setToast({ kind: 'error', message: 'Cannot find selected project id.' });
      return;
    }

    setStatusLoading(true);
    setToast(null);

    try {
      const payload = await projectApi.updateProjectStatus(currentProjectId, {
        status: 'ACTIVE',
        note: 'Activate project from project detail',
      });
      const updatedProject = payload?.data;
      setApiProject((current) => {
        const nextProject = updatedProject ?? (current ? { ...current, status: 'ACTIVE' as ApiProjectStatus } : current);
        if (nextProject) {
          sessionStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(nextProject));
        }
        return nextProject;
      });
      setToast({ kind: 'success', message: 'Project activated successfully.' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to activate project.' });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) {
      setInviteError('Cannot find selected project id.');
      return;
    }
    if (!ensureProjectIsActive('adding staff')) return;

    const email = inviteEmail.trim();
    const matchedAccount = selectedAccount ?? accounts.find((account) => account.email.toLowerCase() === email.toLowerCase());
    if (!email) {
      setInviteError('Please enter a member email.');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    setInviteMessage(null);

    try {
      const payload = await projectApi.addMember(currentProjectId, {
        accountId: matchedAccount?.id ?? null,
        email,
        memberRole: 'STAFF',
      });

      const nextMember = payload?.data as ProjectMemberResponse | undefined;
      setApiProject((current) => {
        if (!current) return current;
        const members = current.members ?? [];
        if (!nextMember || members.some((member) => member.accountId === nextMember.accountId)) return current;
        return { ...current, members: [...members, nextMember] };
      });

      setInviteMessage(`${matchedAccount ? accountName(matchedAccount) : email} has been added to this project.`);
      setInviteEmail('');
      setSelectedAccount(null);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Cannot invite member.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) {
      setCreateTaskError('Cannot find selected project id.');
      return;
    }
    if (!ensureProjectIsActive('assigning tasks to employees')) return;

    const title = createTaskForm.title.trim();
    const assignedToUserId = Number(createTaskForm.assignedToUserId);
    if (!title) {
      setCreateTaskError('Task title is required.');
      return;
    }
    if (!Number.isFinite(assignedToUserId) || assignedToUserId <= 0) {
      setCreateTaskError('Please assign this task to an employee.');
      return;
    }

    const payload: CreateProjectTaskRequest = {
      title,
      description: createTaskForm.description.trim() || null,
      assignedToUserId,
      priority: createTaskForm.priority,
      dueDate: createTaskForm.dueDate ? new Date(createTaskForm.dueDate).toISOString() : null,
      taskType: createTaskForm.taskType,
    };

    setCreateTaskLoading(true);
    setCreateTaskError(null);

    try {
      const response = await taskApi.createProjectTask(currentProjectId, payload);
      if (response?.data) {
        setApiTasks((current) => [response.data, ...current]);
      }
      setCreateTaskForm({
        title: '',
        description: '',
        assignedToUserId: '',
        priority: 'MEDIUM',
        dueDate: '',
        taskType: 'GENERAL_TASK',
      });
      setShowCreateTaskModal(false);
      setToast({ kind: 'success', message: 'Task created successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot create task.';
      setCreateTaskError(message);
      setToast({ kind: 'error', message });
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const openCandidateDetail = async (candidate: CandidateResponse) => {
    setCandidateReviewTaskContext(null);
    setCandidateActionMessage(null);
    setCandidateError(null);
    setSelectedCandidate(candidate);

    try {
      const payload = await candidateApi.getCandidateById(candidate.id);
      if (payload?.data) {
        setSelectedCandidate(payload.data);
      }
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : 'Cannot load candidate detail.');
    }
  };

  const updateCandidateInList = (candidate: CandidateResponse) => {
    setCandidates((current) => (
      current.some((item) => item.id === candidate.id)
        ? current.map((item) => (item.id === candidate.id ? candidate : item))
        : [candidate, ...current]
    ));
    setSelectedCandidate(candidate);
  };

  const updateTaskStatusInState = (taskId: number, status: ApiTaskStatus) => {
    setApiTasks((current) => current.map((item) => (
      item.id === taskId
        ? { ...item, status, completedAt: status === 'DONE' ? new Date().toISOString() : null }
        : item
    )));
  };

  const findSubmissionForCandidate = (candidateId: string): ProjectTaskSubmissionResponse | undefined => (
    workbench?.submissions?.find((submission) => submission.targetEntityId === candidateId)
    ?? workbench?.submissions?.find((submission) => submission.status === 'IN_REVIEW')
    ?? workbench?.submissions?.[0]
  );

  const openManagerCandidateReview = async (candidateId: string) => {
    if (!selectedManagerReviewTask) return;
    const submission = findSubmissionForCandidate(candidateId);

    setCandidateReviewTaskContext({
      projectId: selectedManagerReviewTask.projectId,
      taskId: selectedManagerReviewTask.id,
      submissionId: submission?.id ?? null,
    });
    setSelectedManagerReviewTask(null);
    setActiveTab('Candidates');
    setCandidateActionMessage(null);
    setCandidateError(null);

    try {
      const payload = await candidateApi.getCandidateById(candidateId);
      if (payload?.data) updateCandidateInList(payload.data);
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : 'Cannot load candidate detail.');
    }
  };

  const handleApproveCandidate = async () => {
    if (!selectedCandidate) return;
    setCandidateActionLoading(true);
    setCandidateError(null);
    setCandidateActionMessage(null);

    try {
      const payload = await candidateApi.approveCandidate(selectedCandidate.id, {
        relationshipTypeOverride: selectedCandidate.relationshipTypeOverride || selectedCandidate.suggestedRelationshipType || undefined,
      });
      if (payload?.data) updateCandidateInList(payload.data);

      if (candidateReviewTaskContext?.submissionId) {
        await taskApi.reviewSubmission(
          candidateReviewTaskContext.projectId,
          candidateReviewTaskContext.taskId,
          candidateReviewTaskContext.submissionId,
          {
            decision: 'APPROVE',
            comment: 'Candidate approved and Company Profile created.',
          }
        );
        updateTaskStatusInState(candidateReviewTaskContext.taskId, 'DONE');
        setCandidateReviewTaskContext(null);
        setSelectedCandidate(null);
        setActiveTab('Kanban Board');
        setToast({ kind: 'success', message: 'Candidate approved, Company Profile created, and task moved to Done.' });
      } else {
        setCandidateActionMessage('Candidate approved successfully.');
      }
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : 'Cannot approve candidate.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  const handleRejectCandidate = async () => {
    if (!selectedCandidate) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setCandidateError('Rejection reason is required.');
      return;
    }

    setCandidateActionLoading(true);
    setCandidateError(null);
    setCandidateActionMessage(null);

    try {
      const payload = await candidateApi.rejectCandidate(selectedCandidate.id, { rejectionReason: reason });
      if (payload?.data) updateCandidateInList(payload.data);

      if (candidateReviewTaskContext?.submissionId) {
        await taskApi.reviewSubmission(
          candidateReviewTaskContext.projectId,
          candidateReviewTaskContext.taskId,
          candidateReviewTaskContext.submissionId,
          {
            decision: 'REJECT',
            comment: reason,
          }
        );
        updateTaskStatusInState(candidateReviewTaskContext.taskId, 'IN_PROGRESS');
        setCandidateReviewTaskContext(null);
        setSelectedCandidate(null);
        setActiveTab('Kanban Board');
        setToast({ kind: 'success', message: 'Candidate rejected and task returned to staff.' });
      } else {
        setCandidateActionMessage('Candidate rejected.');
      }
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : 'Cannot reject candidate.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  const updateTaskInState = (task: ProjectTaskResponse) => {
    setApiTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
    setSelectedStaffTask(task);
  };

  const loadTaskWorkbench = async (task: ProjectTaskResponse, options: { loadCandidateDraft?: boolean } = {}) => {
    setWorkbenchLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await taskApi.getTaskWorkbench(task.projectId, task.id);
      setWorkbench(payload.data);

      const firstDraftId = payload.data?.candidateDrafts?.[0]?.candidateId;
      if (options.loadCandidateDraft && firstDraftId) {
        const candidatePayload = await candidateApi.getCandidateById(firstDraftId);
        setStaffCandidate(candidatePayload.data);
        setStaffCandidateEdit(candidateToEditForm(candidatePayload.data));
      } else if (options.loadCandidateDraft) {
        setStaffCandidate(null);
        setStaffCandidateEdit(emptyStaffCandidateEdit);
      }
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot load task workbench.');
    } finally {
      setWorkbenchLoading(false);
    }
  };

  const loadCompanyMemberDraft = async (task: ProjectTaskResponse) => {
    setCompanyMemberLoading(true);
    try {
      const payload = await companyMemberResearchApi.getDraft(task.projectId, task.id);
      const draft = payload.data;
      setCompanyMemberDraft(draft);
      setCompanyMemberItems(draft?.members ?? []);
    } catch (error) {
      setCompanyMemberDraft(null);
      setCompanyMemberItems([]);
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot load company member research draft.');
    } finally {
      setCompanyMemberLoading(false);
    }
  };

  const loadManagerCompanyMemberDraft = async (task: ProjectTaskResponse) => {
    setManagerCompanyMemberLoading(true);
    try {
      const payload = await companyMemberResearchApi.getDraft(task.projectId, task.id);
      setManagerCompanyMemberDraft(payload.data);
    } catch (error) {
      setManagerCompanyMemberDraft(null);
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot load company member research submission.');
    } finally {
      setManagerCompanyMemberLoading(false);
    }
  };

  const loadStaffWorkbench = async (task: ProjectTaskResponse) => {
    await loadTaskWorkbench(task, { loadCandidateDraft: true });
    if (task.taskType === 'COMPANY_MEMBER_RESEARCH') {
      await loadCompanyMemberDraft(task);
    }
  };

  const loadManagerWorkbench = async (task: ProjectTaskResponse) => {
    await loadTaskWorkbench(task);
    if (task.taskType === 'COMPANY_MEMBER_RESEARCH') {
      await loadManagerCompanyMemberDraft(task);
    } else {
      setManagerCompanyMemberDraft(null);
    }
  };

  const resetStaffWorkbenchForms = () => {
    setStaffTaskNote('');
    setCompanyMemberDraft(null);
    setCompanyMemberItems([]);
    setCompanyMemberForm(emptyCompanyMemberForm);
    setEditingCompanyMemberIndex(null);
    setRoleEvaluationForm({
      relationship: '',
      evidenceSummary: '',
      riskLevel: 'MEDIUM',
      recommendation: '',
    });
    setGeneralTaskForm({
      resultSummary: '',
      nextStep: '',
      blocker: '',
      checklist: {
        workDone: false,
        evidenceAttached: false,
        readyForReview: false,
      },
    });
  };

  const resetCompanyMemberForm = () => {
    setCompanyMemberForm(emptyCompanyMemberForm);
    setEditingCompanyMemberIndex(null);
  };

  const handleSaveCompanyMemberItem = () => {
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before editing company members.');
      return;
    }

    const fullName = companyMemberForm.fullName.trim();
    const position = companyMemberForm.position.trim();
    const sourceUrl = companyMemberForm.sourceUrl.trim();
    if (!fullName || !position || !sourceUrl) {
      setWorkbenchError('Full name, position, and source URL are required.');
      return;
    }

    const nextItem: CompanyMemberResearchItem = {
      fullName,
      position,
      imageUrl: companyMemberForm.imageUrl?.trim() || null,
      sourceUrl,
      notes: companyMemberForm.notes?.trim() || null,
    };

    setCompanyMemberItems((current) => {
      if (editingCompanyMemberIndex === null) return [...current, nextItem];
      return current.map((item, index) => (index === editingCompanyMemberIndex ? nextItem : item));
    });
    setWorkbenchError(null);
    resetCompanyMemberForm();
  };

  const handleEditCompanyMemberItem = (index: number) => {
    const item = companyMemberItems[index];
    if (!item) return;
    setCompanyMemberForm({
      fullName: item.fullName || '',
      position: item.position || '',
      imageUrl: item.imageUrl || '',
      sourceUrl: item.sourceUrl || '',
      notes: item.notes || '',
    });
    setEditingCompanyMemberIndex(index);
  };

  const handleRemoveCompanyMemberItem = (index: number) => {
    setCompanyMemberItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (editingCompanyMemberIndex === index) resetCompanyMemberForm();
  };

  const saveCompanyMemberResearchDraft = async () => {
    if (!selectedStaffTask) return null;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before saving company member research.');
      return null;
    }
    if (companyMemberItems.length === 0) {
      setWorkbenchError('Please add at least one company member before saving the draft.');
      return null;
    }

    setCompanyMemberSaving(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await companyMemberResearchApi.saveDraft(selectedStaffTask.projectId, selectedStaffTask.id, companyMemberItems);
      setCompanyMemberDraft(payload.data);
      setCompanyMemberItems(payload.data?.members ?? companyMemberItems);
      setWorkbenchMessage('Company member research draft saved.');
      return payload.data;
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot save company member research draft.');
      return null;
    } finally {
      setCompanyMemberSaving(false);
    }
  };

  const submitCompanyMemberResearchDraft = async () => {
    if (!selectedStaffTask) return;
    const savedDraft = companyMemberDraft || await saveCompanyMemberResearchDraft();
    if (!savedDraft) return;

    setCompanyMemberSubmitting(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await companyMemberResearchApi.submitDraft(selectedStaffTask.projectId, selectedStaffTask.id);
      const updatedTask: ProjectTaskResponse = { ...selectedStaffTask, status: 'IN_REVIEW' };
      updateTaskInState(updatedTask);
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
      setToast({ kind: 'success', message: 'Company member research submitted to manager review.' });
      setTaskRefreshTick((current) => current + 1);
      setSelectedStaffTask(null);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot submit company member research.');
    } finally {
      setCompanyMemberSubmitting(false);
    }
  };

  const handleOpenTask = (task: ProjectTask) => {
    const taskId = Number(task.id.replace('APMS-', ''));
    const apiTask = apiTasks.find((item) => item.id === taskId);

    if (!isStaffView) {
      if (apiTask && (apiTask.status === 'IN_REVIEW' || apiTask.status === 'DONE')) {
        setSelectedManagerReviewTask(apiTask);
        setManagerReviewComment('');
        void loadManagerWorkbench(apiTask);
      } else {
        setSelectedTask(task);
      }
      return;
    }

    if (!apiTask) {
      setToast({ kind: 'error', message: 'Cannot find this task from API data.' });
      return;
    }

    setSelectedStaffTask(apiTask);
    resetStaffWorkbenchForms();
    void loadStaffWorkbench(apiTask);
  };

  useEffect(() => {
    if (!isStaffView || selectedStaffTask || apiTasks.length === 0) return;
    const rawTaskId = sessionStorage.getItem('apms-open-task-id');
    const taskId = rawTaskId ? Number(rawTaskId) : NaN;
    if (!Number.isFinite(taskId) || taskId <= 0) return;

    const apiTask = apiTasks.find((item) => item.id === taskId);
    if (!apiTask) return;

    sessionStorage.removeItem('apms-open-task-id');
    setSelectedStaffTask(apiTask);
    resetStaffWorkbenchForms();
    void loadStaffWorkbench(apiTask);
  }, [apiTasks, isStaffView, selectedStaffTask]);

  const handleStartStaffTask = async () => {
    if (!selectedStaffTask) return;
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'IN_PROGRESS');
      updateTaskInState(payload.data);
      setSelectedStaffTask(payload.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_PROGRESS' } : current);
      setWorkbenchMessage('Task moved to In Progress.');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot start this task.');
    }
  };

  const handleCancelStaffTask = async () => {
    if (!selectedStaffTask) return;
    setCancelTaskConfirmOpen(true);
  };

  const confirmCancelStaffTask = async () => {
    if (!selectedStaffTask) return;
    setCancelTaskLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'CANCELLED');
      updateTaskInState(payload.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'CANCELLED' } : current);
      setCancelTaskConfirmOpen(false);
      setWorkbenchMessage('Task has been cancelled.');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot cancel this task.');
    } finally {
      setCancelTaskLoading(false);
    }
  };

  const handleDeleteTask = async (task: ProjectTask) => {
    if (isStaffView) return;
    const taskId = Number(task.id.replace('APMS-', ''));
    if (!Number.isFinite(taskId) || taskId <= 0 || !currentProjectId) {
      setToast({ kind: 'error', message: 'Cannot identify this task.' });
      return;
    }

    setTaskPendingDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskPendingDelete || !currentProjectId) return;
    const task = taskPendingDelete;
    const taskId = Number(task.id.replace('APMS-', ''));

    setDeletingTaskId(taskId);
    setTaskError(null);

    try {
      await taskApi.deleteProjectTask(currentProjectId, taskId);
      setApiTasks((current) => current.filter((item) => item.id !== taskId));
      setSelectedTask((current) => (current?.id === task.id ? null : current));
      setSelectedManagerReviewTask((current) => (current?.id === taskId ? null : current));
      setTaskPendingDelete(null);
      setToast({ kind: 'success', message: 'Task deleted successfully.' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Cannot delete task.' });
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleUploadEvidence = async (file: File | null) => {
    if (!file || !selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before using staff workbench actions.');
      return;
    }
    setUploadingEvidence(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', String(selectedStaffTask.id));
      const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/projects/${selectedStaffTask.projectId}/documents/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Cannot upload file.');
      }

      setWorkbenchMessage('Evidence uploaded. You can run AI extraction now.');
      await loadStaffWorkbench(selectedStaffTask);
      const documentsPayload = await api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${selectedStaffTask.projectId}/documents`, {
        params: { includeHidden: false, page: 0, size: 100 },
      });
      setProjectDocuments(unwrapList<WorkbenchDocumentResponse>(documentsPayload));
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot upload file.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleRunAiExtraction = async (document: WorkbenchDocumentResponse) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before running AI extraction.');
      return;
    }
    setExtractingImportJobId(document.id);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await api.post<AiExtractionResult>(
        `/import-jobs/${document.id}/ai-extractions`,
        undefined,
        { timeoutMs: null }
      );
      const extractionId = payload.data?.id || payload.data?.extractionId;
      setWorkbenchMessage('AI extraction completed. Create a candidate draft from the extraction.');
      await loadStaffWorkbench(selectedStaffTask);

      if (extractionId) {
        setWorkbench((current) => {
          if (!current) return current;
          return {
            ...current,
            documents: current.documents?.map((item) => (
              item.id === document.id ? { ...item, latestExtractionId: extractionId, canGenerateDraft: true } : item
            )),
          };
        });
      }
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'AI extraction failed.');
    } finally {
      setExtractingImportJobId(null);
    }
  };

  const toggleProjectDocumentSelection = (documentId: number) => {
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before selecting documents.');
      return;
    }
    setSelectedProjectDocumentIds((current) => (
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    ));
  };

  const extractProjectDocumentsForReview = async (selectedDocuments: WorkbenchDocumentResponse[]) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before running AI extraction.');
      return;
    }

    if (selectedDocuments.length === 0) {
      setWorkbenchError('Please select at least one project document to extract.');
      return;
    }

    setExtractingSelectedDocuments(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const totalSteps = selectedDocuments.length * 2 + 1;
      const extractedReviews: StaffExtractionReview[] = [];

      for (const [index, document] of selectedDocuments.entries()) {
        const extractStep = index * 2;
        setAiProgress({
          percent: Math.max(5, Math.round((extractStep / totalSteps) * 100)),
          label: `Extracting ${document.fileName || `Import job #${document.id}`}`,
        });
        setExtractingImportJobId(document.id);
        await api.post<AiExtractionResult>(
          `/import-jobs/${document.id}/ai-extractions`,
          undefined,
          { timeoutMs: null }
        );
        setAiProgress({
          percent: Math.round(((extractStep + 1) / totalSteps) * 100),
          label: `Reading extraction result for ${document.fileName || `Import job #${document.id}`}`,
        });
        const latestPayload = await api.get<{ id?: string; extractionId?: string }>(
          `/import-jobs/${document.id}/ai-extractions/latest`,
          { timeoutMs: null }
        );
        const extractionId = latestPayload.data?.id || latestPayload.data?.extractionId;
        if (extractionId) {
          const latestExtraction = latestPayload.data as Record<string, any>;
          extractedReviews.push({
            id: extractionId,
            importJobId: document.id,
            rawDocumentId: document.rawDocumentId || undefined,
            fileName: document.fileName || `Import job #${document.id}`,
            qualityStatus: latestExtraction?.qualityStatus,
            evidenceCoverageRate: typeof latestExtraction?.evidenceCoverageRate === 'number' ? latestExtraction.evidenceCoverageRate : null,
            evidence: extractionToEvidenceMap(latestExtraction, {
              extractionId,
              importJobId: document.id,
              rawDocumentId: document.rawDocumentId || undefined,
              fileName: document.fileName || `Import job #${document.id}`,
            }),
            edit: extractionToEditForm(latestExtraction),
          });
        }
      }

      if (extractedReviews.length === 0) {
        throw new Error('AI extraction completed, but no extraction ID was returned.');
      }

      setPendingExtractionReviews(extractedReviews);
      setLastExtractionReviews([]);
      setSelectedProjectDocumentIds([]);
      setAiProgress({
        percent: 100,
        label: 'Extraction ready for staff review',
      });
      setWorkbenchMessage(`AI extracted ${extractedReviews.length} document(s). Review and correct the fields before creating a candidate.`);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot extract selected documents.');
    } finally {
      setExtractingImportJobId(null);
      setExtractingSelectedDocuments(false);
      window.setTimeout(() => setAiProgress(null), 900);
    }
  };

  const updateMergedPendingExtractionEdit = (key: StaffCandidateEditKey, value: string) => {
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before editing AI extraction data.');
      return;
    }
    setPendingExtractionReviews((current) => current.map((review) => ({
      ...review,
      edit: {
        ...review.edit,
        [key]: value,
      },
    })));
  };

  const openFieldAiAssist = (
    field: { key: StaffCandidateEditKey; label: string; multiline?: boolean; placeholder?: string },
    review: StaffExtractionReview
  ) => {
    if (!currentProjectId || Number.isNaN(Number(currentProjectId))) {
      setWorkbenchError('Please open a valid project before using AI field research.');
      return;
    }

    const companyName = review.edit.legalName
      || review.edit.tradeName
      || displayedProject.targetCompanyName
      || displayedProject.name
      || 'this company';
    const currentValue = review.edit[field.key] || '';
    const evidence = review.evidence[field.key];

    setFieldAiError(null);
    setFieldAiAssist({
      fieldKey: field.key,
      fieldLabel: field.label,
      companyName,
      currentValue,
      prompt: buildFieldAiAssistPrompt(companyName, field.label, currentValue, evidence),
      sources: [],
      suggestedActions: [],
    });
  };

  const submitFieldAiAssist = async () => {
    if (!fieldAiAssist) return;
    if (!currentProjectId || Number.isNaN(Number(currentProjectId))) {
      setFieldAiError('Cannot ask AI because no active project is selected.');
      return;
    }

    const prompt = fieldAiAssist.prompt.trim();
    if (!prompt) {
      setFieldAiError('Please enter a question for AI.');
      return;
    }

    setFieldAiLoading(true);
    setFieldAiError(null);

    try {
      const payload: { projectId: number; question: string; sessionId?: string } = {
        projectId: Number(currentProjectId),
        question: prompt,
      };
      if (fieldAiAssist.sessionId) payload.sessionId = fieldAiAssist.sessionId;

      const response = await api.post<FieldAiChatResponse>('/ai-assistant/chat', payload, { timeoutMs: null });
      setFieldAiAssist((current) => current ? {
        ...current,
        answer: response.data?.answer || 'AI did not return an answer.',
        sessionId: response.data?.sessionId || current.sessionId,
        sources: response.data?.sources || [],
        suggestedActions: response.data?.suggestedActions || [],
      } : current);
    } catch (error) {
      setFieldAiError(error instanceof Error ? error.message : 'Cannot connect to the AI assistant.');
    } finally {
      setFieldAiLoading(false);
    }
  };

  const copyFieldAiPrompt = async () => {
    if (!fieldAiAssist) return;
    try {
      await navigator.clipboard?.writeText(fieldAiAssist.prompt);
      setToast({ kind: 'success', message: 'AI prompt copied.' });
    } catch {
      setFieldAiError('Cannot copy this prompt from the browser.');
    }
  };

  const handleCreateCandidateFromReviewedExtractions = async () => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before creating a candidate draft.');
      return;
    }
    if (pendingExtractionReviews.length === 0) {
      setWorkbenchError('Please extract at least one document before creating a candidate.');
      return;
    }

    setStaffCandidateLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);
    setAiProgress({ percent: 10, label: 'Saving staff review corrections' });

    try {
      for (const [index, review] of pendingExtractionReviews.entries()) {
        const basePercent = Math.round(((index + 1) / (pendingExtractionReviews.length + 2)) * 70);
        setAiProgress({ percent: Math.max(10, basePercent), label: `Saving review for ${review.fileName}` });
        await api.patch(`/ai-extractions/${review.id}`, buildExtractedCompanyDataPayload(review.edit), { timeoutMs: null });
        setAiProgress({ percent: Math.min(85, basePercent + 8), label: `Marking ${review.fileName} as reviewed` });
        await api.post(`/ai-extractions/${review.id}/review/complete`, undefined, { timeoutMs: null });
      }

      setAiProgress({ percent: 90, label: 'Creating candidate draft from reviewed extractions' });
      const mergePayload = await api.post<MergeCandidateResponse>(
        `/projects/${selectedStaffTask.projectId}/tasks/${selectedStaffTask.id}/candidates/from-extractions`,
        {
          extractionIds: pendingExtractionReviews.map((review) => review.id),
          note: `Created from ${pendingExtractionReviews.length} reviewed project document extraction(s).`,
        },
        { timeoutMs: null }
      );

      const candidateId = mergePayload.data?.candidateId;
      if (!candidateId) {
        throw new Error('Candidate draft was created, but no candidate ID was returned.');
      }

      const candidatePayload = await candidateApi.getCandidateById(candidateId);
      setAiProgress({ percent: 100, label: 'Candidate draft created' });
      setStaffCandidate(candidatePayload.data);
      setStaffCandidateEdit(candidateToEditForm(candidatePayload.data));
      setLastExtractionReviews(pendingExtractionReviews);
      setPendingExtractionReviews([]);
      setSelectedProjectDocumentIds([]);
      setWorkbenchMessage(`Candidate draft created from ${pendingExtractionReviews.length} reviewed extraction(s).`);
      await loadStaffWorkbench(selectedStaffTask);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot create candidate from reviewed extractions.');
    } finally {
      setStaffCandidateLoading(false);
      window.setTimeout(() => setAiProgress(null), 900);
    }
  };

  const restoreLastExtractionReview = () => {
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before editing AI extraction data.');
      return;
    }
    if (staffCandidate?.status !== 'DRAFT') {
      setWorkbenchError('This candidate has already been submitted or rejected. Please run AI extraction again from the source documents.');
      return;
    }
    if (lastExtractionReviews.length === 0) {
      setWorkbenchError('No previous AI extraction review is available.');
      return;
    }
    setPendingExtractionReviews(lastExtractionReviews);
    setWorkbenchMessage('Returned to the latest AI extraction review. Update the fields, then create the candidate draft again.');
  };

  const handleExtractSelectedProjectDocuments = async () => {
    await extractProjectDocumentsForReview(projectDocuments.filter((document) => selectedProjectDocumentIds.includes(document.id)));
  };

  const handleCreateStaffCandidate = async (extractionId: string) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before creating a candidate draft.');
      return;
    }
    setStaffCandidateLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await candidateApi.createCandidateFromExtraction(extractionId);
      setStaffCandidate(payload.data);
      setStaffCandidateEdit(candidateToEditForm(payload.data));
      setWorkbenchMessage('Candidate draft created. Review and correct fields before submitting.');
      await loadStaffWorkbench(selectedStaffTask);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot create candidate from extraction.');
    } finally {
      setStaffCandidateLoading(false);
    }
  };

  const handleOpenStaffCandidate = async (candidateId: string) => {
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before opening candidate drafts.');
      return;
    }
    setStaffCandidateLoading(true);
    setWorkbenchError(null);

    try {
      const payload = await candidateApi.getCandidateById(candidateId);
      setStaffCandidate(payload.data);
      setStaffCandidateEdit(candidateToEditForm(payload.data));
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot load candidate detail.');
    } finally {
      setStaffCandidateLoading(false);
    }
  };

  const handleDeleteStaffCandidateDraft = (candidateId: string, candidateLabel: string, status: CandidateStatus) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before deleting candidate drafts.');
      return;
    }
    setCandidateDraftPendingDelete({ candidateId, label: candidateLabel, status });
  };

  const confirmDeleteStaffCandidateDraft = async () => {
    if (!selectedStaffTask || !candidateDraftPendingDelete) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before deleting candidate drafts.');
      return;
    }
    const { candidateId, label } = candidateDraftPendingDelete;

    setDeletingCandidateDraftId(candidateId);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await candidateApi.deleteCandidate(candidateId);
      setWorkbench((current) => current ? {
        ...current,
        candidateDrafts: current.candidateDrafts?.filter((draft) => draft.candidateId !== candidateId) ?? [],
      } : current);
      if (staffCandidate?.id === candidateId) {
        setStaffCandidate(null);
        setStaffCandidateEdit(emptyStaffCandidateEdit);
      }
      setCandidateDraftPendingDelete(null);
      setToast({ kind: 'success', message: `Candidate "${label}" deleted successfully.` });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Cannot delete candidate draft.' });
    } finally {
      setDeletingCandidateDraftId(null);
    }
  };

  const handleSubmitStaffCandidate = async () => {
    if (!selectedStaffTask || !staffCandidate) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before submitting a candidate.');
      return;
    }
    if (staffCandidate.status !== 'DRAFT') {
      setWorkbenchError('Only the selected candidate draft with DRAFT status can be submitted to manager.');
      return;
    }
    setStaffSubmitLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const candidatePayload = await candidateApi.submitCandidate(staffCandidate.id);
      setStaffCandidate(candidatePayload.data);
      setStaffCandidateEdit(candidateToEditForm(candidatePayload.data));

      await taskApi.submitTask(selectedStaffTask.projectId, selectedStaffTask.id, {
        submissionType: 'COMPANY_CANDIDATE',
        targetEntityType: 'CompanyCandidate',
        targetEntityId: candidatePayload.data.id,
        note: 'Candidate submitted for manager review.',
      });

      const updatedTask = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'IN_REVIEW');
      updateTaskInState(updatedTask.data);
      setSelectedStaffTask(updatedTask.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
      setWorkbenchMessage(`Selected candidate draft ${candidatePayload.data.id.slice(-8)} submitted to manager review.`);
      await loadTaskWorkbench(updatedTask.data);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot submit candidate to manager.');
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  const buildStaffTaskSubmissionNote = (taskType: TaskType, fallbackNote: string) => {
    if (taskType === 'ROLE_EVALUATION') {
      const parts = [
        roleEvaluationForm.relationship && `Relationship: ${roleEvaluationForm.relationship}`,
        roleEvaluationForm.riskLevel && `Risk level: ${roleEvaluationForm.riskLevel}`,
        roleEvaluationForm.evidenceSummary && `Evidence: ${roleEvaluationForm.evidenceSummary}`,
        roleEvaluationForm.recommendation && `Recommendation: ${roleEvaluationForm.recommendation}`,
        staffTaskNote.trim() && `Additional note: ${staffTaskNote.trim()}`,
      ].filter(Boolean);

      return parts.length > 0 ? parts.join('\n') : fallbackNote;
    }

    if (taskType === 'GENERAL_TASK') {
      const checkedItems = [
        generalTaskForm.checklist.workDone && 'Work completed',
        generalTaskForm.checklist.evidenceAttached && 'Evidence attached',
        generalTaskForm.checklist.readyForReview && 'Ready for manager review',
      ].filter(Boolean);

      const parts = [
        generalTaskForm.resultSummary && `Result: ${generalTaskForm.resultSummary}`,
        generalTaskForm.nextStep && `Next step: ${generalTaskForm.nextStep}`,
        generalTaskForm.blocker && `Blocker: ${generalTaskForm.blocker}`,
        checkedItems.length > 0 && `Checklist: ${checkedItems.join(', ')}`,
        staffTaskNote.trim() && `Additional note: ${staffTaskNote.trim()}`,
      ].filter(Boolean);

      return parts.length > 0 ? parts.join('\n') : fallbackNote;
    }

    return staffTaskNote.trim() || fallbackNote;
  };

  const handleSubmitStaffTaskReview = async (
    submissionType: 'DOCUMENT_COLLECTION' | 'ROLE_EVALUATION' | 'OTHER',
    fallbackNote: string
  ) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before submitting it to manager.');
      return;
    }
    const latestDocument = workbench?.documents?.[0];
    const note = buildStaffTaskSubmissionNote(selectedStaffTask.taskType, fallbackNote);

    setStaffSubmitLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await taskApi.submitTask(selectedStaffTask.projectId, selectedStaffTask.id, {
        submissionType,
        targetEntityType: latestDocument ? 'ImportJob' : selectedStaffTask.taskType,
        targetEntityId: latestDocument?.id ? String(latestDocument.id) : String(selectedStaffTask.id),
        note,
      });

      if (selectedStaffTask.taskType === 'DOCUMENT_COLLECTION') {
        const completedTask: ProjectTaskResponse = {
          ...selectedStaffTask,
          status: 'DONE',
          completedAt: new Date().toISOString(),
        };
        updateTaskInState(completedTask);
        setWorkbench((current) => current ? { ...current, taskStatus: 'DONE' } : current);
        setToast({ kind: 'success', message: 'Documents submitted directly to the project.' });
        await loadStaffWorkbench(completedTask);
        setSelectedStaffTask(null);
        setStaffTaskNote('');
        if (activeTab === 'Documents') {
          setDocumentsTabItems([]);
        }
        return;
      }

      const updatedTask = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'IN_REVIEW');
      updateTaskInState(updatedTask.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
      setWorkbenchMessage('Task submitted to manager review.');
      await loadStaffWorkbench(updatedTask.data);
      setSelectedStaffTask(null);
      setStaffTaskNote('');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot submit this task to manager.');
    } finally {
      setStaffSubmitLoading(false);
    }
  };

  const handleManagerReviewSubmission = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedManagerReviewTask) return;
    const submission = workbench?.submissions?.find((item) => item.status === 'IN_REVIEW')
      ?? workbench?.submissions?.[0];

    if (!submission) {
      setWorkbenchError('No submission found for this task.');
      return;
    }

    const comment = managerReviewComment.trim();
    if (decision === 'REJECT' && !comment) {
      setWorkbenchError('Please add a reason before rejecting this task.');
      return;
    }

    setManagerReviewLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await taskApi.reviewSubmission(selectedManagerReviewTask.projectId, selectedManagerReviewTask.id, submission.id, {
        decision,
        comment: comment || (decision === 'APPROVE' ? 'Approved by manager.' : 'Needs correction.'),
      });

      const nextStatus: ApiTaskStatus = decision === 'APPROVE' ? 'DONE' : 'IN_PROGRESS';
      const updatedTask: ProjectTaskResponse = {
        ...selectedManagerReviewTask,
        status: nextStatus,
        completedAt: decision === 'APPROVE' ? new Date().toISOString() : null,
      };

      setApiTasks((current) => current.map((item) => item.id === updatedTask.id ? updatedTask : item));
      setSelectedManagerReviewTask(updatedTask);
      setWorkbench((current) => current ? { ...current, taskStatus: nextStatus } : current);
      setWorkbenchMessage(decision === 'APPROVE' ? 'Task approved and moved to Done.' : 'Task rejected and returned to staff.');
      await loadManagerWorkbench(updatedTask);
      setSelectedManagerReviewTask(null);
      setManagerReviewComment('');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot review this submission.');
    } finally {
      setManagerReviewLoading(false);
    }
  };

  const handleDocumentFileAction = async (document: WorkbenchDocumentResponse, action: 'open' | 'download') => {
    if (!document.rawDocumentId || !document.projectId) {
      setWorkbenchError('This document does not have a downloadable source file.');
      return;
    }

    setWorkbenchError(null);

    try {
      const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
      const url = `${API_BASE_URL}/projects/${document.projectId}/documents/${encodeURIComponent(document.rawDocumentId)}/download?download=${action === 'download'}`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Cannot open this document.');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (action === 'open') {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      }

      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = document.fileName || `document-${document.rawDocumentId}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot open this document.');
    }
  };

  const managerCandidateDrafts = useMemo(() => {
    const drafts = workbench?.candidateDrafts ?? [];
    if (!selectedManagerReviewTask || selectedManagerReviewTask.taskType !== 'COMPANY_DATA_PREPARATION') return [];

    if (selectedManagerReviewTask.status === 'DONE') {
      return drafts.filter((draft) =>
        draft.status === 'APPROVED'
        || draft.status === 'REJECTED'
        || draft.status === 'PENDING_REVIEW'
        || Boolean(draft.isApproved)
        || Boolean(draft.isUnderReview)
      );
    }

    return drafts.filter((draft) => draft.isUnderReview || draft.status === 'PENDING_REVIEW');
  }, [selectedManagerReviewTask, workbench?.candidateDrafts]);

  const managerReviewDocuments = useMemo(() => {
    const documentsByKey = new Map<string, WorkbenchDocumentResponse>();
    const addDocument = (document: WorkbenchDocumentResponse) => {
      const key = document.rawDocumentId || String(document.id);
      if (!documentsByKey.has(key)) documentsByKey.set(key, document);
    };

    (workbench?.documents ?? []).forEach(addDocument);

    const sourceDocumentIds = new Set(
      managerCandidateDrafts.flatMap((draft) => draft.sourceDocumentIds ?? []).filter(Boolean)
    );

    if (sourceDocumentIds.size > 0) {
      projectDocuments
        .filter((document) =>
          sourceDocumentIds.has(document.rawDocumentId || '')
          || sourceDocumentIds.has(String(document.id))
        )
        .forEach(addDocument);
    }

    return Array.from(documentsByKey.values());
  }, [managerCandidateDrafts, projectDocuments, workbench?.documents]);

  return (
    <section className={styles.page}>
      {toast && <div className={`apms-toast ${toast.kind}`}>{toast.message}</div>}
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.backRow}>
            <button className={styles.backButton} type="button" onClick={() => setActivePage ? setActivePage('project-management') : history.back()}>
              <ArrowLeft size={16} /> Back to project list
            </button>
          </div>
          <motion.header className={styles.header} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.breadcrumb}>
              Projects <ChevronRight size={14} /> {displayedProject.key}
            </div>
            {projectError && !/403|denied|forbidden/i.test(projectError) && <div className={styles.inlineError}>{projectError}</div>}
            <div className={styles.headerTop}>
              <div className={styles.titleBlock}>
                <h1>{projectLoading ? 'Loading project...' : displayedProject.name}</h1>
                <div className={styles.keyLine}>
                  <span className={styles.badge}>{displayedProject.key}</span>
                  <span className={styles.statusPill}>{displayedProject.status}</span>
                  <span>{displayedProject.type}</span>
                  {displayedProject.targetCompanyName && <span>{displayedProject.targetCompanyName}</span>}
                </div>
                {displayedProject.description && <p className={styles.projectDescription}>{displayedProject.description}</p>}
              </div>
              <div className={styles.actions}>
                {isManager && isDraftProject && (
                  <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void handleActivateProject()} disabled={statusLoading}>
                    <CheckCircle2 size={16} />{statusLoading ? 'Activating...' : 'Activate Project'}
                  </button>
                )}
                {isManager && (
                  <>
                    <button className={styles.button} type="button"><Edit3 size={16} />Edit Project</button>
                    <button
                      className={`${styles.button} ${styles.primaryButton}`}
                      type="button"
                      onClick={() => {
                        if (ensureProjectIsActive('adding staff')) setShowInviteModal(true);
                      }}
                    >
                      <UserPlus size={16} />Invite Member
                    </button>
                    <button className={styles.iconButton} type="button" aria-label="More actions"><MoreHorizontal size={18} /></button>
                  </>
                )}
              </div>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}><span>Priority</span><strong>{displayedProject.priority}</strong></div>
              <div className={styles.metaItem}><span>Owner</span><strong>{displayedProject.owner.name}</strong></div>
              <div className={styles.metaItem}><span>Start date</span><strong>{displayedProject.startDate}</strong></div>
              <div className={styles.metaItem}><span>Due date</span><strong>{displayedProject.dueDate}</strong></div>
            </div>
          </motion.header>

          <nav className={styles.tabs} aria-label="Project navigation tabs">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          {activeTab === 'Kanban Board' ? (
            <>
              {taskError && !/403|denied|forbidden/i.test(taskError) && <div className={styles.inlineError}>{taskError}</div>}
              <div className={styles.board}>
                {columns.map((column) => {
                  const columnTasks = tasks.filter((task) => task.status === column.id);
                  return (
                    <motion.section
                      layout
                      key={column.id}
                      className={styles.column}
                    >
                      <div className={styles.columnHeader}>
                        <div>
                          <h3>{column.title}</h3>
                          <p>{column.hint}</p>
                        </div>
                        <span className={styles.count}>{columnTasks.length}</span>
                      </div>
                      <div className={styles.cards}>
                        <AnimatePresence>
                          {columnTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onOpen={handleOpenTask}
                              onDelete={!isStaffView ? handleDeleteTask : undefined}
                              deleting={deletingTaskId === Number(task.id.replace('APMS-', ''))}
                            />
                          ))}
                        </AnimatePresence>
                        {columnTasks.length === 0 && <div className={styles.empty}>{tasksLoading ? 'Loading tasks...' : 'No tasks yet'}</div>}
                        {!isStaffView && column.id === 'todo' && (
                          <button
                            className={styles.columnCreateButton}
                            type="button"
                            onClick={() => {
                              if (ensureProjectIsActive('assigning tasks to employees')) setShowCreateTaskModal(true);
                            }}
                          >
                            <Plus size={16} />Create
                          </button>
                        )}
                      </div>
                    </motion.section>
                  );
                })}
              </div>
            </>
          ) : activeTab === 'Candidates' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Candidate review</h2>
                  <p>Review extracted company candidates before approving them into Company Profile records.</p>
                </div>
                <span className={styles.count}>{filteredCandidates.length}/{candidateStats.totalVisible}</span>
              </div>

              {candidateError && !/403|denied|forbidden/i.test(candidateError) && <div className={styles.inlineError}>{candidateError}</div>}
              {candidateActionMessage && <div className={styles.inlineSuccess}>{candidateActionMessage}</div>}

              <div className={styles.candidateStats}>
                <div><span>Total candidates</span><strong>{candidateStats.totalVisible}</strong></div>
                <div><span>Need review</span><strong>{candidateStats.pending}</strong></div>
                <div><span>Approved</span><strong>{candidateStats.approved}</strong></div>
                <div><span>Rejected</span><strong>{candidateStats.rejected}</strong></div>
                <div><span>Missing data</span><strong>{candidateStats.incomplete}</strong></div>
                <div><span>Avg confidence</span><strong>{candidateStats.averageConfidence === null ? 'N/A' : `${candidateStats.averageConfidence}%`}</strong></div>
              </div>

              <div className={styles.candidateToolbar}>
                <label className={styles.candidateSearch}>
                  <Search size={16} />
                  <input
                    value={candidateSearch}
                    placeholder="Search company, industry, tax ID..."
                    onChange={(event) => setCandidateSearch(event.target.value)}
                  />
                </label>
                <label className={styles.candidateFilter}>
                  <Filter size={16} />
                  <select value={candidateStatusFilter} onChange={(event) => setCandidateStatusFilter(event.target.value as CandidateStatus | 'ALL')}>
                    <option value="ALL">All status</option>
                    <option value="PENDING_REVIEW">Pending review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
                <label className={styles.candidateFilter}>
                  <select value={candidateRelationshipFilter} onChange={(event) => setCandidateRelationshipFilter(event.target.value)}>
                    <option value="ALL">All relationships</option>
                    {candidateRelationshipOptions.map((relationship) => (
                      <option key={relationship} value={relationship}>{relationship}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.candidateReviewTableWrap}>
                <table className={styles.candidateReviewTable}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Candidate</th>
                      <th>Project relationship</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesLoading && (
                      <tr>
                        <td colSpan={6}><div className={styles.empty}>Loading candidates...</div></td>
                      </tr>
                    )}
                    {!candidatesLoading && filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={6}><div className={styles.empty}>No candidate matches your review filters.</div></td>
                      </tr>
                    )}
                    {!candidatesLoading && filteredCandidates.map((candidate, index) => (
                      <tr key={candidate.id}>
                        <td>
                          <span className={styles.candidateOrderCell}>{index + 1}</span>
                        </td>
                        <td>
                          <div className={styles.candidateNameCell}>
                            <span>
                              <strong>{candidateName(candidate)}</strong>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.relationshipCell}>
                            <strong>{candidate.suggestedRelationshipType || candidate.relationshipTypeOverride || 'Project default'}</strong>
                            <small>{displayedProject.type}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.candidateConfidenceBadge} ${candidateConfidenceClass(candidate)}`}>
                            {candidateConfidenceLabel(candidate)}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.candidateStatus} ${candidateStatusClass[candidate.status]}`}>
                            {candidateStatusLabel[candidate.status]}
                          </span>
                        </td>
                        <td>
                          <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void openCandidateDetail(candidate)}>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : activeTab === 'Documents' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Project documents</h2>
                  <p>View documents uploaded from document collection tasks and other project evidence sources.</p>
                </div>
                <span className={styles.count}>{filteredDocuments.length}/{documentsTabItems.length}</span>
              </div>

              {documentsTabError && <div className={styles.inlineError}>{documentsTabError}</div>}

              <div className={styles.candidateToolbar}>
                <label className={styles.candidateSearch}>
                  <Search size={16} />
                  <input
                    value={documentSearch}
                    placeholder="Search file name, uploader, type, status..."
                    onChange={(event) => setDocumentSearch(event.target.value)}
                  />
                </label>
                <label className={styles.candidateFilter}>
                  <Filter size={16} />
                  <select value={documentSort} onChange={(event) => setDocumentSort(event.target.value as typeof documentSort)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">File name</option>
                    <option value="type">File type</option>
                    <option value="size">File size</option>
                  </select>
                </label>
              </div>

              <div className={styles.projectDocumentsGrid}>
                {documentsTabLoading && <div className={styles.empty}>Loading project documents...</div>}
                {!documentsTabLoading && filteredDocuments.length === 0 && (
                  <div className={styles.documentEmptyState}>
                    <FileText size={26} />
                    <strong>No documents found</strong>
                    <span>Uploaded documents from Document Collection tasks will appear here after staff submit them to the project.</span>
                  </div>
                )}
                {!documentsTabLoading && filteredDocuments.map((document) => (
                  <article className={styles.projectDocumentCard} key={document.rawDocumentId || document.id}>
                    <div className={styles.projectDocumentIcon}>
                      <FileText size={22} />
                    </div>
                    <div className={styles.projectDocumentBody}>
                      <div className={styles.projectDocumentTitleRow}>
                        <strong>{document.fileName || `Import job #${document.id}`}</strong>
                        <span>{document.sourceType || 'OTHER'}</span>
                      </div>
                      <div className={styles.projectDocumentMetaGrid}>
                        <div><span>Uploaded by</span><strong>{document.uploadedByName || (document.uploadedBy ? `User #${document.uploadedBy}` : 'Unknown')}</strong></div>
                        <div><span>Uploaded</span><strong>{formatDateTime(document.uploadedAt || document.createdAt)}</strong></div>
                        <div><span>File type</span><strong>{document.mimeType || document.sourceType || 'N/A'}</strong></div>
                        <div><span>File size</span><strong>{formatFileSize(document.fileSizeBytes)}</strong></div>
                        <div><span>Status</span><strong>{document.status}</strong></div>
                        <div><span>Source task</span><strong>{document.taskId ? `Task #${document.taskId}` : 'Project upload'}</strong></div>
                      </div>
                      {document.errorMessage && <p className={styles.projectDocumentError}>{document.errorMessage}</p>}
                    </div>
                    <div className={styles.projectDocumentActions}>
                      <button
                        className={styles.button}
                        type="button"
                        onClick={() => void handleDocumentFileAction(document, 'open')}
                        disabled={!document.rawDocumentId}
                      >
                        <ExternalLink size={16} />Preview
                      </button>
                      <button
                        className={`${styles.button} ${styles.primaryButton}`}
                        type="button"
                        onClick={() => void handleDocumentFileAction(document, 'download')}
                        disabled={!document.rawDocumentId}
                      >
                        <Download size={16} />Download
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          ) : activeTab === 'Members' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Project members</h2>
                  <p>Review who owns this project and which employees are assigned to the workspace.</p>
                </div>
                {!isStaffView && (
                  <button
                    className={`${styles.button} ${styles.primaryButton}`}
                    type="button"
                    onClick={() => {
                      if (ensureProjectIsActive('adding staff')) setShowInviteModal(true);
                    }}
                  >
                    <UserPlus size={16} />Invite Member
                  </button>
                )}
              </div>

              <div className={styles.memberTableWrap}>
                <table className={styles.memberTable}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectMembers.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <div className={styles.empty}>No members found in this project.</div>
                        </td>
                      </tr>
                    )}
                    {projectMembers.map((member, index) => {
                      const isManager = member.memberRole === 'MANAGER';
                      return (
                        <tr key={`${member.id}-${member.accountId}`} className={isManager ? styles.managerRow : ''}>
                          <td>{index + 1}</td>
                          <td>
                            <div className={styles.memberCell}>
                              <span className={`${styles.memberAvatar} ${isManager ? styles.managerAvatar : ''}`}>
                                {memberInitials(member)}
                              </span>
                              <span>
                                <strong>{memberDisplayName(member)}</strong>
                                <small>{member.email || 'Email not available'}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.memberRoleBadge} ${isManager ? styles.managerBadge : styles.staffBadge}`}>
                              {memberRoleLabel(member)}
                            </span>
                          </td>
                          <td>{formatMemberDate(member.joinedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : (
            <motion.div className={styles.header} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2>{activeTab}</h2>
              <p className={styles.description}>This section is prepared for future API integration and detailed project workflows.</p>
            </motion.div>
          )}
        </main>
      </div>
      <AnimatePresence>
        {showInviteModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)}>
            <motion.div
              className={styles.inviteModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="invite-member-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>Project access</span>
                  <h2 id="invite-member-title">Invite member</h2>
                  <p>Search an account from the database by email, then assign a project role.</p>
                </div>
                <button className={styles.iconButton} type="button" aria-label="Close invite member modal" onClick={() => setShowInviteModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {inviteError && <div className={styles.inlineError}>{inviteError}</div>}
              {inviteMessage && <div className={styles.inlineSuccess}>{inviteMessage}</div>}

              <label className={styles.inviteField}>
                <span>Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  placeholder="Type user email..."
                  onChange={(event) => {
                    setInviteEmail(event.target.value);
                    setSelectedAccount(null);
                    setInviteMessage(null);
                  }}
                />
              </label>

              <div className={styles.suggestionPanel}>
                <div className={styles.suggestionHead}>
                  <span>Suggestions</span>
                  {accountsLoading && <small>Loading...</small>}
                </div>
                {!inviteEmail.trim() && (
                  <div className={styles.suggestionEmpty}>Type the first email character to search members.</div>
                )}
                {inviteEmail.trim() && !accountsLoading && suggestedAccounts.length === 0 && (
                  <div className={styles.suggestionEmpty}>No account found for this email.</div>
                )}
                {suggestedAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className={`${styles.suggestionItem} ${selectedAccount?.id === account.id ? styles.suggestionActive : ''}`}
                    onClick={() => selectSuggestedAccount(account)}
                  >
                    <span className={styles.suggestionAvatar}>{accountName(account).slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{accountName(account)}</strong>
                      <small>{account.email} - {roleName(account)}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.button} type="button" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void handleInviteMember()} disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading ? 'Inviting...' : 'Add member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateTaskModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateTaskModal(false)}>
            <motion.div
              className={styles.inviteModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-task-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>Kanban task</span>
                  <h2 id="create-task-title">Create task</h2>
                  <p>Create a real project task and assign it to one employee in this project.</p>
                </div>
                <button className={styles.iconButton} type="button" aria-label="Close create task modal" onClick={() => setShowCreateTaskModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {createTaskError && <div className={styles.inlineError}>{createTaskError}</div>}

              <div className={styles.taskFormGrid}>
                <label className={styles.inviteField}>
                  <span>Task title</span>
                  <input
                    value={createTaskForm.title}
                    placeholder="Example: Validate company ownership documents"
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>

                <label className={styles.inviteField}>
                  <span>Assignee</span>
                  <select
                    value={createTaskForm.assignedToUserId}
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, assignedToUserId: event.target.value }))}
                  >
                    <option value="">Select an employee</option>
                    {(assignableMembers.length ? assignableMembers : projectMembers).map((member) => (
                      <option key={member.accountId} value={member.accountId}>
                        {memberDisplayName(member)} - {member.email || `Account #${member.accountId}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.inviteField}>
                  <span>Priority</span>
                  <select
                    value={createTaskForm.priority}
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, priority: event.target.value as ApiTaskPriority }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>

                <label className={styles.inviteField}>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={createTaskForm.dueDate}
                    min={toInputDate(new Date().toISOString())}
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </label>

                <label className={styles.inviteField}>
                  <span>Task type</span>
                  <select
                    value={createTaskForm.taskType}
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, taskType: event.target.value as TaskType }))}
                  >
                    <option value="GENERAL_TASK">General task</option>
                    <option value="DOCUMENT_COLLECTION">Document collection</option>
                    <option value="COMPANY_DATA_PREPARATION">Company data preparation</option>
                    <option value="ROLE_EVALUATION">Role evaluation</option>
                    <option value="COMPANY_MEMBER_RESEARCH">Company member research</option>
                  </select>
                </label>

                <label className={`${styles.inviteField} ${styles.fullField}`}>
                  <span>Description</span>
                  <textarea
                    value={createTaskForm.description}
                    placeholder="Add task context, expected output, and review notes..."
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </div>

              {projectMembers.length === 0 && (
                <div className={styles.inlineError}>This project has no members yet. Invite an employee before creating tasks.</div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.button} type="button" onClick={() => setShowCreateTaskModal(false)}>Cancel</button>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  type="button"
                  onClick={() => void handleCreateTask()}
                  disabled={createTaskLoading || projectMembers.length === 0}
                >
                  {createTaskLoading ? 'Creating...' : 'Create task'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {taskPendingDelete && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!deletingTaskId) setTaskPendingDelete(null);
            }}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-task-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>Delete task</span>
                  <h2 id="delete-task-title">Confirm task deletion</h2>
                  <p>
                    Are you sure you want to delete <strong>{taskPendingDelete.id}</strong>? This task will be removed from the project board.
                  </p>
                </div>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Close delete confirmation"
                  onClick={() => setTaskPendingDelete(null)}
                  disabled={Boolean(deletingTaskId)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.deleteTaskPreview}>
                <Trash2 size={20} />
                <div>
                  <strong>{taskPendingDelete.title}</strong>
                  <span>{taskPendingDelete.labels.join(', ') || 'Project task'}</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => setTaskPendingDelete(null)}
                  disabled={Boolean(deletingTaskId)}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.button} ${styles.dangerButton}`}
                  type="button"
                  onClick={() => void confirmDeleteTask()}
                  disabled={Boolean(deletingTaskId)}
                >
                  {deletingTaskId ? 'Deleting...' : 'Delete task'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedStaffTask && (
          <motion.div
            className={`${styles.modalOverlay} ${styles.taskWorkbenchOverlay}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStaffTask(null)}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.staffWorkbenchModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-workbench-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>APMS-{selectedStaffTask.id}</span>
                  <h2 id="staff-workbench-title">{selectedStaffTask.title}</h2>
                  <p>{selectedStaffTask.description || taskTypeText[selectedStaffTask.taskType].description}</p>
                </div>
                <button className={styles.iconButton} type="button" aria-label="Close staff workbench" onClick={() => setSelectedStaffTask(null)}>
                  <X size={18} />
                </button>
              </div>

              {workbenchError && <div className={styles.inlineError}>{workbenchError}</div>}
              {workbenchMessage && <div className={styles.inlineSuccess}>{workbenchMessage}</div>}
              {(() => {
                const rejectedSubmission = workbench?.submissions
                  ?.filter((submission) => submission.status === 'REJECTED' && submission.reviewComment)
                  .at(-1);

                return rejectedSubmission ? (
                  <div className={styles.reviewNoteAlert}>
                    <strong>Manager requested correction</strong>
                    <span>{rejectedSubmission.reviewComment}</span>
                  </div>
                ) : null;
              })()}

              <div className={styles.workbenchStatusRow}>
                <div>
                  <span>Status</span>
                  <strong>{workbench?.taskStatus || selectedStaffTask.status}</strong>
                </div>
                <div>
                  <span>Task type</span>
                  <strong>{selectedStaffTask.taskType.replace(/_/g, ' ')}</strong>
                </div>
                <div>
                  <span>Due date</span>
                  <strong>{formatOptionalDate(selectedStaffTask.dueDate)}</strong>
                </div>
                <div>
                  <span>Project target</span>
                  <strong>{workbench?.targetCompanyName || displayedProject.targetCompanyName || 'No target'}</strong>
                </div>
              </div>

              <div className={styles.workbenchTopActions}>
                {staffTaskStatus === 'TODO' ? (
                  <button
                    className={`${styles.button} ${styles.primaryButton}`}
                    type="button"
                    onClick={() => void handleStartStaffTask()}
                  >
                    <Clock size={16} />Start task
                  </button>
                ) : staffTaskStatus === 'IN_PROGRESS' ? (
                  <button
                    className={`${styles.button} ${styles.dangerButton}`}
                    type="button"
                    onClick={() => void handleCancelStaffTask()}
                  >
                    <X size={16} />Cancel task
                  </button>
                ) : (
                  <span className={styles.taskTypeBadge}>{staffTaskStatus}</span>
                )}
                <span>
                  {staffTaskStatus === 'TODO'
                    ? 'Start this task to move it from To Do to In Progress.'
                    : `Current task status: ${workbench?.taskStatus || selectedStaffTask.status}`}
                </span>
              </div>
              {!canUseStaffWorkbench && staffTaskStatus === 'TODO' && (
                <div className={styles.reviewNoteAlert}>
                  <strong>Task has not started yet</strong>
                  <span>Click Start task to move this task to In Progress before using upload, AI extraction, candidate draft, submit, or delete actions.</span>
                </div>
              )}

              <div className={styles.workbenchFlow}>
                {taskTypeText[selectedStaffTask.taskType].steps.map((step, index) => (
                  <div
                    key={step}
                    className={`${styles.workbenchStep} ${isStaffWorkbenchStepActive(step) ? styles.workbenchStepDone : ''}`}
                  >
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.staffWorkbenchGrid}>
                <main className={styles.workbenchMain}>
                  {selectedStaffTask.taskType === 'COMPANY_DATA_PREPARATION' ? (
                  <>
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Project document library</h3>
                        <p>Select one or more existing project documents, run AI extraction, then review the extracted fields before creating a candidate.</p>
                      </div>
                      <button
                        className={`${styles.button} ${styles.primaryButton}`}
                        type="button"
                        onClick={() => void handleExtractSelectedProjectDocuments()}
                        disabled={!canUseStaffWorkbench || extractingSelectedDocuments || selectedProjectDocumentIds.length === 0}
                      >
                        <Sparkles size={16} />
                        {extractingSelectedDocuments ? 'Extracting...' : `Extract AI (${selectedProjectDocumentIds.length})`}
                      </button>
                    </div>

                    <div className={styles.documentSelectionSummary}>
                      <span>{projectDocuments.length} project document(s)</span>
                      <span>{selectedProjectDocumentIds.length} selected</span>
                    </div>

                    {aiProgress && (
                      <div className={styles.aiProgressPanel}>
                        <div className={styles.aiProgressHead}>
                          <div>
                            <strong>AI is running</strong>
                            <span>{aiProgress.label}</span>
                          </div>
                          <b>{aiProgress.percent}%</b>
                        </div>
                        <div className={styles.aiProgressTrack}>
                          <span style={{ width: `${Math.max(5, aiProgress.percent)}%` }} />
                        </div>
                        <small>Please keep this modal open while AI is processing.</small>
                      </div>
                    )}

                    <div className={styles.projectDocumentList}>
                      {projectDocumentsLoading && <div className={styles.empty}>Loading project documents...</div>}
                      {!projectDocumentsLoading && projectDocuments.length === 0 && (
                        <div className={styles.empty}>No project documents found. Upload documents from the project document screen first.</div>
                      )}
                      {projectDocuments.map((document) => {
                        const selected = selectedProjectDocumentIds.includes(document.id);
                        return (
                        <article className={`${styles.documentItem} ${selected ? styles.documentItemSelected : ''}`} key={document.id}>
                          <label className={styles.documentCheckbox}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleProjectDocumentSelection(document.id)}
                              disabled={!canUseStaffWorkbench}
                            />
                          </label>
                          <div className={styles.documentIcon}><FileText size={18} /></div>
                          <div>
                            <strong>{document.fileName || `Import job #${document.id}`}</strong>
                            <span>{document.status} - uploaded {formatOptionalDate(document.createdAt)}</span>
                            <small>
                              Import job: {document.id} | Raw document: {document.rawDocumentId || 'N/A'}
                            </small>
                          </div>
                          <div className={styles.documentActions}>
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void handleDocumentFileAction(document, 'open')}
                              disabled={!canUseStaffWorkbench || !document.rawDocumentId}
                            >
                              <ExternalLink size={16} />Open
                            </button>
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void handleDocumentFileAction(document, 'download')}
                              disabled={!canUseStaffWorkbench || !document.rawDocumentId}
                            >
                              <Download size={16} />Download
                            </button>
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void extractProjectDocumentsForReview([document])}
                              disabled={!canUseStaffWorkbench || extractingImportJobId === document.id || extractingSelectedDocuments}
                            >
                              <Sparkles size={16} />{extractingImportJobId === document.id ? 'Running...' : 'Extract for review'}
                            </button>
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  </section>

                  {pendingExtractionReviews.length > 0 && (
                    <section className={styles.workbenchPanel}>
                      <div className={styles.workbenchPanelHead}>
                        <div>
                          <h3>Review AI extraction</h3>
                          <p>Correct extracted fields first. APMS will mark the extraction as reviewed before creating the candidate draft.</p>
                        </div>
                      </div>

                      <div className={styles.extractionReviewList}>
                        {mergedPendingExtractionReview && (
                          <article className={styles.extractionReviewCard} key={mergedPendingExtractionReview.id}>
                            <div className={styles.extractionReviewHead}>
                              <div>
                                <span>Merged AI extraction review</span>
                                <strong>{pendingExtractionReviews.length} source document(s)</strong>
                                <div className={styles.extractionSourceChips}>
                                  {pendingExtractionReviews.map((review) => (
                                    <small key={review.id}>{review.fileName}</small>
                                  ))}
                                </div>
                              </div>
                              <small>
                                {mergedPendingExtractionReview.qualityStatus || 'Pending staff review'}
                                {typeof mergedPendingExtractionReview.evidenceCoverageRate === 'number' ? ` | Evidence coverage ${Math.round(mergedPendingExtractionReview.evidenceCoverageRate)}%` : ''}
                              </small>
                            </div>

                            <StaffAiExtractResult
                              review={mergedPendingExtractionReview}
                              onChange={updateMergedPendingExtractionEdit}
                              onAskAi={openFieldAiAssist}
                            />
                          </article>
                        )}
                      </div>

                      <div className={styles.extractionReviewActions}>
                        <button
                          className={`${styles.button} ${styles.primaryButton}`}
                          type="button"
                          onClick={() => void handleCreateCandidateFromReviewedExtractions()}
                          disabled={!canUseStaffWorkbench || staffCandidateLoading}
                        >
                          <CheckCircle2 size={16} />
                          {staffCandidateLoading ? 'Creating...' : 'Save review & create candidate'}
                        </button>
                      </div>
                    </section>
                  )}

                  {staffCandidate && (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Candidate detail</h3>
                        <p>Review and correct extracted fields before sending it to the manager.</p>
                      </div>
                      <div className={styles.workbenchPanelActions}>
                        {staffCandidate.status === 'DRAFT' && lastExtractionReviews.length > 0 && pendingExtractionReviews.length === 0 && (
                          <button
                            className={styles.button}
                            type="button"
                            onClick={restoreLastExtractionReview}
                            disabled={!canUseStaffWorkbench}
                          >
                            <ArrowLeft size={16} />
                            Back to AI extraction
                          </button>
                        )}
                        <span className={`${styles.candidateStatus} ${candidateStatusClass[staffCandidate.status]}`}>
                          {candidateStatusLabel[staffCandidate.status]}
                        </span>
                      </div>
                    </div>

                      <>
                        <div className={styles.candidateReviewWorkspace}>
                          <div className={styles.candidateReviewHero}>
                            <div className={styles.candidateReviewHeroMain}>
                              <span>Candidate draft workspace</span>
                              <h4>{candidateName(staffCandidate)}</h4>
                              <p>{candidateIndustry(staffCandidate)}</p>
                            </div>
                            <div className={styles.candidateReviewMetrics}>
                              <div>
                                <span>Status</span>
                                <strong>{candidateStatusLabel[staffCandidate.status]}</strong>
                              </div>
                              <div>
                                <span>Confidence</span>
                                <strong>{candidateConfidenceLabel(staffCandidate)}</strong>
                              </div>
                              <div>
                                <span>Data quality</span>
                                <strong>{candidateCompleteness(staffCandidate)}</strong>
                              </div>
                              <div>
                                <span>SWOT items</span>
                                <strong>
                                  {[
                                    staffCandidateEdit.strengths,
                                    staffCandidateEdit.opportunities,
                                    staffCandidateEdit.weaknesses,
                                    staffCandidateEdit.threats,
                                  ].reduce((sum, value) => sum + splitLines(value).length, 0)}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className={styles.candidateReviewTabs} role="tablist" aria-label="Candidate draft review sections">
                            {candidateReviewTabs.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={candidateReviewTab === tab.id}
                                className={`${styles.candidateReviewTab} ${candidateReviewTab === tab.id ? styles.candidateReviewTabActive : ''}`}
                                onClick={() => setCandidateReviewTab(tab.id)}
                              >
                                <strong>{tab.label}</strong>
                                <span>{tab.helper}</span>
                              </button>
                            ))}
                          </div>

                          {candidateReviewTab === 'profile' && (
                            <div className={`${styles.candidateReviewSection} ${styles.profileReviewSection}`}>
                              <div className={styles.candidateReviewSectionHead}>
                                <div>
                                  <span>Company profile</span>
                                  <h4>Identity and contact</h4>
                                </div>
                                <small>{candidateConfidenceLabel(staffCandidate)} confidence</small>
                              </div>
                              <div className={styles.readOnlyFieldGrid}>
                                {[
                                  ['Legal name', staffCandidateEdit.legalName],
                                  ['Tax ID', staffCandidateEdit.taxId],
                                  ['Address', staffCandidateEdit.address],
                                  ['Industry', staffCandidateEdit.industry],
                                  ['Employee tier', staffCandidateEdit.employeeTier],
                                  ['Company size', staffCandidateEdit.companySize],
                                ].map(([label, value]) => (
                                  <div className={styles.readOnlyField} key={label}>
                                    <span>{label}</span>
                                    <strong>{value || 'No data'}</strong>
                                  </div>
                                ))}
                              </div>
                              <div className={styles.candidateExtractedFieldStack}>
                                <WebsiteListField
                                  label="Website"
                                  value={staffCandidateEdit.website}
                                  editable={false}
                                  onChange={() => undefined}
                                />
                                <ExtractedListField
                                  label="Email"
                                  fieldKey="email"
                                  value={staffCandidateEdit.email}
                                  editable={false}
                                  onChange={() => undefined}
                                />
                                <ExtractedListField
                                  label="Hotline"
                                  fieldKey="phone"
                                  value={staffCandidateEdit.phone}
                                  editable={false}
                                  onChange={() => undefined}
                                />
                              </div>
                              <LongTextInsightCard title="Business model" value={staffCandidateEdit.businessModel} />
                            </div>
                          )}

                          {candidateReviewTab === 'swot' && (
                            <div className={styles.candidateReviewSection}>
                              <div className={styles.candidateReviewSectionHead}>
                                <div>
                                  <span>AI insight review</span>
                                  <h4>SWOT signals</h4>
                                </div>
                                <small>{[
                                  staffCandidateEdit.strengths,
                                  staffCandidateEdit.opportunities,
                                  staffCandidateEdit.weaknesses,
                                ].reduce((sum, value) => sum + splitLines(value).length, 0)} item(s)</small>
                              </div>
                              <div className={styles.candidateInsightGrid}>
                                <CandidateInsightField title="Strengths" data={splitLines(staffCandidateEdit.strengths)} />
                                <CandidateInsightField title="Opportunities" data={splitLines(staffCandidateEdit.opportunities)} />
                                <CandidateInsightField title="Weaknesses" data={splitLines(staffCandidateEdit.weaknesses)} />
                                <CandidateInsightField title="Threats" data={splitLines(staffCandidateEdit.threats)} />
                              </div>
                            </div>
                          )}

                          {candidateReviewTab === 'evidence' && (
                            <div className={styles.candidateReviewSection}>
                              <div className={styles.candidateReviewSectionHead}>
                                <div>
                                  <span>Business evidence</span>
                                  <h4>Products, markets, and customers</h4>
                                </div>
                                <small>AI extracted fields</small>
                              </div>
                              <div className={styles.evidenceWorkspace}>
                                <section className={styles.evidenceGroup}>
                                  <div className={styles.evidenceGroupHead}>
                                    <span>Business scope</span>
                                    <strong>What the company sells and who it serves</strong>
                                  </div>
                                  <div className={styles.evidenceBusinessGrid}>
                                    <CandidateProductPanel title="Products / services" data={(staffCandidate.business as { products?: unknown } | undefined)?.products} />
                                    <CandidateInfoPanel
                                      title="Markets and customers"
                                      data={{
                                        markets: normalizeExtractedListValue(staffCandidateEdit.markets, true),
                                        targetCustomers: normalizeExtractedListValue(staffCandidateEdit.targetCustomers, true),
                                      }}
                                    />
                                  </div>
                                </section>
                              </div>
                            </div>
                          )}

                        </div>

                        <div className={styles.modalActions}>
                          <button
                            className={`${styles.button} ${styles.primaryButton}`}
                            type="button"
                            onClick={() => void handleSubmitStaffCandidate()}
                            disabled={!canUseStaffWorkbench || staffSubmitLoading || staffCandidate.status !== 'DRAFT'}
                            title={staffCandidate.status !== 'DRAFT' ? 'Only a selected DRAFT candidate can be submitted.' : 'Submit the selected candidate draft to manager.'}
                          >
                            <CheckCircle2 size={16} />{staffSubmitLoading ? 'Submitting...' : 'Submit'}
                          </button>
                        </div>
                      </>
                  </section>
                  )}
                  </>
                  ) : selectedStaffTask.taskType === 'COMPANY_MEMBER_RESEARCH' ? (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Company member research</h3>
                        <p>Research key people, leadership, board members, founders, or public representatives and attach a source URL for each person.</p>
                      </div>
                      <span className={styles.taskTypeBadge}>{companyMemberItems.length} member(s)</span>
                    </div>

                    <div className={styles.memberResearchHero}>
                      <div>
                        <span>Research target</span>
                        <h4>{workbench?.targetCompanyName || displayedProject.targetCompanyName || displayedProject.name}</h4>
                        <p>
                          Add verified people related to this company. Each member must have name, position, and a public source URL so the manager can review the evidence.
                        </p>
                      </div>
                      <div className={styles.memberResearchStats}>
                        <div>
                          <strong>{companyMemberItems.length}</strong>
                          <span>Members added</span>
                        </div>
                        <div>
                          <strong>{companyMemberDraft?.updatedAt ? formatOptionalDate(companyMemberDraft.updatedAt) : 'Not saved'}</strong>
                          <span>Last saved</span>
                        </div>
                        <div>
                          <strong>{companyMemberDraft?.submissionId ? 'Submitted' : 'Draft'}</strong>
                          <span>Draft status</span>
                        </div>
                      </div>
                    </div>

                    {companyMemberLoading ? (
                      <div className={styles.empty}>Loading member research draft...</div>
                    ) : (
                      <>
                        <div className={styles.memberResearchLayout}>
                          <section className={styles.memberResearchForm}>
                            <div className={styles.taskSpecificHead}>
                              <UserPlus size={20} />
                              <div>
                                <strong>{editingCompanyMemberIndex === null ? 'Add company member' : 'Edit company member'}</strong>
                                <span>Use official website, annual report, LinkedIn, news, or other reliable public source.</span>
                              </div>
                            </div>

                            <div className={styles.memberResearchFormGrid}>
                              <label className={styles.inviteField}>
                                <span>Full name</span>
                                <input
                                  value={companyMemberForm.fullName}
                                  placeholder="Example: Nguyen Van A"
                                  onChange={(event) => setCompanyMemberForm((current) => ({ ...current, fullName: event.target.value }))}
                                  disabled={!canUseStaffWorkbench}
                                />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Position</span>
                                <input
                                  value={companyMemberForm.position}
                                  placeholder="Example: CEO, Founder, Board member"
                                  onChange={(event) => setCompanyMemberForm((current) => ({ ...current, position: event.target.value }))}
                                  disabled={!canUseStaffWorkbench}
                                />
                              </label>
                              <label className={`${styles.inviteField} ${styles.fullField}`}>
                                <span>Image URL</span>
                                <input
                                  value={companyMemberForm.imageUrl || ''}
                                  placeholder="Optional profile image URL"
                                  onChange={(event) => setCompanyMemberForm((current) => ({ ...current, imageUrl: event.target.value }))}
                                  disabled={!canUseStaffWorkbench}
                                />
                              </label>
                              <label className={`${styles.inviteField} ${styles.fullField}`}>
                                <span>Source URL</span>
                                <input
                                  value={companyMemberForm.sourceUrl}
                                  placeholder="https://company.com/leadership"
                                  onChange={(event) => setCompanyMemberForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                                  disabled={!canUseStaffWorkbench}
                                />
                              </label>
                              <label className={`${styles.inviteField} ${styles.fullField}`}>
                                <span>Notes</span>
                                <textarea
                                  value={companyMemberForm.notes || ''}
                                  placeholder="Short note about this person's role or why this source is reliable..."
                                  onChange={(event) => setCompanyMemberForm((current) => ({ ...current, notes: event.target.value }))}
                                  disabled={!canUseStaffWorkbench}
                                />
                              </label>
                            </div>

                            <div className={styles.modalActions}>
                              {editingCompanyMemberIndex !== null && (
                                <button className={styles.button} type="button" onClick={resetCompanyMemberForm} disabled={!canUseStaffWorkbench}>
                                  Cancel edit
                                </button>
                              )}
                              <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={handleSaveCompanyMemberItem} disabled={!canUseStaffWorkbench}>
                                <Plus size={16} />{editingCompanyMemberIndex === null ? 'Add member' : 'Update member'}
                              </button>
                            </div>
                          </section>

                          <section className={styles.memberResearchList}>
                            <div className={styles.memberResearchListHead}>
                              <div>
                                <span>Draft members</span>
                                <strong>{companyMemberItems.length} researched person(s)</strong>
                              </div>
                              <button
                                className={styles.button}
                                type="button"
                                onClick={() => void saveCompanyMemberResearchDraft()}
                                disabled={!canUseStaffWorkbench || companyMemberSaving || companyMemberItems.length === 0}
                              >
                                <CheckCircle2 size={16} />{companyMemberSaving ? 'Saving...' : 'Save draft'}
                              </button>
                            </div>

                            {companyMemberItems.length === 0 ? (
                              <div className={styles.empty}>No members added yet. Add at least one person before submitting.</div>
                            ) : (
                              <CompanyMemberLayerBoard
                                members={companyMemberItems}
                                emptyText="No members added yet. Add at least one person before submitting."
                                statusLabel="Draft"
                                renderActions={(_, index) => (
                                  <>
                                    <button className={styles.button} type="button" onClick={() => handleEditCompanyMemberItem(index)} disabled={!canUseStaffWorkbench}>
                                      <Edit3 size={15} />Edit
                                    </button>
                                    <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => handleRemoveCompanyMemberItem(index)} disabled={!canUseStaffWorkbench}>
                                      <Trash2 size={15} />Delete
                                    </button>
                                  </>
                                )}
                              />
                            )}
                          </section>
                        </div>

                        <div className={styles.modalActions}>
                          <button
                            className={styles.button}
                            type="button"
                            onClick={() => void saveCompanyMemberResearchDraft()}
                            disabled={!canUseStaffWorkbench || companyMemberSaving || companyMemberItems.length === 0}
                          >
                            <CheckCircle2 size={16} />{companyMemberSaving ? 'Saving...' : 'Save draft'}
                          </button>
                          <button
                            className={`${styles.button} ${styles.primaryButton}`}
                            type="button"
                            onClick={() => void submitCompanyMemberResearchDraft()}
                            disabled={!canUseStaffWorkbench || companyMemberSubmitting || companyMemberSaving || companyMemberItems.length === 0}
                          >
                            <CheckCircle2 size={16} />{companyMemberSubmitting ? 'Submitting...' : 'Submit for manager review'}
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                  ) : (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>
                          {selectedStaffTask.taskType === 'DOCUMENT_COLLECTION' && 'Document package'}
                          {selectedStaffTask.taskType === 'ROLE_EVALUATION' && 'Evaluation result'}
                          {selectedStaffTask.taskType === 'GENERAL_TASK' && 'Task result'}
                        </h3>
                        <p>
                          {selectedStaffTask.taskType === 'DOCUMENT_COLLECTION' && 'Confirm the uploaded documents are enough, then submit them directly to the project.'}
                          {selectedStaffTask.taskType === 'ROLE_EVALUATION' && 'Write your evaluation notes and attach evidence before sending it for manager review.'}
                          {selectedStaffTask.taskType === 'GENERAL_TASK' && 'Add a clear result note so the manager knows what has been completed.'}
                        </p>
                      </div>
                      <span className={styles.taskTypeBadge}>{taskTypeText[selectedStaffTask.taskType].title}</span>
                    </div>

                    {selectedStaffTask.taskType === 'ROLE_EVALUATION' && (
                      <RoleEvaluationWorkspace
                        mode="staff"
                        project={apiProject}
                        task={selectedStaffTask}
                        documents={projectDocuments}
                        documentsLoading={projectDocumentsLoading}
                        canEdit={canUseStaffWorkbench}
                        uploadingEvidence={uploadingEvidence}
                        onUploadEvidence={handleUploadEvidence}
                        onSubmitted={async () => {
                          const updatedTask = await taskApi.getTaskWorkbench(selectedStaffTask.projectId, selectedStaffTask.id);
                          setWorkbench(updatedTask.data);
                          const nextTask: ProjectTaskResponse = {
                            ...selectedStaffTask,
                            status: updatedTask.data.taskStatus,
                          };
                          updateTaskInState(nextTask);
                          setSelectedStaffTask(null);
                          setTaskRefreshTick((current) => current + 1);
                          setToast({ kind: 'success', message: 'Role evaluation submitted to manager review.' });
                        }}
                      />
                    )}

                    {selectedStaffTask.taskType !== 'ROLE_EVALUATION' && (
                      <label className={styles.workbenchUploadBox}>
                        <input
                          type="file"
                          onChange={(event) => {
                            void handleUploadEvidence(event.target.files?.[0] ?? null);
                            event.currentTarget.value = '';
                          }}
                          disabled={!canUseStaffWorkbench || uploadingEvidence}
                        />
                        <FileText size={24} />
                        <strong>{uploadingEvidence ? 'Uploading evidence...' : 'Upload evidence'}</strong>
                        <span>Attach files that support this task before submitting them to the project.</span>
                      </label>
                    )}

                    {selectedStaffTask.taskType !== 'ROLE_EVALUATION' && (
                      <div className={styles.documentList}>
                        {workbenchLoading && <div className={styles.empty}>Loading workbench...</div>}
                        {!workbenchLoading && (workbench?.documents?.length ?? 0) === 0 && (
                          <div className={styles.empty}>No evidence uploaded yet.</div>
                        )}
                        {workbench?.documents?.map((document) => (
                          <article className={styles.documentItem} key={document.id}>
                            <div className={styles.documentIcon}><FileText size={18} /></div>
                            <div>
                              <strong>{document.fileName || `Import job #${document.id}`}</strong>
                              <span>{document.status} - uploaded {formatOptionalDate(document.createdAt)}</span>
                              <small>
                                {document.errorMessage || `Import job: ${document.id} | Raw document: ${document.rawDocumentId || 'N/A'}`}
                              </small>
                            </div>
                            <div className={styles.documentActions}>
                              <button
                                className={styles.button}
                                type="button"
                                onClick={() => void handleDocumentFileAction(document, 'open')}
                                disabled={!canUseStaffWorkbench || !document.rawDocumentId}
                              >
                                <ExternalLink size={16} />Open
                              </button>
                              <button
                                className={styles.button}
                                type="button"
                                onClick={() => void handleDocumentFileAction(document, 'download')}
                                disabled={!canUseStaffWorkbench || !document.rawDocumentId}
                              >
                                <Download size={16} />Download
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {selectedStaffTask.taskType === 'GENERAL_TASK' && (
                      <div className={styles.taskSpecificPanel}>
                        <div className={styles.taskSpecificHead}>
                          <CheckCircle2 size={20} />
                          <div>
                            <strong>General task workspace</strong>
                            <span>Record the result clearly so the manager can approve without asking for extra context.</span>
                          </div>
                        </div>

                        <div className={styles.roleEvaluationGrid}>
                          <label className={`${styles.inviteField} ${styles.fullField}`}>
                            <span>Result summary</span>
                            <textarea
                              value={generalTaskForm.resultSummary}
                              placeholder="What did you complete?"
                              onChange={(event) => setGeneralTaskForm((current) => ({ ...current, resultSummary: event.target.value }))}
                              disabled={!canUseStaffWorkbench}
                            />
                          </label>

                          <label className={styles.inviteField}>
                            <span>Next step</span>
                            <input
                              value={generalTaskForm.nextStep}
                              placeholder="Optional next action"
                              onChange={(event) => setGeneralTaskForm((current) => ({ ...current, nextStep: event.target.value }))}
                              disabled={!canUseStaffWorkbench}
                            />
                          </label>

                          <label className={styles.inviteField}>
                            <span>Blocker</span>
                            <input
                              value={generalTaskForm.blocker}
                              placeholder="No blocker"
                              onChange={(event) => setGeneralTaskForm((current) => ({ ...current, blocker: event.target.value }))}
                              disabled={!canUseStaffWorkbench}
                            />
                          </label>
                        </div>

                        <div className={styles.generalChecklist}>
                          {[
                            ['workDone', 'Work completed'],
                            ['evidenceAttached', 'Evidence attached if needed'],
                            ['readyForReview', 'Ready for manager review'],
                          ].map(([key, label]) => (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={generalTaskForm.checklist[key as keyof typeof generalTaskForm.checklist]}
                                disabled={!canUseStaffWorkbench}
                                onChange={(event) => setGeneralTaskForm((current) => ({
                                  ...current,
                                  checklist: {
                                    ...current.checklist,
                                    [key]: event.target.checked,
                                  },
                                }))}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.workbenchResultGrid}>
                      <div className={styles.workbenchResultCard}>
                        <FileText size={22} />
                        <span>Evidence files</span>
                        <strong>{workbench?.documents?.length ?? 0}</strong>
                      </div>
                      <div className={styles.workbenchResultCard}>
                        <MessageSquare size={22} />
                        <span>Submissions</span>
                        <strong>{workbench?.submissions?.length ?? 0}</strong>
                      </div>
                      <div className={styles.workbenchResultCard}>
                        <Clock size={22} />
                        <span>Current status</span>
                        <strong>{workbench?.taskStatus || selectedStaffTask.status}</strong>
                      </div>
                    </div>

                    <label className={`${styles.inviteField} ${styles.fullField}`}>
                      <span>
                        {selectedStaffTask.taskType === 'ROLE_EVALUATION' ? 'Evaluation note' : 'Completion note'}
                      </span>
                      <textarea
                        value={staffTaskNote}
                        placeholder={
                          selectedStaffTask.taskType === 'DOCUMENT_COLLECTION'
                            ? 'Example: Uploaded annual report and registration evidence. Ready to add to project documents.'
                            : selectedStaffTask.taskType === 'ROLE_EVALUATION'
                              ? 'Example: Based on the uploaded evidence, this company fits the partner role because...'
                              : 'Example: Completed the assigned work and attached supporting evidence.'
                        }
                        onChange={(event) => setStaffTaskNote(event.target.value)}
                        disabled={!canUseStaffWorkbench}
                      />
                    </label>

                    <div className={styles.modalActions}>
                      <button
                        className={`${styles.button} ${styles.primaryButton}`}
                        type="button"
                        onClick={() => void handleSubmitStaffTaskReview(
                          selectedStaffTask.taskType === 'DOCUMENT_COLLECTION' ? 'DOCUMENT_COLLECTION' : 'OTHER',
                          selectedStaffTask.taskType === 'DOCUMENT_COLLECTION'
                            ? 'Documents submitted for manager review.'
                            : 'Task result submitted for manager review.'
                        )}
                        disabled={!canUseStaffWorkbench || staffSubmitLoading || selectedStaffTask.taskType === 'ROLE_EVALUATION'}
                      >
                        <CheckCircle2 size={16} />
                        {staffSubmitLoading
                          ? 'Submitting...'
                          : selectedStaffTask.taskType === 'DOCUMENT_COLLECTION'
                            ? 'Submit for manager review'
                            : selectedStaffTask.taskType === 'ROLE_EVALUATION'
                              ? 'Use evaluation submit'
                              : 'Submit to manager'}
                      </button>
                    </div>
                  </section>
                  )}
                </main>

                <aside className={styles.workbenchSidebar}>
                  {selectedStaffTask.taskType === 'COMPANY_DATA_PREPARATION' ? (
                    <section className={styles.workbenchPanel}>
                      <h3>Rejected drafts</h3>
                      <div className={styles.draftList}>
                        {(workbench?.candidateDrafts?.filter((draft) => draft.status === 'REJECTED').length ?? 0) === 0 && (
                          <div className={styles.empty}>No rejected draft history yet.</div>
                        )}
                        {workbench?.candidateDrafts?.filter((draft) => draft.status === 'REJECTED').map((draft) => {
                          const draftLabel = draft.candidateName || `Candidate ${draft.candidateId.slice(-8)}`;
                          const isDeleting = deletingCandidateDraftId === draft.candidateId;

                          return (
                            <article
                              className={`${styles.draftItem} ${styles.draftItemWithActions} ${staffCandidate?.id === draft.candidateId ? styles.draftItemActive : ''}`}
                              key={draft.candidateId}
                            >
                              <button
                                className={styles.draftItemMain}
                                type="button"
                                onClick={() => void handleOpenStaffCandidate(draft.candidateId)}
                                disabled={!canUseStaffWorkbench || isDeleting}
                              >
                                <strong>{draftLabel}</strong>
                                {draft.candidateIndustry && <small>{draft.candidateIndustry}</small>}
                                <span className={`${styles.draftStatusBadge} ${candidateStatusClass[draft.status]}`}>{candidateStatusLabel[draft.status]}</span>
                                {draft.isUnderReview && <small>Under manager review</small>}
                                {draft.hasConflicts && <small>{draft.conflictCount || 0} conflict(s)</small>}
                              </button>
                              {(draft.status === 'DRAFT' || draft.status === 'REJECTED') && (
                                <button
                                  className={styles.draftDeleteButton}
                                  type="button"
                                  onClick={() => handleDeleteStaffCandidateDraft(draft.candidateId, draftLabel, draft.status)}
                                  disabled={!canUseStaffWorkbench || isDeleting}
                                  aria-label={`Delete ${draftLabel}`}
                                  title="Delete draft"
                                >
                                  <Trash2 size={15} />
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <section className={styles.workbenchPanel}>
                      <h3>{taskTypeText[selectedStaffTask.taskType].title}</h3>
                      <div className={styles.workbenchHintList}>
                        {selectedStaffTask.taskType === 'DOCUMENT_COLLECTION' && (
                          <>
                            <span>Upload all required company evidence.</span>
                            <span>Check file names and source clarity.</span>
                            <span>Submit once the package is ready.</span>
                          </>
                        )}
                        {selectedStaffTask.taskType === 'ROLE_EVALUATION' && (
                          <>
                            <span>Review project relationship and target company.</span>
                            <span>Attach sources that support the evaluation.</span>
                            <span>Submit clear notes for manager approval.</span>
                          </>
                        )}
                        {selectedStaffTask.taskType === 'COMPANY_MEMBER_RESEARCH' && (
                          <>
                            <span>Identify key people related to the target company.</span>
                            <span>Add a reliable source URL for every member.</span>
                            <span>Save the draft, then submit it for manager review.</span>
                          </>
                        )}
                        {selectedStaffTask.taskType === 'GENERAL_TASK' && (
                          <>
                            <span>Complete the assigned work.</span>
                            <span>Add a short result note.</span>
                            <span>Attach evidence when useful.</span>
                          </>
                        )}
                      </div>
                    </section>
                  )}

                  <section className={styles.workbenchPanel}>
                    <h3>Review history</h3>
                    <div className={styles.workbenchTimeline}>
                      {(workbench?.submissions?.length ?? 0) === 0 && <div className={styles.empty}>No submission yet.</div>}
                      {workbench?.submissions?.map((submission) => (
                        <article key={submission.id}>
                          <strong>{submission.status}</strong>
                          <span>{submission.note || submission.targetEntityType || 'Submitted work'}</span>
                          <small>{formatOptionalDate(submission.submittedAt || submission.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cancelTaskConfirmOpen && selectedStaffTask && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!cancelTaskLoading) setCancelTaskConfirmOpen(false);
            }}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-task-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>Cancel task</span>
                  <h2 id="cancel-task-title">Confirm task cancellation</h2>
                  <p>
                    Are you sure you want to cancel <strong>APMS-{selectedStaffTask.id}</strong>? This task will move to Cancelled status.
                  </p>
                </div>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Close cancel task confirmation"
                  onClick={() => setCancelTaskConfirmOpen(false)}
                  disabled={cancelTaskLoading}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.deleteTaskPreview}>
                <X size={20} />
                <div>
                  <strong>{selectedStaffTask.title}</strong>
                  <span>{selectedStaffTask.taskType.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => setCancelTaskConfirmOpen(false)}
                  disabled={cancelTaskLoading}
                >
                  Keep working
                </button>
                <button
                  className={`${styles.button} ${styles.dangerButton}`}
                  type="button"
                  onClick={() => void confirmCancelStaffTask()}
                  disabled={cancelTaskLoading}
                >
                  {cancelTaskLoading ? 'Cancelling...' : 'Cancel task'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {candidateDraftPendingDelete && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!deletingCandidateDraftId) setCandidateDraftPendingDelete(null);
            }}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-candidate-draft-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>Delete candidate</span>
                  <h2 id="delete-candidate-draft-title">Confirm candidate deletion</h2>
                  <p>
                    Are you sure you want to delete <strong>{candidateDraftPendingDelete.label}</strong>? Only Draft or Rejected candidates can be removed.
                  </p>
                </div>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Close candidate delete confirmation"
                  onClick={() => setCandidateDraftPendingDelete(null)}
                  disabled={Boolean(deletingCandidateDraftId)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.deleteTaskPreview}>
                <Trash2 size={20} />
                <div>
                  <strong>{candidateDraftPendingDelete.label}</strong>
                  <span className={`${styles.draftStatusBadge} ${candidateStatusClass[candidateDraftPendingDelete.status]}`}>
                    {candidateStatusLabel[candidateDraftPendingDelete.status]}
                  </span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => setCandidateDraftPendingDelete(null)}
                  disabled={Boolean(deletingCandidateDraftId)}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.button} ${styles.dangerButton}`}
                  type="button"
                  onClick={() => void confirmDeleteStaffCandidateDraft()}
                  disabled={Boolean(deletingCandidateDraftId)}
                >
                  {deletingCandidateDraftId ? 'Deleting...' : 'Delete candidate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedManagerReviewTask && (
          <motion.div
            className={`${styles.modalOverlay} ${styles.taskWorkbenchOverlay}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedManagerReviewTask(null)}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.staffWorkbenchModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="manager-task-review-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>
                    {selectedManagerReviewTask.status === 'DONE' ? 'Completed task' : 'Manager review'} - APMS-{selectedManagerReviewTask.id}
                  </span>
                  <h2 id="manager-task-review-title">{selectedManagerReviewTask.title}</h2>
                  <p>
                    {selectedManagerReviewTask.status === 'DONE'
                      ? 'View the submitted evidence, candidate drafts, and review history for this completed task.'
                      : 'Review submitted evidence, candidate drafts, and staff notes before approving this task.'}
                  </p>
                </div>
                <button className={styles.iconButton} type="button" aria-label="Close manager review" onClick={() => setSelectedManagerReviewTask(null)}>
                  <X size={18} />
                </button>
              </div>

              {workbenchError && <div className={styles.inlineError}>{workbenchError}</div>}
              {workbenchMessage && <div className={styles.inlineSuccess}>{workbenchMessage}</div>}

              <div className={styles.workbenchStatusRow}>
                <div><span>Status</span><strong>{workbench?.taskStatus || selectedManagerReviewTask.status}</strong></div>
                <div><span>Task type</span><strong>{selectedManagerReviewTask.taskType.replace(/_/g, ' ')}</strong></div>
                <div><span>Assignee</span><strong>{selectedManagerReviewTask.assignedToName || 'Unassigned'}</strong></div>
                <div><span>Due date</span><strong>{formatOptionalDate(selectedManagerReviewTask.dueDate)}</strong></div>
              </div>

              <div className={styles.staffWorkbenchGrid}>
                <main className={styles.workbenchMain}>
                  {selectedManagerReviewTask.taskType !== 'COMPANY_DATA_PREPARATION'
                    && selectedManagerReviewTask.taskType !== 'COMPANY_MEMBER_RESEARCH' && (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Uploaded evidence</h3>
                        <p>These are the files uploaded by staff for this task.</p>
                      </div>
                      <span className={styles.taskTypeBadge}>{managerReviewDocuments.length} file(s)</span>
                    </div>

                    <div className={styles.documentList}>
                      {workbenchLoading && <div className={styles.empty}>Loading review data...</div>}
                      {!workbenchLoading && managerReviewDocuments.length === 0 && (
                        <div className={styles.empty}>No uploaded files found for this task.</div>
                      )}
                      {managerReviewDocuments.map((document) => (
                        <article className={styles.documentItem} key={document.id}>
                          <div className={styles.documentIcon}><FileText size={18} /></div>
                          <div>
                            <strong>{document.fileName || `Import job #${document.id}`}</strong>
                            <span>{document.status} - uploaded {formatOptionalDate(document.createdAt)}</span>
                            <small>
                              Raw document: {document.rawDocumentId || 'N/A'} | Extraction: {document.latestExtractionId || 'Not generated'}
                            </small>
                          </div>
                          <div className={styles.documentActions}>
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void handleDocumentFileAction(document, 'open')}
                              disabled={!document.rawDocumentId}
                            >
                              <ExternalLink size={16} />Open
                            </button>
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void handleDocumentFileAction(document, 'download')}
                              disabled={!document.rawDocumentId}
                            >
                              <Download size={16} />Download
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                  )}

                  {selectedManagerReviewTask.taskType === 'COMPANY_MEMBER_RESEARCH' && (
                    <section className={styles.workbenchPanel}>
                      <div className={styles.workbenchPanelHead}>
                        <div>
                          <h3>Company member research</h3>
                        </div>
                        <span className={styles.taskTypeBadge}>{managerCompanyMemberDraft?.members?.length ?? 0} member(s)</span>
                      </div>
                      {managerCompanyMemberLoading ? (
                        <div className={styles.empty}>Loading submitted members...</div>
                      ) : !managerCompanyMemberDraft?.members?.length ? (
                        <div className={styles.empty}>No company members were submitted for review.</div>
                      ) : (
                        <CompanyMemberLayerBoard
                          members={managerCompanyMemberDraft.members}
                          emptyText="No company members were submitted for review."
                          statusLabel="Ready to apply"
                        />
                      )}
                    </section>
                  )}

                  {selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION' && (
                    <section className={styles.workbenchPanel}>
                      <div className={styles.workbenchPanelHead}>
                        <div>
                          <h3>{selectedManagerReviewTask.status === 'DONE' ? 'Candidate result' : 'Candidate drafts'}</h3>
                          <p>
                            {selectedManagerReviewTask.status === 'DONE'
                              ? 'Final candidate decision linked to this completed task.'
                              : 'Open the candidate from the Candidates tab if you need the full company profile preview and approval workflow.'}
                          </p>
                        </div>
                        <span className={styles.taskTypeBadge}>
                          {managerCandidateDrafts.length} {selectedManagerReviewTask.status === 'DONE' ? 'result(s)' : 'submitted draft(s)'}
                        </span>
                      </div>
                      <div className={styles.draftList}>
                        {managerCandidateDrafts.length === 0 && (
                          <div className={styles.empty}>
                            {selectedManagerReviewTask.status === 'DONE'
                              ? 'No approved or rejected candidate result linked to this task.'
                              : 'No submitted candidate draft linked to this task.'}
                          </div>
                        )}
                        {managerCandidateDrafts.map((draft) => (
                          <button
                            className={styles.draftItem}
                            type="button"
                            key={draft.candidateId}
                            onClick={() => void openManagerCandidateReview(draft.candidateId)}
                          >
                            <strong>{draft.candidateName || `Candidate ${draft.candidateId.slice(-8)}`}</strong>
                            {draft.candidateIndustry && <small>{draft.candidateIndustry}</small>}
                            <span className={`${styles.draftStatusBadge} ${candidateStatusClass[draft.status]}`}>{candidateStatusLabel[draft.status]}</span>
                            {draft.isUnderReview && <small>Submitted for review</small>}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedManagerReviewTask.taskType === 'ROLE_EVALUATION' && (
                    <section className={styles.workbenchPanel}>
                      <RoleEvaluationWorkspace
                        mode="manager"
                        project={apiProject}
                        task={selectedManagerReviewTask}
                        documents={projectDocuments.length > 0 ? projectDocuments : workbench?.documents || []}
                        documentsLoading={projectDocumentsLoading}
                        managerComment={managerReviewComment}
                        onManagerCommentChange={setManagerReviewComment}
                        onReviewed={async () => {
                          await loadManagerWorkbench(selectedManagerReviewTask);
                          setTaskRefreshTick((current) => current + 1);
                        }}
                      />
                    </section>
                  )}

                  {selectedManagerReviewTask.taskType !== 'ROLE_EVALUATION' && (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                          <h3>{selectedManagerReviewTask.status === 'DONE' ? 'Final decision' : 'Decision'}</h3>
                          <p>
                            {selectedManagerReviewTask.status === 'DONE'
                              ? selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION'
                                ? 'This document collection has been approved. The submitted documents remain available in the project.'
                                : selectedManagerReviewTask.taskType === 'COMPANY_MEMBER_RESEARCH'
                                  ? 'This company member research has been approved. The members were applied to the Company Profile.'
                                : 'This task has already been approved. The submitted evidence remains available for audit.'
                              : selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION'
                                ? 'Review the submitted candidate before approving. Approval creates the Company Profile and completes this task.'
                                : selectedManagerReviewTask.taskType === 'COMPANY_MEMBER_RESEARCH'
                                  ? 'Review the submitted members and source URLs, then approve to apply them to the Company Profile or reject to return it to staff.'
                                : selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION'
                                  ? 'Review the uploaded documents, then approve to move the task to Done or reject to return it to staff.'
                                : 'Approve to move the task to Done, or reject to return it to staff for correction.'}
                          </p>
                      </div>
                    </div>

                    {selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION' && selectedManagerReviewTask.status === 'DONE' ? (
                      <div className={styles.inlineSuccess}>Documents were approved and are available in the project Documents tab.</div>
                    ) : selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION' && selectedManagerReviewTask.status !== 'DONE' ? (
                      <div className={styles.modalActions}>
                        <button
                          className={`${styles.button} ${styles.primaryButton}`}
                          type="button"
                          onClick={() => {
                            const draft = managerCandidateDrafts[0];
                            if (draft) void openManagerCandidateReview(draft.candidateId);
                          }}
                          disabled={managerCandidateDrafts.length === 0}
                        >
                          <CheckCircle2 size={16} />Review candidate
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className={`${styles.inviteField} ${styles.fullField}`}>
                          <span>Review comment</span>
                          <textarea
                            value={managerReviewComment}
                            placeholder="Add approval note or explain what staff needs to fix..."
                            onChange={(event) => setManagerReviewComment(event.target.value)}
                            readOnly={selectedManagerReviewTask.status === 'DONE'}
                          />
                        </label>

                        {selectedManagerReviewTask.status !== 'DONE' && (
                          <div className={styles.modalActions}>
                            <button
                              className={`${styles.button} ${styles.dangerButton}`}
                              type="button"
                              onClick={() => void handleManagerReviewSubmission('REJECT')}
                              disabled={managerReviewLoading}
                            >
                              {managerReviewLoading ? 'Saving...' : 'Reject'}
                            </button>
                            <button
                              className={`${styles.button} ${styles.primaryButton}`}
                              type="button"
                              onClick={() => void handleManagerReviewSubmission('APPROVE')}
                              disabled={managerReviewLoading}
                            >
                              <CheckCircle2 size={16} />{managerReviewLoading ? 'Approving...' : 'Approve task'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                  )}
                </main>

                <aside className={styles.workbenchSidebar}>
                  <section className={styles.workbenchPanel}>
                    <h3>Submission history</h3>
                    <div className={styles.workbenchTimeline}>
                      {(workbench?.submissions?.length ?? 0) === 0 && <div className={styles.empty}>No submission yet.</div>}
                      {workbench?.submissions?.map((submission) => (
                        <article key={submission.id}>
                          <strong>{submission.status}</strong>
                          <span>{submission.note || submission.targetEntityType || 'Submitted work'}</span>
                          <small>{formatOptionalDate(submission.submittedAt || submission.createdAt)}</small>
                          {submission.reviewComment && <small>Review: {submission.reviewComment}</small>}
                        </article>
                      ))}
                    </div>
                  </section>

                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedCandidate && (() => {
          const identity = selectedCandidate.identity as { legalName?: string; tradeName?: string; taxCode?: string; taxId?: string; country?: string; registrationNumber?: string } | undefined;
          const business = selectedCandidate.business as { industries?: string[]; businessModel?: string; products?: unknown; services?: unknown; markets?: unknown; targetCustomers?: unknown } | undefined;
          const companySize = selectedCandidate.companySize as { employeeTier?: unknown; employeeCount?: unknown; revenueTier?: unknown } | undefined;
          const contactRaw = selectedCandidate.contact as { website?: unknown; emails?: unknown; phones?: unknown; addresses?: unknown } | undefined;
          const insights = selectedCandidate.insights as Record<string, unknown> | undefined;
          const managerWebsiteValue = listJoinValue(normalizeUrlItems(contactRaw?.website));
          const managerEmailValue = listJoinValue(normalizeExtractedListValue(contactRaw?.emails, true));
          const managerPhoneValue = listJoinValue(normalizePhoneItems(contactRaw?.phones));
          const canReview = selectedCandidate.status === 'PENDING_REVIEW' || selectedCandidate.status === 'CORRECTED' || selectedCandidate.status === 'DRAFT';
          const detailConfidenceScore = candidateConfidenceScore(selectedCandidate);
          const availableManagerCandidateTabs = canReview
            ? managerCandidateTabs
            : managerCandidateTabs.filter((tab) => tab.id !== 'decision');

          return (
            <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCandidate(null)}>
              <motion.div
                className={`${styles.inviteModal} ${styles.candidateModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="candidate-detail-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Candidate #{selectedCandidate.candidateOrder ?? selectedCandidate.id.slice(-6)}</span>
                    <h2 id="candidate-detail-title">{candidateName(selectedCandidate)}</h2>
                    <p>Review extracted company data, relationship suggestion, and validation quality before approval.</p>
                  </div>
                  <button className={styles.iconButton} type="button" aria-label="Close candidate detail modal" onClick={() => setSelectedCandidate(null)}>
                    <X size={18} />
                  </button>
                </div>

                {candidateError && <div className={styles.inlineError}>{candidateError}</div>}
                {candidateActionMessage && <div className={styles.inlineSuccess}>{candidateActionMessage}</div>}

                <div className={styles.candidateDetailHero}>
                  <span className={`${styles.candidateStatus} ${candidateStatusClass[selectedCandidate.status]}`}>
                    {candidateStatusLabel[selectedCandidate.status]}
                  </span>
                  {/* <div>
                    <span>Suggested relationship</span>
                    <strong>{selectedCandidate.suggestedRelationshipType || 'Not suggested'}</strong>
                  </div> */}
                  <div>
                    <span>Confidence score</span>
                    <strong>{candidateConfidenceLabel(selectedCandidate)}</strong>
                    <div className={styles.candidateConfidenceTrack} aria-hidden="true">
                      <i style={{ width: `${detailConfidenceScore ?? 0}%` }} />
                    </div>
                  </div>
                  {/* <div>
                    <span>Data quality</span>
                    <strong>{candidateCompleteness(selectedCandidate)}</strong>
                  </div> */}
                </div>

                <div className={styles.candidateReviewTabs} role="tablist" aria-label="Manager candidate review sections">
                  {availableManagerCandidateTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={managerCandidateTab === tab.id}
                      className={`${styles.candidateReviewTab} ${managerCandidateTab === tab.id ? styles.candidateReviewTabActive : ''}`}
                      onClick={() => setManagerCandidateTab(tab.id)}
                    >
                      <strong>{tab.label}</strong>
                      <span>{tab.helper}</span>
                    </button>
                  ))}
                </div>

                {managerCandidateTab === 'overview' && (
                  <div className={`${styles.candidateReviewSection} ${styles.profileReviewSection}`}>
                    <div className={styles.candidateReviewSectionHead}>
                      <div>
                        <span>Company profile</span>
                        <h4>Identity and contact</h4>
                      </div>
                      <small>{candidateConfidenceLabel(selectedCandidate)} confidence</small>
                    </div>
                    <div className={styles.readOnlyFieldGrid}>
                      {([
                        ['Legal name', identity?.legalName],
                        ['Tax ID', identity?.taxCode || identity?.taxId],
                        ['Address', formatAddressValue(contactRaw?.addresses)],
                        ['Industry', candidateIndustry(selectedCandidate)],
                        ['Employee tier', companySize?.employeeTier],
                        ['Company size', formatCompanySizeValue(companySize)],
                      ] as Array<[string, unknown]>).map(([label, value]) => (
                        <div className={styles.readOnlyField} key={label}>
                          <span>{label}</span>
                          <strong>{candidateField(value)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className={styles.candidateExtractedFieldStack}>
                      <WebsiteListField
                        label="Website"
                        value={managerWebsiteValue}
                        editable={false}
                        onChange={() => undefined}
                      />
                      <ExtractedListField
                        label="Email"
                        fieldKey="email"
                        value={managerEmailValue}
                        editable={false}
                        onChange={() => undefined}
                      />
                      <ExtractedListField
                        label="Phone"
                        fieldKey="phone"
                        value={managerPhoneValue}
                        editable={false}
                        onChange={() => undefined}
                      />
                    </div>
                    <LongTextInsightCard title="Business model" value={business?.businessModel} />
                  </div>
                )}

                {managerCandidateTab === 'swot' && (
                  <div className={styles.candidateInsightGrid}>
                    <CandidateInsightField title="Strengths" data={insightList(insights, 'strengths')} />
                    <CandidateInsightField title="Opportunities" data={insightList(insights, 'opportunities')} />
                    <CandidateInsightField title="Weaknesses" data={insightList(insights, 'weaknesses')} />
                    <CandidateInsightField title="Threats" data={insightList(insights, 'threats')} />
                  </div>
                )}

                {managerCandidateTab === 'evidence' && (
                  <div className={styles.candidateReviewSection}>
                    <div className={styles.candidateReviewSectionHead}>
                      <div>
                        <span>Business evidence</span>
                        <h4>Products, markets, and customers</h4>
                      </div>
                      <small>AI extracted fields</small>
                    </div>
                    <div className={styles.evidenceWorkspace}>
                      <section className={styles.evidenceGroup}>
                        <div className={styles.evidenceGroupHead}>
                          <span>Business scope</span>
                          <strong>What the company sells and who it serves</strong>
                        </div>
                        <div className={styles.evidenceBusinessGrid}>
                          <CandidateProductPanel title="Products / services" data={business?.products} />
                          <CandidateInfoPanel
                            title="Markets and customers"
                            data={{
                              markets: normalizeExtractedListValue(business?.markets, true),
                              targetCustomers: normalizeExtractedListValue(business?.targetCustomers, true),
                            }}
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {managerCandidateTab === 'decision' && canReview && (
                  <>
                    <div className={styles.managerDecision}>
                      <div>
                        <h3>Manager decision</h3>
                        <p>Approving this candidate will create or update the Company Profile according to the backend workflow.</p>
                      </div>
                      {/* <label className={styles.inviteField}>
                        <span>Relationship override</span>
                        <select
                          value={selectedCandidate.relationshipTypeOverride || selectedCandidate.suggestedRelationshipType || ''}
                          onChange={(event) => {
                            const relationshipTypeOverride = (event.target.value || undefined) as RelationshipType | undefined;
                            setSelectedCandidate((current) => current ? { ...current, relationshipTypeOverride } : current);
                          }}
                        >
                          <option value="">Use backend suggestion</option>
                          {candidateRelationshipOptions.map((relationship) => (
                            <option key={relationship} value={relationship}>{relationship}</option>
                          ))}
                        </select>
                      </label> */}
                      <label className={styles.inviteField}>
                        <span>Reject reason</span>
                        <textarea
                          value={rejectReason}
                          placeholder="Explain why this candidate should not be approved..."
                          onChange={(event) => setRejectReason(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className={styles.modalActions}>
                      <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => void handleRejectCandidate()} disabled={candidateActionLoading}>
                        {candidateActionLoading ? 'Saving...' : 'Reject'}
                      </button>
                      <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void handleApproveCandidate()} disabled={candidateActionLoading}>
                        <CheckCircle2 size={16} />{candidateActionLoading ? 'Approving...' : 'Approve & create profile'}
                      </button>
                    </div>
                  </>
                )}

                <div className={styles.modalActions}>
                  <button
                    className={styles.button}
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(null);
                      setCandidateReviewTaskContext(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <AnimatePresence>
        {fieldAiAssist && (
          <motion.div
            className={`${styles.modalOverlay} ${styles.fieldAiAssistOverlay}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFieldAiAssist(null)}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.fieldAiAssistModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="field-ai-assist-title"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead}>
                <div>
                  <span className={styles.taskKey}>AI field research</span>
                  <h2 id="field-ai-assist-title">{fieldAiAssist.fieldLabel}</h2>
                  <p>
                    Ask AI to verify or enrich this extracted field for <strong>{fieldAiAssist.companyName}</strong>.
                  </p>
                </div>
                <button className={styles.iconButton} type="button" aria-label="Close AI helper" onClick={() => setFieldAiAssist(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.fieldAiContextGrid}>
                <div>
                  <span>Company</span>
                  <strong>{fieldAiAssist.companyName}</strong>
                </div>
                <div>
                  <span>Field</span>
                  <strong>{fieldAiAssist.fieldLabel}</strong>
                </div>
                <div>
                  <span>Current value</span>
                  <strong>{fieldAiAssist.currentValue.trim() || 'No extracted value yet'}</strong>
                </div>
              </div>

              <div className={styles.aiFieldNote}>
                <Sparkles size={16} />
                <span>
                  This uses the APMS AI assistant API. If live web search is not enabled on the backend, AI will answer from project/company context and should say that clearly.
                </span>
              </div>

              <label className={styles.inviteField}>
                <span>Question for AI</span>
                <textarea
                  className={styles.fieldAiPrompt}
                  value={fieldAiAssist.prompt}
                  onChange={(event) => setFieldAiAssist((current) => current ? { ...current, prompt: event.target.value } : current)}
                />
              </label>

              {fieldAiError && <div className={styles.inlineError}>{fieldAiError}</div>}

              <div className={styles.modalActions}>
                <button className={styles.button} type="button" onClick={() => void copyFieldAiPrompt()}>
                  <Copy size={16} /> Copy prompt
                </button>
                <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void submitFieldAiAssist()} disabled={fieldAiLoading || !fieldAiAssist.prompt.trim()}>
                  <Sparkles size={16} /> {fieldAiLoading ? 'Asking AI...' : 'Ask AI'}
                </button>
              </div>

              {fieldAiLoading && (
                <div className={styles.fieldAiLoading}>
                  <span />
                  <div>
                    <strong>AI is checking this field...</strong>
                    <p>Reviewing project context and available assistant sources.</p>
                  </div>
                </div>
              )}

              {fieldAiAssist.answer && (
                <section className={styles.fieldAiAnswerPanel}>
                  <div className={styles.fieldAiAnswerHead}>
                    <Bot size={18} />
                    <div>
                      <span>AI answer</span>
                      <strong>Use this as a reference before editing the extracted value.</strong>
                    </div>
                  </div>
                  <p>{fieldAiAssist.answer}</p>
                </section>
              )}

              {fieldAiAssist.sources && fieldAiAssist.sources.length > 0 && (
                <section className={styles.fieldAiSources}>
                  <h3>Sources returned by AI</h3>
                  {fieldAiAssist.sources.map((source, index) => (
                    <article key={`${source.documentId}-${index}`}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{source.documentTitle || source.documentId}</strong>
                        <p>{source.snippet || `${Math.round((source.relevanceScore || 0) * 100)}% relevance`}</p>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </section>
  );
};
