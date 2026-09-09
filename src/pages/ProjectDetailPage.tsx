import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
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
  Eye,
  FileText,
  Filter,
  Globe2,
  Info,
  Lightbulb,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  type LucideIcon,
  Upload,
  UserPlus,
  UserX,
  Users,
  X,
  History,
  RotateCcw,
} from 'lucide-react';
import styles from './ProjectDetailPage.module.css';
import {
  columns,
  members,
  projectDetail,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from '../data/projectDetailMock.ts';
import { projectApi } from '../API/projectApi';
import { accountApi } from '../API/accountApi';
import { taskApi } from '../API/taskApi';
import { candidateApi } from '../API/candidateApi';
import { companyMemberResearchApi } from '../API/companyMemberResearchApi';
import { EditProjectModal } from '../components/EditProjectModal';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import { ROLES, useUser } from '../context/UserContext';
import { API_BASE_URL, api } from '../services/api';
import type {
  AiExtractionResult,
  CandidateResponse,
  CandidateStatus,
  CompanyProfileMember,
} from '../types/domain';
import { CandidateReviewWorkspace } from '../components/CandidateReview/CandidateReviewWorkspace';
import { ManagerCandidateReviewWorkspace } from '../components/CandidateReview/ManagerCandidateReviewWorkspace';
import { CompanyNewsResearchWorkspace } from '../components/CompanyNewsResearchWorkspace';
import { ManagerNewsReviewWorkspace } from '../components/CompanyNewsResearch/ManagerNewsReviewWorkspace';
import FinancialResearchWorkbench from '../components/FinancialResearch/FinancialResearchWorkbench';
import ManagerFinancialResearchReviewWorkspace from '../components/FinancialResearch/ManagerFinancialResearchReviewWorkspace';
import { ContractResearchWorkbench } from '../components/ContractResearch/ContractResearchWorkbench';
import { ManagerContractResearchReviewWorkspace } from '../components/ContractResearch/ManagerContractResearchReviewWorkspace';
import type {
  CompanyMemberResearchDraftResponse,
  CompanyMemberResearchItem,
  CandidateDraftSummary,
  CreateProjectTaskRequest,
  MergeCandidateResponse,
  PageResult,
  ProjectMemberResponse,
  ProfileResponse,
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
  ManagerReviewHistoryItem,
  SubmissionStatus,
  StaffWorkHistoryItemResponse,
  TaskHistoryDetailResponse,
  TaskTimelineEventResponse,
} from '../types/domain';

const tabs = ['Kanban Board', 'Review History', 'Members'];
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

const formatDeliverableType = (type?: string | null) => {
  switch (type) {
    case 'COMPANY_DATA_PREPARATION':
    case 'COMPANY_CANDIDATE':
      return 'Company Profile Candidate';
    case 'FINANCIAL_RESEARCH':
      return 'Financial Research';
    case 'COMPANY_MEMBER_RESEARCH':
      return 'Company Members';
    case 'PARTNER_CONTRACT_COLLECTION':
      return 'Contract Information';
    case 'COMPANY_REPORT':
      return 'Company Report';
    case 'COMPANY_NEWS_RESEARCH':
      return 'News Research';
    case 'ROLE_EVALUATION':
      return 'Role Evaluation';
    default:
      return type ? type.replace(/_/g, ' ') : 'Deliverable';
  }
};

const PROJECT_STATUS_LABELS: Record<ApiProjectStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  ARCHIVED: 'Lưu trữ',
  CLOSED: 'Đóng',
};

const projectTypeLabel: Record<ApiProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New Company Research',
  UPDATE_EXISTING_COMPANY: 'Existing Company',
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
  member.projectRole === 'LEADER' ? 'Leader' : member.projectRole === 'DEPUTY' ? 'Deputy' : 'Member';

const formatAccountRole = (role: string | undefined | null) => {
  if (!role) return 'Unknown';
  // convert BUSINESS_DEVELOPMENT_MANAGER to BD Manager
  const map: Record<string, string> = {
    'BUSINESS_OWNER': 'Business Owner',
    'BUSINESS_DEVELOPMENT_MANAGER': 'BD Manager',
    'BUSINESS_DEVELOPMENT_STAFF': 'BD Staff',
    'SYSTEM_ADMIN': 'System Admin',
  };
  return map[role] || role;
};

const candidateStatusLabel: Record<CandidateStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  REVISION_REQUIRED: 'Revision required',
  REJECTED: 'Rejected',
  CORRECTED: 'Corrected',
  APPROVED: 'Approved',
};

const candidateStatusClass: Record<CandidateStatus, string> = {
  DRAFT: styles.candidateDRAFT,
  PENDING_REVIEW: styles.candidatePENDING_REVIEW,
  REVISION_REQUIRED: styles.candidateREVISION_REQUIRED || styles.candidateREJECTED,
  REJECTED: styles.candidateREJECTED,
  CORRECTED: styles.candidateCORRECTED,
  APPROVED: styles.candidateAPPROVED,
};

const visibleCandidateStatuses = new Set<CandidateStatus>(['PENDING_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED', 'DRAFT', 'CORRECTED']);

const getCandidateReviewerName = (
  candidate: CandidateResponse,
  members: ProjectMemberResponse[],
  currentUser?: { id?: number; fullName?: string; email?: string } | null
): string => {
  const reviewedBy = candidate.review?.reviewedBy
    || ((candidate.status === 'REVISION_REQUIRED' || candidate.status === 'CORRECTED') ? candidate.metadata?.lastModifiedBy : undefined);
  if (!reviewedBy) return '—';
  if (currentUser && String(currentUser.id) === String(reviewedBy)) {
    return currentUser.fullName || currentUser.email || 'Current User';
  }
  const member = members.find((m) => String(m.accountId) === String(reviewedBy));
  if (member?.fullName) return member.fullName;
  return `User #${reviewedBy}`;
};

const getCandidateReviewDate = (candidate: CandidateResponse): string | null => {
  if (candidate.review?.reviewedAt) {
    return candidate.review.reviewedAt;
  }
  if (candidate.status === 'REVISION_REQUIRED' || candidate.status === 'CORRECTED') {
    return candidate.metadata?.updatedAt || candidate.lastSubmittedAt || candidate.metadata?.createdAt || null;
  }
  return null;
};

const getCandidateSource = (candidate: CandidateResponse): { fileName: string; method?: string } => {
  const origin = candidate.extractionSource?.originFileName;
  if (origin) {
    return { fileName: origin, method: candidate.extractionSource?.extractionMethod };
  }
  const sourceDoc = candidate.sourceDocumentIds?.[0];
  if (sourceDoc) {
    return { fileName: `Doc #${sourceDoc}`, method: candidate.extractionSource?.extractionMethod };
  }
  if (candidate.extractionSource?.extractionMethod) {
    return { fileName: candidate.extractionSource.extractionMethod };
  }
  return { fileName: '—' };
};

const getCandidateEmptyStateMessage = (
  totalCandidates: number,
  statusFilter: CandidateStatus | 'ALL',
  hasSearch: boolean
): { title: string; subtitle?: string } => {
  if (totalCandidates === 0) {
    return {
      title: 'No candidates yet.',
      subtitle: 'Candidates will appear here after company information is extracted and submitted through the candidate workflow.',
    };
  }
  if (hasSearch) {
    return { title: 'No candidates match your current search and filters.' };
  }
  if (statusFilter === 'APPROVED') {
    return { title: 'No approved candidates found.' };
  }
  if (statusFilter === 'REJECTED') {
    return { title: 'No rejected candidates found.' };
  }
  if (statusFilter === 'PENDING_REVIEW') {
    return { title: 'No candidates are currently waiting for review.' };
  }
  if (statusFilter === 'DRAFT') {
    return { title: 'No draft candidates found.' };
  }
  return { title: 'No candidates match your current review filters.' };
};
const isStaffEditableCandidateStatus = (status?: CandidateStatus | null) => status === 'DRAFT' || status === 'REVISION_REQUIRED';
const selectPreferredStaffCandidateDraft = (drafts: CandidateDraftSummary[] = []) => (
  drafts.find((draft) => draft.status === 'REVISION_REQUIRED')
  ?? drafts.find((draft) => draft.status === 'DRAFT')
  ?? drafts[0]
);

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
  readOnly?: boolean;
}> = ({ field, value, onChange, readOnly }) => {
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
            readOnly={readOnly}
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
          readOnly={readOnly}
        />
      ) : (
        <input
          value={value}
          placeholder={field.placeholder}
          aria-label={`${field.label} current value`}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
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
  readOnly?: boolean;
}> = ({ group, field, review, onChange, onAskAi, readOnly }) => {
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
          readOnly={readOnly}
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
  isResearchNewCompany?: boolean;
}> = ({ review, onChange, onAskAi, isResearchNewCompany }) => (
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
              readOnly={isResearchNewCompany && (field.key === 'legalName' || field.key === 'taxId')}
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
  AVAILABLE: 'todo',
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
    color: member.projectRole === 'LEADER' ? '#2563EB' : member.projectRole === 'DEPUTY' ? '#8B5CF6' : '#22C55E',
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
    backendId: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description || 'No description provided.',
    status: task.keyResult ? task.status : (statusToColumn[task.status] ?? 'todo'),
    priority: priorityToCard[task.priority ?? 'MEDIUM'],
    assignee: fallbackMember,
    reporter: members[0],
    dueDate: task.dueDate || task.createdAt || new Date().toISOString(),
    labels: task.keyResult ? [task.keyResult.name] : [task.taskType?.replace(/_/g, ' ') || 'GENERAL TASK'],
    availableActions: task.availableActions,
    taskType: task.taskType,
    keyResultType: task.keyResult?.type,
    attachments: [],
    comments: [],
    activity: [
      { id: task.id, actor: task.keyResult ? 'System' : (task.assignedToName || 'APMS'), action: task.keyResult ? `Task automatically generated from ${task.keyResult.name} deliverable` : `created task with status ${task.status}`, time: formatOptionalDate(task.createdAt) },
    ],
    aiGenerated: false,
    aiSummary: 'This task was loaded from the project task API.',
    aiSuggestions: ['Use the task detail modal for future workflow details.'],
    aiRiskAnalysis: task.status === 'BLOCKED' ? 'Task is currently blocked.' : 'No risk analysis available yet.',
    aiNextSteps: ['Update task status as work progresses.'],
    keyResult: task.keyResult,
  };
};

const TaskCard: React.FC<{
  task: ProjectTask;
  onOpen: (task: ProjectTask) => void;
  onDelete?: (task: ProjectTask) => void;
  onRelease?: (task: ProjectTask) => void;
  onReview?: (task: ProjectTask) => void;
  onClaim?: (taskId: string) => void;
  deleting?: boolean;
  releasing?: boolean;
  claiming?: boolean;
}> = ({
  task,
  onOpen,
  onDelete,
  onRelease,
  onReview,
  onClaim,
  deleting = false,
  releasing = false,
  claiming = false,
}) => (
  <motion.article
    layout
    className={`${styles.taskCard} ${task.status === 'done' || task.status === 'DONE' ? styles.taskCardDone : ''}`}
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
      </div>
    </div>
    <h4 className={styles.taskTitle}>{task.title}</h4>
    <div className={styles.labels}>
      {!task.keyResult && (
        <span className={`${styles.priority} ${priorityClass[task.priority]}`}>{task.priority}</span>
      )}
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
    {(() => {
      const hasRelease = onRelease && task.availableActions?.includes('RELEASE_TASK');
      const hasClaim = onClaim && task.availableActions?.includes('CLAIM_TASK');
      if (!hasRelease && !onReview && !hasClaim) return null;
      return (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
          {hasRelease && (
            <button
              className={styles.button}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                onRelease(task);
              }}
              disabled={releasing}
            >
              {releasing ? 'Releasing...' : 'Release Task'}
            </button>
          )}
          {onReview && (
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                onReview(task);
              }}
            >
              Review
            </button>
          )}
          {hasClaim && (
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                onClaim(task.id.replace('APMS-', ''));
              }}
              disabled={claiming}
            >
              {claiming ? 'Taking...' : 'Take Task'}
            </button>
          )}
        </div>
      );
    })()}
  </motion.article>
);

