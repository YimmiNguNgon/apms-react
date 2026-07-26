import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Trash2,
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
import { ROLES, useUser } from '../context/UserContext';
import { API_BASE_URL, api } from '../services/api';
import type {
  AiExtractionResult,
  CandidateResponse,
  CandidateStatus,
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

const tabs = ['Kanban Board', 'Candidates', 'Members'];
const SELECTED_PROJECT_STORAGE_KEY = 'apms-selected-project';

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

const candidateField = (value: unknown, fallback = 'No data') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
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
    .map(([key, value]) => ({ key, items: toInsightItems(value) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <section>
      <h3>{title}</h3>
      {visibleEntries.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <div className={styles.insightSections}>
          {visibleEntries.map((entry) => (
            <article className={styles.insightBlock} key={entry.key}>
              <h4>{formatInsightTitle(entry.key)}</h4>
              <ul>
                {entry.items.map((item, index) => (
                  <li key={`${entry.key}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const CandidateInsightField: React.FC<{ title: string; data: unknown }> = ({ title, data }) => {
  const items = toInsightItems(data);

  return (
    <section>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className={styles.insightEmpty}>No data</div>
      ) : (
        <ul className={styles.insightList}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

const candidateTaxId = (candidate: CandidateResponse) => {
  const identity = candidate.identity as { taxId?: string; registrationNumber?: string } | undefined;
  return identity?.taxId || identity?.registrationNumber || 'No tax ID';
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
            <h3><Sparkles size={16} /> AI Information</h3>
            <div className={styles.aiPanel}>
              <p><strong>Summary:</strong> {task.aiSummary}</p>
              <p><strong>Risk analysis:</strong> {task.aiRiskAnalysis}</p>
              <strong>Suggestions</strong>
              <ul>{task.aiSuggestions.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>Recommended next steps</strong>
              <ul>{task.aiNextSteps.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className={styles.drawerSection}>
            <h3><Paperclip size={16} /> Attachments</h3>
            <ul className={styles.attachmentList}>
              {task.attachments.length === 0 && <li className={styles.empty}>No attachments yet</li>}
              {task.attachments.map((file) => (
                <li className={styles.attachmentItem} key={file.id}>
                  <span className={styles.attachmentIcon}>{file.type === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}</span>
                  <div>
                    <strong>{file.name}</strong>
                    <div className={styles.keyLine}>{file.size}</div>
                    {file.preview && <img className={styles.imagePreview} src={file.preview} alt={file.name} />}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.drawerSection}>
            <h3><MessageSquare size={16} /> Comments</h3>
            <ul className={styles.commentList}>
              {task.comments.map((comment) => (
                <li className={styles.commentItem} key={comment.id}>
                  <Avatar small name={comment.author.name} initials={comment.author.avatar} color={comment.author.color} />
                  <div className={styles.commentBubble}>
                    <strong>{comment.author.name}</strong><span>{comment.createdAt}</span>
                    <p>{comment.message}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.commentBox}>
              <input placeholder="Add a comment, use @ to mention someone..." />
              <button className={`${styles.button} ${styles.primaryButton}`} type="button">Add</button>
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
  industry: string;
  businessModel: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
}

interface StaffExtractionReview {
  id: string;
  importJobId?: number;
  rawDocumentId?: string;
  fileName: string;
  qualityStatus?: string | null;
  edit: StaffCandidateEditForm;
}

const emptyStaffCandidateEdit: StaffCandidateEditForm = {
  legalName: '',
  tradeName: '',
  taxId: '',
  website: '',
  email: '',
  phone: '',
  industry: '',
  businessModel: '',
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

const candidateToEditForm = (candidate: CandidateResponse | null): StaffCandidateEditForm => {
  if (!candidate) return emptyStaffCandidateEdit;
  const identity = candidate.identity as { legalName?: string; tradeName?: string; taxId?: string } | undefined;
  const business = candidate.business as { industries?: string[]; businessModel?: string } | undefined;
  const contact = candidate.contact as { website?: string; emails?: string[]; phones?: string[] } | undefined;
  const insights = candidate.insights as { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[] } | undefined;

  return {
    legalName: identity?.legalName || '',
    tradeName: identity?.tradeName || '',
    taxId: identity?.taxId || '',
    website: contact?.website || '',
    email: contact?.emails?.[0] || '',
    phone: contact?.phones?.[0] || '',
    industry: business?.industries?.join(', ') || '',
    businessModel: business?.businessModel || '',
    strengths: insights?.strengths?.join('\n') || '',
    weaknesses: insights?.weaknesses?.join('\n') || '',
    opportunities: insights?.opportunities?.join('\n') || '',
    threats: insights?.threats?.join('\n') || '',
  };
};

const extractionToEditForm = (extraction: Record<string, unknown>): StaffCandidateEditForm => {
  const data = (extraction.extractedData as Record<string, unknown>) ?? extraction;
  return {
    legalName: String(data?.legalName || ''),
    tradeName: String(data?.tradeName || ''),
    taxId: String(data?.taxCode || data?.taxId || ''),
    website: String(data?.website || ''),
    email: Array.isArray(data?.email) ? String(data.email[0] || '') : String(data?.email || ''),
    phone: Array.isArray(data?.phone) ? String(data.phone[0] || '') : String(data?.phone || ''),
    industry: Array.isArray(data?.industries) ? (data.industries as string[]).join(', ') : String(data?.industries || ''),
    businessModel: String(data?.businessModel || ''),
    strengths: Array.isArray(data?.strengths) ? (data.strengths as string[]).join('\n') : String(data?.strengths || ''),
    weaknesses: Array.isArray(data?.weaknesses) ? (data.weaknesses as string[]).join('\n') : String(data?.weaknesses || ''),
    opportunities: Array.isArray(data?.opportunities) ? (data.opportunities as string[]).join('\n') : String(data?.opportunities || ''),
    threats: Array.isArray(data?.threats) ? (data.threats as string[]).join('\n') : String(data?.threats || ''),
  };
};

const buildExtractedCompanyDataPayload = (form: StaffCandidateEditForm) => ({
  legalName: form.legalName.trim() || null,
  tradeName: form.tradeName.trim() || null,
  taxCode: form.taxId.trim() || null,
  industries: form.industry.split(',').map((item) => item.trim()).filter(Boolean),
  businessModel: form.businessModel.trim() || null,
  website: form.website.trim() || null,
  email: form.email.trim() ? [form.email.trim()] : [],
  phone: form.phone.trim() ? [form.phone.trim()] : [],
  strengths: splitLines(form.strengths),
  weaknesses: splitLines(form.weaknesses),
  opportunities: splitLines(form.opportunities),
  threats: splitLines(form.threats),
});

const buildCandidateUpdatePayload = (form: StaffCandidateEditForm): UpdateCandidateRequest => ({
  identity: {
    legalName: form.legalName.trim() || null,
    tradeName: form.tradeName.trim() || null,
    taxId: form.taxId.trim() || null,
  },
  business: {
    industries: form.industry.split(',').map((item) => item.trim()).filter(Boolean),
    businessModel: form.businessModel.trim() || null,
  },
  contact: {
    website: form.website.trim() || null,
    emails: form.email.trim() ? [form.email.trim()] : [],
    phones: form.phone.trim() ? [form.phone.trim()] : [],
  },
  insights: {
    strengths: splitLines(form.strengths),
    weaknesses: splitLines(form.weaknesses),
    opportunities: splitLines(form.opportunities),
    threats: splitLines(form.threats),
  },
});

const taskTypeText: Record<TaskType, { title: string; description: string; steps: string[] }> = {
  DOCUMENT_COLLECTION: {
    title: 'Document collection',
    description: 'Collect and upload evidence documents, then submit the document package for manager review.',
    steps: ['Start work', 'Upload evidence', 'Check documents', 'Submit review'],
  },
  COMPANY_DATA_PREPARATION: {
    title: 'Company data preparation',
    description: 'Upload evidence, run AI extraction, create a candidate draft, correct data, then submit to manager.',
    steps: ['Start work', 'Upload evidence', 'AI extraction', 'Candidate draft', 'Submit review'],
  },
  ROLE_EVALUATION: {
    title: 'Role evaluation',
    description: 'Review the company context, prepare evaluation notes, attach supporting files, then submit the evaluation.',
    steps: ['Start work', 'Review context', 'Prepare evaluation', 'Submit review'],
  },
  GENERAL_TASK: {
    title: 'General task',
    description: 'Work on the assigned request, add a completion note, attach evidence if needed, then submit review.',
    steps: ['Start work', 'Add result', 'Submit review'],
  },
};

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const isManager = currentUser?.role === ROLES.MANAGER || currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.ADMIN;
  const isStaffView = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.KEY_MEMBER;
  const [activeTab, setActiveTab] = useState('Kanban Board');
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
  const [candidateReviewTaskContext, setCandidateReviewTaskContext] = useState<{
    projectId: number;
    taskId: number;
    submissionId?: number | null;
  } | null>(null);
  const [workbench, setWorkbench] = useState<ProjectTaskWorkbenchResponse | null>(null);
  const [workbenchLoading, setWorkbenchLoading] = useState(false);
  const [workbenchError, setWorkbenchError] = useState<string | null>(null);
  const [workbenchMessage, setWorkbenchMessage] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [extractingImportJobId, setExtractingImportJobId] = useState<number | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<WorkbenchDocumentResponse[]>([]);
  const [projectDocumentsLoading, setProjectDocumentsLoading] = useState(false);
  const [selectedProjectDocumentIds, setSelectedProjectDocumentIds] = useState<number[]>([]);
  const [extractingSelectedDocuments, setExtractingSelectedDocuments] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ percent: number; label: string } | null>(null);
  const [pendingExtractionReviews, setPendingExtractionReviews] = useState<StaffExtractionReview[]>([]);
  const [staffCandidate, setStaffCandidate] = useState<CandidateResponse | null>(null);
  const [staffCandidateEdit, setStaffCandidateEdit] = useState<StaffCandidateEditForm>(emptyStaffCandidateEdit);
  const [staffCandidateLoading, setStaffCandidateLoading] = useState(false);
  const [staffSubmitLoading, setStaffSubmitLoading] = useState(false);
  const [staffTaskNote, setStaffTaskNote] = useState('');
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
  const visibleTabs = useMemo(() => (isStaffView ? ['Kanban Board', 'Members'] : tabs), [isStaffView]);
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
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('Kanban Board');
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
    if (!isStaffView) return;
    const refreshStaffTasks = () => setTaskRefreshTick((current) => current + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshStaffTasks();
    };
    const interval = window.setInterval(refreshStaffTasks, 8000);
    window.addEventListener('focus', refreshStaffTasks);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshStaffTasks);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isStaffView]);

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
    if (!selectedStaffTask || selectedStaffTask.taskType !== 'COMPANY_DATA_PREPARATION') {
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

  const assignableMembers = useMemo(
    () => projectMembers.filter((member) => member.memberRole === 'STAFF'),
    [projectMembers]
  );

  const candidateStats = useMemo(() => {
    const pending = candidates.filter((candidate) => candidate.status === 'PENDING_REVIEW' || candidate.status === 'CORRECTED' || candidate.status === 'DRAFT').length;
    const approved = candidates.filter((candidate) => candidate.status === 'APPROVED').length;
    const rejected = candidates.filter((candidate) => candidate.status === 'REJECTED').length;
    const incomplete = candidates.filter(isCandidateIncomplete).length;

    return {
      pending,
      approved,
      rejected,
      incomplete,
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
      const matchesStatus = candidateStatusFilter === 'ALL' || candidate.status === candidateStatusFilter;
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

  const loadStaffWorkbench = async (task: ProjectTaskResponse) => {
    await loadTaskWorkbench(task, { loadCandidateDraft: true });
  };

  const loadManagerWorkbench = async (task: ProjectTaskResponse) => {
    await loadTaskWorkbench(task);
  };

  const resetStaffWorkbenchForms = () => {
    setStaffTaskNote('');
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
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_PROGRESS' } : current);
      setWorkbenchMessage('Task moved to In Progress.');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot start this task.');
    }
  };

  const handleCancelStaffTask = async () => {
    if (!selectedStaffTask) return;
    if (!window.confirm('Are you sure you want to cancel this task? This action cannot be undone.')) return;
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'CANCELLED');
      updateTaskInState(payload.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'CANCELLED' } : current);
      setWorkbenchMessage('Task has been cancelled.');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot cancel this task.');
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
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot upload file.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const toggleProjectDocumentSelection = (documentId: number) => {
    setSelectedProjectDocumentIds((current) => (
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    ));
  };

  const extractProjectDocumentsForReview = async (selectedDocuments: WorkbenchDocumentResponse[]) => {
    if (!selectedStaffTask) return;

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
          extractedReviews.push({
            id: extractionId,
            importJobId: document.id,
            rawDocumentId: document.rawDocumentId || undefined,
            fileName: document.fileName || `Import job #${document.id}`,
            qualityStatus: (latestPayload.data as Record<string, unknown>)?.qualityStatus as string | null | undefined,
            edit: extractionToEditForm(latestPayload.data as Record<string, unknown>),
          });
        }
      }

      if (extractedReviews.length === 0) {
        throw new Error('AI extraction completed, but no extraction ID was returned.');
      }

      setPendingExtractionReviews(extractedReviews);
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

  const updatePendingExtractionEdit = (extractionId: string, patch: Partial<StaffCandidateEditForm>) => {
    setPendingExtractionReviews((current) => current.map((review) => (
      review.id === extractionId ? { ...review, edit: { ...review.edit, ...patch } } : review
    )));
  };

  const handleCreateCandidateFromReviewedExtractions = async () => {
    if (!selectedStaffTask) return;
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

  const handleExtractSelectedProjectDocuments = async () => {
    await extractProjectDocumentsForReview(projectDocuments.filter((document) => selectedProjectDocumentIds.includes(document.id)));
  };

  const handleOpenStaffCandidate = async (candidateId: string) => {
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

  const handleSaveStaffCandidate = async () => {
    if (!staffCandidate) return;
    setStaffCandidateLoading(true);
    setWorkbenchError(null);
    setWorkbenchMessage(null);

    try {
      const payload = await candidateApi.updateCandidate(staffCandidate.id, buildCandidateUpdatePayload(staffCandidateEdit));
      setStaffCandidate(payload.data);
      setStaffCandidateEdit(candidateToEditForm(payload.data));
      setWorkbenchMessage('Candidate information saved.');
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Cannot save candidate.');
    } finally {
      setStaffCandidateLoading(false);
    }
  };

  const handleSubmitStaffCandidate = async () => {
    if (!selectedStaffTask || !staffCandidate) return;
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
        targetEntityId: staffCandidate.id,
        note: 'Candidate submitted for manager review.',
      });

      const updatedTask = await taskApi.updateTaskStatus(selectedStaffTask.projectId, selectedStaffTask.id, 'IN_REVIEW');
      updateTaskInState(updatedTask.data);
      setWorkbench((current) => current ? { ...current, taskStatus: 'IN_REVIEW' } : current);
      setWorkbenchMessage('Submitted to manager review.');
      await loadStaffWorkbench(updatedTask.data);
      setSelectedStaffTask(null);
      setStaffTaskNote('');
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
                <span className={styles.count}>{filteredCandidates.length}/{candidates.length}</span>
              </div>

              {candidateError && !/403|denied|forbidden/i.test(candidateError) && <div className={styles.inlineError}>{candidateError}</div>}
              {candidateActionMessage && <div className={styles.inlineSuccess}>{candidateActionMessage}</div>}

              <div className={styles.candidateStats}>
                <div><span>Total candidates</span><strong>{candidates.length}</strong></div>
                <div><span>Need review</span><strong>{candidateStats.pending}</strong></div>
                <div><span>Approved</span><strong>{candidateStats.approved}</strong></div>
                <div><span>Rejected</span><strong>{candidateStats.rejected}</strong></div>
                <div><span>Missing data</span><strong>{candidateStats.incomplete}</strong></div>
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
                    <option value="CORRECTED">Corrected</option>
                    <option value="DRAFT">Draft</option>
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
                      <th>Candidate</th>
                      <th>Project relationship</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesLoading && (
                      <tr>
                        <td colSpan={4}><div className={styles.empty}>Loading candidates...</div></td>
                      </tr>
                    )}
                    {!candidatesLoading && filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={4}><div className={styles.empty}>No candidate matches your review filters.</div></td>
                      </tr>
                    )}
                    {!candidatesLoading && filteredCandidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td>
                          <div className={styles.candidateNameCell}>
                            <span className={styles.candidateRank}>#{candidate.candidateOrder ?? candidate.id.slice(-6)}</span>
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
            className={styles.modalOverlay}
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
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  type="button"
                  onClick={() => void handleStartStaffTask()}
                  disabled={selectedStaffTask.status !== 'TODO'}
                >
                  <Clock size={16} />{selectedStaffTask.status === 'TODO' ? 'Start task' : 'Task started'}
                </button>
                {selectedStaffTask.status !== 'DONE' && selectedStaffTask.status !== 'CANCELLED' && (
                  <button
                    className={`${styles.button}`}
                    type="button"
                    onClick={() => void handleCancelStaffTask()}
                    style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                  >
                    <X size={16} />Cancel task
                  </button>
                )}
                <span>
                  {selectedStaffTask.status === 'TODO'
                    ? 'Start this task to move it from To Do to In Progress.'
                    : `Current task status: ${workbench?.taskStatus || selectedStaffTask.status}`}
                </span>
              </div>

              <div className={styles.workbenchFlow}>
                {taskTypeText[selectedStaffTask.taskType].steps.map((step, index) => (
                  <div
                    key={step}
                    className={`${styles.workbenchStep} ${
                      index === 0 && selectedStaffTask.status !== 'TODO' ? styles.workbenchStepDone : ''
                    } ${
                      index === 1 && (workbench?.documents?.length ?? 0) > 0 ? styles.workbenchStepDone : ''
                    } ${
                      step === 'AI extraction' && workbench?.documents?.some((doc) => doc.latestExtractionId) ? styles.workbenchStepDone : ''
                    } ${
                      step === 'Candidate draft' && (workbench?.candidateDrafts?.length ?? 0) > 0 ? styles.workbenchStepDone : ''
                    } ${
                      step === 'Submit review' && workbench?.submissions?.some((submission) => submission.status === 'IN_REVIEW' || submission.status === 'APPROVED') ? styles.workbenchStepDone : ''
                    }`}
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
                        disabled={extractingSelectedDocuments || selectedProjectDocumentIds.length === 0}
                      >
                        <Sparkles size={16} />
                        {extractingSelectedDocuments ? 'Extracting...' : `Extract selected for review (${selectedProjectDocumentIds.length})`}
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
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => void extractProjectDocumentsForReview([document])}
                              disabled={extractingImportJobId === document.id || extractingSelectedDocuments}
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
                        <button
                          className={`${styles.button} ${styles.primaryButton}`}
                          type="button"
                          onClick={() => void handleCreateCandidateFromReviewedExtractions()}
                          disabled={staffCandidateLoading}
                        >
                          <CheckCircle2 size={16} />
                          {staffCandidateLoading ? 'Creating...' : 'Save review & create candidate'}
                        </button>
                      </div>

                      <div className={styles.extractionReviewList}>
                        {pendingExtractionReviews.map((review, reviewIndex) => (
                          <article className={styles.extractionReviewCard} key={review.id}>
                            <div className={styles.extractionReviewHead}>
                              <div>
                                <span>Extraction #{reviewIndex + 1}</span>
                                <strong>{review.fileName}</strong>
                              </div>
                              <small>{review.qualityStatus || 'Pending staff review'}</small>
                            </div>

                            <div className={styles.candidateEditGrid}>
                              <label className={styles.inviteField}>
                                <span>Legal name</span>
                                <input value={review.edit.legalName} onChange={(event) => updatePendingExtractionEdit(review.id, { legalName: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Trade name</span>
                                <input value={review.edit.tradeName} onChange={(event) => updatePendingExtractionEdit(review.id, { tradeName: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Tax code</span>
                                <input value={review.edit.taxId} onChange={(event) => updatePendingExtractionEdit(review.id, { taxId: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Website</span>
                                <input value={review.edit.website} onChange={(event) => updatePendingExtractionEdit(review.id, { website: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Email</span>
                                <input value={review.edit.email} onChange={(event) => updatePendingExtractionEdit(review.id, { email: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Phone</span>
                                <input value={review.edit.phone} onChange={(event) => updatePendingExtractionEdit(review.id, { phone: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Industries</span>
                                <input value={review.edit.industry} onChange={(event) => updatePendingExtractionEdit(review.id, { industry: event.target.value })} />
                              </label>
                              <label className={styles.inviteField}>
                                <span>Business model</span>
                                <input value={review.edit.businessModel} onChange={(event) => updatePendingExtractionEdit(review.id, { businessModel: event.target.value })} />
                              </label>
                              {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((field) => (
                                <label className={`${styles.inviteField} ${styles.fullField}`} key={`${review.id}-${field}`}>
                                  <span>{formatInsightTitle(field)}</span>
                                  <textarea
                                    value={review.edit[field]}
                                    placeholder="One item per line"
                                    onChange={(event) => updatePendingExtractionEdit(review.id, { [field]: event.target.value })}
                                  />
                                </label>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Candidate detail</h3>
                        <p>Review and correct extracted fields before sending it to the manager.</p>
                      </div>
                      {staffCandidate && (
                        <span className={`${styles.candidateStatus} ${candidateStatusClass[staffCandidate.status]}`}>
                          {candidateStatusLabel[staffCandidate.status]}
                        </span>
                      )}
                    </div>

                    {!staffCandidate ? (
                      <div className={styles.empty}>Create or open a candidate draft to edit company information.</div>
                    ) : (
                      <>
                        <div className={styles.candidateEditGrid}>
                          <label className={styles.inviteField}>
                            <span>Legal name</span>
                            <input value={staffCandidateEdit.legalName} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, legalName: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Trade name</span>
                            <input value={staffCandidateEdit.tradeName} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, tradeName: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Tax ID</span>
                            <input value={staffCandidateEdit.taxId} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, taxId: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Website</span>
                            <input value={staffCandidateEdit.website} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, website: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Email</span>
                            <input value={staffCandidateEdit.email} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, email: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Phone</span>
                            <input value={staffCandidateEdit.phone} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, phone: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Industry</span>
                            <input value={staffCandidateEdit.industry} placeholder="Technology, Finance..." onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, industry: event.target.value }))} />
                          </label>
                          <label className={styles.inviteField}>
                            <span>Business model</span>
                            <input value={staffCandidateEdit.businessModel} onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, businessModel: event.target.value }))} />
                          </label>
                          {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((field) => (
                            <label className={`${styles.inviteField} ${styles.fullField}`} key={field}>
                              <span>{formatInsightTitle(field)}</span>
                              <textarea
                                value={staffCandidateEdit[field]}
                                placeholder="One item per line"
                                onChange={(event) => setStaffCandidateEdit((current) => ({ ...current, [field]: event.target.value }))}
                              />
                            </label>
                          ))}
                        </div>

                        <div className={styles.modalActions}>
                          <button className={styles.button} type="button" onClick={() => void handleSaveStaffCandidate()} disabled={staffCandidateLoading}>
                            {staffCandidateLoading ? 'Saving...' : 'Save candidate'}
                          </button>
                          <button
                            className={`${styles.button} ${styles.primaryButton}`}
                            type="button"
                            onClick={() => void handleSubmitStaffCandidate()}
                            disabled={staffSubmitLoading || staffCandidate.status === 'PENDING_REVIEW' || staffCandidate.status === 'APPROVED'}
                          >
                            <CheckCircle2 size={16} />{staffSubmitLoading ? 'Submitting...' : 'Submit to manager'}
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                  </>
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
                          {selectedStaffTask.taskType === 'DOCUMENT_COLLECTION' && 'Confirm the uploaded documents are enough, then submit the package to manager review.'}
                          {selectedStaffTask.taskType === 'ROLE_EVALUATION' && 'Write your evaluation notes and attach evidence before sending it for manager review.'}
                          {selectedStaffTask.taskType === 'GENERAL_TASK' && 'Add a clear result note so the manager knows what has been completed.'}
                        </p>
                      </div>
                      <span className={styles.taskTypeBadge}>{taskTypeText[selectedStaffTask.taskType].title}</span>
                    </div>

                    <label className={styles.workbenchUploadBox}>
                      <input
                        type="file"
                        onChange={(event) => {
                          void handleUploadEvidence(event.target.files?.[0] ?? null);
                          event.currentTarget.value = '';
                        }}
                        disabled={uploadingEvidence}
                      />
                      <FileText size={24} />
                      <strong>{uploadingEvidence ? 'Uploading evidence...' : 'Upload evidence'}</strong>
                      <span>Attach files that support this task before submitting to manager review.</span>
                    </label>

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
                            <small>{document.errorMessage || 'Ready for review package'}</small>
                          </div>
                        </article>
                      ))}
                    </div>

                    {selectedStaffTask.taskType === 'ROLE_EVALUATION' && (
                      <div className={styles.taskSpecificPanel}>
                        <div className={styles.taskSpecificHead}>
                          <Bot size={20} />
                          <div>
                            <strong>Role evaluation workspace</strong>
                            <span>Assess how this company should be positioned in the project before manager review.</span>
                          </div>
                        </div>

                        <div className={styles.roleEvaluationGrid}>
                          <label className={styles.inviteField}>
                            <span>Suggested relationship</span>
                            <select
                              value={roleEvaluationForm.relationship}
                              onChange={(event) => setRoleEvaluationForm((current) => ({ ...current, relationship: event.target.value }))}
                            >
                              <option value="">Select relationship</option>
                              {candidateRelationshipOptions.map((relationship) => (
                                <option key={relationship} value={relationship}>{relationship}</option>
                              ))}
                            </select>
                          </label>

                          <label className={styles.inviteField}>
                            <span>Risk level</span>
                            <select
                              value={roleEvaluationForm.riskLevel}
                              onChange={(event) => setRoleEvaluationForm((current) => ({ ...current, riskLevel: event.target.value }))}
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </label>

                          <label className={`${styles.inviteField} ${styles.fullField}`}>
                            <span>Evidence summary</span>
                            <textarea
                              value={roleEvaluationForm.evidenceSummary}
                              placeholder="Summarize the documents, facts, or signals that support this evaluation..."
                              onChange={(event) => setRoleEvaluationForm((current) => ({ ...current, evidenceSummary: event.target.value }))}
                            />
                          </label>

                          <label className={`${styles.inviteField} ${styles.fullField}`}>
                            <span>Recommendation</span>
                            <textarea
                              value={roleEvaluationForm.recommendation}
                              placeholder="Example: Approve this company as a strategic partner because..."
                              onChange={(event) => setRoleEvaluationForm((current) => ({ ...current, recommendation: event.target.value }))}
                            />
                          </label>
                        </div>
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
                            />
                          </label>

                          <label className={styles.inviteField}>
                            <span>Next step</span>
                            <input
                              value={generalTaskForm.nextStep}
                              placeholder="Optional next action"
                              onChange={(event) => setGeneralTaskForm((current) => ({ ...current, nextStep: event.target.value }))}
                            />
                          </label>

                          <label className={styles.inviteField}>
                            <span>Blocker</span>
                            <input
                              value={generalTaskForm.blocker}
                              placeholder="No blocker"
                              onChange={(event) => setGeneralTaskForm((current) => ({ ...current, blocker: event.target.value }))}
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
                            ? 'Example: Uploaded annual report and registration evidence. Ready for manager review.'
                            : selectedStaffTask.taskType === 'ROLE_EVALUATION'
                              ? 'Example: Based on the uploaded evidence, this company fits the partner role because...'
                              : 'Example: Completed the assigned work and attached supporting evidence.'
                        }
                        onChange={(event) => setStaffTaskNote(event.target.value)}
                      />
                    </label>

                    <div className={styles.modalActions}>
                      <button
                        className={`${styles.button} ${styles.primaryButton}`}
                        type="button"
                        onClick={() => void handleSubmitStaffTaskReview(
                          selectedStaffTask.taskType === 'DOCUMENT_COLLECTION'
                            ? 'DOCUMENT_COLLECTION'
                            : selectedStaffTask.taskType === 'ROLE_EVALUATION'
                              ? 'ROLE_EVALUATION'
                              : 'OTHER',
                          selectedStaffTask.taskType === 'DOCUMENT_COLLECTION'
                            ? 'Document package submitted for manager review.'
                            : selectedStaffTask.taskType === 'ROLE_EVALUATION'
                              ? 'Role evaluation submitted for manager review.'
                              : 'Task result submitted for manager review.'
                        )}
                        disabled={staffSubmitLoading || selectedStaffTask.status === 'IN_REVIEW' || selectedStaffTask.status === 'DONE'}
                      >
                        <CheckCircle2 size={16} />{staffSubmitLoading ? 'Submitting...' : 'Submit to manager'}
                      </button>
                    </div>
                  </section>
                  )}
                </main>

                <aside className={styles.workbenchSidebar}>
                  {selectedStaffTask.taskType === 'COMPANY_DATA_PREPARATION' ? (
                    <section className={styles.workbenchPanel}>
                      <h3>Candidate drafts</h3>
                      <div className={styles.draftList}>
                        {(workbench?.candidateDrafts?.length ?? 0) === 0 && <div className={styles.empty}>No candidate drafts yet.</div>}
                        {workbench?.candidateDrafts?.map((draft) => (
                          <button className={styles.draftItem} type="button" key={draft.candidateId} onClick={() => void handleOpenStaffCandidate(draft.candidateId)}>
                            <strong>{draft.candidateId.slice(-8)}</strong>
                            <span>{candidateStatusLabel[draft.status]}</span>
                            {draft.isUnderReview && <small>Under manager review</small>}
                            {draft.hasConflicts && <small>{draft.conflictCount || 0} conflict(s)</small>}
                          </button>
                        ))}
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
        {selectedManagerReviewTask && (
          <motion.div
            className={styles.modalOverlay}
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
                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                        <h3>Uploaded evidence</h3>
                        <p>These are the files uploaded by staff for this task.</p>
                      </div>
                      <span className={styles.taskTypeBadge}>{workbench?.documents?.length ?? 0} file(s)</span>
                    </div>

                    <div className={styles.documentList}>
                      {workbenchLoading && <div className={styles.empty}>Loading review data...</div>}
                      {!workbenchLoading && (workbench?.documents?.length ?? 0) === 0 && (
                        <div className={styles.empty}>No uploaded files found for this task.</div>
                      )}
                      {workbench?.documents?.map((document) => (
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

                  {selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION' && (
                    <section className={styles.workbenchPanel}>
                      <div className={styles.workbenchPanelHead}>
                        <div>
                          <h3>Candidate drafts</h3>
                          <p>Open the candidate from the Candidates tab if you need the full company profile preview and approval workflow.</p>
                        </div>
                        <span className={styles.taskTypeBadge}>{workbench?.candidateDrafts?.length ?? 0} draft(s)</span>
                      </div>
                      <div className={styles.draftList}>
                        {(workbench?.candidateDrafts?.length ?? 0) === 0 && <div className={styles.empty}>No candidate draft linked to this task.</div>}
                        {workbench?.candidateDrafts?.map((draft) => (
                          <button
                            className={styles.draftItem}
                            type="button"
                            key={draft.candidateId}
                            onClick={() => void openManagerCandidateReview(draft.candidateId)}
                          >
                            <strong>{draft.candidateId.slice(-8)}</strong>
                            <span>{candidateStatusLabel[draft.status]}</span>
                            {draft.isUnderReview && <small>Submitted for review</small>}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className={styles.workbenchPanel}>
                    <div className={styles.workbenchPanelHead}>
                      <div>
                          <h3>{selectedManagerReviewTask.status === 'DONE' ? 'Final decision' : 'Decision'}</h3>
                          <p>
                            {selectedManagerReviewTask.status === 'DONE'
                              ? 'This task has already been approved. The submitted evidence remains available for audit.'
                              : selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION'
                                ? 'Review the submitted candidate before approving. Approval creates the Company Profile and completes this task.'
                                : 'Approve to move the task to Done, or reject to return it to staff for correction.'}
                          </p>
                      </div>
                    </div>

                    {selectedManagerReviewTask.taskType === 'COMPANY_DATA_PREPARATION' && selectedManagerReviewTask.status !== 'DONE' ? (
                      <div className={styles.modalActions}>
                        <button
                          className={`${styles.button} ${styles.primaryButton}`}
                          type="button"
                          onClick={() => {
                            const draft = workbench?.candidateDrafts?.find((item) => item.isUnderReview)
                              ?? workbench?.candidateDrafts?.[0];
                            if (draft) void openManagerCandidateReview(draft.candidateId);
                          }}
                          disabled={(workbench?.candidateDrafts?.length ?? 0) === 0}
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

                  <section className={styles.workbenchPanel}>
                    <h3>Review checklist</h3>
                    <div className={styles.workbenchHintList}>
                      <span>Check whether the uploaded file matches the task requirement.</span>
                      <span>Confirm the staff note explains what was completed.</span>
                      <span>For candidate tasks, review candidate data before approving the task.</span>
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
          const identity = selectedCandidate.identity as { legalName?: string; tradeName?: string; taxId?: string; country?: string; registrationNumber?: string } | undefined;
          const business = selectedCandidate.business as { industries?: string[]; businessModel?: string; products?: string[]; services?: string[] } | undefined;
          const insights = selectedCandidate.insights as Record<string, unknown> | undefined;
          const financial = selectedCandidate.financial;
          const risk = selectedCandidate.risk;
          const validation = selectedCandidate.validation as { isComplete?: boolean; dataQualityScore?: string; missingCriticalFields?: string[] | string; warnings?: string[] } | undefined;
          const contact = candidateContact(selectedCandidate);
          const canReview = selectedCandidate.status === 'PENDING_REVIEW' || selectedCandidate.status === 'CORRECTED' || selectedCandidate.status === 'DRAFT';

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
                  <div>
                    <span>Suggested relationship</span>
                    <strong>{selectedCandidate.suggestedRelationshipType || 'Not suggested'}</strong>
                  </div>
                  <div>
                    <span>Confidence score</span>
                    <strong>{selectedCandidate.relationshipConfidenceScore ?? 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Data quality</span>
                    <strong>{candidateCompleteness(selectedCandidate)}</strong>
                  </div>
                </div>

                <div className={styles.candidateDetailGrid}>
                  <section className={styles.candidateDetailSection}>
                    <h3>Identity</h3>
                    <dl>
                      <div><dt>Legal name</dt><dd>{candidateField(identity?.legalName)}</dd></div>
                      <div><dt>Trade name</dt><dd>{candidateField(identity?.tradeName)}</dd></div>
                      <div><dt>Tax ID</dt><dd>{candidateField(identity?.taxId)}</dd></div>
                      <div><dt>Registration</dt><dd>{candidateField(identity?.registrationNumber)}</dd></div>
                      <div><dt>Country</dt><dd>{candidateField(identity?.country)}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.candidateDetailSection}>
                    <h3>Business</h3>
                    <dl>
                      <div><dt>Industry</dt><dd>{candidateIndustry(selectedCandidate)}</dd></div>
                      <div><dt>Business model</dt><dd>{candidateField(business?.businessModel)}</dd></div>
                      <div><dt>Products</dt><dd>{candidateField(business?.products)}</dd></div>
                      <div><dt>Services</dt><dd>{candidateField(business?.services)}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.candidateDetailSection}>
                    <h3>Contact</h3>
                    <dl>
                      <div><dt>Website</dt><dd>{contact.website}</dd></div>
                      <div><dt>Email</dt><dd>{contact.email}</dd></div>
                      <div><dt>Phone</dt><dd>{contact.phone}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.candidateDetailSection}>
                    <h3>Validation</h3>
                    <dl>
                      <div><dt>Complete</dt><dd>{validation?.isComplete ? 'Yes' : 'No'}</dd></div>
                      <div><dt>Missing fields</dt><dd>{candidateField(validation?.missingCriticalFields, 'No missing fields')}</dd></div>
                      <div><dt>Warnings</dt><dd>{candidateField(validation?.warnings, 'No warnings')}</dd></div>
                    </dl>
                  </section>
                </div>

                <div className={styles.candidateInsightGrid}>
                  <CandidateInsightField title="Strengths" data={insights?.strengths} />
                  <CandidateInsightField title="Weaknesses" data={insights?.weaknesses} />
                  <CandidateInsightField title="Opportunities" data={insights?.opportunities} />
                  <CandidateInsightField title="Threats" data={insights?.threats} />
                  <CandidateInfoPanel title="Financial" data={financial} />
                  <CandidateInfoPanel title="Risk analysis" data={risk} />
                </div>

                {canReview && (
                  <div className={styles.managerDecision}>
                    <div>
                      <h3>Manager decision</h3>
                      <p>Approving this candidate will create or update the Company Profile according to the backend workflow.</p>
                    </div>
                    <label className={styles.inviteField}>
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
                    </label>
                    <label className={styles.inviteField}>
                      <span>Reject reason</span>
                      <textarea
                        value={rejectReason}
                        placeholder="Explain why this candidate should not be approved..."
                        onChange={(event) => setRejectReason(event.target.value)}
                      />
                    </label>
                  </div>
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
                  {canReview && (
                    <>
                      <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => void handleRejectCandidate()} disabled={candidateActionLoading}>
                        {candidateActionLoading ? 'Saving...' : 'Reject'}
                      </button>
                      <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void handleApproveCandidate()} disabled={candidateActionLoading}>
                        <CheckCircle2 size={16} />{candidateActionLoading ? 'Approving...' : 'Approve & create profile'}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </section>
  );
};