const TaskDetailModal: React.FC<{
  task: ProjectTask | null;
  onClose: () => void;
  onOpenWorkbench?: (task: ProjectTask) => void;
  onRelease?: (task: ProjectTask) => void;
}> = ({ task, onClose, onOpenWorkbench, onRelease }) => {
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  useEffect(() => {
    if (!task) return;
    
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [task]);

  useEffect(() => {
    if (task && task.projectId) {
      setActivityLoading(true);
      setActivityError(false);
      taskApi.getTaskActivity(task.projectId, task.backendId ?? task.id.replace('APMS-', ''))
        .then(res => {
          if (Array.isArray(res.data)) {
            setActivityLogs(res.data);
          } else {
            console.error("Unexpected activity response shape:", res);
            setActivityError(true);
            setActivityLogs([]);
          }
          setActivityLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load task activity:", err);
          setActivityError(true);
          setActivityLogs([]);
          setActivityLoading(false);
        });
    } else {
      setActivityLogs([]);
      setActivityLoading(false);
    }
  }, [task]);

  const formatDateWithTime = (dateString: string) => {
    if (dateString.includes('ago') || dateString.includes('Today') || dateString.includes('Yesterday')) {
      return dateString;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} · ${timePart}`;
  };

  const getActionText = (action: string, detail: string) => {
    switch (action) {
      case 'PROJECT_TASK_CREATED': return detail || 'Generated this task';
      case 'PROJECT_TASK_CLAIMED': return 'Claimed this task';
      case 'PROJECT_TASK_RELEASED': return 'Released this task';
      case 'PROJECT_TASK_SUBMITTED': return 'Submitted this task for review';
      case 'PROJECT_TASK_SUBMISSION_REVISION_REQUESTED': return 'Requested changes';
      case 'PROJECT_TASK_SUBMISSION_APPROVED': return 'Approved this task';
      default: return action;
    }
  };

  return typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {task && (
            <motion.div className={`${styles.overlay} ${styles.taskDetailOverlay}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
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
              <div><span>Status</span><strong>
                {task.status === 'AVAILABLE' ? 'Available' :
                 task.status === 'IN_PROGRESS' ? 'In Progress' :
                 task.status === 'IN_REVIEW' ? 'In Review' :
                 task.status === 'DONE' ? 'Done' :
                 task.status === 'CANCELLED' ? 'Cancelled' :
                 task.status === 'TODO' || task.status === 'todo' ? 'To Do' :
                 task.status === 'progress' ? 'In Progress' :
                 task.status === 'review' ? 'In Review' :
                 task.status === 'done' ? 'Done' :
                 task.status}
              </strong></div>
              {task.keyResult ? (
                <>
                  <div><span>Deliverable</span><strong>{task.keyResult.name}</strong></div>
                  <div><span>Progress Weight</span><strong>{task.keyResult.weight != null ? `${task.keyResult.weight} %` : ''}</strong></div>
                </>
              ) : null}
              {!task.keyResult && (
                <div><span>Priority</span><strong>{task.priority}</strong></div>
              )}
              <div><span>Assignee</span><strong>{task.assignee.name}</strong></div>
              {!task.keyResult && (
                <div><span>Reporter</span><strong>{task.reporter.name}</strong></div>
              )}
              <div><span>Due date</span><strong>{formatDate(task.dueDate)}</strong></div>
              {!task.keyResult && (
                <div><span>Labels</span><strong>{task.labels.join(', ')}</strong></div>
              )}
            </div>
          </section>

          <section className={styles.drawerSection}>
            <h3><Activity size={16} /> Activity History</h3>
            {activityLoading ? (
              <p className={styles.description}>Loading activity...</p>
            ) : activityError ? (
              <p className={styles.description}>Unable to load activity.</p>
            ) : activityLogs.length > 0 ? (
              <div className={styles.timeline}>
                {activityLogs.map((item) => (
                  <div key={item.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <strong>{item.actorName}</strong>
                      </div>
                      <div className={styles.timelineAction}>
                        {getActionText(item.action, item.detail)}
                      </div>
                      <div className={styles.timelineTime}>
                        {formatDateWithTime(item.occurredAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.description}>No activity yet.</p>
            )}
          </section>

          {(onOpenWorkbench || onRelease || task?.status === 'IN_REVIEW' || task?.status === 'DONE') && (
            <section className={styles.drawerSection}>
              {onOpenWorkbench && task?.availableActions?.includes('SUBMIT_TASK') && (
                <button
                  className={styles.primaryButton}
                  onClick={() => {
                    onOpenWorkbench(task);
                    onClose();
                  }}
                  style={{ marginRight: '8px' }}
                >
                  Open Workbench
                </button>
              )}
              {task?.status === 'IN_REVIEW' && (
                <p className={styles.statusMessage}>Waiting for Manager Review</p>
              )}
              {(task?.status === 'DONE' || task?.status === 'done') && (
                <p className={styles.statusMessage}>Completed</p>
              )}
            </section>
          )}
        </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;
};

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

const evidenceSourceKey = (source: StaffExtractionEvidenceSource, index: number) => [
  source.rawDocumentId || source.extractionId || source.importJobId || source.fileName || 'source',
  source.pageNumber ?? 'na',
  index,
].join('-');

const evidenceSourceLabel = (source: StaffExtractionEvidenceSource, index: number) =>
  source.fileName || source.rawDocumentId || `Source ${index + 1}`;

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
    fields: ['website', 'email', 'phone', 'address'],
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
  const hasSourceEvidence = sources.some((source) => Boolean(source.evidenceText?.trim()));
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
      {sources.length > 0 ? (
        <div className={`${styles.extractionEvidenceSourceList} ${hasSourceEvidence ? '' : styles.extractionEvidenceMissing}`}>
          <div>
            <span>Source evidence</span>
            <strong>{sources.length} source document{sources.length !== 1 ? 's' : ''}</strong>
          </div>
          {sources.map((source, index) => {
            const sourceMeta = [
              source.pageNumber ? `Page ${source.pageNumber}` : 'Page unavailable',
              typeof source.confidenceScore === 'number' ? `${source.confidenceScore}% confidence` : null,
            ].filter((item): item is string => Boolean(item));
            return (
              <article key={evidenceSourceKey(source, index)}>
                <strong>{evidenceSourceLabel(source, index)}</strong>
                <p>{source.evidenceText || 'No source quote returned for this file.'}</p>
                <footer>
                  {sourceMeta.map((item) => <small key={item}>{item}</small>)}
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={`${styles.extractionEvidenceCompact} ${hasEvidence ? '' : styles.extractionEvidenceMissing}`}>
          <div>
            <span>Source evidence</span>
            <strong>{hasEvidence ? 'Evidence available for this field' : 'No source quote returned'}</strong>
          </div>
          <p>{evidence.evidenceText || 'AI returned a value, but no supporting quote was attached. Staff should verify it in the original document.'}</p>
        </div>
      )}
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
    description: 'Select project documents, run AI extraction, create a candidate draft, correct data, then submit to manager.',
    steps: ['AI extraction', 'Candidate draft', 'Submit review'],
  },
  PARTNER_CONTRACT_COLLECTION: {
    title: 'Partner contract collection',
    description: 'Upload partner contract documents, submit them to manager, then approved contracts are saved to the company profile.',
    steps: ['Start work', 'Upload contracts', 'Submit review'],
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
    steps: ['Start work', 'Add members', 'Submit review'],
  },
  COMPANY_NEWS_RESEARCH: {
    title: 'Company news research',
    description: 'Find relevant company news, record sources and summaries, save a draft, then submit it for manager review.',
    steps: ['Start Work', 'Research News', 'Review Drafts', 'Submit Review'],
  },
  FINANCIAL_RESEARCH: {
    title: 'Financial research',
    description: 'Create financial reports, extract metrics with AI, review the results, then submit the package to manager.',
    steps: [],
  },
  GENERAL_TASK: {
    title: 'General task',
    description: 'A generic task for miscellaneous assignments.',
    steps: ['Start work', 'Submit result'],
  },
};

const createTaskTypeOptions: Array<{ value: TaskType; label: string }> = [
  { value: 'GENERAL_TASK', label: 'General task' },
  { value: 'COMPANY_DATA_PREPARATION', label: 'Company data preparation' },
  { value: 'COMPANY_MEMBER_RESEARCH', label: 'Company member research' },
  { value: 'COMPANY_NEWS_RESEARCH', label: 'Company news research' },
  { value: 'ROLE_EVALUATION', label: 'Role evaluation' },
  { value: 'PARTNER_CONTRACT_COLLECTION', label: 'Partner contract collection' },
];

const emptyCompanyMemberForm: CompanyMemberResearchItem = {
  fullName: '',
  position: '',
  imageUrl: '',
  sourceUrl: '',
  notes: '',
};

const companyMemberInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${Array.from(words[0])[0] || ''}${Array.from(words[words.length - 1])[0] || ''}`.toUpperCase();
  return Array.from(name.trim()).slice(0, 2).join('').toUpperCase() || 'NA';
};

const profileMembersToResearchItems = (members: CompanyProfileMember[] = []): CompanyMemberResearchItem[] =>
  members.map((member) => ({
    fullName: member.fullName || '',
    position: member.position || '',
    imageUrl: member.imageUrl || '',
    sourceUrl: member.sourceUrl || '',
    notes: member.notes || '',
  }));

const resolveMemberImageUrl = (imageUrl?: string | null): string => {
  if (!imageUrl) return '';
  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl;
  }
  const cleanBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${cleanBase}${path}`;
};

const CompanyMemberAvatar: React.FC<{ fullName: string; imageUrl?: string | null }> = ({ fullName, imageUrl }) => {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveMemberImageUrl(imageUrl);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  if (resolved && !imgError) {
    return (
      <img
        src={resolved}
        alt={fullName}
        onError={() => setImgError(true)}
      />
    );
  }
  return <span>{companyMemberInitials(fullName)}</span>;
};

const CompanyMemberLayerBoard: React.FC<{
  members: CompanyMemberResearchItem[];
  emptyText: string;
  statusLabel?: string;
  renderActions?: (member: CompanyMemberResearchItem, index: number) => React.ReactNode;
}> = ({ members, emptyText, statusLabel, renderActions }) => {
  if (!members || members.length === 0) {
    return (
      <div
        className={styles.empty}
        style={{
          padding: '36px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{emptyText}</div>
        {renderActions && (
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 400 }}>
            Add a company member using the form.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.memberResearchCards}>
      {members.map((member, index) => (
        <article className={styles.memberResearchCard} key={`${member.fullName}-${member.position}-${index}`}>
          <div className={styles.memberResearchAvatar}>
            <CompanyMemberAvatar fullName={member.fullName} imageUrl={member.imageUrl} />
          </div>
          <div className={styles.memberResearchBody}>
            <strong>{member.fullName || 'Unnamed member'}</strong>
            <span>{member.position || 'Position not provided'}</span>
            {member.sourceUrl ? (
              <a href={member.sourceUrl} target="_blank" rel="noreferrer" style={{ marginTop: '2px' }}>
                <ExternalLink size={12} /> Source
              </a>
            ) : null}
            {statusLabel && statusLabel !== 'Draft' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 7px',
                  borderRadius: '4px',
                  background: statusLabel === 'Approved' ? '#dcfce7' : statusLabel === 'Submitted' ? '#dbeafe' : '#f1f5f9',
                  color: statusLabel === 'Approved' ? '#15803d' : statusLabel === 'Submitted' ? '#1e40af' : '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  width: 'fit-content',
                  marginTop: '2px',
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
          {renderActions && (
            <div className={styles.memberResearchActions}>
              {renderActions(member, index)}
            </div>
          )}
        </article>
      ))}
    </div>
  );
};

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ setActivePage }) => {
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const isManager = currentUser?.role === ROLES.MANAGER || currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.ADMIN;
  const isStaffView = currentUser?.role === ROLES.STAFF;
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(PROJECT_DETAIL_TAB_STORAGE_KEY);
    if (saved === 'Candidate History' || saved === 'Candidates') return 'Review History';
    if (saved === 'Documents' || saved === 'Company Members') return 'Kanban Board';
    if (saved === 'My Work History') return 'My Work History';
    return (saved === 'Pending Reviews' || saved === 'Available Tasks') ? 'Kanban Board' : (saved || 'Kanban Board');
  });
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [apiTasks, setApiTasks] = useState<ProjectTaskResponse[]>([]);
  const [availableTasks, setAvailableTasks] = useState<ProjectTaskResponse[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskRefreshTick, setTaskRefreshTick] = useState(0);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<ProjectTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [selectedStaffTask, setSelectedStaffTask] = useState<ProjectTaskResponse | null>(null);
  const [selectedManagerReviewTask, setSelectedManagerReviewTask] = useState<ProjectTaskResponse | null>(null);
  const [cancelTaskConfirmOpen, setCancelTaskConfirmOpen] = useState(false);
  const [releaseTaskConfirmOpen, setReleaseTaskConfirmOpen] = useState(false);
  const [releaseTaskError, setReleaseTaskError] = useState<string | null>(null);
  const [releasingTask, setReleasingTask] = useState(false);
  const [cancelTaskLoading, setCancelTaskLoading] = useState(false);
  const [cancelTaskError, setCancelTaskError] = useState<string | null>(null);
  const cancelTaskDialogRef = useRef<HTMLDivElement | null>(null);
  const cancelTaskLoadingRef = useRef(false);
  const [candidateReviewTaskContext, setCandidateReviewTaskContext] = useState<{
    projectId: number;
    taskId: number;
    submissionId?: number | null;
    submission?: ProjectTaskSubmissionResponse | null;
    allActiveSubmissions?: ProjectTaskSubmissionResponse[];
    taskDueDate?: string | null;
    taskTitle?: string | null;
  } | null>(null);
  const [reviewSubmissionError, setReviewSubmissionError] = useState<{ task: ProjectTaskResponse; message: string } | null>(null);
  const [resolvingSubmission, setResolvingSubmission] = useState(false);
  const [managerCandidateTab, setManagerCandidateTab] = useState<ManagerCandidateTab>('overview');
  const [workbench, setWorkbench] = useState<ProjectTaskWorkbenchResponse | null>(null);
  const [workbenchLoading, setWorkbenchLoading] = useState(false);
  const [workbenchError, setWorkbenchError] = useState<string | null>(null);
  const [workbenchMessage, setWorkbenchMessage] = useState<string | null>(null);
  const [pendingReviewTasks, setPendingReviewTasks] = useState<ProjectTaskResponse[]>([]);
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [projectRefreshTick, setProjectRefreshTick] = useState(0);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Async Multi-Document Extraction States
  const [extractionJobId, setExtractionJobId] = useState<string | null>(null);
  const [extractionJob, setExtractionJob] = useState<any>(null);

  const [extractingImportJobId, setExtractingImportJobId] = useState<number | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<WorkbenchDocumentResponse[]>([]);
  const [projectDocumentsError, setProjectDocumentsError] = useState<string | null>(null);
  const [projectDocumentsLoading, setProjectDocumentsLoading] = useState(false);
  const [documentsTabItems, setDocumentsTabItems] = useState<WorkbenchDocumentResponse[]>([]);
  const [documentsTabLoading, setDocumentsTabLoading] = useState(false);
  const [documentsTabError, setDocumentsTabError] = useState<string | null>(null);
  const [contractPendingDelete, setContractPendingDelete] = useState<WorkbenchDocumentResponse | null>(null);
  const [contractDeleteLoading, setContractDeleteLoading] = useState(false);
  const [documentPendingDelete, setDocumentPendingDelete] = useState<WorkbenchDocumentResponse | null>(null);
  const [documentDeleteLoading, setDocumentDeleteLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberResponse | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [showTransferLeaveModal, setShowTransferLeaveModal] = useState(false);
  const [leaveProjectLoading, setLeaveProjectLoading] = useState(false);
  const [transferLeaveCandidateId, setTransferLeaveCandidateId] = useState<number | "">("");
  const [openMemberMenuId, setOpenMemberMenuId] = useState<number | null>(null);
  const [companyMembersProfile, setCompanyMembersProfile] = useState<ProfileResponse | null>(null);
  const [companyMembersLoading, setCompanyMembersLoading] = useState(false);
  const [companyMembersError, setCompanyMembersError] = useState<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentSort, setDocumentSort] = useState<'newest' | 'oldest' | 'name' | 'type' | 'size'>('newest');
  const [selectedProjectDocumentIds, setSelectedProjectDocumentIds] = useState<number[]>([]);
  const [extractingSelectedDocuments, setExtractingSelectedDocuments] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ percent: number; label: string } | null>(null);
  const [pendingExtractionReviews, setPendingExtractionReviews] = useState<StaffExtractionReview[]>([]);
  const [lastExtractionReviews, setLastExtractionReviews] = useState<StaffExtractionReview[]>([]);
  const [claimingTaskId, setClaimingTaskId] = useState<number | null>(null);
  const [releasingTaskId, setReleasingTaskId] = useState<number | null>(null);

  // Staff Work History States
  const [myWorkHistory, setMyWorkHistory] = useState<StaffWorkHistoryItemResponse[]>([]);
  const [myWorkHistoryLoading, setMyWorkHistoryLoading] = useState(false);
  const [myWorkHistoryError, setMyWorkHistoryError] = useState<string | null>(null);
  const [myWorkHistorySearch, setMyWorkHistorySearch] = useState('');
  const [myWorkHistoryStatusFilter, setMyWorkHistoryStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'IN_REVIEW' | 'REVISION_REQUESTED' | 'DONE'>('ALL');
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<StaffWorkHistoryItemResponse | null>(null);
  const [taskHistoryDetail, setTaskHistoryDetail] = useState<TaskHistoryDetailResponse | null>(null);
  const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
  const [taskHistoryError, setTaskHistoryError] = useState<string | null>(null);

  useEffect(() => {
    cancelTaskLoadingRef.current = cancelTaskLoading;
  }, [cancelTaskLoading]);

  useEffect(() => {
    if (!cancelTaskConfirmOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => cancelTaskDialogRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!cancelTaskLoadingRef.current) {
          setCancelTaskError(null);
          setCancelTaskConfirmOpen(false);
        }
        return;
      }

      if (event.key !== 'Tab' || !cancelTaskDialogRef.current) return;

      const focusable = Array.from(
        cancelTaskDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        cancelTaskDialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previousFocus?.focus();
    };
  }, [cancelTaskConfirmOpen]);
  const mergedPendingExtractionReview = useMemo(
    () => mergeStaffExtractionReviews(pendingExtractionReviews),
    [pendingExtractionReviews]
  );
  const [fieldAiAssist, setFieldAiAssist] = useState<FieldAiAssistState | null>(null);
  const [fieldAiLoading, setFieldAiLoading] = useState(false);
  const [fieldAiError, setFieldAiError] = useState<string | null>(null);
  const [staffCandidate, setStaffCandidate] = useState<CandidateResponse | null>(null);
  const [newsResearchDraftCount, setNewsResearchDraftCount] = useState(0);
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
  const [submittedCandidateData, setSubmittedCandidateData] = useState<CandidateResponse | null>(null);
  const [inReviewSelectedCandidateId, setInReviewSelectedCandidateId] = useState<string | null>(null);
  const [showCancelSubmissionModal, setShowCancelSubmissionModal] = useState(false);
  const [cancellingSubmission, setCancellingSubmission] = useState(false);
  const [companyMemberDraft, setCompanyMemberDraft] = useState<CompanyMemberResearchDraftResponse | null>(null);
  const [companyMemberItems, setCompanyMemberItems] = useState<CompanyMemberResearchItem[]>([]);
  const [companyMemberForm, setCompanyMemberForm] = useState<CompanyMemberResearchItem>(emptyCompanyMemberForm);
  const [editingCompanyMemberIndex, setEditingCompanyMemberIndex] = useState<number | null>(null);
  const [companyMemberFormImageName, setCompanyMemberFormImageName] = useState('');
  const [companyMemberUploadingImage, setCompanyMemberUploadingImage] = useState(false);
  const [companyMemberImageError, setCompanyMemberImageError] = useState<string | null>(null);
  const companyMemberFileInputRef = useRef<HTMLInputElement>(null);
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
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: React.ReactNode } | null>(null);
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
    taskType: 'COMPANY_MEMBER_RESEARCH' as TaskType,
    targetCompanyProfileId: '',
  });
  const projectEndDateInput = toInputDate(apiProject?.plannedEndDate || null);
  const projectEndDateLabel = formatOptionalDate(apiProject?.plannedEndDate);
  const projectStartDateLabel = formatOptionalDate(apiProject?.createdAt);
  const createTaskDueDateError = createTaskForm.dueDate && projectEndDateInput && createTaskForm.dueDate > projectEndDateInput
    ? `Task due date cannot be later than the project's planned end date (${projectEndDateLabel}).`
    : null;
  const projectAlreadyOverdueWarning = projectEndDateInput && new Date(projectEndDateInput).getTime() < new Date(toInputDate(new Date().toISOString())).getTime()
    ? 'This project has already passed its planned end date.'
    : null;
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResponse | null>(null);
  const [candidateActionLoading, setCandidateActionLoading] = useState(false);
  const [candidateActionMessage, setCandidateActionMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Insufficient evidence');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<CandidateStatus | 'ALL'>('ALL');
  const [candidateRelationshipFilter, setCandidateRelationshipFilter] = useState('ALL');
  const [reviewHistory, setReviewHistory] = useState<ManagerReviewHistoryItem[]>([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false);
  const [reviewHistoryError, setReviewHistoryError] = useState<string | null>(null);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewDecisionFilter, setReviewDecisionFilter] = useState<'ALL' | 'APPROVED' | 'CHANGES_REQUESTED' | 'PENDING_REVIEW'>('ALL');
  const [selectedReviewHistoryItem, setSelectedReviewHistoryItem] = useState<ManagerReviewHistoryItem | null>(null);

  const closeManagerReviewModal = () => {
    setSelectedManagerReviewTask(null);
    setSelectedReviewHistoryItem(null);
  };

  useEffect(() => {
    if (!selectedManagerReviewTask && !selectedStaffTask) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedManagerReviewTask) {
          closeManagerReviewModal();
        } else if (selectedStaffTask) {
          setSelectedStaffTask(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedManagerReviewTask, selectedStaffTask]);

  const closeCandidateModal = () => {
    setSelectedCandidate(null);
    setCandidateReviewTaskContext(null);
    setSelectedReviewHistoryItem(null);
  };
  const currentProjectId = apiProject?.id ?? Number(localStorage.getItem('apms-active-project'));
  const isDraftProject = apiProject?.status === 'DRAFT';
  const isTerminalProject = apiProject?.status === 'CLOSED' || apiProject?.status === 'COMPLETED';
  const staffTaskStatus = workbench?.taskStatus || selectedStaffTask?.status;
  const canUseStaffWorkbench = Boolean(selectedStaffTask && selectedStaffTask.status === 'IN_PROGRESS');

  const isCompanyDataInReview = Boolean(
    selectedStaffTask?.taskType === 'COMPANY_DATA_PREPARATION' && staffTaskStatus === 'IN_REVIEW'
  );
  const inReviewPendingSub = isCompanyDataInReview
    ? (workbench?.submissions?.find((s) => s.status === 'IN_REVIEW') ?? workbench?.submissions?.[0])
    : undefined;
  const inReviewSubmittedCandId = inReviewPendingSub?.targetEntityId || workbench?.candidateDrafts?.[0]?.candidateId;
  const inReviewDrafts = isCompanyDataInReview
    ? [...(workbench?.candidateDrafts || [])].sort((a, b) => {
        const seqA = a.draftSequence ?? 0;
        const seqB = b.draftSequence ?? 0;
        if (seqA !== seqB) return seqB - seqA;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
    : [];
  const inReviewActiveCandId = (inReviewSelectedCandidateId && inReviewDrafts.some((d) => d.candidateId === inReviewSelectedCandidateId))
    ? inReviewSelectedCandidateId
    : (inReviewSubmittedCandId || inReviewDrafts[0]?.candidateId);
  const isStaffWorkbenchStepActive = (step: string) => {
    const hasSubmittedReview = workbench?.submissions?.some((submission) => submission.status === 'IN_REVIEW' || submission.status === 'APPROVED');
    const hasCandidateDraft = Boolean(staffCandidate) || (workbench?.candidateDrafts?.length ?? 0) > 0;
    const hasAiExtraction = pendingExtractionReviews.length > 0
      || lastExtractionReviews.length > 0
      || hasCandidateDraft
      || Boolean(workbench?.documents?.some((document) => document.latestExtractionId));

    if (selectedStaffTask && ['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION'].includes(selectedStaffTask.taskType)) {
      if (step === 'AI extraction') return extractingSelectedDocuments || selectedProjectDocumentIds.length > 0 || hasAiExtraction;
      if (step === 'Candidate draft') return hasCandidateDraft;
      if (step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (selectedStaffTask?.taskType === 'PARTNER_CONTRACT_COLLECTION') {
      if (step === 'Start work') return staffTaskStatus !== 'TODO';
      if (step === 'Upload contracts') return (workbench?.documents?.length ?? 0) > 0;
      if (step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (selectedStaffTask?.taskType === 'COMPANY_MEMBER_RESEARCH') {
      if (step === 'Start work') return staffTaskStatus !== 'TODO';
      if (step === 'Add members') return companyMemberItems.length > 0;
      if (step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (selectedStaffTask?.taskType === 'COMPANY_NEWS_RESEARCH') {
      if (step === 'Start Work') return staffTaskStatus !== 'TODO';
      if (step === 'Research News') return staffTaskStatus !== 'TODO';
      if (step === 'Review Drafts') return newsResearchDraftCount > 0;
      if (step === 'Submit Review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
      return false;
    }

    if (step === 'Start work') return staffTaskStatus !== 'TODO';
    if (step === 'Upload evidence') return (workbench?.documents?.length ?? 0) > 0;
    if (step === 'Complete task' || step === 'Submit review') return Boolean(hasSubmittedReview || staffTaskStatus === 'IN_REVIEW' || staffTaskStatus === 'DONE');
    return false;
  };
  const visibleTabs = useMemo(() => {
    if (isStaffView) return ['Kanban Board', 'My Work History', 'Members'];
    return tabs;
  }, [isStaffView, isManager]);
  const staffAccountId = useMemo(() => {
    if (!isStaffView) return null;
    if (currentUser?.id && currentUser.id > 0) return currentUser.id;
    const currentEmail = currentUser?.email?.toLowerCase();
    const matchedMember = apiProject?.members?.find((member) => member.email?.toLowerCase() === currentEmail);
    return matchedMember?.accountId ?? null;
  }, [currentUser, apiProject?.members, isStaffView]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
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
  }, [projectRefreshTick]);

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
    if (!isManager || !Number.isFinite(currentProjectId) || currentProjectId <= 0) return;

    let cancelled = false;
    setPendingReviewLoading(true);

    taskApi.getProjectTasks(currentProjectId, { status: 'IN_REVIEW' })
      .then((payload) => {
        if (cancelled) return;
        setPendingReviewTasks(unwrapList<ProjectTaskResponse>(payload));
      })
      .catch(() => {
        if (cancelled) return;
        setPendingReviewTasks([]);
      })
      .finally(() => {
        if (!cancelled) setPendingReviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, isManager, taskRefreshTick]);

  useEffect(() => {
    if (!isStaffView || !Number.isFinite(currentProjectId) || currentProjectId <= 0) return;

    let cancelled = false;
    taskApi.getProjectTasks(currentProjectId, { status: 'AVAILABLE' })
      .then((payload) => {
        if (cancelled) return;
        setAvailableTasks(unwrapList<ProjectTaskResponse>(payload));
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableTasks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, isStaffView, taskRefreshTick]);

  // Automatic polling disabled per user request to prevent screen flickering


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
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) return;
    let cancelled = false;
    setReviewHistoryLoading(true);
    setReviewHistoryError(null);

    projectApi.getProjectReviewHistory(currentProjectId)
      .then((payload) => {
        if (!cancelled) setReviewHistory(payload.data || []);
      })
      .catch((error) => {
        if (cancelled) return;
        setReviewHistory([]);
        setReviewHistoryError(error instanceof Error ? error.message : 'Cannot load project review history.');
      })
      .finally(() => {
        if (!cancelled) setReviewHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, taskRefreshTick, projectRefreshTick]);

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

  // --- DEEP LINK NOTIFICATION EFFECT ---
  useEffect(() => {
    const focusTaskIdStr = localStorage.getItem('apms-project-detail-focus-task-id');
    if (!focusTaskIdStr) return;
    const focusTaskId = Number(focusTaskIdStr);

    if (activeTab === 'Kanban Board' || activeTab === 'My Tasks') {
      if (apiTasks.length > 0) {
        const target = apiTasks.find((t) => t.id === focusTaskId);
        if (target) {
          localStorage.removeItem('apms-project-detail-focus-task-id');
          if (isManager && target.status === 'IN_REVIEW') {
            setSelectedManagerReviewTask(target);
            void loadManagerWorkbench(target);
          } else if (isStaffView) {
            setSelectedStaffTask(target);
            const mappedCard = tasks.find((t) => t.id === `APMS-${focusTaskId}`);
            if (mappedCard) setSelectedTask(mappedCard);
          } else {
            const mappedCard = tasks.find((t) => t.id === `APMS-${focusTaskId}`);
            if (mappedCard) setSelectedTask(mappedCard);
          }
        }
      }
    }
  }, [activeTab, isManager, isStaffView, apiTasks, tasks]);

  const displayedProject = useMemo(() => ({
    name: apiProject?.projectName || projectDetail.name,
    key: toProjectKey(apiProject),
    status: apiProject ? PROJECT_STATUS_LABELS[apiProject.status] : projectDetail.status,
    type: apiProject ? projectTypeLabel[apiProject.projectType] : projectDetail.type,
    priority: projectDetail.priority,
    managerName: apiProject?.managerName || 'Not assigned',
    createdAt: formatOptionalDate(apiProject?.createdAt || projectDetail.startDate),
    dueDate: formatOptionalDate(apiProject?.plannedEndDate || projectDetail.dueDate),
    targetCompanyName: apiProject?.targetCompanyName,
    description: apiProject?.description,
  }), [apiProject]);

  const projectMembers = useMemo(() => {
    const rows = apiProject?.members ?? [];
    return [...rows].sort((a, b) => {
      if (a.projectRole === b.projectRole) return a.accountId - b.accountId;
      if (a.projectRole === 'LEADER') return -1;
      if (b.projectRole === 'LEADER') return 1;
      if (a.projectRole === 'DEPUTY') return -1;
      if (b.projectRole === 'DEPUTY') return 1;
      return 0;
    });
  }, [apiProject]);

  useEffect(() => {
    let mergedTasks = apiTasks;
    if (isStaffView) {
      const apiTaskIds = new Set(apiTasks.map((t) => t.id));
      const uniqueAvailable = availableTasks.filter((t) => !apiTaskIds.has(t.id));
      mergedTasks = [...uniqueAvailable, ...apiTasks];
    }
    setTasks(mergedTasks.map((task) => mapApiTaskToCard(task, projectMembers)));
  }, [apiTasks, availableTasks, projectMembers, isStaffView]);

  useEffect(() => {
    if (!selectedStaffTask || !['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION', 'ROLE_EVALUATION', 'FINANCIAL_RESEARCH'].includes(selectedStaffTask.taskType)) {
      setProjectDocuments([]);
      setProjectDocumentsError(null);
      setSelectedProjectDocumentIds([]);
      return;
    }

    let cancelled = false;
    setProjectDocumentsLoading(true);
    setProjectDocumentsError(null);

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
        setProjectDocumentsError(error instanceof Error ? error.message : 'Cannot load project documents.');
      })
      .finally(() => {
        if (!cancelled) setProjectDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStaffTask?.id, selectedStaffTask?.projectId, selectedStaffTask?.taskType]);

  useEffect(() => {
    setInReviewSelectedCandidateId(null);
  }, [selectedStaffTask?.id]);

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

  // Async Multi-Document Extraction Polling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (extractionJobId && selectedStaffTask) {
      interval = setInterval(async () => {
        try {
          const res = await projectApi.getExtractionJobStatus(Number(currentProjectId), selectedStaffTask.id, extractionJobId);
          if (res.success && res.data) {
            setExtractionJob(res.data);
            if (res.data.status === 'COMPLETED') {
              setExtractionJobId(null);
              queryClient.invalidateQueries({ queryKey: ['candidates'] });
              setExtractingSelectedDocuments(false);
              setWorkbenchMessage('Candidate draft created successfully from extractions.');
              await loadTaskWorkbench(selectedStaffTask);
              setToast({
                kind: 'success',
                message: (
                  <>
                    <strong>AI Extraction completed</strong>
                    <span>Company data has been extracted successfully.</span>
                  </>
                ),
              });
              // Clear progress after short delay
              window.setTimeout(() => setExtractionJob(null), 2000);
            } else if (res.data.status === 'FAILED') {
              setExtractionJobId(null);
              setExtractingSelectedDocuments(false);
              setWorkbenchError('Extraction failed: ' + (res.data.errorMessage || 'Unknown error'));
              setToast({
                kind: 'error',
                message: (
                  <>
                    <strong>AI Extraction failed</strong>
                    <span>Unable to extract company data. Please try again.</span>
                  </>
                ),
              });
              window.setTimeout(() => setExtractionJob(null), 2000);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [extractionJobId, selectedStaffTask]);


  useEffect(() => {
    if (activeTab !== 'Company Members') return;

    const profileId = apiProject?.targetCompanyProfileId;
    if (!profileId) {
      setCompanyMembersProfile(null);
      setCompanyMembersError('No approved Company Profile is linked to this project yet.');
      return;
    }

    let cancelled = false;
    setCompanyMembersLoading(true);
    setCompanyMembersError(null);

    api.get<ProfileResponse>(`/profiles/${profileId}`)
      .then((payload) => {
        if (!cancelled) setCompanyMembersProfile(payload.data ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setCompanyMembersProfile(null);
          setCompanyMembersError(error instanceof Error ? error.message : 'Cannot load company members.');
        }
      })
      .finally(() => {
        if (!cancelled) setCompanyMembersLoading(false);
      });

  }, [activeTab, apiProject?.targetCompanyProfileId]);

  useEffect(() => {
    if (!currentProjectId || !isStaffView) return;
    if (activeTab !== 'My Work History') return;

    let cancelled = false;
    setMyWorkHistoryLoading(true);
    setMyWorkHistoryError(null);

    taskApi.getMyWorkHistory(currentProjectId)
      .then((payload) => {
        if (cancelled) return;
        setMyWorkHistory(unwrapList<StaffWorkHistoryItemResponse>(payload));
      })
      .catch((error) => {
        if (cancelled) return;
        setMyWorkHistory([]);
        setMyWorkHistoryError(error instanceof Error ? error.message : 'Cannot load work history.');
      })
      .finally(() => {
        if (!cancelled) setMyWorkHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, isStaffView, activeTab, taskRefreshTick]);

  const assignableMembers = useMemo(
    () => projectMembers.filter((member) => member.projectRole !== 'LEADER'),
    [projectMembers]
  );

  const currentUserProjectRole = useMemo(() => {
    return projectMembers.find((m) => m.accountId === currentUser?.id)?.projectRole;
  }, [projectMembers, currentUser]);

  const isCurrentLeader = currentUserProjectRole === 'LEADER';
  const isCurrentDeputy = currentUserProjectRole === 'DEPUTY';
  const canManageMembers = (isCurrentLeader || isCurrentDeputy) && !isTerminalProject;

  const candidateStats = useMemo(() => {
    const reviewCandidates = candidates.filter((candidate) => visibleCandidateStatuses.has(candidate.status));
    const pending = reviewCandidates.filter((candidate) => candidate.status === 'PENDING_REVIEW').length;
    const approved = reviewCandidates.filter((candidate) => candidate.status === 'APPROVED').length;
    const rejected = reviewCandidates.filter((candidate) => candidate.status === 'REJECTED').length;
    const needsRevision = reviewCandidates.filter((candidate) => candidate.status === 'REVISION_REQUIRED' || candidate.status === 'CORRECTED').length;
    const draft = reviewCandidates.filter((candidate) => candidate.status === 'DRAFT').length;

    return {
      total: reviewCandidates.length,
      approved,
      rejected,
      pending,
      needsRevision,
      draft,
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

    return candidates
      .filter((candidate) => {
        if (!visibleCandidateStatuses.has(candidate.status)) return false;
        const effectiveStatusFilter = candidateStatusFilter !== 'ALL' && !visibleCandidateStatuses.has(candidateStatusFilter)
          ? 'ALL'
          : candidateStatusFilter;
        const matchesStatus = effectiveStatusFilter === 'ALL' || candidate.status === effectiveStatusFilter;
        if (!matchesStatus) return false;

        if (!term) return true;
        const reviewerName = getCandidateReviewerName(candidate, projectMembers, currentUser);
        const sourceInfo = getCandidateSource(candidate);
        const searchable = [
          candidate.identity?.legalName || '',
          candidate.identity?.tradeName || '',
          candidate.identity?.taxCode || '',
          candidateName(candidate),
          sourceInfo.fileName,
          reviewerName,
          candidate.review?.rejectionReason || '',
        ].join(' ').toLowerCase();
        return searchable.includes(term);
      })
      .sort((a, b) => {
        const timeA = new Date(getCandidateReviewDate(a) ?? a.lastSubmittedAt ?? a.metadata?.createdAt ?? 0).getTime();
        const timeB = new Date(getCandidateReviewDate(b) ?? b.lastSubmittedAt ?? b.metadata?.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
  }, [candidateSearch, candidateStatusFilter, candidates, projectMembers, currentUser]);

  const unifiedReviewHistory = useMemo(() => {
    const list = [...reviewHistory];
    const existingCandidateIds = new Set(
      list.map((item) => item.targetEntityId).filter(Boolean)
    );
    for (const c of candidates) {
      if (c.id && !existingCandidateIds.has(c.id)) {
        const isReviewed = c.status === 'APPROVED' || c.status === 'REVISION_REQUIRED' || c.status === 'REJECTED' || c.status === 'PENDING_REVIEW';
        if (isReviewed) {
          const mappedStatus: SubmissionStatus =
            c.status === 'APPROVED' ? 'APPROVED'
            : c.status === 'REVISION_REQUIRED' ? 'CHANGES_REQUESTED'
            : c.status === 'REJECTED' ? 'REJECTED'
            : c.status === 'PENDING_REVIEW' ? 'IN_REVIEW'
            : 'DRAFT';

          const candName = c.identity?.legalName || c.draftName || `Candidate #${c.candidateOrder || c.id.slice(-6)}`;
          list.push({
            submissionId: null,
            projectId: currentProjectId,
            taskId: c.taskId ?? null,
            taskTitle: 'Basic Company Information',
            taskType: 'COMPANY_DATA_PREPARATION',
            submissionType: 'COMPANY_CANDIDATE',
            targetEntityType: 'CompanyCandidate',
            targetEntityId: c.id,
            targetEntityName: candName,
            submittedRevisionNumber: c.revisionNumber ?? 1,
            submittedAt: c.lastSubmittedAt || c.metadata?.createdAt,
            status: mappedStatus,
            reviewedByName: c.review?.reviewedBy || (c.review?.reviewedAt ? 'Manager' : null),
            reviewedAt: c.review?.reviewedAt || (c.status === 'APPROVED' ? c.metadata?.updatedAt : null),
            reviewComment: c.review?.rejectionReason || (c.status === 'APPROVED' ? 'Candidate approved' : null),
          });
        }
      }
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.reviewedAt ?? a.submittedAt ?? 0).getTime();
      const timeB = new Date(b.reviewedAt ?? b.submittedAt ?? 0).getTime();
      return timeB - timeA;
    });
  }, [reviewHistory, candidates, currentProjectId]);

  const reviewStats = useMemo(() => {
    const total = unifiedReviewHistory.length;
    const approved = unifiedReviewHistory.filter((i) => i.status === 'APPROVED').length;
    const changesRequested = unifiedReviewHistory.filter((i) =>
      i.status === 'CHANGES_REQUESTED' || i.status === 'REVISION_REQUESTED' || i.status === 'REJECTED'
    ).length;
    const pending = unifiedReviewHistory.filter((i) =>
      i.status === 'IN_REVIEW' || i.status === 'SUBMITTED'
    ).length;
    return { total, approved, changesRequested, pending };
  }, [unifiedReviewHistory]);

  const filteredReviewHistory = useMemo(() => {
    return unifiedReviewHistory.filter((item) => {
      if (reviewDecisionFilter === 'APPROVED' && item.status !== 'APPROVED') return false;
      if (
        reviewDecisionFilter === 'CHANGES_REQUESTED' &&
        !(item.status === 'CHANGES_REQUESTED' || item.status === 'REVISION_REQUESTED' || item.status === 'REJECTED')
      )
        return false;
      if (
        reviewDecisionFilter === 'PENDING_REVIEW' &&
        !(item.status === 'IN_REVIEW' || item.status === 'SUBMITTED')
      )
        return false;

      const query = reviewSearch.trim().toLowerCase();
      if (!query) return true;

      const matchTask = item.taskTitle?.toLowerCase().includes(query);
      const matchTarget = item.targetEntityName?.toLowerCase().includes(query) || item.targetCompanyName?.toLowerCase().includes(query);
      const matchReviewer = item.reviewedByName?.toLowerCase().includes(query);
      const matchSubmitter = item.submittedByName?.toLowerCase().includes(query);
      const matchComment = item.reviewComment?.toLowerCase().includes(query);
      const matchType = item.submissionType?.toLowerCase().includes(query) || item.taskType?.toLowerCase().includes(query);

      return Boolean(matchTask || matchTarget || matchReviewer || matchSubmitter || matchComment || matchType);
    });
  }, [unifiedReviewHistory, reviewDecisionFilter, reviewSearch]);

  const openCandidateDetailById = async (candidateId?: string | null, historyItem?: ManagerReviewHistoryItem | null) => {
    if (!candidateId) return;
    setSelectedReviewHistoryItem(historyItem || null);
    const existing = candidates.find((c) => c.id === candidateId);
    if (existing) {
      void openCandidateDetail(existing);
    } else {
      try {
        const payload = await candidateApi.getCandidateById(candidateId);
        if (payload?.data) {
          void openCandidateDetail(payload.data);
        }
      } catch {
        setToast({ kind: 'error', message: 'Cannot load candidate details.' });
      }
    }
  };

  const openTaskReviewByTaskId = async (taskId?: number | null, historyItem?: ManagerReviewHistoryItem | null) => {
    if (!taskId) return;
    setSelectedReviewHistoryItem(historyItem || null);
    let target = apiTasks.find((t) => t.id === taskId) ?? availableTasks.find((t) => t.id === taskId);
    if (!target && currentProjectId) {
      try {
        const payload = await taskApi.getProjectTasks(currentProjectId);
        const rows = unwrapList<ProjectTaskResponse>(payload);
        setApiTasks(rows);
        target = rows.find((t) => t.id === taskId);
      } catch {
        // ignore
      }
    }
    if (target) {
      setSelectedManagerReviewTask(target);
      setManagerReviewComment(historyItem?.reviewComment || '');
      void loadManagerWorkbench(target);
    } else {
      setToast({ kind: 'error', message: 'Task details not found.' });
    }
  };

  const renderReviewHistoryBanner = (onClose?: () => void) => {
    if (!selectedReviewHistoryItem) return null;
    const item = selectedReviewHistoryItem;
    const isApproved = item.status === 'APPROVED';
    const isChangesRequested = item.status === 'CHANGES_REQUESTED' || item.status === 'REVISION_REQUESTED' || item.status === 'REJECTED';
    const isPending = item.status === 'IN_REVIEW' || item.status === 'SUBMITTED';

    // Ẩn banner trên đầu khi đang trong phiên review (Pending Review).
    // Chỉ hiển thị khi xem lại lịch sử các lần đã yêu cầu sửa đổi (Changes requested) hoặc đã phê duyệt.
    if (isPending || (!isChangesRequested && !isApproved)) {
      return null;
    }

    return (
      <div
        style={{
          flex: '0 0 auto',
          marginBottom: '16px',
          padding: '14px 18px',
          borderRadius: '12px',
          border: isChangesRequested
            ? '1px solid #fca5a5'
            : isApproved
            ? '1px solid #86efac'
            : '1px solid #cbd5e1',
          background: isChangesRequested
            ? 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)'
            : isApproved
            ? 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)'
            : '#f8fafc',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isChangesRequested ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <AlertTriangle size={14} />
                {item.status === 'REVISION_REQUESTED' ? 'Cần chỉnh sửa (Needs revision)' : 'Yêu cầu sửa đổi (Changes requested)'}
              </span>
            ) : isApproved ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <CheckCircle2 size={14} />
                Đã phê duyệt (Approved)
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <Clock size={14} />
                Đang chờ duyệt (Pending review)
              </span>
            )}

            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}>
              Hồ sơ đánh giá: {item.targetEntityName || item.taskTitle}
            </span>

            {item.submittedRevisionNumber != null && (
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Lần nộp #{item.submittedRevisionNumber} (Rev. {item.submittedRevisionNumber})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: '#64748b' }}>
            {item.submittedByName && (
              <span>
                Nhân viên gửi: <strong style={{ color: '#1e293b' }}>{item.submittedByName}</strong>
                {item.submittedAt ? ` (${formatDateTime(item.submittedAt)})` : ''}
              </span>
            )}
            {item.reviewedByName && (
              <span>
                Người đánh giá: <strong style={{ color: '#1e293b' }}>{item.reviewedByName}</strong>
                {item.reviewedAt ? ` (${formatDateTime(item.reviewedAt)})` : ''}
              </span>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
                aria-label="Đóng"
                title="Đóng cửa sổ chi tiết"
              >
                <X size={14} />
                Đóng
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#ffffff',
            border: isChangesRequested ? '1px solid #fecaca' : isApproved ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
            fontSize: '0.88rem',
            lineHeight: '1.45',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.8rem',
              color: isChangesRequested ? '#b91c1c' : isApproved ? '#15803d' : '#475569',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isChangesRequested ? (
              <>
                <AlertTriangle size={15} />
                <span>Nội dung yêu cầu chỉnh sửa / Lý do từ Manager:</span>
              </>
            ) : isApproved ? (
              <>
                <CheckCircle2 size={15} />
                <span>Nhận xét phê duyệt từ Manager:</span>
              </>
            ) : (
              <>
                <FileText size={15} />
                <span>Ghi chú đánh giá:</span>
              </>
            )}
          </div>
          <div
            style={{
              color: item.reviewComment ? '#0f172a' : '#94a3b8',
              fontStyle: item.reviewComment ? 'normal' : 'italic',
              whiteSpace: 'pre-wrap',
              fontWeight: item.reviewComment ? 500 : 400,
            }}
          >
            {item.reviewComment || '(Không có ghi chú nhận xét)'}
          </div>

          {item.note && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
              <strong>Ghi chú từ nhân viên khi nộp bài:</strong> {item.note}
            </div>
          )}
        </div>
      </div>
    );
  };

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

  const handleViewCompanyProfile = () => {
    const profileId = apiProject?.targetCompanyProfileId
      || candidates.find((c) => c.status === 'APPROVED' && c.lifecycle?.convertedCompanyProfileId)?.lifecycle?.convertedCompanyProfileId;
    if (!profileId) {
      setToast({ kind: 'error', message: 'No official Company Profile linked yet. An official profile is created once a candidate is approved.' });
      return;
    }
    localStorage.setItem('apms-selected-company', profileId);
    localStorage.removeItem('apms-context-project');
    if (setActivePage) {
      setActivePage(`company-detail?source=project&projectId=${apiProject?.id}&companyId=${profileId}`);
    }
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

  const handleCloseProject = async () => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) {
      setCloseError('Cannot find selected project id.');
      return;
    }

    const is100Percent = apiProject?.progressPercentage === 100;
    if (!is100Percent && !closeReason.trim()) {
      setCloseError('Please provide a reason for closing the project.');
      return;
    }

    setCloseLoading(true);
    setCloseError(null);

    try {
      const payload = await projectApi.closeProject(currentProjectId, closeReason.trim());
      const updatedProject = payload?.data;
      setApiProject((current) => {
        const nextProject = updatedProject ?? current;
        if (nextProject) {
          sessionStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(nextProject));
        }
        return nextProject;
      });
      setShowCloseModal(false);
      setToast({ kind: 'success', message: `Project ${is100Percent ? 'completed' : 'closed'} successfully.` });
      // Refetch
      setProjectRefreshTick(prev => prev + 1);
    } catch (error) {
      setCloseError(error instanceof Error ? error.message : 'Failed to close project.');
    } finally {
      setCloseLoading(false);
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
    const targetCompanyProfileId = createTaskForm.targetCompanyProfileId || apiProject?.targetCompanyProfileId || '';
    if (createTaskForm.taskType === 'COMPANY_NEWS_RESEARCH' && !targetCompanyProfileId) {
      setCreateTaskError('Company news research requires this project to have a target company profile.');
      return;
    }
    if (createTaskDueDateError) {
      setCreateTaskError(createTaskDueDateError);
      return;
    }

    const payload: CreateProjectTaskRequest = {
      title,
      description: createTaskForm.description.trim() || null,
      assignedToUserId,
      priority: createTaskForm.priority,
      dueDate: createTaskForm.dueDate ? new Date(createTaskForm.dueDate).toISOString() : null,
      taskType: createTaskForm.taskType,
      targetCompanyProfileId: createTaskForm.taskType === 'COMPANY_NEWS_RESEARCH'
        ? targetCompanyProfileId
        : undefined,
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
        taskType: 'COMPANY_MEMBER_RESEARCH',
        targetCompanyProfileId: '',
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

  const handleClaimTask = async (taskId: number) => {
    if (!currentProjectId) return;
    setClaimingTaskId(taskId);
    setTaskError(null);
    try {
      await taskApi.claimProjectTask(currentProjectId, taskId);
      setToast({ kind: 'success', message: 'Task taken successfully. You can find it in My Tasks.' });
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
      setTaskRefreshTick((t) => t + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cannot claim task.';
      if (msg.includes('409') || msg.toLowerCase().includes('already claimed')) {
        setToast({ kind: 'error', message: 'This task has already been taken by another staff member.' });
      } else {
        setToast({ kind: 'error', message: msg });
      }
      setTaskRefreshTick((t) => t + 1);
    } finally {
      setClaimingTaskId(null);
    }
  };

  const handleReleaseTask = async (task: ProjectTask) => {
    if (!currentProjectId) return;
    const taskId = Number(task.id.replace('APMS-', ''));
    setReleasingTaskId(taskId);
    setTaskError(null);
    try {
      await taskApi.releaseProjectTask(currentProjectId, taskId);
      setToast({ kind: 'success', message: 'Task released back to the Available pool.' });
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
      setTaskRefreshTick((t) => t + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cannot release task.';
      setToast({ kind: 'error', message: msg });
      setTaskRefreshTick((t) => t + 1);
    } finally {
      setReleasingTaskId(null);
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
    const task = selectedManagerReviewTask || (candidateReviewTaskContext ? {
      projectId: candidateReviewTaskContext.projectId,
      id: candidateReviewTaskContext.taskId,
      dueDate: candidateReviewTaskContext.taskDueDate,
      title: candidateReviewTaskContext.taskTitle,
    } : null);

    const submission = findSubmissionForCandidate(candidateId) || candidateReviewTaskContext?.submission;

    if (task) {
      setCandidateReviewTaskContext({
        projectId: task.projectId,
        taskId: 'id' in task ? task.id : (task as any).taskId,
        submissionId: submission?.id ?? null,
        submission: submission ?? null,
        allActiveSubmissions: candidateReviewTaskContext?.allActiveSubmissions,
        taskDueDate: task.dueDate ?? null,
        taskTitle: task.title ?? null,
      });
    }
    setSelectedManagerReviewTask(null);
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
        const payload = await candidateApi.getCandidateById(selectedCandidate.id);
        if (payload?.data) updateCandidateInList(payload.data);
        updateTaskStatusInState(candidateReviewTaskContext.taskId, 'DONE');
        setCandidateReviewTaskContext(null);
        setSelectedCandidate(null);
        setActiveTab('Kanban Board');
        setToast({ kind: 'success', message: 'Candidate approved, Company Profile created, and task moved to Done.' });
      } else {
        const payload = await candidateApi.approveCandidateWorkflow(
          selectedCandidate.id,
          'Candidate approved and Company Profile created.'
        );
        if (payload?.data?.candidateDetail) updateCandidateInList(payload.data.candidateDetail);
        setCandidateActionMessage('Candidate approved successfully.');
      }
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', selectedCandidate.id] });
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['managerReviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['companyProfiles'] });
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

      const firstDraftId = selectPreferredStaffCandidateDraft(payload.data?.candidateDrafts ?? [])?.candidateId;
      if (options.loadCandidateDraft && firstDraftId) {
        const candidatePayload = await candidateApi.getCandidateById(firstDraftId);
        setStaffCandidate(candidatePayload.data);
        setStaffCandidateEdit(candidateToEditForm(candidatePayload.data));
      } else if (options.loadCandidateDraft) {
        setStaffCandidate(null);
        setStaffCandidateEdit(emptyStaffCandidateEdit);
      }

      if (task.status === 'IN_REVIEW') {
        const pendingSub = payload.data?.submissions?.find((s: any) => s.status === 'IN_REVIEW') ?? payload.data?.submissions?.[0];
        const candId = pendingSub?.targetEntityId || payload.data?.candidateDrafts?.[0]?.candidateId;
        if (candId) {
          try {
            const candPayload = await candidateApi.getCandidateById(candId);
            setSubmittedCandidateData(candPayload.data);
          } catch (e) {
            console.error('Failed to load in-review candidate data', e);
          }
        }
      } else {
        setSubmittedCandidateData(null);
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
      const errMsg = error instanceof Error ? error.message : '';
      if (!errMsg.toLowerCase().includes('not found')) {
        setWorkbenchError(errMsg || 'Cannot load company member research draft.');
      }
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
      const errMsg = error instanceof Error ? error.message : '';
      if (!errMsg.toLowerCase().includes('not found')) {
        setWorkbenchError(errMsg || 'Cannot load company member research submission.');
      }
    } finally {
      setManagerCompanyMemberLoading(false);
    }
  };

  const loadStaffWorkbench = async (task: ProjectTaskResponse) => {
    await loadTaskWorkbench(task);
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

    try {
      const payload = await taskApi.getSubmissions(task.projectId, task.id, { page: 0, size: 1 });
      const submissions = 'content' in payload.data ? payload.data.content : payload.data;
      const latestSubmissions = Array.isArray(submissions) ? submissions : [];
      setWorkbench((current) => current ? { ...current, submissions: latestSubmissions } : current);
      if (latestSubmissions.length === 0 && task.status === 'IN_REVIEW') {
        setWorkbenchError('No submission record was found for this task.');
      }
    } catch (e) {
      if (task.status === 'IN_REVIEW') {
        setWorkbenchError('Cannot load latest submission.');
      }
    }
  };

  const resetStaffWorkbenchForms = () => {
    setStaffTaskNote('');
    setStaffCandidate(null);
    setStaffCandidateEdit(emptyStaffCandidateEdit);
    setSubmittedCandidateData(null);
    setShowCancelSubmissionModal(false);
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

  const isTaskAssignedToMe = Boolean(
    selectedStaffTask && (
      (staffAccountId && selectedStaffTask.assignedToUserId === staffAccountId) ||
      (currentUser?.id && selectedStaffTask.assignedToUserId === currentUser.id) ||
      (currentUser?.email && selectedStaffTask.assignedToName?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const canCancelStaffSubmission = Boolean(
    staffTaskStatus === 'IN_REVIEW' && (isTaskAssignedToMe || isManager || currentUser?.role === ROLES.ADMIN)
  );

  const handleCancelStaffSubmission = async () => {
    if (!selectedStaffTask) return;
    const pendingSub = workbench?.submissions?.find((s) => s.status === 'IN_REVIEW')
      ?? (staffTaskStatus === 'IN_REVIEW' ? workbench?.submissions?.[0] : undefined);

    setCancellingSubmission(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await taskApi.cancelSubmission(currentProjectId, selectedStaffTask.id, pendingSub?.id);
      setWorkbenchMessage('Submission cancelled. Task returned to In Progress.');
      setShowCancelSubmissionModal(false);

      const updatedTask: ProjectTaskResponse = {
        ...selectedStaffTask,
        status: 'IN_PROGRESS',
        completedAt: null,
      };

      setApiTasks((current) => current.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
      setSelectedStaffTask(updatedTask);
      setSubmittedCandidateData(null);
      await loadStaffWorkbench(updatedTask);
      setTaskRefreshTick((current) => current + 1);

      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        queryClient.invalidateQueries({ queryKey: ['managerReviewQueue'] });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to cancel submission.';
      setWorkbenchError(msg);
      setShowCancelSubmissionModal(false);
    } finally {
      setCancellingSubmission(false);
    }
  };

  const resetCompanyMemberForm = () => {
    setCompanyMemberForm(emptyCompanyMemberForm);
    setCompanyMemberFormImageName('');
    setCompanyMemberImageError(null);
    setEditingCompanyMemberIndex(null);
  };

  const handleCompanyMemberImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedStaffTask) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setCompanyMemberImageError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSizeBytes) {
      setCompanyMemberImageError('Image must be 2 MB or smaller.');
      return;
    }

    setCompanyMemberImageError(null);
    setCompanyMemberUploadingImage(true);
    try {
      const res = await companyMemberResearchApi.uploadImage(
        selectedStaffTask.projectId,
        selectedStaffTask.id,
        file
      );
      const uploadedUrl = res.data?.imageUrl;
      setCompanyMemberForm((prev) => ({
        ...prev,
        imageUrl: uploadedUrl || '',
      }));
      setCompanyMemberFormImageName(file.name);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to upload image. Please try again.';
      setCompanyMemberImageError(msg);
    } finally {
      setCompanyMemberUploadingImage(false);
    }
  };

  const handleRemoveCompanyMemberFormImage = () => {
    setCompanyMemberForm((prev) => ({
      ...prev,
      imageUrl: '',
    }));
    setCompanyMemberFormImageName('');
    setCompanyMemberImageError(null);
  };

  const handleSaveCompanyMemberItem = async () => {
    if (!selectedStaffTask) return;
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
      notes: editingCompanyMemberIndex !== null ? (companyMemberItems[editingCompanyMemberIndex]?.notes || null) : null,
    };

    const nextItems = editingCompanyMemberIndex === null
      ? [...companyMemberItems, nextItem]
      : companyMemberItems.map((item, index) => (index === editingCompanyMemberIndex ? nextItem : item));

    setCompanyMemberSaving(true);
    setWorkbenchError(null);
    try {
      const payload = await companyMemberResearchApi.saveDraft(selectedStaffTask.projectId, selectedStaffTask.id, nextItems);
      setCompanyMemberDraft(payload.data);
      setCompanyMemberItems(payload.data?.members ?? nextItems);
      resetCompanyMemberForm();
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot save company member.');
    } finally {
      setCompanyMemberSaving(false);
    }
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
    setCompanyMemberFormImageName(item.imageUrl ? item.imageUrl.split('/').pop() || 'Uploaded image' : '');
    setCompanyMemberImageError(null);
    setEditingCompanyMemberIndex(index);
  };

  const handleRemoveCompanyMemberItem = async (index: number) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) return;

    const nextItems = companyMemberItems.filter((_, itemIndex) => itemIndex !== index);
    if (editingCompanyMemberIndex === index) resetCompanyMemberForm();

    setCompanyMemberSaving(true);
    setWorkbenchError(null);
    try {
      const payload = await companyMemberResearchApi.saveDraft(selectedStaffTask.projectId, selectedStaffTask.id, nextItems);
      setCompanyMemberDraft(payload.data);
      setCompanyMemberItems(payload.data?.members ?? nextItems);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot delete company member.');
    } finally {
      setCompanyMemberSaving(false);
    }
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
    if (companyMemberItems.length === 0) {
      setWorkbenchError('Please add at least one company member before submitting.');
      return;
    }

    setCompanyMemberSubmitting(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await companyMemberResearchApi.saveDraft(selectedStaffTask.projectId, selectedStaffTask.id, companyMemberItems);
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

  const openDirectManagerCandidateReview = async (apiTask: ProjectTaskResponse) => {
    setResolvingSubmission(true);
    setReviewSubmissionError(null);
    try {
      const payload = await taskApi.getSubmissions(apiTask.projectId, apiTask.id, { page: 0, size: 20 });
      const submissions = 'content' in payload.data ? payload.data.content : payload.data;
      const submissionList = Array.isArray(submissions) ? submissions : [];

      const activeSub = submissionList.find((s) => s.status === 'IN_REVIEW');
      if (!activeSub || !activeSub.targetEntityId) {
        setReviewSubmissionError({
          task: apiTask,
          message: 'Review submission could not be loaded.',
        });
        return;
      }

      const candidateRes = await candidateApi.getCandidateById(activeSub.targetEntityId);
      if (!candidateRes?.data) {
        setReviewSubmissionError({
          task: apiTask,
          message: 'Review submission could not be loaded.',
        });
        return;
      }

      void loadTaskWorkbench(apiTask);

      setCandidateReviewTaskContext({
        projectId: apiTask.projectId,
        taskId: apiTask.id,
        submissionId: activeSub.id,
        submission: activeSub,
        allActiveSubmissions: submissionList.filter((s) => s.status === 'IN_REVIEW' && s.targetEntityId),
        taskDueDate: apiTask.dueDate,
        taskTitle: apiTask.title,
      });

      updateCandidateInList(candidateRes.data);
    } catch {
      setReviewSubmissionError({
        task: apiTask,
        message: 'Review submission could not be loaded.',
      });
    } finally {
      setResolvingSubmission(false);
    }
  };

  const handleReviewTask = (taskCard: ProjectTask) => {
    const rawId = Number(taskCard.id.replace('APMS-', ''));
    const apiTask = apiTasks.find((t) => t.id === rawId);
    if (apiTask) {
      if (apiTask.taskType === 'COMPANY_DATA_PREPARATION' && apiTask.status === 'IN_REVIEW') {
        void openDirectManagerCandidateReview(apiTask);
        return;
      }
      setSelectedManagerReviewTask(apiTask);
      void loadManagerWorkbench(apiTask);
    }
  };

  const handleOpenTask = (task: ProjectTask) => {
    const taskId = Number(task.id.replace('APMS-', ''));
    const findRawTaskById = (id: number) =>
      apiTasks.find((item) => item.id === id) ?? availableTasks.find((item) => item.id === id);
    const apiTask = findRawTaskById(taskId);

    if (!isStaffView) {
      if (apiTask && (apiTask.status === 'IN_REVIEW' || apiTask.status === 'DONE')) {
        if (apiTask.taskType === 'COMPANY_DATA_PREPARATION' && apiTask.status === 'IN_REVIEW') {
          void openDirectManagerCandidateReview(apiTask);
          return;
        }
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

    if (apiTask.status === 'AVAILABLE') {
      setSelectedTask(task);
      return;
    }

    if (['IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(apiTask.status)) {
      setSelectedStaffTask(apiTask);
      resetStaffWorkbenchForms();
      void loadStaffWorkbench(apiTask);
      return;
    }

    // Fallback
    setSelectedTask(task);
  };

  const handleOpenWorkbenchFromModal = (task: ProjectTask) => {
    const taskId = Number(task.id.replace('APMS-', ''));
    const apiTask = apiTasks.find((item) => item.id === taskId) ?? availableTasks.find((item) => item.id === taskId);
    if (apiTask) {
      setSelectedStaffTask(apiTask);
      resetStaffWorkbenchForms();
      void loadStaffWorkbench(apiTask);
    }
  };

  const handleReleaseTaskFromModal = (task: ProjectTask) => {
    const taskId = Number(task.id.replace('APMS-', ''));
    const apiTask = apiTasks.find((item) => item.id === taskId) ?? availableTasks.find((item) => item.id === taskId);
    if (apiTask) {
      setSelectedStaffTask(apiTask);
      setReleaseTaskError(null);
      setReleaseTaskConfirmOpen(true);
    }
  };

  const confirmReleaseStaffTask = async () => {
    if (!selectedStaffTask || !currentProjectId) return;
    setReleasingTask(true);
    setReleaseTaskError(null);
    try {
      await taskApi.releaseProjectTask(currentProjectId, selectedStaffTask.id);
      setToast({ kind: 'success', message: 'Task released successfully.' });
      setReleaseTaskConfirmOpen(false);
      setSelectedStaffTask(null);
      setWorkbench(null);
      setTaskRefreshTick((t) => t + 1);
    } catch (error) {
      setReleaseTaskError(error instanceof Error ? error.message : 'Cannot release this task.');
    } finally {
      setReleasingTask(false);
    }
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
      await loadStaffWorkbench(payload.data);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot start this task.');
    }
  };

  const handleCancelStaffTask = async () => {
    if (!selectedStaffTask) return;
    setCancelTaskError(null);
    setCancelTaskConfirmOpen(true);
  };

  const confirmCancelStaffTask = async () => {
    if (!selectedStaffTask) return;
    setCancelTaskLoading(true);
    setCancelTaskError(null);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'CANCELLED');
      updateTaskInState(payload.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'CANCELLED' } : current);
      setCancelTaskConfirmOpen(false);
      setSelectedStaffTask(null);
      setSelectedTask(null);
      setToast({ kind: 'success', message: 'Task has been cancelled.' });
    } catch (error) {
      setCancelTaskError(error instanceof Error ? error.message : 'Unable to cancel task. Please try again.');
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
      const uploadUrl = selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION'
        ? `${API_BASE_URL}/projects/${selectedStaffTask.projectId}/tasks/${selectedStaffTask.id}/partner-contracts/documents`
        : `${API_BASE_URL}/projects/${selectedStaffTask.projectId}/documents/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Cannot upload file.');
      }

      setWorkbenchMessage(selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION'
        ? 'Contract uploaded. Submit it to manager when ready.'
        : 'Evidence uploaded. You can run AI extraction now.');
      await loadStaffWorkbench(selectedStaffTask);
      if (selectedStaffTask.taskType !== 'PARTNER_CONTRACT_COLLECTION') {
        const documentsPayload = await api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${selectedStaffTask.projectId}/documents`, {
          params: { includeHidden: false, page: 0, size: 100 },
        });
        setProjectDocuments(unwrapList<WorkbenchDocumentResponse>(documentsPayload));
      }
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot upload file.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDeletePartnerContractDocument = async () => {
    if (!selectedStaffTask || !contractPendingDelete?.rawDocumentId) return;
    setContractDeleteLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      await taskApi.deletePartnerContractDocument(
        selectedStaffTask.projectId,
        selectedStaffTask.id,
        contractPendingDelete.rawDocumentId,
      );
      setWorkbench((current) => current ? {
        ...current,
        documents: current.documents?.filter((document) => document.rawDocumentId !== contractPendingDelete.rawDocumentId),
      } : current);
      setContractPendingDelete(null);
      setToast({ kind: 'success', message: 'Contract deleted successfully.' });
      await loadStaffWorkbench(selectedStaffTask);
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot delete contract.');
    } finally {
      setContractDeleteLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentPendingDelete?.rawDocumentId || !documentPendingDelete?.projectId) return;
    setDocumentDeleteLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const taskId = documentPendingDelete.taskId || selectedStaffTask?.id;
      const url = `/projects/${documentPendingDelete.projectId}/documents/${encodeURIComponent(documentPendingDelete.rawDocumentId)}${taskId ? `?taskId=${taskId}` : ''}`;
      await api.delete(url);

      const deletedDocId = documentPendingDelete.id;
      setToast({ kind: 'success', message: 'Document deleted successfully.' });
      setDocumentPendingDelete(null);

      setProjectDocuments((prev) => prev.filter((doc) => doc.id !== deletedDocId));
      setSelectedProjectDocumentIds((prev) => prev.filter((id) => id !== deletedDocId));
      setWorkbench((current) => current ? { ...current, documents: current.documents?.filter((doc) => doc.id !== deletedDocId) } : current);

      if (selectedStaffTask) {
        await loadStaffWorkbench(selectedStaffTask);
        if (selectedStaffTask.taskType !== 'PARTNER_CONTRACT_COLLECTION') {
          const documentsPayload = await api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${selectedStaffTask.projectId}/documents`, {
            params: { includeHidden: false, page: 0, size: 100 },
          });
          setProjectDocuments(unwrapList<WorkbenchDocumentResponse>(documentsPayload));
        }
      }
      if (currentProjectId) {
        const payload = await api.get<PageResult<WorkbenchDocumentResponse>>(`/projects/${currentProjectId}/documents`, {
          params: { includeHidden: false, page: 0, size: 200 },
        });
        setDocumentsTabItems(unwrapList<WorkbenchDocumentResponse>(payload));
      }
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot delete document.');
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Cannot delete document.' });
    } finally {
      setDocumentDeleteLoading(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !currentProjectId) return;
    setRemoveMemberLoading(true);
    try {
      await projectApi.removeMember(currentProjectId, memberToRemove.accountId);
      
      setApiProject((current) => {
        if (!current) return current;
        return {
          ...current,
          members: current.members.filter((m) => m.accountId !== memberToRemove.accountId),
        };
      });

      setToast({ kind: 'success', message: `Member ${memberDisplayName(memberToRemove)} removed from project.` });
      setMemberToRemove(null);
      await queryClient.invalidateQueries({ queryKey: ['projectMembers', currentProjectId] });
      await queryClient.invalidateQueries({ queryKey: ['projectDetails', currentProjectId] });
      await queryClient.invalidateQueries({ queryKey: ['project', currentProjectId] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to remove member from project.';
      setToast({ kind: 'error', message: msg });
    } finally {
      setRemoveMemberLoading(false);
    }
  };

  const handleUpdateMemberRole = async (member: ProjectMemberResponse, newRole: 'LEADER' | 'DEPUTY' | 'MEMBER') => {
    if (!currentProjectId) return;
    try {
      await projectApi.updateMemberRole(currentProjectId, member.accountId, newRole);
      setApiProject((current) => {
        if (!current) return current;
        return {
          ...current,
          members: current.members.map((m) =>
            m.accountId === member.accountId ? { ...m, projectRole: newRole } : m
          ),
        };
      });
      setToast({ kind: 'success', message: `Member ${memberDisplayName(member)} role updated to ${newRole}.` });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update member role.' });
    }
  };

  const handleTransferLeadership = async (member: ProjectMemberResponse) => {
    if (!currentProjectId || !window.confirm(`Are you sure you want to transfer project leadership to ${memberDisplayName(member)}? You will become a MEMBER.`)) return;
    try {
      await projectApi.transferLeadership(currentProjectId, member.accountId, false);
      setApiProject((current) => {
        if (!current) return current;
        return {
          ...current,
          members: current.members.map((m) => {
            if (m.accountId === member.accountId) return { ...m, projectRole: 'LEADER' };
            if (m.projectRole === 'LEADER') return { ...m, projectRole: 'MEMBER' };
            return m;
          }),
        };
      });
      setToast({ kind: 'success', message: `Leadership transferred to ${memberDisplayName(member)}.` });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to transfer leadership.' });
    }
  };

  const handleLeaveProject = async () => {
    if (!currentProjectId) return;
    setLeaveProjectLoading(true);
    try {
      await projectApi.leaveProject(currentProjectId);
      setToast({ kind: 'success', message: 'Left project successfully.' });
      if (setActivePage) setActivePage('project-management');
      else window.location.hash = 'project-management';
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to leave project.' });
    } finally {
      setLeaveProjectLoading(false);
      setShowLeaveConfirmModal(false);
    }
  };

  const handleTransferAndLeaveProject = async (newLeaderId: number) => {
    if (!currentProjectId) return;
    setLeaveProjectLoading(true);
    try {
      await projectApi.transferLeadership(currentProjectId, newLeaderId, true);
      setToast({ kind: 'success', message: 'Leadership transferred and left project successfully.' });
      setShowTransferLeaveModal(false);
      if (setActivePage) setActivePage('project-management');
      else window.location.hash = 'project-management';
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to transfer leadership and leave.' });
    } finally {
      setLeaveProjectLoading(false);
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
      // Async Multi-Document Extraction
      const rawDocumentIds = selectedDocuments.map((doc) => doc.rawDocumentId).filter((id): id is string => Boolean(id));
      if (rawDocumentIds.length === 0) {
        setWorkbenchError('The selected documents are unavailable for AI extraction (Missing Raw Document ID).');
        setExtractingSelectedDocuments(false);
        return;
      }

      if (selectedDocuments.length === 1) {
        setExtractingImportJobId(selectedDocuments[0].id);
      }

      const res = await projectApi.extractMultiDocuments(Number(currentProjectId), selectedStaffTask.id, rawDocumentIds);
      if (res.success && res.data && res.data.jobId) {
        setExtractionJobId(res.data.jobId);
      }
    } catch (error: unknown) {
      const errAny = error as any;
      const payload = errAny?.payload;
      const errorCode = payload?.errorCode;
      const isCompanyValidationError = errorCode === 'DOCUMENT_COMPANY_MISMATCH'
        || errorCode === 'DOCUMENT_COMPANY_UNRESOLVED'
        || errorCode === 'DOCUMENT_TARGET_COMPANY_MISMATCH';

      if (isCompanyValidationError && payload) {
        // Build detailed error message
        const documents = payload.details?.documents as Array<{
          rawDocumentId?: string;
          fileName?: string;
          legalName?: string;
          tradeName?: string;
          status?: string;
        }> | undefined;

        setWorkbenchError(payload.message || 'Tài liệu không đồng nhất.');

        const toastContent = (
          <>
            <strong>
              {errorCode === 'DOCUMENT_COMPANY_MISMATCH'
                ? 'Lỗi dữ liệu đầu vào'
                : errorCode === 'DOCUMENT_TARGET_COMPANY_MISMATCH'
                  ? 'Sai doanh nghiệp'
                  : 'Lỗi xác định doanh nghiệp'}
            </strong>
            <span style={{ display: 'block', marginTop: 4, fontWeight: 400 }}>
              {payload.message}
            </span>
          </>
        );

        setToast({ kind: 'error', message: toastContent });
      } else {
        const message = error instanceof Error ? error.message : 'Cannot run AI extraction.';
        setWorkbenchError(message);
        setToast({ kind: 'error', message: (<><strong>AI Extraction failed</strong><span>{message}</span></>) });
      }

      setExtractingSelectedDocuments(false);
      setExtractingImportJobId(null);
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
    const returnedCandidate = workbench?.candidateDrafts?.find((draft) => draft.status === 'REVISION_REQUIRED');
    if (returnedCandidate) {
      setWorkbenchError('This task already has a Candidate requiring revision. Continue editing the returned Candidate before creating another draft.');
      await handleOpenStaffCandidate(returnedCandidate.candidateId);
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
      const mergeRequest: {
        extractionIds: string[];
        note: string;
      } = {
        extractionIds: pendingExtractionReviews.map((review) => review.id),
        note: `Created from ${pendingExtractionReviews.length} reviewed project document extraction(s).`,
      };
      const mergePayload = await api.post<MergeCandidateResponse>(
        `/projects/${selectedStaffTask.projectId}/tasks/${selectedStaffTask.id}/candidates/from-extractions`,
        mergeRequest,
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
      await loadTaskWorkbench(selectedStaffTask);
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

  const handleCreateManualCandidate = async () => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('You are not assigned to this task or do not have permission.');
      return;
    }

    const returnedCandidate = workbench?.candidateDrafts?.find((draft) => draft.status === 'REVISION_REQUIRED');
    if (returnedCandidate) {
      setWorkbenchError('This task already has a Candidate requiring revision. Continue editing the returned Candidate before creating another draft.');
      await handleOpenStaffCandidate(returnedCandidate.candidateId);
      return;
    }

    setStaffCandidateLoading(true);
    setWorkbenchError(null);
    try {
      const payload = await candidateApi.createManualCandidate(currentProjectId!, selectedStaffTask.id);
      setStaffCandidate(payload.data);
      setWorkbenchMessage('Draft manual candidate created. Enter fields and submit.');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    } catch (error: any) {
      setWorkbenchError('Failed to create manual candidate: ' + (error.response?.data?.message || error.message));
    } finally {
      setStaffCandidateLoading(false);
    }
  };

  const handleCreateStaffCandidate = async (extractionId: string) => {
    if (!selectedStaffTask) return;
    if (!canUseStaffWorkbench) {
      setWorkbenchError('Please start this task before creating a candidate draft.');
      return;
    }
    const returnedCandidate = workbench?.candidateDrafts?.find((draft) => draft.status === 'REVISION_REQUIRED');
    if (returnedCandidate) {
      setWorkbenchError('This task already has a Candidate requiring revision. Continue editing the returned Candidate before creating another draft.');
      await handleOpenStaffCandidate(returnedCandidate.candidateId);
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
      await loadTaskWorkbench(selectedStaffTask);
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

      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.removeQueries({ queryKey: ['candidate', candidateId] });
      if (selectedStaffTask) {
        await loadStaffWorkbench(selectedStaffTask);
      }
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
    if (!isStaffEditableCandidateStatus(staffCandidate.status)) {
      setWorkbenchError('Only the selected candidate draft with DRAFT or REVISION_REQUIRED status can be submitted to manager.');
      return;
    }
    setStaffSubmitLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const workflowPayload = await candidateApi.submitCandidateWorkflow(staffCandidate.id, selectedStaffTask.id);
      const { candidateStatus, taskStatus, candidateDetail } = workflowPayload.data;
      
      const updatedTask: ProjectTaskResponse = { ...selectedStaffTask, status: taskStatus };
      updateTaskInState(updatedTask);

      setStaffCandidate(null);
      setStaffCandidateEdit(emptyStaffCandidateEdit);
      setSelectedStaffTask(null);

      setToast({ kind: 'success', message: 'Submitted for review successfully.' });
      setTaskRefreshTick((current) => current + 1);

      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
        queryClient.invalidateQueries({ queryKey: ['candidate', staffCandidate.id] });
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
        queryClient.invalidateQueries({ queryKey: ['project'] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        queryClient.invalidateQueries({ queryKey: ['managerReviewQueue'] });
      }
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
      if (selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION') {
        const rawDocumentIds = (workbench?.documents ?? [])
          .map((document) => document.rawDocumentId)
          .filter((id): id is string => Boolean(id));

        if (rawDocumentIds.length === 0) {
          throw new Error('Upload at least one contract document before submitting to manager.');
        }

        await taskApi.submitPartnerContractCollection(selectedStaffTask.projectId, selectedStaffTask.id, {
          rawDocumentIds,
          note,
        });

        const updatedTask: ProjectTaskResponse = {
          ...selectedStaffTask,
          status: 'IN_REVIEW',
        };
        updateTaskInState(updatedTask);
        setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
        setWorkbenchMessage('Contract documents submitted to manager review.');
        await loadStaffWorkbench(updatedTask);
        setSelectedStaffTask(null);
        setStaffTaskNote('');
        return;
      }

      const submitRes = await taskApi.submitTask(selectedStaffTask.projectId, selectedStaffTask.id, {
        submissionType,
        targetEntityType: latestDocument ? 'ImportJob' : selectedStaffTask.taskType,
        targetEntityId: latestDocument?.id ? String(latestDocument.id) : String(selectedStaffTask.id),
        note,
      });

      // Refetch task to get updated status
      const taskRes = await taskApi.getProjectTasks(selectedStaffTask.projectId);
      if (taskRes.success && taskRes.data) {
        const rows = 'content' in taskRes.data ? taskRes.data.content : taskRes.data;
        const freshTask = (rows as ProjectTaskResponse[]).find((t: ProjectTaskResponse) => t.id === selectedStaffTask.id);
        if (freshTask) {
          updateTaskInState(freshTask);
          setSelectedStaffTask(freshTask);
          setWorkbench((current) => current ? { ...current, taskStatus: freshTask.status } : current);
          await loadStaffWorkbench(freshTask);
        }
      } else {
        // Fallback if fetch fails
        const fallbackTask: ProjectTaskResponse = {
          ...selectedStaffTask,
          status: 'IN_REVIEW',
        };
        updateTaskInState(fallbackTask);
        setSelectedStaffTask(fallbackTask);
        setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
        await loadStaffWorkbench(fallbackTask);
      }

      setWorkbenchMessage('Task submitted to manager review.');
      setSelectedStaffTask(null);
      setStaffTaskNote('');
      setTaskRefreshTick((current) => current + 1);

      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', currentProjectId] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        queryClient.invalidateQueries({ queryKey: ['managerReviewQueue'] });
      }
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
      setPendingReviewTasks((current) => current.filter((item) => item.id !== updatedTask.id));
      setSelectedManagerReviewTask(updatedTask);
      setWorkbench((current) => current ? { ...current, taskStatus: nextStatus } : current);
      setWorkbenchMessage(decision === 'APPROVE' ? 'Task approved and moved to Done.' : 'Correction requested from staff.');
      await loadManagerWorkbench(updatedTask);
      setTaskRefreshTick((current) => current + 1);
      setProjectRefreshTick((current) => current + 1);
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
      const isPartnerContract = document.sourceType === 'PARTNER_CONTRACT'
        || selectedManagerReviewTask?.taskType === 'PARTNER_CONTRACT_COLLECTION'
        || selectedStaffTask?.taskType === 'PARTNER_CONTRACT_COLLECTION';
      const taskId = document.taskId || selectedManagerReviewTask?.id || selectedStaffTask?.id;

      if (isPartnerContract && !taskId) {
        setWorkbenchError('This contract document is missing its task context.');
        return;
      }
      const url = isPartnerContract
        ? `${API_BASE_URL}/projects/${document.projectId}/tasks/${encodeURIComponent(taskId!)}/partner-contracts/documents/${encodeURIComponent(document.rawDocumentId)}/download?download=${action === 'download'}`
        : `${API_BASE_URL}/projects/${document.projectId}/documents/${encodeURIComponent(document.rawDocumentId)}/download?download=${action === 'download'}`;
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
    if (!selectedManagerReviewTask || !['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION'].includes(selectedManagerReviewTask.taskType)) return [];

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

  const isAutomatedSystemNote = (note?: string | null): boolean => {
    if (!note || !note.trim()) return true;
    const lower = note.trim().toLowerCase();
    const withoutRecall = lower.replace('[recalled by staff]', '').trim();
    if (!withoutRecall) return true;
    return (
      withoutRecall.includes('submitted for manager review') ||
      withoutRecall.includes('submitted for review') ||
      withoutRecall.includes('submitted to manager') ||
      withoutRecall.includes('completed revisions per manager feedback') ||
      withoutRecall.includes('task result submitted') ||
      withoutRecall.includes('documents submitted') ||
      withoutRecall.includes('candidate submitted for manager review')
    );
  };

  const handleViewTaskHistory = async (taskItem: StaffWorkHistoryItemResponse) => {
    setSelectedHistoryTask(taskItem);
    setTaskHistoryDetail(null);
    setTaskHistoryError(null);
    if (!currentProjectId) return;

    setTaskHistoryLoading(true);
    try {
      const payload = await taskApi.getTaskHistory(currentProjectId, taskItem.taskId);
      const wrapped = payload as { data?: TaskHistoryDetailResponse } | null;
      const data = (wrapped?.data ?? payload) as TaskHistoryDetailResponse;
      setTaskHistoryDetail(data);
    } catch (err) {
      setTaskHistoryError(err instanceof Error ? err.message : 'Failed to load task history detail.');
    } finally {
      setTaskHistoryLoading(false);
    }
  };

  const workHistoryStats = useMemo(() => {
    const total = myWorkHistory.length;
    const inProgress = myWorkHistory.filter((t) => t.status === 'IN_PROGRESS' && t.latestReviewStatus !== 'CHANGES_REQUESTED').length;
    const revisionRequested = myWorkHistory.filter((t) => t.latestReviewStatus === 'CHANGES_REQUESTED' || (t.status as string) === 'REVISION_REQUESTED').length;
    const inReview = myWorkHistory.filter((t) => t.status === 'IN_REVIEW').length;
    const done = myWorkHistory.filter((t) => t.status === 'DONE').length;
    return { total, inProgress, revisionRequested, inReview, done };
  }, [myWorkHistory]);

  const filteredWorkHistory = useMemo(() => {
    return myWorkHistory.filter((item) => {
      const isRevision = item.latestReviewStatus === 'CHANGES_REQUESTED' || (item.status as string) === 'REVISION_REQUESTED';
      if (myWorkHistoryStatusFilter === 'IN_PROGRESS' && (item.status !== 'IN_PROGRESS' || isRevision)) return false;
      if (myWorkHistoryStatusFilter === 'REVISION_REQUESTED' && !isRevision) return false;
      if (myWorkHistoryStatusFilter === 'IN_REVIEW' && item.status !== 'IN_REVIEW') return false;
      if (myWorkHistoryStatusFilter === 'DONE' && item.status !== 'DONE') return false;

      if (myWorkHistorySearch.trim()) {
        const query = myWorkHistorySearch.toLowerCase().trim();
        const matchCode = item.taskCode?.toLowerCase().includes(query);
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchDeliverable = item.deliverable?.toLowerCase().includes(query);
        if (!matchCode && !matchTitle && !matchDeliverable) return false;
      }
      return true;
    });
  }, [myWorkHistory, myWorkHistoryStatusFilter, myWorkHistorySearch]);

  useEffect(() => {
    if (!selectedHistoryTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHistoryTask(null);
        setTaskHistoryDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryTask]);

  return (
    <section className={styles.page}>
      {toast && createPortal(<div className={`apms-toast ${toast.kind}`}>{toast.message}</div>, document.body)}
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.backRow}>
            <button className={styles.backButton} type="button" onClick={() => setActivePage ? setActivePage('project-management') : history.back()}>
              <ArrowLeft size={16} /> Back to project list
            </button>
          </div>
          <motion.header className={styles.header} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.breadcrumb}>
              Projects <ChevronRight size={14} /> {displayedProject.name}
            </div>
            {projectError && !/403|denied|forbidden/i.test(projectError) && <div className={styles.inlineError}>{projectError}</div>}
            <div className={styles.headerTop}>
              <div className={styles.titleBlock}>
                <h1>{projectLoading ? 'Loading project...' : displayedProject.name}</h1>
                <div className={styles.keyLine}>
                  <span className={`${styles.statusPill} ${apiProject?.status === 'ACTIVE' && apiProject?.isOverdue ? styles.overduePill : ''}`}>
                    {apiProject?.status === 'DRAFT' ? 'Draft' :
                     apiProject?.status === 'ACTIVE' ? (apiProject?.isOverdue ? 'Overdue' : 'Active') :
                     apiProject?.status === 'COMPLETED' ? 'Completed' :
                     apiProject?.status === 'CLOSED' ? 'Closed' :
                     displayedProject.status}
                  </span>
                  <span className={styles.badge}>{displayedProject.type === 'RESEARCH_NEW_COMPANY' ? 'New Company Research' : displayedProject.type === 'UPDATE_EXISTING_COMPANY' ? 'Existing Company Update' : displayedProject.type}</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  className={`${styles.button} ${styles.outlineButton}`}
                  type="button"
                  onClick={handleViewCompanyProfile}
                  title={
                    apiProject?.targetCompanyProfileId || candidates.some((c) => c.status === 'APPROVED' && c.lifecycle?.convertedCompanyProfileId)
                      ? "View Company Profile"
                      : "Official company profile will be created once a candidate is approved"
                  }
                >
                  <Eye size={16} />View Profile
                </button>
                {isManager && isDraftProject && (
                  <button className={`${styles.button} ${styles.outlineButton}`} type="button" onClick={() => setShowEditModal(true)}>
                    <Edit3 size={16} />Edit Project
                  </button>
                )}
                {isManager && isDraftProject && (
                  <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void handleActivateProject()} disabled={statusLoading}>
                    <CheckCircle2 size={16} />{statusLoading ? 'Activating...' : 'Activate Project'}
                  </button>
                )}
                {apiProject?.status === 'ACTIVE' && isCurrentLeader && (
                  <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => setShowCloseModal(true)}>
                    <CheckCircle2 size={16} />Close Project
                  </button>
                )}
                {isManager && !isTerminalProject && (
                  <button
                    className={`${styles.button} ${isDraftProject ? styles.outlineButton : styles.primaryButton}`}
                    type="button"
                    onClick={() => {
                      if (ensureProjectIsActive('adding staff')) setShowInviteModal(true);
                    }}
                  >
                    <UserPlus size={16} />Invite Member
                  </button>
                )}
              </div>
            </div>

            <div className={styles.summaryMetaGrid}>
              <div className={styles.summaryMetaItem}>
                <div className={styles.summaryMetaLabel}>Target Company</div>
                <div className={styles.summaryMetaValue}>{displayedProject.targetCompanyName || 'N/A'}</div>
              </div>
              <div className={styles.summaryMetaItem}>
                <div className={styles.summaryMetaLabel}>Tax Code</div>
                <div className={styles.summaryMetaValue}>{apiProject?.targetCompanyTaxCode || 'N/A'}</div>
              </div>
              <div className={styles.summaryMetaItem}>
                <div className={styles.summaryMetaLabel}>Relationship</div>
                <div className={styles.summaryMetaValue}>{apiProject?.targetRelationshipType || 'N/A'}</div>
              </div>
              <div className={styles.summaryMetaItem}>
                <div className={styles.summaryMetaLabel}>Due Date</div>
                <div className={styles.summaryMetaValue}>{displayedProject.dueDate || 'N/A'}</div>
              </div>
            </div>

            <div className={styles.summaryGoalSection}>
              <div className={styles.summarySectionLabel}>Project Goal</div>
              <p className={styles.summaryGoalText}>{apiProject?.objective || 'No project goal provided.'}</p>
            </div>

            {Boolean(apiProject?.description?.trim()) && (
              <div className={styles.summaryNotesSection}>
                <div className={styles.summarySectionLabel}>Additional Notes</div>
                <p className={styles.summaryNotesText}>{apiProject?.description}</p>
              </div>
            )}

            {(() => {
              const safeProgress = Math.max(0, Math.min(100, Math.round(apiProject?.progressPercentage || 0)));
              const isCompleted = safeProgress >= 100 || apiProject?.status === 'COMPLETED';
              const isOverdue = Boolean(apiProject?.isOverdue && !isCompleted);
              return (
                <div className={styles.summaryProgressSection}>
                  <div className={styles.summaryProgressHeader}>
                    <span className={styles.summaryProgressTitle}>Project Progress</span>
                    <span className={`${styles.summaryProgressPercent} ${isCompleted ? styles.summaryProgressPercentCompleted : ''}`}>
                      {safeProgress}%
                    </span>
                  </div>
                  <div
                    className={styles.summaryProgressBarWrapper}
                    role="progressbar"
                    aria-valuenow={safeProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Project progress"
                  >
                    <div
                      className={`${styles.summaryProgressBarFill} ${isCompleted ? styles.summaryProgressBarFillCompleted : isOverdue ? styles.summaryProgressBarFillOverdue : ''}`}
                      style={{ width: `${safeProgress}%` }}
                    />
                  </div>
                  <div className={styles.summaryProgressFooter}>
                    <span>
                      Planned End Date: {apiProject?.plannedEndDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(apiProject.plannedEndDate)) : (displayedProject.dueDate || 'N/A')}
                    </span>
                    {isOverdue && <span className={styles.summaryOverdueText}>Overdue</span>}
                  </div>
                </div>
              );
            })()}
          </motion.header>

          {apiProject?.keyResults && apiProject.keyResults.length > 0 && (
            <section className={styles.deliverablesSection}>
              <div className={styles.deliverablesHeader}>
                <h3 className={styles.deliverablesTitle}>Project Deliverables</h3>
                <span
                  className={styles.deliverablesInfoIcon}
                  title="Each deliverable has a progress weight. Its full weight is added to Project Progress only after the related task is approved and completed."
                >
                  <Info size={15} />
                </span>
              </div>
              <div className={styles.krGrid}>
                {apiProject.keyResults.map(kr => {
                  const weight = kr.weight || 0;
                  const linkedTask = apiTasks.find(t => t.keyResult?.id === kr.id) ?? availableTasks.find(t => t.keyResult?.id === kr.id);
                  
                  // Map status based on linked task and kr completion
                  const isTaskDone = linkedTask?.status === 'DONE' || kr.progress === 100;
                  let statusLabel = 'Available';
                  let statusClass = styles.krNotCompleted;

                  if (isTaskDone) {
                    statusLabel = 'Completed';
                    statusClass = styles.krCompleted;
                  } else if (linkedTask?.status === 'IN_REVIEW') {
                    statusLabel = 'In Review';
                    statusClass = styles.krInReview;
                  } else if (linkedTask?.status === 'IN_PROGRESS') {
                    statusLabel = 'In Progress';
                    statusClass = styles.krInProgress;
                  } else if (linkedTask?.status === 'AVAILABLE') {
                    statusLabel = 'Available';
                    statusClass = styles.krNotCompleted;
                  } else if (linkedTask?.status === 'TODO') {
                    statusLabel = 'Not Started';
                    statusClass = styles.krNotCompleted;
                  }

                  return (
                    <div key={kr.id} className={styles.krCard}>
                      <div className={styles.krHeader}>
                        <span className={styles.krTitle}>{kr.name}</span>
                        <span className={styles.krWeight}>{weight}%</span>
                      </div>
                      {kr.description && <div className={styles.krDescription}>{kr.description}</div>}
                      <div className={styles.krFooter}>
                        <span className={statusClass}>
                          {isTaskDone ? `✓ ${statusLabel}` : statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
                {(apiProject?.keyResults && apiProject.keyResults.length > 0 ? [
                  { id: 'AVAILABLE', title: 'Available', hint: 'Ready for staff to claim', empty: 'No tasks are currently available.' },
                  { id: 'IN_PROGRESS', title: 'In Progress', hint: 'Currently being worked on', empty: 'No tasks are currently in progress.' },
                  { id: 'IN_REVIEW', title: 'In Review', hint: 'Waiting for validation', empty: 'No tasks are waiting for review.' },
                  { id: 'DONE', title: 'Done', hint: 'Completed and accepted', empty: 'No completed tasks yet.' }
                ] : [
                  { id: 'todo', title: 'To Do', hint: 'Ready for discovery', empty: 'No tasks yet' },
                  { id: 'progress', title: 'In Progress', hint: 'Currently being worked on', empty: 'No tasks yet' },
                  { id: 'review', title: 'In Review', hint: 'Waiting for validation', empty: 'No tasks yet' },
                  { id: 'done', title: 'Done', hint: 'Completed and accepted', empty: 'No tasks yet' }
                ]).map((column) => {
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
                              onDelete={!isStaffView && !task.keyResultType ? handleDeleteTask : undefined}
                              onRelease={isStaffView && !isTerminalProject ? handleReleaseTask : undefined}
                              onReview={!isTerminalProject && task.availableActions?.includes('REVIEW_SUBMISSION') ? handleReviewTask : undefined}
                              onClaim={isStaffView && !isTerminalProject ? (id) => void handleClaimTask(Number(id)) : undefined}
                              deleting={deletingTaskId === Number(task.id.replace('APMS-', ''))}
                              releasing={releasingTaskId === Number(task.id.replace('APMS-', ''))}
                              claiming={claimingTaskId === Number(task.id.replace('APMS-', ''))}
                            />
                          ))}
                        </AnimatePresence>
                        {columnTasks.length === 0 && <div className={styles.empty}>{tasksLoading ? 'Loading tasks...' : column.empty}</div>}
                      </div>
                    </motion.section>
                  );
                })}
              </div>
            </>
          ) : (activeTab === 'Review History' || activeTab === 'Candidate History' || activeTab === 'Candidates') ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Review History</h2>
                  <p>Historical records of all manager review actions, task approvals, change requests, and candidate decisions in this project.</p>
                </div>
                <span className={styles.count}>{filteredReviewHistory.length}/{reviewStats.total}</span>
              </div>

              {reviewHistoryError && !/403|denied|forbidden/i.test(reviewHistoryError) && <div className={styles.inlineError}>{reviewHistoryError}</div>}
              {candidateActionMessage && <div className={styles.inlineSuccess}>{candidateActionMessage}</div>}

              <div className={styles.candidateStats}>
                <div><span>Total Reviews</span><strong>{reviewStats.total}</strong></div>
                <div><span>Approved</span><strong>{reviewStats.approved}</strong></div>
                <div><span>Changes Requested</span><strong>{reviewStats.changesRequested}</strong></div>
                <div><span>Pending Review</span><strong>{reviewStats.pending}</strong></div>
              </div>

              <div className={styles.candidateToolbar}>
                <label className={styles.candidateSearch}>
                  <Search size={16} />
                  <input
                    value={reviewSearch}
                    placeholder="Search task, deliverable, candidate, reviewer, comment..."
                    onChange={(event) => setReviewSearch(event.target.value)}
                  />
                </label>
                <label className={styles.candidateFilter}>
                  <Filter size={16} />
                  <select
                    value={reviewDecisionFilter}
                    onChange={(event) => setReviewDecisionFilter(event.target.value as any)}
                  >
                    <option value="ALL">All decisions ({reviewStats.total})</option>
                    <option value="APPROVED">Approved ({reviewStats.approved})</option>
                    <option value="CHANGES_REQUESTED">Changes requested ({reviewStats.changesRequested})</option>
                    <option value="PENDING_REVIEW">Pending review ({reviewStats.pending})</option>
                  </select>
                </label>
              </div>

              <div className={styles.candidateReviewTableWrap}>
                <table className={styles.candidateReviewTable}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Task / Deliverable</th>
                      <th>Target / Item</th>
                      <th>Decision</th>
                      <th>Staff</th>
                      <th>Reviewed By</th>
                      <th>Reviewed At</th>
                      <th>Comment / Reason</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewHistoryLoading && (
                      <tr>
                        <td colSpan={9}><div className={styles.empty}>Loading review history...</div></td>
                      </tr>
                    )}
                    {!reviewHistoryLoading && filteredReviewHistory.length === 0 && (
                      <tr>
                        <td colSpan={9}>
                          <div className={styles.empty} style={{ padding: '36px 16px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            <strong>
                              {reviewStats.total === 0
                                ? 'No review history records found yet.'
                                : 'No review records match your current search and filter.'}
                            </strong>
                            <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem' }}>
                              {reviewStats.total === 0
                                ? 'Review decisions, approved tasks, and changes requested by Manager will appear here.'
                                : 'Try changing your keyword or clearing the decision filter.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!reviewHistoryLoading && filteredReviewHistory.map((item, index) => {
                      const isApproved = item.status === 'APPROVED';
                      const isChangesRequested = item.status === 'CHANGES_REQUESTED' || item.status === 'REVISION_REQUESTED' || item.status === 'REJECTED';
                      const isPending = item.status === 'IN_REVIEW' || item.status === 'SUBMITTED';
                      const isCandidate = item.submissionType === 'COMPANY_CANDIDATE' || item.targetEntityType === 'CompanyCandidate';

                      const statusClass = isApproved
                        ? styles.candidateAPPROVED
                        : isChangesRequested
                        ? styles.candidateREJECTED
                        : isPending
                        ? styles.candidatePENDING_REVIEW
                        : styles.candidateDRAFT;

                      const statusLabel = isApproved
                        ? 'Approved'
                        : item.status === 'REVISION_REQUESTED'
                        ? 'Needs revision'
                        : isChangesRequested
                        ? 'Changes requested'
                        : item.status === 'REJECTED'
                        ? 'Rejected'
                        : isPending
                        ? 'Pending review'
                        : item.status;

                      const targetDisplayName = item.targetEntityName || item.targetCompanyName || item.taskTitle;
                      const deliverableLabel = formatDeliverableType(item.submissionType || item.taskType);

                      return (
                        <tr key={item.submissionId ?? `${item.taskId ?? 't'}-${item.targetEntityId ?? 'e'}-${index}`}>
                          <td>
                            <span className={styles.candidateOrderCell}>{index + 1}</span>
                          </td>
                          <td>
                            <div className={styles.candidateNameCell}>
                              <strong style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                {item.taskTitle}
                              </strong>
                              <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                {deliverableLabel}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.candidateNameCell}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {targetDisplayName}
                                </span>
                                {item.submittedRevisionNumber != null && (
                                  <span className={styles.candidateRevisionBadge}>
                                    Rev. {item.submittedRevisionNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.decisionCell}>
                              <span className={`${styles.candidateStatus} ${statusClass}`} style={{ fontSize: '0.74rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                {statusLabel}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.submittedByName || 'Staff'}
                              </span>
                              {item.submittedAt && (
                                <small style={{ color: '#94a3b8', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.submittedAt)}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                {item.reviewedByName || (item.reviewedAt ? 'Manager' : '—')}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {item.reviewedAt ? formatDateTime(item.reviewedAt) : '—'}
                            </span>
                          </td>
                          <td style={{ minWidth: 0, textAlign: 'left' }}>
                            <span
                              title={item.reviewComment || ''}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: isChangesRequested ? '#b91c1c' : '#475569',
                                fontSize: '0.78rem',
                                wordBreak: 'break-word',
                                lineHeight: '1.25',
                              }}
                            >
                              {item.reviewComment || '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isPending ? (
                              <button
                                className={`${styles.reviewActionBtn} ${styles.reviewActionBtnPrimary}`}
                                type="button"
                                onClick={() => {
                                  if (isCandidate && item.targetEntityId) {
                                    void openCandidateDetailById(item.targetEntityId, item);
                                  } else {
                                    void openTaskReviewByTaskId(item.taskId, item);
                                  }
                                }}
                              >
                                Review
                              </button>
                            ) : (
                              <button
                                className={styles.reviewActionBtn}
                                type="button"
                                onClick={() => {
                                  if (isCandidate && item.targetEntityId) {
                                    void openCandidateDetailById(item.targetEntityId, item);
                                  } else {
                                    void openTaskReviewByTaskId(item.taskId, item);
                                  }
                                }}
                              >
                                View details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : activeTab === 'My Work History' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>My Work History</h2>
                  <p>Chronological record of all tasks you have claimed, submitted, and completed across this project.</p>
                </div>
                <span className={styles.count}>{filteredWorkHistory.length}/{workHistoryStats.total}</span>
              </div>

              {myWorkHistoryError && !/403|denied|forbidden/i.test(myWorkHistoryError) && (
                <div className={styles.inlineError}>{myWorkHistoryError}</div>
              )}

              <div className={styles.candidateStats}>
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: myWorkHistoryStatusFilter === 'ALL' ? '#2563eb' : undefined,
                    boxShadow: myWorkHistoryStatusFilter === 'ALL' ? '0 0 0 2px rgba(37, 99, 235, 0.18)' : undefined,
                    background: myWorkHistoryStatusFilter === 'ALL' ? '#f8faff' : undefined,
                  }}
                  onClick={() => setMyWorkHistoryStatusFilter('ALL')}
                >
                  <span>Total Tasks</span>
                  <strong>{workHistoryStats.total}</strong>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: myWorkHistoryStatusFilter === 'IN_PROGRESS' ? '#2563eb' : undefined,
                    boxShadow: myWorkHistoryStatusFilter === 'IN_PROGRESS' ? '0 0 0 2px rgba(37, 99, 235, 0.18)' : undefined,
                    background: myWorkHistoryStatusFilter === 'IN_PROGRESS' ? '#f8faff' : undefined,
                  }}
                  onClick={() => setMyWorkHistoryStatusFilter('IN_PROGRESS')}
                >
                  <span>In Progress</span>
                  <strong>{workHistoryStats.inProgress}</strong>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: myWorkHistoryStatusFilter === 'REVISION_REQUESTED' ? '#ef4444' : undefined,
                    boxShadow: myWorkHistoryStatusFilter === 'REVISION_REQUESTED' ? '0 0 0 2px rgba(239, 68, 68, 0.18)' : undefined,
                    background: myWorkHistoryStatusFilter === 'REVISION_REQUESTED' ? '#fff5f5' : undefined,
                  }}
                  onClick={() => setMyWorkHistoryStatusFilter('REVISION_REQUESTED')}
                >
                  <span>Needs Revision</span>
                  <strong style={{ color: workHistoryStats.revisionRequested > 0 ? '#b91c1c' : undefined }}>{workHistoryStats.revisionRequested}</strong>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: myWorkHistoryStatusFilter === 'IN_REVIEW' ? '#2563eb' : undefined,
                    boxShadow: myWorkHistoryStatusFilter === 'IN_REVIEW' ? '0 0 0 2px rgba(37, 99, 235, 0.18)' : undefined,
                    background: myWorkHistoryStatusFilter === 'IN_REVIEW' ? '#f8faff' : undefined,
                  }}
                  onClick={() => setMyWorkHistoryStatusFilter('IN_REVIEW')}
                >
                  <span>In Review</span>
                  <strong>{workHistoryStats.inReview}</strong>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: myWorkHistoryStatusFilter === 'DONE' ? '#16a34a' : undefined,
                    boxShadow: myWorkHistoryStatusFilter === 'DONE' ? '0 0 0 2px rgba(22, 163, 74, 0.18)' : undefined,
                    background: myWorkHistoryStatusFilter === 'DONE' ? '#f0fdf4' : undefined,
                  }}
                  onClick={() => setMyWorkHistoryStatusFilter('DONE')}
                >
                  <span>Done</span>
                  <strong style={{ color: '#15803d' }}>{workHistoryStats.done}</strong>
                </div>
              </div>

              <div className={styles.workHistoryToolbar}>
                <label className={styles.candidateSearch}>
                  <Search size={16} />
                  <input
                    value={myWorkHistorySearch}
                    placeholder="Search task code, title, deliverable..."
                    onChange={(event) => setMyWorkHistorySearch(event.target.value)}
                  />
                </label>

                <label className={styles.candidateFilter}>
                  <Filter size={16} />
                  <select
                    value={myWorkHistoryStatusFilter}
                    onChange={(event) => setMyWorkHistoryStatusFilter(event.target.value as any)}
                  >
                    <option value="ALL">All statuses ({workHistoryStats.total})</option>
                    <option value="IN_PROGRESS">In Progress ({workHistoryStats.inProgress})</option>
                    <option value="REVISION_REQUESTED">Needs Revision ({workHistoryStats.revisionRequested})</option>
                    <option value="IN_REVIEW">In Review ({workHistoryStats.inReview})</option>
                    <option value="DONE">Done ({workHistoryStats.done})</option>
                  </select>
                </label>
              </div>

              <div className={styles.workHistoryTableWrap}>
                <table className={styles.workHistoryTable}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Task Code</th>
                      <th>Task / Deliverable</th>
                      <th>Status</th>
                      <th>Claimed At</th>
                      <th>Last Submitted</th>
                      <th>Revisions</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myWorkHistoryLoading && (
                      <tr>
                        <td colSpan={8}><div className={styles.empty}>Loading your work history...</div></td>
                      </tr>
                    )}
                    {!myWorkHistoryLoading && myWorkHistory.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className={styles.documentEmptyState} style={{ padding: '40px 20px' }}>
                            <History size={32} style={{ color: '#94a3b8', marginBottom: 8 }} />
                            <strong>No work history yet</strong>
                            <span>You haven't taken any tasks in this project. Claim an available task from the Kanban Board to begin.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!myWorkHistoryLoading && myWorkHistory.length > 0 && filteredWorkHistory.length === 0 && (
                      <tr>
                        <td colSpan={8}><div className={styles.empty}>No tasks match your search or filter.</div></td>
                      </tr>
                    )}
                    {!myWorkHistoryLoading && filteredWorkHistory.map((item, index) => {
                      const isDone = item.status === 'DONE';
                      const isRevision = item.latestReviewStatus === 'CHANGES_REQUESTED' || (item.status as string) === 'REVISION_REQUESTED';
                      const isInReview = item.status === 'IN_REVIEW';
                      const isInProgress = item.status === 'IN_PROGRESS';

                      const statusClass = isDone
                        ? styles.candidateAPPROVED
                        : isRevision
                        ? styles.candidateREJECTED
                        : isInReview
                        ? styles.candidatePENDING_REVIEW
                        : styles.candidateDRAFT;

                      const statusLabel = isDone
                        ? 'Done'
                        : isRevision
                        ? 'Changes Requested'
                        : isInReview
                        ? 'In Review'
                        : isInProgress
                        ? 'In Progress'
                        : item.status;

                      return (
                        <tr key={item.taskId}>
                          <td style={{ textAlign: 'center' }}>
                            <span className={styles.candidateOrderCell}>{index + 1}</span>
                          </td>
                          <td>
                            <span className={styles.taskCodePill}>{item.taskCode || `APMS-${item.taskId}`}</span>
                          </td>
                          <td>
                            <div className={styles.candidateNameCell}>
                              <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block', marginBottom: 2 }}>
                                {item.title}
                              </strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.74rem' }}>
                                  {item.deliverable || 'General Task'}
                                </span>
                                {item.priority && (
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>• {item.priority}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.candidateStatus} ${statusClass}`} style={{ fontSize: '0.74rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', color: '#475569' }}>
                              {item.claimedAt ? formatDateTime(item.claimedAt) : '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', color: '#475569' }}>
                              {item.lastSubmittedAt ? formatDateTime(item.lastSubmittedAt) : '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {item.revisionCount > 0 ? (
                              <span className={styles.revisionCountBadge}>
                                <AlertTriangle size={12} /> {item.revisionCount} {item.revisionCount === 1 ? 'rev' : 'revs'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>0</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 12 }}>
                            <button
                              type="button"
                              className={`${styles.reviewActionBtn} ${styles.reviewActionBtnPrimary}`}
                              onClick={() => void handleViewTaskHistory(item)}
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : activeTab === 'Documents' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Project documents</h2>
                  <p>Research documents used for company data preparation and AI extraction.</p>
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
                    <strong>No research documents found</strong>
                    <span>Upload research sources from Company Data Preparation to use them for AI extraction.</span>
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
          ) : activeTab === 'Company Members' ? (
            <motion.section className={styles.memberPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.memberPanelHead}>
                <div>
                  <h2>Company members</h2>
                </div>
                <span className={styles.count}>{companyMembersProfile?.companyMembers?.length ?? 0}</span>
              </div>

              {companyMembersError && <div className={styles.inlineError}>{companyMembersError}</div>}

              <div className={styles.companyMembersProfileHero}>
                <div>
                  <span>Official company profile</span>
                  <strong>
                    {companyMembersProfile?.identity?.tradeName
                      || companyMembersProfile?.identity?.legalName
                      || displayedProject.targetCompanyName
                      || displayedProject.name}
                  </strong>
                </div>
                <div>
                  <span>Profile version</span>
                  <strong>{companyMembersProfile?.version ?? 'N/A'}</strong>
                </div>
                <div>
                  <span>Review status</span>
                  <strong>{companyMembersProfile?.reviewStatus === 'VERIFIED' ? 'APPROVED' : companyMembersProfile?.reviewStatus || 'N/A'}</strong>
                </div>
                <div>
                  <span>Total members</span>
                  <strong>{companyMembersProfile?.companyMembers?.length ?? 0}</strong>
                </div>
              </div>

              {companyMembersError ? null : companyMembersLoading ? (
                <div className={styles.empty}>Loading company members...</div>
              ) : !companyMembersError && (companyMembersProfile?.companyMembers?.length ?? 0) === 0 ? (
                <div className={styles.documentEmptyState}>
                  <Users size={26} />
                  <strong>No company members yet</strong>
                  <span>After manager approves a Company Member Research task, approved people will appear in this tab.</span>
                </div>
              ) : (
                <CompanyMemberLayerBoard
                  members={profileMembersToResearchItems(companyMembersProfile?.companyMembers)}
                  emptyText="No company members yet."
                />
              )}
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
                      <th>Account Role</th>
                      <th>Project Role</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectMembers.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className={styles.empty}>No members found in this project.</div>
                        </td>
                      </tr>
                    )}
                    {projectMembers.map((member, index) => {
                      const isLeader = member.projectRole === 'LEADER';
                      const isDeputy = member.projectRole === 'DEPUTY';

                      return (
                        <tr key={`${member.id}-${member.accountId}`} className={isLeader ? styles.leaderRow : ''}>
                          <td>{index + 1}</td>
                          <td>
                            <div className={styles.memberCell}>
                              <span className={`${styles.memberAvatar} ${isLeader ? styles.leaderAvatar : isDeputy ? styles.deputyAvatar : styles.memberAvatar}`}>
                                {memberInitials(member)}
                              </span>
                              <span>
                                <strong>{memberDisplayName(member)}</strong>
                                <small>{member.email || 'Email not available'}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.accountRoleBadge}>{formatAccountRole(member.accountRole)}</div>
                          </td>
                          <td>
                            <span className={`${styles.memberRoleBadge} ${isLeader ? styles.leaderBadge : isDeputy ? styles.deputyBadge : styles.memberBadge}`}>
                              {memberRoleLabel(member)}
                            </span>
                          </td>
                          <td>{formatMemberDate(member.joinedAt)}</td>
                          <td>
                            <div className={styles.actionMenuWrapper}>
                              {(canManageMembers || member.accountId === currentUser?.id) && (
                                <button
                                  className={styles.actionMenuButton}
                                  onClick={() => setOpenMemberMenuId(openMemberMenuId === member.accountId ? null : member.accountId)}
                                  aria-label="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              )}
                              
                              {openMemberMenuId === member.accountId && (
                                <>
                                  <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5}} onClick={() => setOpenMemberMenuId(null)} />
                                  <div className={styles.actionMenuDropdown}>
                                    {canManageMembers && isCurrentLeader && member.projectRole === 'MEMBER' && (
                                      <button
                                        className={styles.actionMenuItem}
                                        onClick={() => { setOpenMemberMenuId(null); handleUpdateMemberRole(member, 'DEPUTY'); }}
                                      >
                                        Make Deputy
                                      </button>
                                    )}
                                    {canManageMembers && isCurrentLeader && isDeputy && (
                                      <button
                                        className={styles.actionMenuItem}
                                        onClick={() => { setOpenMemberMenuId(null); handleUpdateMemberRole(member, 'MEMBER'); }}
                                      >
                                        Remove Deputy Role
                                      </button>
                                    )}
                                    {canManageMembers && isCurrentLeader && !isLeader && (
                                      <button
                                        className={styles.actionMenuItem}
                                        onClick={() => { setOpenMemberMenuId(null); handleTransferLeadership(member); }}
                                      >
                                        Transfer Leadership
                                      </button>
                                    )}
                                    {canManageMembers && (isCurrentLeader ? !isLeader : (isCurrentDeputy && !isLeader && !isDeputy)) && member.accountId !== currentUser?.id && (
                                      <button
                                        className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                        onClick={() => { setOpenMemberMenuId(null); setMemberToRemove(member); }}
                                      >
                                        Remove from Project
                                      </button>
                                    )}
                                    {member.accountId === currentUser?.id && (
                                      <button
                                        className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                        onClick={() => {
                                          setOpenMemberMenuId(null);
                                          if (isLeader) {
                                            const candidates = projectMembers.filter(m => m.accountId !== currentUser?.id);
                                            if (candidates.length === 0) {
                                              window.alert("You must invite another member before leaving the project.");
                                              return;
                                            }
                                            setShowTransferLeaveModal(true);
                                          } else {
                                            setShowLeaveConfirmModal(true);
                                          }
                                        }}
                                      >
                                        Leave Project
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : null}
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
                    max={projectEndDateInput || undefined}
                    aria-invalid={Boolean(createTaskDueDateError)}
                    onChange={(event) => setCreateTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                  {projectEndDateInput && (
                    <small className={styles.fieldHint}>
                      Project timeline: {projectStartDateLabel} to {projectEndDateLabel}
                    </small>
                  )}
                  {projectAlreadyOverdueWarning && (
                    <small className={styles.fieldWarning}>{projectAlreadyOverdueWarning}</small>
                  )}
                  {createTaskDueDateError && (
                    <small className={styles.fieldError}>{createTaskDueDateError}</small>
                  )}
                </label>

                <label className={styles.inviteField}>
                  <span>Task type</span>
                  <select
                    value={createTaskForm.taskType}
                    onChange={(event) => {
                      const taskType = event.target.value as TaskType;
                      setCreateTaskForm((current) => ({
                        ...current,
                        taskType,
                        targetCompanyProfileId: taskType === 'COMPANY_NEWS_RESEARCH'
                          ? current.targetCompanyProfileId || apiProject?.targetCompanyProfileId || ''
                          : '',
                      }));
                    }}
                  >
                    {createTaskTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {createTaskForm.taskType === 'COMPANY_NEWS_RESEARCH' && (
                    <small className={styles.fieldHint}>
                      Uses this project's target company profile for news research.
                    </small>
                  )}
                </label>

                {createTaskForm.taskType === 'COMPANY_NEWS_RESEARCH' && (
                  <label className={styles.inviteField}>
                    <span>Target Company *</span>
                    <input
                      value={displayedProject.targetCompanyName || apiProject?.targetCompanyName || createTaskForm.targetCompanyProfileId || ''}
                      readOnly
                    />
                    <small className={styles.fieldHint}>
                      Profile ID: {createTaskForm.targetCompanyProfileId || apiProject?.targetCompanyProfileId || 'No target company profile linked to this project.'}
                    </small>
                  </label>
                )}

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
                  disabled={createTaskLoading || projectMembers.length === 0 || Boolean(createTaskDueDateError)}
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
        {contractPendingDelete && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !contractDeleteLoading && setContractPendingDelete(null)}
          >
            <motion.div
              className={styles.deleteTaskModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-contract-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.deleteTaskHead}>
                <div>
                  <span>Contract package</span>
                  <h2 id="delete-contract-title">Delete contract?</h2>
                </div>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Close delete contract confirmation"
                  onClick={() => setContractPendingDelete(null)}
                  disabled={contractDeleteLoading}
                >
                  <X size={18} />
                </button>
              </div>

              <p className={styles.deleteTaskCopy}>
                <strong>{contractPendingDelete.fileName || 'This contract'}</strong> will be removed from this contract package. This action cannot be undone.
              </p>

              <div className={styles.deleteTaskPreview}>
                <Trash2 size={20} />
                <div>
                  <strong>{contractPendingDelete.fileName || `Raw document ${contractPendingDelete.rawDocumentId}`}</strong>
                  <span>{contractPendingDelete.rawDocumentId || 'Partner contract'}</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => setContractPendingDelete(null)}
                  disabled={contractDeleteLoading}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.button} ${styles.dangerButton}`}
                  type="button"
                  onClick={() => void handleDeletePartnerContractDocument()}
                  disabled={contractDeleteLoading}
                >
                  {contractDeleteLoading ? 'Deleting...' : 'Delete'}
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
              className={`${styles.inviteModal} ${styles.staffWorkbenchModal} ${(selectedStaffTask.taskType === 'FINANCIAL_RESEARCH' || selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION') ? styles.financialResearchModal : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-workbench-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.inviteHead} style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h2 id="staff-workbench-title" style={{ marginTop: 0, marginBottom: '6px' }}>{selectedStaffTask.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#64748b', fontSize: '13px' }}>
                    <span style={{
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      backgroundColor: (workbench?.taskStatus || selectedStaffTask.status) === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9',
                      color: (workbench?.taskStatus || selectedStaffTask.status) === 'IN_PROGRESS' ? '#1d4ed8' : '#475569'
                    }}>
                      {workbench?.taskStatus || selectedStaffTask.status}
                    </span>
                    {selectedStaffTask.dueDate && (
                      <>
                        <span>•</span>
                        <span>Due {formatOptionalDate(selectedStaffTask.dueDate)}</span>
                      </>
                    )}
                    {(workbench?.targetCompanyName || displayedProject.targetCompanyName) && (
                      <>
                        <span>•</span>
                        <span>Target: <strong>{workbench?.targetCompanyName || displayedProject.targetCompanyName}</strong></span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.iconButton} type="button" aria-label="Close staff workbench" onClick={() => setSelectedStaffTask(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {workbenchError && <div className={styles.inlineError}>{workbenchError}</div>}
              {workbenchMessage && <div className={styles.inlineSuccess}>{workbenchMessage}</div>}
              {(() => {
                const rejectedSubmission = workbench?.submissions
                  ?.filter((submission) => ['REJECTED', 'CHANGES_REQUESTED', 'REVISION_REQUESTED'].includes(submission.status) && submission.reviewComment)
                  .at(-1);

                // return rejectedSubmission ? (
                //   <div className={styles.reviewNoteAlert}>
                //     <strong>{['DOCUMENT_COLLECTION', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedStaffTask.taskType) ? 'Document rejected' : 'Manager requested correction'}</strong>
                //     <span>{rejectedSubmission.reviewComment}</span>
                //   </div>
                // ) : null;
              })()}

              {!['FINANCIAL_RESEARCH', 'COMPANY_DATA_PREPARATION', 'COMPANY_MEMBER_RESEARCH', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedStaffTask.taskType) && (
                <div className={styles.workbenchStatusRow}>
                  <div>
                    <span>Status</span>
                    <strong>{workbench?.taskStatus || selectedStaffTask.status}</strong>
                  </div>
                  <div>
                    <span>Task type</span>
                    <strong>{taskTypeText[selectedStaffTask.taskType].title}</strong>
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
              )}
              {!canUseStaffWorkbench && staffTaskStatus === 'TODO' && (
                <div className={styles.reviewNoteAlert}>
                  <strong>Task has not started yet</strong>
                  <span>
                    {selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION'
                      ? 'Click Start task to move this task to In Progress before uploading or submitting partner contracts.'
                      : 'Click Start task to move this task to In Progress before using upload, AI extraction, candidate draft, submit, or delete actions.'}
                  </span>
                </div>
              )}
              {selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION' && !workbench?.targetCompanyProfileId && (
                <div className={styles.reviewNoteAlert}>
                  <strong>Target partner profile unavailable</strong>
                  <span>This contract task cannot be submitted until the partner Company Profile is available from an approved company candidate.</span>
                </div>
              )}

              {!['FINANCIAL_RESEARCH', 'COMPANY_DATA_PREPARATION', 'COMPANY_MEMBER_RESEARCH', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedStaffTask.taskType) && (
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
              )}

              {isCompanyDataInReview && (
                (() => {
                  const candDraft = workbench?.candidateDrafts?.find((d) => d.candidateId === inReviewSubmittedCandId);
                  const displayDraftTitle = submittedCandidateData?.draftName
                    || candDraft?.draftName
                    || (candDraft?.draftSequence ? `Draft ${candDraft.draftSequence}` : 'Draft');
                  const legalNameDisplay = submittedCandidateData?.identity?.legalName || 'N/A';
                  const roundLabel = inReviewPendingSub?.submittedRevisionNumber
                    ? `Round ${inReviewPendingSub.submittedRevisionNumber}`
                    : submittedCandidateData?.revisionNumber
                    ? `Round ${submittedCandidateData.revisionNumber}`
                    : 'Round 1';
                  const submittedAtDate = inReviewPendingSub?.submittedAt || inReviewPendingSub?.createdAt;
                  const submittedByLabel = inReviewPendingSub?.submittedByName || selectedStaffTask.assignedToName || 'Staff';
                  const sourceDocIds = (submittedCandidateData?.sourceDocumentIds || candDraft?.sourceDocumentIds || []) as string[];
                  const sourceDocs = projectDocuments.filter((d) =>
                    sourceDocIds.some((id) => String(id) === String(d.id) || (d.rawDocumentId && String(id) === String(d.rawDocumentId)))
                  );

                  return (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '20px 24px',
                      marginBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Submitted for Review
                          </span>
                          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                            {roundLabel}
                          </span>
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a' }}>
                          {displayDraftTitle}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                          Target Company: <strong style={{ color: '#1e293b' }}>{apiProject?.targetCompanyName || legalNameDisplay}</strong>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', color: '#475569', fontSize: '13px' }}>
                          <span><strong>Submitted:</strong> {formatOptionalDate(submittedAtDate)}</span>
                          <span><strong>Submitted By:</strong> {submittedByLabel}</span>
                          {sourceDocs.length > 0 && (
                            <span><strong>Source Documents:</strong> {sourceDocs.map((d) => d.fileName || `Doc #${d.id}`).join(', ')}</span>
                          )}
                        </div>
                      </div>

                      {canCancelStaffSubmission && (
                        <button
                          className={`${styles.button} ${styles.dangerButton}`}
                          type="button"
                          onClick={() => setShowCancelSubmissionModal(true)}
                          disabled={cancellingSubmission}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Cancel Submission
                        </button>
                      )}
                    </div>
                  );
                })()
              )}

              <div className={`${styles.staffWorkbenchGrid} ${selectedStaffTask.taskType === 'COMPANY_MEMBER_RESEARCH' ? styles.companyMemberWorkbenchGrid : ''} ${(selectedStaffTask.taskType === 'FINANCIAL_RESEARCH' || selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION') ? styles.financialResearchWorkbenchGrid : ''} ${staffCandidate ? styles.staffWorkbenchCandidateOpen : ''}`}>
                <main className={styles.workbenchMain}>
                  {isCompanyDataInReview ? (
                    inReviewActiveCandId ? (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <CandidateReviewWorkspace
                          key={inReviewActiveCandId}
                          projectId={String(currentProjectId)}
                          candidateId={inReviewActiveCandId}
                          taskId={selectedStaffTask.id}
                          role="STAFF"
                          targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                          readOnly={true}
                          isResearchNewCompany={apiProject?.projectType === 'RESEARCH_NEW_COMPANY'}
                        />
                      </div>
                    ) : (
                      <div className={styles.empty}>No active submission details found.</div>
                    )
                  ) : ['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION'].includes(selectedStaffTask.taskType) ? (
                  <>
                  {!staffCandidate && (
                  <>
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Project document library</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className={styles.button}
                          type="button"
                          onClick={() => void handleCreateManualCandidate()}
                          disabled={!canUseStaffWorkbench || staffCandidateLoading}
                        >
                          {staffCandidateLoading ? 'Creating...' : 'Enter Manually'}
                        </button>
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
                    </div>

                    <label className={styles.workbenchUploadBox} style={{ marginTop: '16px', marginBottom: '16px' }}>
                      <input
                        type="file"
                        onChange={(event) => {
                          void handleUploadEvidence(event.target.files?.[0] ?? null);
                          event.currentTarget.value = '';
                        }}
                        disabled={!canUseStaffWorkbench || uploadingEvidence}
                      />
                      <FileText size={24} />
                      <strong>{uploadingEvidence ? 'Uploading document...' : 'Upload document'}</strong>
                      <span>Upload a new file to the project document library.</span>
                    </label>

                    <div className={styles.documentSelectionSummary}>
                      <span>{projectDocuments.length} project document{projectDocuments.length !== 1 ? 's' : ''}</span>
                    </div>

                    {extractionJob && (
                      <div className={styles.aiProgressPanel}>
                        <div className={styles.aiProgressHead}>
                          <div>
                            <strong>AI Extraction</strong>
                            <span>Processing {extractionJob.totalDocuments > 0 ? extractionJob.totalDocuments : (selectedProjectDocumentIds.length || 1)} document(s)</span>
                          </div>
                          <b>
                            {extractionJob.status === 'COMPLETED' ? '100%' :
                             extractionJob.status === 'FAILED' ? 'Failed' :
                             extractionJob.progress != null ? `${extractionJob.progress}%` :
                             'Processing...'}
                          </b>
                        </div>
                        
                        <div className={styles.aiProgressTrack}>
                          {extractionJob.status === 'COMPLETED' ? (
                            <span style={{ width: '100%' }} />
                          ) : extractionJob.status === 'FAILED' ? (
                            <span style={{ width: '100%', backgroundColor: 'var(--error)' }} />
                          ) : extractionJob.progress != null ? (
                            <span style={{ width: `${extractionJob.progress}%` }} />
                          ) : (
                            <span className={styles.indeterminateBar} />
                          )}
                        </div>

                        <div className={styles.aiProgressChecklist}>
                          <div className={styles.checklistRow}>
                            <span>{extractionJob.stage === 'PREPARING' || extractionJob.stage === 'EXTRACTING' || extractionJob.stage === 'MERGING' || extractionJob.stage === 'CREATING_CANDIDATE' || extractionJob.stage === 'COMPLETED' ? '●' : '○'}</span> Preparing documents
                          </div>
                          <div className={styles.checklistRow}>
                            <span>{extractionJob.stage === 'MERGING' || extractionJob.stage === 'CREATING_CANDIDATE' || extractionJob.stage === 'COMPLETED' ? '●' : '○'}</span> AI analysis in progress
                          </div>
                          <div className={styles.checklistRow}>
                            <span>{extractionJob.stage === 'CREATING_CANDIDATE' || extractionJob.stage === 'COMPLETED' ? '●' : '○'}</span> Merging results
                          </div>
                          <div className={styles.checklistRow}>
                            <span>{extractionJob.stage === 'COMPLETED' ? '●' : '○'}</span> Creating candidate draft
                          </div>
                        </div>

                        {extractionJob.status === 'FAILED' && (
                          <div className={styles.aiProgressError}>
                            {extractionJob.errorMessage || 'Extraction failed.'}
                          </div>
                        )}
                        
                        {extractionJob.status !== 'COMPLETED' && extractionJob.status !== 'FAILED' && (
                          <small>Please keep this modal open while AI is processing.</small>
                        )}
                      </div>
                    )}

                    <div className={styles.projectDocumentList}>
                      {projectDocumentsError && (
                        <div className={styles.inlineError} style={{ margin: '0.5rem 1rem' }}>
                          Unable to load project documents. {projectDocumentsError}
                        </div>
                      )}
                      {projectDocumentsLoading && <div className={styles.empty}>Loading project documents...</div>}
                      {!projectDocumentsLoading && !projectDocumentsError && projectDocuments.length === 0 && (
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
                              disabled={!canUseStaffWorkbench || extractingSelectedDocuments}
                            />
                          </label>
                          <div className={styles.documentIcon}><FileText size={18} /></div>
                          <div className={styles.documentInfo}>
                            <strong>{document.fileName || `Import job #${document.id}`}</strong>
                            <span>{document.status} - uploaded {formatOptionalDate(document.createdAt)}</span>
                            {/* <small>
                              Import job: {document.id} | Raw document: {document.rawDocumentId || 'N/A'}
                            </small> */}
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
                              className={`${styles.button} ${styles.dangerButton}`}
                              type="button"
                              onClick={() => setDocumentPendingDelete(document)}
                              disabled={!canUseStaffWorkbench || !document.rawDocumentId || staffTaskStatus !== 'IN_PROGRESS'}
                            >
                              <Trash2 size={16} />Delete
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
                              isResearchNewCompany={apiProject?.projectType === 'RESEARCH_NEW_COMPANY'}
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
                  </>
                  )}

                  {staffCandidate && (
                  <section className={`${styles.workbenchPanel} ${styles.candidateWorkbenchPanel}`}>
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
                        <button
                          className={styles.iconButton}
                          type="button"
                          aria-label="Close candidate detail"
                          title="Close candidate detail"
                          onClick={() => {
                            setStaffCandidate(null);
                            setStaffCandidateEdit(emptyStaffCandidateEdit);
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                        <CandidateReviewWorkspace
                          projectId={String(currentProjectId)}
                          candidateId={staffCandidate.id}
                          taskId={selectedStaffTask.id}
                          role="STAFF"
                          targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                          readOnly={staffTaskStatus !== 'IN_PROGRESS' || !isStaffEditableCandidateStatus(staffCandidate.status)}
                          isResearchNewCompany={apiProject?.projectType === 'RESEARCH_NEW_COMPANY'}
                          onDraftRenamed={(updated) => {
                            setStaffCandidate(updated);
                            taskApi.getTaskWorkbench(currentProjectId, selectedStaffTask.id)
                              .then((payload: any) => setWorkbench(payload.data))
                              .catch(console.error);
                          }}
                          onReviewed={() => {
                            taskApi.getTaskWorkbench(currentProjectId, selectedStaffTask.id)
                              .then((payload: any) => setWorkbench(payload.data))
                              .catch(console.error);
                          }}
                          onCancel={() => {
                            setStaffCandidate(null);
                            setStaffCandidateEdit(emptyStaffCandidateEdit);
                          }}
                          onSubmit={() => void handleSubmitStaffCandidate()}
                          submitLoading={staffSubmitLoading}
                        />
                  </section>
                  )}
                  </>
                  ) : selectedStaffTask.taskType === 'COMPANY_NEWS_RESEARCH' ? (
                  <CompanyNewsResearchWorkspace
                    projectId={currentProjectId}
                    taskId={selectedStaffTask.id}
                    targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                    canEdit={canUseStaffWorkbench}
                    onDraftCountChange={setNewsResearchDraftCount}
                    onSubmitSuccess={() => {
                      void loadStaffWorkbench(selectedStaffTask);
                      setTaskRefreshTick((current) => current + 1);
                      setSelectedStaffTask(null);
                    }}
                    onClose={() => setSelectedStaffTask(null)}
                  />
                  ) : selectedStaffTask.taskType === 'FINANCIAL_RESEARCH' ? (
                  <FinancialResearchWorkbench
                    projectId={selectedStaffTask.projectId}
                    taskId={selectedStaffTask.id}
                    taskTitle={selectedStaffTask.title}
                    taskStatus={workbench?.taskStatus || selectedStaffTask.status}
                    taskTypeLabel={taskTypeText[selectedStaffTask.taskType].title}
                    dueDate={selectedStaffTask.dueDate}
                    targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                    documents={projectDocuments}
                    canEdit={canUseStaffWorkbench}
                    uploadingDocument={uploadingEvidence}
                    onUploadDocument={(file: File) => handleUploadEvidence(file)}
                    onRefreshWorkbench={() => void loadStaffWorkbench(selectedStaffTask)}
                    onRecallSuccess={() => {
                      void loadStaffWorkbench(selectedStaffTask);
                      setTaskRefreshTick((current) => current + 1);
                    }}
                    onSubmitSuccess={() => {
                      void loadStaffWorkbench(selectedStaffTask);
                      setTaskRefreshTick((current) => current + 1);
                      setSelectedStaffTask(null);
                    }}
                  />
                  ) : selectedStaffTask.taskType === 'PARTNER_CONTRACT_COLLECTION' ? (
                  <ContractResearchWorkbench
                    projectId={selectedStaffTask.projectId}
                    taskId={selectedStaffTask.id}
                    taskTitle={selectedStaffTask.title}
                    taskStatus={workbench?.taskStatus || selectedStaffTask.status}
                    taskTypeLabel={taskTypeText[selectedStaffTask.taskType].title}
                    dueDate={selectedStaffTask.dueDate}
                    targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                    canEdit={canUseStaffWorkbench}
                    onRefreshWorkbench={() => void loadStaffWorkbench(selectedStaffTask)}
                    onRecallSuccess={() => {
                      void loadStaffWorkbench(selectedStaffTask);
                      setTaskRefreshTick((current) => current + 1);
                    }}
                    onSubmitSuccess={() => {
                      void loadStaffWorkbench(selectedStaffTask);
                      setTaskRefreshTick((current) => current + 1);
                      setSelectedStaffTask(null);
                    }}
                    onClose={() => setSelectedStaffTask(null)}
                  />
                  ) : selectedStaffTask.taskType === 'COMPANY_MEMBER_RESEARCH' ? (
                    staffTaskStatus === 'IN_REVIEW' ? (
                      (() => {
                        const pendingSub = workbench?.submissions?.find((s) => s.status === 'IN_REVIEW')
                          ?? workbench?.submissions?.[0];
                        const roundLabel = pendingSub?.submittedRevisionNumber
                          ? `Round ${pendingSub.submittedRevisionNumber}`
                          : 'Round 1';
                        const submittedAtDate = pendingSub?.submittedAt || pendingSub?.createdAt;
                        const submittedByLabel = pendingSub?.submittedByName || selectedStaffTask.assignedToName || 'Staff';

                        return (
                          <section className={styles.workbenchPanel} style={{ width: '100%' }}>
                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '20px 24px',
                              marginBottom: '20px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '16px',
                              flexWrap: 'wrap'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Submitted for Review
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                                    {roundLabel}
                                  </span>
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>
                                  Submitted Members ({companyMemberItems.length})
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', color: '#475569', fontSize: '13px' }}>
                                  <span><strong>Submitted:</strong> {formatOptionalDate(submittedAtDate)}</span>
                                  <span><strong>Submitted By:</strong> {submittedByLabel}</span>
                                </div>
                              </div>

                              {canCancelStaffSubmission && (
                                <button
                                  className={`${styles.button} ${styles.dangerButton}`}
                                  type="button"
                                  onClick={() => setShowCancelSubmissionModal(true)}
                                  disabled={cancellingSubmission}
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  Cancel Submission
                                </button>
                              )}
                            </div>

                            {companyMemberItems.length === 0 ? (
                              <div className={styles.empty}>No members in this submission.</div>
                            ) : (
                              <CompanyMemberLayerBoard
                                members={companyMemberItems}
                                emptyText="No members in this submission."
                                statusLabel="Submitted"
                              />
                            )}
                          </section>
                        );
                      })()
                    ) : staffTaskStatus === 'DONE' ? (
                      <section className={styles.workbenchPanel} style={{ width: '100%' }}>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '16px 20px',
                          marginBottom: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                              }}>
                                Approved
                              </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                              Approved Members ({companyMemberItems.length})
                            </h3>
                          </div>
                        </div>
                        {companyMemberItems.length === 0 ? (
                          <div className={styles.empty}>No approved members found.</div>
                        ) : (
                          <CompanyMemberLayerBoard
                            members={companyMemberItems}
                            emptyText="No approved members found."
                            statusLabel="Approved"
                          />
                        )}
                      </section>
                    ) : (
                      <section className={styles.workbenchPanel}>
                        {(() => {
                          const rejectedSubmission = workbench?.submissions
                            ?.filter((submission) => ['REJECTED', 'CHANGES_REQUESTED', 'REVISION_REQUESTED'].includes(submission.status) && submission.reviewComment)
                            .at(-1);

                          return rejectedSubmission ? (
                            <div className={styles.reviewNoteAlert} style={{ marginBottom: '14px' }}>
                              <strong>Manager requested changes:</strong>
                              <span>{rejectedSubmission.reviewComment}</span>
                            </div>
                          ) : null;
                        })()}

                        {companyMemberLoading ? (
                          <div className={styles.empty}>Loading member research draft...</div>
                        ) : (
                          <>
                            <div className={styles.memberResearchLayout}>
                              <section className={styles.memberResearchForm}>
                                <div className={styles.taskSpecificHead} style={{ alignItems: 'center' }}>
                                  <UserPlus size={20} />
                                  <div>
                                    <strong style={{ margin: 0 }}>{editingCompanyMemberIndex === null ? 'Add company member' : 'Edit company member'}</strong>
                                  </div>
                                </div>

                                <div className={styles.memberResearchFormGrid}>
                                  <label className={`${styles.inviteField} ${styles.memberResearchHalfField}`}>
                                    <span>Full name</span>
                                    <input
                                      value={companyMemberForm.fullName}
                                      placeholder="Example: Nguyen Van A"
                                      onChange={(event) => setCompanyMemberForm((current) => ({ ...current, fullName: event.target.value }))}
                                      disabled={!canUseStaffWorkbench}
                                    />
                                  </label>
                                  <label className={`${styles.inviteField} ${styles.memberResearchHalfField}`}>
                                    <span>Position</span>
                                    <input
                                      value={companyMemberForm.position}
                                      placeholder="Example: CEO, Founder, Board member"
                                      onChange={(event) => setCompanyMemberForm((current) => ({ ...current, position: event.target.value }))}
                                      disabled={!canUseStaffWorkbench}
                                    />
                                  </label>
                                  <div className={`${styles.inviteField} ${styles.memberResearchHalfField}`}>
                                    <span>Profile image</span>
                                    <input
                                      type="file"
                                      ref={companyMemberFileInputRef}
                                      onChange={(e) => void handleCompanyMemberImageFileChange(e)}
                                      accept="image/jpeg,image/png,image/webp"
                                      style={{ display: 'none' }}
                                    />
                                    {companyMemberForm.imageUrl ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '42px', flexWrap: 'wrap' }}>
                                        <img
                                          src={resolveMemberImageUrl(companyMemberForm.imageUrl)}
                                          alt="Profile preview"
                                          style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '1px solid #e2e8f0',
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            color: '#475569',
                                            maxWidth: '120px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                          title={companyMemberFormImageName || 'Uploaded image'}
                                        >
                                          {companyMemberFormImageName || 'Uploaded image'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                          <button
                                            type="button"
                                            className={styles.button}
                                            onClick={() => companyMemberFileInputRef.current?.click()}
                                            disabled={!canUseStaffWorkbench || companyMemberUploadingImage || companyMemberSaving}
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                          >
                                            Replace
                                          </button>
                                          <button
                                            type="button"
                                            className={`${styles.button} ${styles.dangerButton}`}
                                            onClick={handleRemoveCompanyMemberFormImage}
                                            disabled={!canUseStaffWorkbench || companyMemberUploadingImage || companyMemberSaving}
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', minHeight: '42px' }}>
                                        <button
                                          type="button"
                                          className={styles.button}
                                          onClick={() => companyMemberFileInputRef.current?.click()}
                                          disabled={!canUseStaffWorkbench || companyMemberUploadingImage || companyMemberSaving}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '7px 12px' }}
                                        >
                                          <Upload size={14} />
                                          {companyMemberUploadingImage ? 'Uploading...' : 'Upload image'}
                                        </button>
                                      </div>
                                    )}
                                    {companyMemberImageError && (
                                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                                        {companyMemberImageError}
                                      </div>
                                    )}
                                  </div>
                                  <label className={`${styles.inviteField} ${styles.memberResearchHalfField}`}>
                                    <span>Source URL</span>
                                    <input
                                      value={companyMemberForm.sourceUrl}
                                      placeholder="https://company.com/leadership"
                                      onChange={(event) => setCompanyMemberForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                                      disabled={!canUseStaffWorkbench}
                                    />
                                  </label>
                                </div>

                                <div className={styles.modalActions}>
                                  {editingCompanyMemberIndex !== null && (
                                    <button className={styles.button} type="button" onClick={resetCompanyMemberForm} disabled={!canUseStaffWorkbench || companyMemberSaving}>
                                      Cancel edit
                                    </button>
                                  )}
                                  <button
                                    className={`${styles.button} ${styles.primaryButton}`}
                                    type="button"
                                    onClick={() => void handleSaveCompanyMemberItem()}
                                    disabled={!canUseStaffWorkbench || companyMemberSaving}
                                  >
                                    <Plus size={16} />{companyMemberSaving ? 'Saving...' : editingCompanyMemberIndex === null ? 'Add member' : 'Update member'}
                                  </button>
                                </div>
                              </section>

                              <section className={styles.memberResearchList}>
                                <div className={styles.memberResearchListHead}>
                                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                                    Draft members ({companyMemberItems.length})
                                  </h3>
                                </div>

                                {companyMemberItems.length === 0 ? (
                                  <div
                                    className={styles.empty}
                                    style={{
                                      padding: '36px 16px',
                                      textAlign: 'center',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>No members added yet.</div>
                                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 400 }}>Add a company member using the form.</div>
                                  </div>
                                ) : (
                                  <CompanyMemberLayerBoard
                                    members={companyMemberItems}
                                    emptyText="No members added yet."
                                    renderActions={(_, index) => (
                                      <>
                                        <button
                                          className={styles.button}
                                          type="button"
                                          onClick={() => handleEditCompanyMemberItem(index)}
                                          disabled={!canUseStaffWorkbench || companyMemberSaving}
                                        >
                                          <Edit3 size={15} />Edit
                                        </button>
                                        <button
                                          className={`${styles.button} ${styles.dangerButton}`}
                                          type="button"
                                          onClick={() => void handleRemoveCompanyMemberItem(index)}
                                          disabled={!canUseStaffWorkbench || companyMemberSaving}
                                        >
                                          <Trash2 size={15} />Delete
                                        </button>
                                      </>
                                    )}
                                  />
                                )}
                              </section>
                            </div>

                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              marginTop: '16px',
                              paddingTop: '16px',
                              borderTop: '1px solid #e2e8f0',
                              gap: '12px'
                            }}>
                              <button
                                className={`${styles.button} ${styles.primaryButton}`}
                                type="button"
                                onClick={() => void submitCompanyMemberResearchDraft()}
                                disabled={!canUseStaffWorkbench || companyMemberSubmitting || companyMemberSaving || companyMemberItems.length === 0}
                              >
                                <CheckCircle2 size={16} />{companyMemberSubmitting ? 'Submitting...' : 'Submit for Review'}
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    )
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

                {(!staffCandidate || isCompanyDataInReview) && !['COMPANY_MEMBER_RESEARCH', 'COMPANY_NEWS_RESEARCH', 'FINANCIAL_RESEARCH', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedStaffTask.taskType) && (
                <aside className={styles.workbenchSidebar}>
                  {isCompanyDataInReview ? (
                    <section className={styles.workbenchPanel}>
                      <h3>Drafts {inReviewDrafts.length > 0 ? `(${inReviewDrafts.length})` : ''}</h3>
                      <div className={styles.draftList}>
                        {inReviewDrafts.length === 0 ? (
                          <div className={styles.empty}>No active candidate draft yet.</div>
                        ) : (
                          inReviewDrafts.map((draft) => {
                            const draftLabel = draft.draftName || draft.candidateName || (draft.draftSequence ? `Draft ${draft.draftSequence}` : `Draft`);
                            const isSubmitted = Boolean(inReviewSubmittedCandId && draft.candidateId === inReviewSubmittedCandId);
                            const isSelected = draft.candidateId === inReviewActiveCandId;

                            return (
                              <article
                                className={`${styles.draftItem} ${isSelected ? styles.draftItemActive : ''}`}
                                key={draft.candidateId}
                                style={
                                  isSelected
                                    ? {
                                        borderColor: '#2563eb',
                                        background: '#eff6ff',
                                        cursor: 'pointer',
                                      }
                                    : { cursor: 'pointer' }
                                }
                              >
                                <button
                                  className={styles.draftItemMain}
                                  type="button"
                                  onClick={() => setInReviewSelectedCandidateId(draft.candidateId)}
                                  style={{
                                    textAlign: 'left',
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                    }}
                                  >
                                    <strong
                                      style={{
                                        margin: 0,
                                        color: isSelected ? '#1d4ed8' : '#1e293b',
                                        fontSize: '14px',
                                        fontWeight: isSelected ? 700 : 600,
                                      }}
                                    >
                                      {draftLabel}
                                    </strong>
                                    {isSubmitted ? (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: '9999px',
                                          background: '#dbeafe',
                                          color: '#1e40af',
                                          border: '1px solid #bfdbfe',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Submitted for Review
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 500,
                                          padding: '2px 8px',
                                          borderRadius: '9999px',
                                          background: '#f1f5f9',
                                          color: '#475569',
                                          border: '1px solid #e2e8f0',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Draft
                                      </span>
                                    )}
                                  </div>
                                  {draft.createdAt && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginTop: '6px',
                                        color: '#64748b',
                                        fontSize: '12px',
                                      }}
                                    >
                                      <span>Created {formatOptionalDate(draft.createdAt)}</span>
                                    </div>
                                  )}
                                </button>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>
                  ) : ['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION'].includes(selectedStaffTask.taskType) ? (
                    <>
                    <section className={styles.workbenchPanel}>
                      <h3>Drafts</h3>
                      <div className={styles.draftList}>
                        {(() => {
                          const sortedDrafts = [...(workbench?.candidateDrafts || [])]
                            .filter((draft) => draft.status === 'DRAFT')
                            .sort((a, b) => {
                              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                              return dateB - dateA; // Descending: Newest first
                            });

                          if (sortedDrafts.length === 0) {
                            return <div className={styles.empty}>No active candidate draft yet.</div>;
                          }

                          return sortedDrafts.map((draft) => {
                            const draftLabel = draft.draftName || draft.candidateName || (draft.draftSequence ? `Draft ${draft.draftSequence}` : `Draft`);
                            const isDeleting = deletingCandidateDraftId === draft.candidateId;

                            return (
                              <article
                                className={`${styles.draftItem} ${styles.draftItemWithActions}`}
                                key={draft.candidateId}
                              >
                                <button
                                  className={styles.draftItemMain}
                                  type="button"
                                  onClick={() => void handleOpenStaffCandidate(draft.candidateId)}
                                  disabled={!canUseStaffWorkbench || isDeleting}
                                >
                                  <strong style={{ margin: 0, color: '#1e293b' }}>{draftLabel}</strong>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                                    <span>{candidateStatusLabel[draft.status] || 'Draft'}</span>
                                    {draft.createdAt && (
                                      <>
                                        <span>•</span>
                                        <span>{formatOptionalDate(draft.createdAt)}</span>
                                      </>
                                    )}
                                  </div>
                                </button>
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
                              </article>
                            );
                          });
                        })()}
                      </div>
                    </section>

                    {(() => {
                      const returnedDrafts = workbench?.candidateDrafts?.filter((draft) => draft.status === 'REVISION_REQUIRED') ?? [];
                      if (returnedDrafts.length === 0) return null;

                      return (
                        <section className={styles.workbenchPanel}>
                          <h3>Changes requested</h3>
                          <div className={styles.draftList}>
                            {returnedDrafts.map((draft) => {
                              const draftLabel = draft.draftName || draft.candidateName || (draft.draftSequence ? `Draft ${draft.draftSequence}` : `Draft`);

                              return (
                                <article
                                  className={styles.draftItem}
                                  key={draft.candidateId}
                                >
                                  <button
                                    className={styles.draftItemMain}
                                    type="button"
                                    onClick={() => void handleOpenStaffCandidate(draft.candidateId)}
                                    disabled={!canUseStaffWorkbench}
                                  >
                                    <strong style={{ margin: 0, color: '#1e293b' }}>{draftLabel}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                                      <span className={`${styles.draftStatusBadge} ${candidateStatusClass[draft.status]}`}>Changes requested</span>
                                      {draft.createdAt && (
                                        <>
                                          <span>•</span>
                                          <span>{formatOptionalDate(draft.createdAt)}</span>
                                        </>
                                      )}
                                    </div>
                                  </button>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })()}

                    </>
                  ) : ['COMPANY_MEMBER_RESEARCH', 'COMPANY_NEWS_RESEARCH', 'FINANCIAL_RESEARCH', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedStaffTask.taskType) ? null : (
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

                  {/* <section className={styles.workbenchPanel}>
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
                  </section> */}
                </aside>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {releaseTaskConfirmOpen && selectedStaffTask && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReleaseTaskConfirmOpen(false)}
            >
              <motion.div
                className={styles.confirmModalContent}
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Release task?</h3>
                <p>
                  This task will return to the Available pool and another Staff member may claim it.
                  <br/><br/>
                  Saved research/workbench data will not be deleted.
                </p>
                {releaseTaskError && (
                  <div className={styles.errorNotice} style={{ marginTop: '16px' }}>
                    <AlertTriangle size={16} />
                    <span>{releaseTaskError}</span>
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setReleaseTaskConfirmOpen(false)}
                    disabled={releasingTask}
                  >
                    Keep Task
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={() => void confirmReleaseStaffTask()}
                    disabled={releasingTask}
                  >
                    {releasingTask ? 'Releasing...' : 'Release Task'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

      {cancelTaskConfirmOpen && selectedStaffTask && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!cancelTaskLoading) {
                  setCancelTaskError(null);
                  setCancelTaskConfirmOpen(false);
                }
              }}
            >
              <motion.div
                ref={cancelTaskDialogRef}
                className={styles.nestedConfirmDialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-task-title"
                aria-describedby="cancel-task-description"
                tabIndex={-1}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.nestedConfirmHead}>
                  <div className={styles.nestedConfirmIcon}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span className={styles.taskKey}>Cancel task</span>
                    <h2 id="cancel-task-title">Cancel task?</h2>
                    <p id="cancel-task-description">
                      Are you sure you want to cancel <strong>APMS-{selectedStaffTask.id}</strong>? This action will stop the current task progress.
                    </p>
                  </div>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Close cancel task confirmation"
                    onClick={() => {
                      setCancelTaskError(null);
                      setCancelTaskConfirmOpen(false);
                    }}
                    disabled={cancelTaskLoading}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.deleteTaskPreview}>
                  <X size={20} />
                  <div>
                    <strong>{selectedStaffTask.title}</strong>
                    <span>{taskTypeText[selectedStaffTask.taskType].title}</span>
                  </div>
                </div>

                {cancelTaskError && (
                  <div className={styles.inlineError}>
                    {cancelTaskError}
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button
                    className={styles.button}
                    type="button"
                    onClick={() => {
                      setCancelTaskError(null);
                      setCancelTaskConfirmOpen(false);
                    }}
                    disabled={cancelTaskLoading}
                  >
                    Keep Task
                  </button>
                  <button
                    className={`${styles.button} ${styles.dangerButton}`}
                    type="button"
                    onClick={() => void confirmCancelStaffTask()}
                    disabled={cancelTaskLoading}
                  >
                    {cancelTaskLoading ? 'Cancelling...' : 'Cancel Task'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <ConfirmModal
        isOpen={Boolean(showCancelSubmissionModal && selectedStaffTask)}
        title="Cancel submitted review?"
        message="This submission is waiting for Manager review. Cancelling it will return the task to In Progress so you can continue editing and submit again."
        cancelText="Keep Submission"
        confirmText={cancellingSubmission ? 'Cancelling...' : 'Cancel Submission'}
        confirmDisabled={cancellingSubmission}
        isDestructive={true}
        onCancel={() => {
          if (!cancellingSubmission) setShowCancelSubmissionModal(false);
        }}
        onConfirm={() => void handleCancelStaffSubmission()}
      />
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {candidateDraftPendingDelete && (
            <motion.div
              className={styles.nestedConfirmOverlay}
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
        </AnimatePresence>,
        document.body
      )}
      <AnimatePresence>
        {selectedManagerReviewTask && (
          <motion.div
            className={`${styles.modalOverlay} ${styles.taskWorkbenchOverlay}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeManagerReviewModal()}
          >
            <motion.div
              className={`${styles.inviteModal} ${styles.staffWorkbenchModal} ${(selectedManagerReviewTask.taskType === 'FINANCIAL_RESEARCH' || selectedManagerReviewTask.taskType === 'PARTNER_CONTRACT_COLLECTION') ? styles.financialResearchModal : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="manager-task-review-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              {(selectedManagerReviewTask.taskType === 'FINANCIAL_RESEARCH' || selectedManagerReviewTask.taskType === 'PARTNER_CONTRACT_COLLECTION') && (
                <div className={styles.inviteHead} style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h2 id="manager-task-review-title" style={{ marginTop: 0, marginBottom: '6px' }}>{selectedManagerReviewTask.title}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#64748b', fontSize: '13px' }}>
                      <span style={{
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        letterSpacing: '0.5px',
                        backgroundColor: (workbench?.taskStatus || selectedManagerReviewTask.status) === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9',
                        color: (workbench?.taskStatus || selectedManagerReviewTask.status) === 'IN_PROGRESS' ? '#1d4ed8' : '#475569'
                      }}>
                        {workbench?.taskStatus || selectedManagerReviewTask.status}
                      </span>
                      {selectedManagerReviewTask.dueDate && (
                        <>
                          <span>•</span>
                          <span>Due {formatOptionalDate(selectedManagerReviewTask.dueDate)}</span>
                        </>
                      )}
                      {(workbench?.targetCompanyName || displayedProject.targetCompanyName) && (
                        <>
                          <span>•</span>
                          <span>Target: <strong>{workbench?.targetCompanyName || displayedProject.targetCompanyName}</strong></span>
                        </>
                      )}
                      {selectedManagerReviewTask.assignedToName && (
                        <>
                          <span>•</span>
                          <span>Assigned to: <strong>{selectedManagerReviewTask.assignedToName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.iconButton} type="button" aria-label="Close manager review" onClick={() => closeManagerReviewModal()}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
              {selectedReviewHistoryItem && renderReviewHistoryBanner(closeManagerReviewModal)}
              {selectedManagerReviewTask.taskType === 'COMPANY_NEWS_RESEARCH' ? (
                <ManagerNewsReviewWorkspace
                  projectId={currentProjectId}
                  taskId={selectedManagerReviewTask.id}
                  taskTitle={selectedManagerReviewTask.title}
                  taskDescription={selectedManagerReviewTask.description || taskTypeText[selectedManagerReviewTask.taskType].description}
                  taskStatus={workbench?.taskStatus || selectedManagerReviewTask.status}
                  dueDate={selectedManagerReviewTask.dueDate}
                  targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                  assignedToName={selectedManagerReviewTask.assignedToName}
                  workbenchSubmissions={workbench?.submissions}
                  onClose={() => closeManagerReviewModal()}
                  onReviewed={(message, isSuccess) => {
                    void loadManagerWorkbench(selectedManagerReviewTask);
                    setTaskRefreshTick((current) => current + 1);
                    closeManagerReviewModal();
                    setToast({ kind: isSuccess ? 'success' : 'error', message });
                  }}
                />
              ) : selectedManagerReviewTask.taskType === 'FINANCIAL_RESEARCH' ? (
                <ManagerFinancialResearchReviewWorkspace
                  projectId={currentProjectId}
                  taskId={selectedManagerReviewTask.id}
                  taskTitle={selectedManagerReviewTask.title}
                  taskDescription={selectedManagerReviewTask.description || taskTypeText[selectedManagerReviewTask.taskType].description}
                  taskStatus={workbench?.taskStatus || selectedManagerReviewTask.status}
                  dueDate={selectedManagerReviewTask.dueDate}
                  targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                  assignedToName={selectedManagerReviewTask.assignedToName}
                  workbenchSubmissions={workbench?.submissions}
                  onClose={() => closeManagerReviewModal()}
                  onReviewed={(message: string, isSuccess: boolean) => {
                    void loadManagerWorkbench(selectedManagerReviewTask);
                    setTaskRefreshTick((current) => current + 1);
                    closeManagerReviewModal();
                    setToast({ kind: isSuccess ? 'success' : 'error', message });
                  }}
                />
              ) : selectedManagerReviewTask.taskType === 'PARTNER_CONTRACT_COLLECTION' ? (
                <ManagerContractResearchReviewWorkspace
                  projectId={currentProjectId}
                  taskId={selectedManagerReviewTask.id}
                  taskTitle={selectedManagerReviewTask.title}
                  taskDescription={selectedManagerReviewTask.description || taskTypeText[selectedManagerReviewTask.taskType]?.description}
                  taskStatus={workbench?.taskStatus || selectedManagerReviewTask.status}
                  dueDate={selectedManagerReviewTask.dueDate}
                  targetCompanyName={workbench?.targetCompanyName || displayedProject.targetCompanyName}
                  assignedToName={selectedManagerReviewTask.assignedToName}
                  workbenchSubmissions={workbench?.submissions}
                  submissionId={workbench?.submissions?.[0]?.id || 0}
                  onClose={() => closeManagerReviewModal()}
                  onReviewCompleted={() => {
                    void loadManagerWorkbench(selectedManagerReviewTask);
                    setTaskRefreshTick((current) => current + 1);
                    closeManagerReviewModal();
                    setToast({ kind: 'success', message: 'Contract review submitted successfully.' });
                  }}
                />
              ) : (
                <>
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
                <button className={styles.iconButton} type="button" aria-label="Close manager review" onClick={() => closeManagerReviewModal()}>
                  <X size={18} />
                </button>
              </div>

              {workbenchError && <div className={styles.inlineError}>{workbenchError}</div>}
              {workbenchMessage && <div className={styles.inlineSuccess}>{workbenchMessage}</div>}

              <div className={styles.workbenchStatusRow}>
                <div><span>Status</span><strong>{workbench?.taskStatus || selectedManagerReviewTask.status}</strong></div>
                <div><span>Task type</span><strong>{taskTypeText[selectedManagerReviewTask.taskType].title}</strong></div>
                <div><span>Assignee</span><strong>{selectedManagerReviewTask.assignedToName || 'Unassigned'}</strong></div>
                <div><span>Due date</span><strong>{formatOptionalDate(selectedManagerReviewTask.dueDate)}</strong></div>
              </div>

              <div className={styles.staffWorkbenchGrid}>
                <main className={styles.workbenchMain}>
                  {!['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION', 'COMPANY_NEWS_RESEARCH', 'PARTNER_CONTRACT_COLLECTION'].includes(selectedManagerReviewTask.taskType) && selectedManagerReviewTask.taskType !== 'COMPANY_MEMBER_RESEARCH' && (
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Uploaded evidence</h3>
                        <p>
                          These are the files uploaded by staff for this task.
                        </p>
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
                          <div className={styles.documentInfo}>
                            <strong>{document.fileName || `Import job #${document.id}`}</strong>
                            <span>{document.status} - uploaded {formatOptionalDate(document.createdAt)}</span>
                            <small>
                              {`Raw document: ${document.rawDocumentId || 'N/A'} | Extraction: ${document.latestExtractionId || 'Not generated'}`}
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
                        {/* <span className={styles.taskTypeBadge}>{managerCompanyMemberDraft?.members?.length ?? 0} member(s)</span> */}
                      </div>
                      {managerCompanyMemberLoading ? (
                        <div className={styles.empty}>Loading submitted members...</div>
                      ) : !managerCompanyMemberDraft?.members?.length ? (
                        <div className={styles.empty}>No company members were submitted for review.</div>
                      ) : (
                        <CompanyMemberLayerBoard
                          members={managerCompanyMemberDraft.members}
                          emptyText="No company members were submitted for review."
                        />
                      )}
                    </section>
                  )}

                  {['COMPANY_DATA_PREPARATION', 'DOCUMENT_COLLECTION'].includes(selectedManagerReviewTask.taskType) && (
                    <section className={styles.workbenchPanel}>
                      <div className={styles.workbenchPanelHead}>
                        <div>
                          <h3>{selectedManagerReviewTask.status === 'DONE' ? 'Candidate result' : 'Candidate drafts'}</h3>
                          <p>
                            {selectedManagerReviewTask.status === 'DONE'
                              ? 'Final candidate decision linked to this completed task.'
                              : 'Candidate drafts associated with this task.'}
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
                            <strong>{draft.draftName || draft.candidateName || (draft.draftSequence ? `Draft ${draft.draftSequence}` : `Draft`)}</strong>
                            {draft.candidateIndustry && <small>{draft.candidateIndustry}</small>}
                            <span className={`${styles.draftStatusBadge} ${candidateStatusClass[draft.status]}`}>{candidateStatusLabel[draft.status]}</span>
                            {draft.isUnderReview && <small>Submitted for review</small>}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}



                  {!['ROLE_EVALUATION', 'COMPANY_NEWS_RESEARCH', 'COMPANY_DATA_PREPARATION'].includes(selectedManagerReviewTask.taskType) && (
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
                              : selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION'
                                ? 'Review the submitted documents before approving. Approval completes this task.'
                                : selectedManagerReviewTask.taskType === 'COMPANY_MEMBER_RESEARCH'
                                  ? 'Review the submitted members and source URLs, then approve to apply them to the Company Profile or reject to return it to staff.'
                                : 'Approve to move the task to Done, or reject to return it to staff for correction.'}
                          </p>
                      </div>
                    </div>

                    {selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION' && selectedManagerReviewTask.status === 'DONE' ? (
                      <div className={styles.inlineSuccess}>
                        Documents were approved and are available in the project Documents tab.
                      </div>
                    ) : selectedManagerReviewTask.taskType === 'DOCUMENT_COLLECTION' && selectedManagerReviewTask.status !== 'DONE' ? (
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
                              disabled={managerReviewLoading || (workbench?.submissions?.length === 0)}
                            >
                              {managerReviewLoading ? 'Saving...' : 'Request Changes'}
                            </button>
                            <button
                              className={`${styles.button} ${styles.primaryButton}`}
                              type="button"
                              onClick={() => void handleManagerReviewSubmission('APPROVE')}
                              disabled={managerReviewLoading || (workbench?.submissions?.length === 0)}
                            >
                              <CheckCircle2 size={16} />{managerReviewLoading ? 'Approving...' : 'Approve'}
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
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {reviewSubmissionError && (
        <div className={styles.modalOverlay} onClick={() => setReviewSubmissionError(null)}>
          <div className={styles.inviteModal} style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.inviteHead}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Review submission could not be loaded.</h3>
                <p style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>No active submission could be resolved for this task.</p>
              </div>
              <button className={styles.iconButton} type="button" aria-label="Close" onClick={() => setReviewSubmissionError(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalActions} style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className={styles.button}
                type="button"
                onClick={() => setReviewSubmissionError(null)}
              >
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                type="button"
                onClick={() => {
                  const task = reviewSubmissionError.task;
                  setReviewSubmissionError(null);
                  void openDirectManagerCandidateReview(task);
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
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

          return isManager && (selectedCandidate.status === 'PENDING_REVIEW' || selectedCandidate.status === 'REVISION_REQUIRED' || Boolean(candidateReviewTaskContext?.submissionId)) ? (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {selectedReviewHistoryItem && (
                <div style={{ padding: '16px 24px 0 24px' }}>
                  {renderReviewHistoryBanner(closeCandidateModal)}
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0 }}>
                <ManagerCandidateReviewWorkspace
                  projectId={String(apiProject?.id || candidateReviewTaskContext?.projectId || '')}
                  candidateId={selectedCandidate.id}
                  taskId={candidateReviewTaskContext?.taskId}
                  submissionId={candidateReviewTaskContext?.submissionId || undefined}
                  submission={candidateReviewTaskContext?.submission || undefined}
                  allActiveSubmissions={candidateReviewTaskContext?.allActiveSubmissions}
                  taskDueDate={candidateReviewTaskContext?.taskDueDate || undefined}
                  taskTitle={candidateReviewTaskContext?.taskTitle || undefined}
                  sourceDocuments={workbench?.documents}
                  onSelectCandidate={(newCandidateId) => {
                    void openManagerCandidateReview(newCandidateId);
                  }}
                  onReviewed={() => {
                    closeCandidateModal();
                    setTaskRefreshTick((current) => current + 1);
                  }}
                  onCancel={() => {
                    closeCandidateModal();
                  }}
                />
              </div>
            </div>
          ) : (
            <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => closeCandidateModal()}>
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
                {selectedReviewHistoryItem && renderReviewHistoryBanner(closeCandidateModal)}
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Candidate #{selectedCandidate.candidateOrder ?? selectedCandidate.id.slice(-6)}</span>
                    <h2 id="candidate-detail-title">
                      {selectedCandidate.status === 'APPROVED' || selectedCandidate.status === 'REJECTED'
                        ? 'Candidate review details'
                        : candidateName(selectedCandidate)}
                    </h2>
                    <p>
                      {selectedCandidate.status === 'APPROVED' || selectedCandidate.status === 'REJECTED'
                        ? 'Review decision, audit metadata, and extracted company profile details.'
                        : 'Review extracted company data, relationship suggestion, and validation quality before approval.'}
                    </p>
                  </div>
                  <button className={styles.iconButton} type="button" aria-label="Close candidate detail modal" onClick={() => closeCandidateModal()}>
                    <X size={18} />
                  </button>
                </div>

                {candidateError && <div className={styles.inlineError}>{candidateError}</div>}
                {candidateActionMessage && <div className={styles.inlineSuccess}>{candidateActionMessage}</div>}

                <div className={styles.candidateDetailHero}>
                  <div>
                    <span>Review decision</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span className={`${styles.candidateStatus} ${candidateStatusClass[selectedCandidate.status]}`}>
                        {candidateStatusLabel[selectedCandidate.status] || selectedCandidate.status}
                      </span>
                    </div>
                    {selectedCandidate.status === 'REJECTED' && selectedCandidate.review?.rejectionReason && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#b91c1c' }}>
                        Reason: {selectedCandidate.review.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div>
                    <span>Reviewed by</span>
                    <strong style={{ fontSize: '1.05rem', marginTop: '6px', display: 'block' }}>
                      {getCandidateReviewerName(selectedCandidate, projectMembers, currentUser)}
                    </strong>
                  </div>

                  <div>
                    <span>Reviewed at</span>
                    <strong style={{ fontSize: '1.05rem', marginTop: '6px', display: 'block' }}>
                      {(() => {
                        const rDate = getCandidateReviewDate(selectedCandidate);
                        return rDate ? formatDateTime(rDate) : '—';
                      })()}
                    </strong>
                  </div>

                  <div>
                    <span>Company Profile</span>
                    <div style={{ marginTop: '6px' }}>
                      {(() => {
                        const profileId = selectedCandidate.lifecycle?.convertedCompanyProfileId
                          || selectedCandidate.deduplication?.existingProfileIdMatch
                          || (selectedCandidate.status === 'APPROVED' ? apiProject?.targetCompanyProfileId : null);
                        if (profileId) {
                          return (
                            <button
                              type="button"
                              className={styles.profileLinkBtn}
                              onClick={() => {
                                setSelectedCandidate(null);
                                localStorage.setItem('apms-selected-company', profileId);
                                localStorage.removeItem('apms-context-project');
                                setActivePage?.(`company-detail?source=project&projectId=${apiProject?.id}&companyId=${profileId}`);
                              }}
                            >
                              Company Profile <ExternalLink size={12} />
                            </button>
                          );
                        }
                        return (
                          <span className={styles.unconvertedProfileNotice} title="Official company profile will be created once approved">
                            Not created yet
                          </span>
                        );
                      })()}
                    </div>
                  </div>
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
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {documentPendingDelete && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !documentDeleteLoading && setDocumentPendingDelete(null)}
            >
              <motion.div
                className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-doc-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Delete document</span>
                    <h2 id="delete-doc-title">Delete document?</h2>
                    <p>
                      <strong>{documentPendingDelete.fileName || 'This document'}</strong> will be removed from this task.
                    </p>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={() => setDocumentPendingDelete(null)} disabled={documentDeleteLoading}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.button} type="button" onClick={() => setDocumentPendingDelete(null)} disabled={documentDeleteLoading}>
                    Cancel
                  </button>
                  <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => void handleDeleteDocument()} disabled={documentDeleteLoading}>
                    {documentDeleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {memberToRemove && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !removeMemberLoading && setMemberToRemove(null)}
            >
              <motion.div
                className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-member-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Remove member</span>
                    <h2 id="remove-member-title">Remove member from project?</h2>
                    <p>
                      This staff member (<strong>{memberDisplayName(memberToRemove)}</strong>) will lose access to this project.
                    </p>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={() => setMemberToRemove(null)} disabled={removeMemberLoading}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.button} type="button" onClick={() => setMemberToRemove(null)} disabled={removeMemberLoading}>
                    Cancel
                  </button>
                  <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => void handleConfirmRemoveMember()} disabled={removeMemberLoading}>
                    {removeMemberLoading ? 'Removing...' : 'Remove Member'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showLeaveConfirmModal && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !leaveProjectLoading && setShowLeaveConfirmModal(false)}
            >
              <motion.div
                className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="leave-project-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Leave project</span>
                    <h2 id="leave-project-title">Leave project?</h2>
                    <p>
                      You will no longer be a member of this project.
                    </p>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={() => setShowLeaveConfirmModal(false)} disabled={leaveProjectLoading}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.button} type="button" onClick={() => setShowLeaveConfirmModal(false)} disabled={leaveProjectLoading}>
                    Cancel
                  </button>
                  <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => void handleLeaveProject()} disabled={leaveProjectLoading}>
                    {leaveProjectLoading ? 'Leaving...' : 'Leave Project'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showTransferLeaveModal && (
            <motion.div
              className={styles.nestedConfirmOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !leaveProjectLoading && setShowTransferLeaveModal(false)}
            >
              <motion.div
                className={`${styles.inviteModal} ${styles.deleteConfirmModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="transfer-leave-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.inviteHead}>
                  <div>
                    <span className={styles.taskKey}>Transfer & Leave</span>
                    <h2 id="transfer-leave-title">Transfer leadership before leaving</h2>
                    <p>Choose another project member to become the new Leader.</p>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={() => setShowTransferLeaveModal(false)} disabled={leaveProjectLoading}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.fieldGroup}>
                    <label>New Leader</label>
                    <select
                      value={transferLeaveCandidateId}
                      onChange={(e) => setTransferLeaveCandidateId(Number(e.target.value))}
                      disabled={leaveProjectLoading}
                      className={styles.input}
                    >
                      <option value="">-- Select Member --</option>
                      {projectMembers.filter(m => m.accountId !== currentUser?.id).map((m) => (
                        <option key={m.accountId} value={m.accountId}>
                          {memberDisplayName(m)} ({m.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.button} type="button" onClick={() => setShowTransferLeaveModal(false)} disabled={leaveProjectLoading}>
                    Cancel
                  </button>
                  <button
                    className={`${styles.button} ${styles.dangerButton}`}
                    type="button"
                    onClick={() => {
                      if (transferLeaveCandidateId) void handleTransferAndLeaveProject(Number(transferLeaveCandidateId));
                    }}
                    disabled={leaveProjectLoading || !transferLeaveCandidateId}
                  >
                    {leaveProjectLoading ? 'Processing...' : 'Transfer & Leave'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onOpenWorkbench={isStaffView && !isTerminalProject ? handleOpenWorkbenchFromModal : undefined}
        onRelease={isStaffView && !isTerminalProject ? handleReleaseTaskFromModal : undefined}
      />
      {showCloseModal && apiProject && createPortal(
        <AnimatePresence>
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.closeProjectModal} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
              <div className={styles.closeModalHeader}>
                <h2 className={styles.closeModalTitle}>{apiProject.progressPercentage === 100 ? 'Complete project?' : 'Close project?'}</h2>
                <button className={styles.closeModalCloseBtn} onClick={() => setShowCloseModal(false)}><X size={20} /></button>
              </div>
              
              <div className={styles.closeModalBody}>
                <p className={styles.closeModalDesc}>
                  {apiProject.progressPercentage === 100 
                    ? 'The project has reached 100% of its planned deliverables. Closing it will mark the project as Completed and make the workspace read-only.'
                    : `This project is currently ${apiProject.progressPercentage || 0}% complete. Closing it will stop further work and make the project workspace read-only.`
                  }
                </p>
                
                {apiProject.progressPercentage !== 100 && (
                  <div className={styles.formGroup}>
                    <label>Reason for closing *</label>
                    <textarea
                      value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
                      placeholder="Provide a reason..."
                      rows={4}
                      style={{ width: '100%', minHeight: '96px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', resize: 'vertical' }}
                    />
                  </div>
                )}
  
                {closeError && <div className={styles.inlineError}>{closeError}</div>}
              </div>

              <div className={styles.closeModalFooter}>
                <button className={`${styles.button} ${styles.outlineButton}`} onClick={() => setShowCloseModal(false)}>Cancel</button>
                <button
                  className={`${styles.button} ${styles.dangerButton}`}
                  onClick={() => void handleCloseProject()}
                  disabled={closeLoading || (apiProject.progressPercentage !== 100 && !closeReason.trim())}
                >
                  {closeLoading ? 'Processing...' : apiProject.progressPercentage === 100 ? 'Complete Project' : 'Close Project'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
      {selectedHistoryTask && createPortal(
        <AnimatePresence>
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedHistoryTask(null);
              setTaskHistoryDetail(null);
            }}
          >
            <motion.div
              className={styles.historyModalCard}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.historyModalHeader}>
                <div className={styles.historyModalHeaderTop}>
                  <div className={styles.historyModalBadges}>
                    <span className={styles.taskCodePill}>{selectedHistoryTask.taskCode || `APMS-${selectedHistoryTask.taskId}`}</span>
                    <span className={styles.historyDeliverableBadge}>
                      <Target size={12} /> {selectedHistoryTask.deliverable}
                    </span>
                    <span
                      className={`${styles.candidateStatus} ${
                        selectedHistoryTask.status === 'DONE'
                          ? styles.candidateAPPROVED
                          : selectedHistoryTask.latestReviewStatus === 'CHANGES_REQUESTED' || (selectedHistoryTask.status as string) === 'REVISION_REQUESTED'
                          ? styles.candidateREJECTED
                          : selectedHistoryTask.status === 'IN_REVIEW'
                          ? styles.candidatePENDING_REVIEW
                          : styles.candidateDRAFT
                      }`}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {selectedHistoryTask.status === 'DONE'
                        ? 'Done'
                        : selectedHistoryTask.latestReviewStatus === 'CHANGES_REQUESTED' || (selectedHistoryTask.status as string) === 'REVISION_REQUESTED'
                        ? 'Changes Requested'
                        : selectedHistoryTask.status === 'IN_REVIEW'
                        ? 'In Review'
                        : 'In Progress'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.historyModalCloseBtn}
                    onClick={() => {
                      setSelectedHistoryTask(null);
                      setTaskHistoryDetail(null);
                    }}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.historyModalTitleRow}>
                  <h2 className={styles.historyModalTitle}>{selectedHistoryTask.title}</h2>
                </div>
              </div>

              <div className={styles.historyModalMetaGrid}>
                <div className={styles.historyMetaCard}>
                  <span className={styles.historyMetaLabel}>
                    <Clock size={12} style={{ color: '#3b82f6' }} /> Claimed At
                  </span>
                  <span className={styles.historyMetaValue} title={selectedHistoryTask.claimedAt ? formatDateTime(selectedHistoryTask.claimedAt) : undefined}>
                    {selectedHistoryTask.claimedAt ? formatDateTime(selectedHistoryTask.claimedAt) : '—'}
                  </span>
                </div>
                <div className={styles.historyMetaCard}>
                  <span className={styles.historyMetaLabel}>
                    <Upload size={12} style={{ color: '#6366f1' }} /> Last Submitted
                  </span>
                  <span className={styles.historyMetaValue} title={selectedHistoryTask.lastSubmittedAt ? formatDateTime(selectedHistoryTask.lastSubmittedAt) : undefined}>
                    {selectedHistoryTask.lastSubmittedAt ? formatDateTime(selectedHistoryTask.lastSubmittedAt) : '—'}
                  </span>
                </div>
                <div className={styles.historyMetaCard}>
                  <span className={styles.historyMetaLabel}>
                    <CheckCircle2 size={12} style={{ color: '#16a34a' }} /> Completed
                  </span>
                  <span className={styles.historyMetaValue} style={{ color: selectedHistoryTask.completedAt ? '#15803d' : undefined }} title={selectedHistoryTask.completedAt ? formatDateTime(selectedHistoryTask.completedAt) : undefined}>
                    {selectedHistoryTask.completedAt ? formatDateTime(selectedHistoryTask.completedAt) : (selectedHistoryTask.status === 'DONE' ? 'Done' : 'In Progress')}
                  </span>
                </div>
                <div className={styles.historyMetaCard}>
                  <span className={styles.historyMetaLabel}>
                    <AlertTriangle size={12} style={{ color: selectedHistoryTask.revisionCount > 0 ? '#ea580c' : '#94a3b8' }} /> Revision Cycles
                  </span>
                  <span className={styles.historyMetaValue}>
                    {selectedHistoryTask.revisionCount > 0 ? (
                      <span className={styles.revisionCountBadge}>
                        <AlertTriangle size={11} /> {selectedHistoryTask.revisionCount} {selectedHistoryTask.revisionCount === 1 ? 'time' : 'times'}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>0 times</span>
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.historyModalBody}>
                {taskHistoryLoading && (
                  <div className={styles.empty}>Loading task timeline...</div>
                )}
                {taskHistoryError && (
                  <div className={styles.inlineError}>{taskHistoryError}</div>
                )}
                {!taskHistoryLoading && taskHistoryDetail && (!taskHistoryDetail.activities || taskHistoryDetail.activities.length === 0) && (
                  <div className={styles.empty}>No timeline events recorded for this task.</div>
                )}
                {!taskHistoryDetail && !taskHistoryLoading && !taskHistoryError && (
                  <div className={styles.empty}>Select a task to view timeline history.</div>
                )}
                {!taskHistoryLoading && taskHistoryDetail && taskHistoryDetail.activities && taskHistoryDetail.activities.length > 0 && (
                  <div className={styles.historyTimelineTrack}>
                    {taskHistoryDetail.activities.map((event, idx) => {
                      const isClaimed = event.type === 'TASK_CLAIMED' || event.type === 'CLAIMED' || event.type === 'TASK_CREATED';
                      const isSubmitted = event.type === 'SUBMITTED';
                      const isResubmitted = event.type === 'RESUBMITTED';
                      const isRecalled = event.type === 'RECALLED';
                      const isRevision = event.type === 'REVISION_REQUESTED' || event.type === 'CHANGES_REQUESTED';
                      const isApproved = event.type === 'APPROVED' || event.type === 'TASK_APPROVED' || event.type === 'COMPLETED';

                      const iconClass = isRevision
                        ? styles.historyTimelineIconRevision
                        : isApproved
                        ? styles.historyTimelineIconApproved
                        : isResubmitted
                        ? styles.historyTimelineIconResubmitted
                        : isRecalled
                        ? styles.historyTimelineIconRecalled
                        : isSubmitted
                        ? styles.historyTimelineIconSubmitted
                        : styles.historyTimelineIconClaimed;

                      const contentCardClass = `${styles.historyTimelineContent} ${
                        isRevision ? styles.historyTimelineContentRevision : isApproved ? styles.historyTimelineContentApproved : ''
                      }`;

                      return (
                        <div key={idx} className={styles.historyTimelineNode}>
                          <div className={`${styles.historyTimelineIcon} ${iconClass}`}>
                            {isRevision ? (
                              <AlertTriangle size={16} />
                            ) : isApproved ? (
                              <CheckCircle2 size={16} />
                            ) : isResubmitted ? (
                              <RotateCcw size={16} />
                            ) : isRecalled ? (
                              <RotateCcw size={16} />
                            ) : isSubmitted ? (
                              <Upload size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </div>
                          <div className={contentCardClass}>
                            <div className={styles.historyTimelineHead}>
                              <div className={styles.historyTimelineHeadLeft}>
                                <span className={styles.historyTimelineEventTitle}>{event.title}</span>
                                {event.actorName && (
                                  <span className={`${styles.historyActorPill} ${isRevision ? styles.historyActorPillManager : ''}`}>
                                    {isRevision || isApproved ? 'Reviewed by ' : 'by '}<strong>{event.actorName}</strong>
                                  </span>
                                )}
                              </div>
                              <span className={styles.historyTimelineTime}>
                                <Clock size={12} /> {formatDateTime(event.occurredAt)}
                              </span>
                            </div>
                            {event.detail && (
                              <div className={styles.historyTimelineDetail}>{event.detail}</div>
                            )}
                            {isRevision && event.note && (
                              <div className={styles.historyRevisionBox}>
                                <div className={styles.historyRevisionBoxTitle}>
                                  <AlertTriangle size={13} /> Manager Feedback & Change Request:
                                </div>
                                <p className={styles.historyRevisionBoxText}>{event.note}</p>
                              </div>
                            )}
                            {isApproved && (
                              <div className={styles.historyApprovalBox}>
                                <div className={styles.historyApprovalBoxTitle}>
                                  <CheckCircle2 size={13} /> Manager Approval Note:
                                </div>
                                <p className={styles.historyApprovalBoxText}>
                                  {event.note || 'Submission approved by Manager.'}
                                </p>
                              </div>
                            )}
                            {(isSubmitted || isResubmitted) && event.note && !isAutomatedSystemNote(event.note) && (
                              <div className={styles.historyStaffNoteBox}>
                                <div className={styles.historyStaffNoteTitle}>
                                  <FileText size={13} /> Staff Submission Note:
                                </div>
                                <p className={styles.historyStaffNoteText}>{event.note}</p>
                              </div>
                            )}
                            {isRecalled && event.note && !isAutomatedSystemNote(event.note) && (
                              <div className={styles.historyStaffNoteBox} style={{ borderLeftColor: '#94a3b8' }}>
                                <div className={styles.historyStaffNoteTitle} style={{ color: '#64748b' }}>
                                  <RotateCcw size={13} /> Recall Reason:
                                </div>
                                <p className={styles.historyStaffNoteText}>{event.note.replace('[Recalled by Staff]', '').trim()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={styles.historyModalFooter}>
                <span className={styles.historyModalFooterCount}>
                  {taskHistoryDetail?.activities?.length ? `${taskHistoryDetail.activities.length} timeline events recorded` : ''}
                </span>
                <button
                  type="button"
                  className={`${styles.button} ${styles.outlineButton}`}
                  onClick={() => {
                    setSelectedHistoryTask(null);
                    setTaskHistoryDetail(null);
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
      {showEditModal && apiProject && (
        <EditProjectModal
          project={apiProject}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            setProjectRefreshTick((current) => current + 1);
            setToast({ kind: 'success', message: 'Project updated successfully.' });
          }}
        />
      )}
    </section>
  );
};
