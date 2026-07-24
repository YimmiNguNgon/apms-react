import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Sparkles,
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
import type {
  CandidateResponse,
  CandidateStatus,
  CreateProjectTaskRequest,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus as ApiProjectStatus,
  ProjectType as ApiProjectType,
  ProjectTaskResponse,
  RelationshipType,
  TaskPriority as ApiTaskPriority,
  TaskStatus as ApiTaskStatus,
  TaskType,
  UserSearchResponse,
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

const columnToStatus: Record<TaskStatus, ApiTaskStatus> = {
  todo: 'TODO',
  progress: 'IN_PROGRESS',
  review: 'IN_REVIEW',
  done: 'DONE',
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

const TaskCard: React.FC<{ task: ProjectTask; onOpen: (task: ProjectTask) => void; onDragStart: (taskId: string) => void }> = ({
  task,
  onOpen,
  onDragStart,
}) => (
  <motion.article
    layout
    className={styles.taskCard}
    draggable
    onDragStart={() => onDragStart(task.id)}
    onClick={() => onOpen(task)}
    whileHover={{ y: -3 }}
    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
  >
    <div className={styles.taskTop}>
      <span className={styles.taskKey}>{task.id}</span>
      {task.aiGenerated && (
        <span className={styles.aiDot} title="AI generated task">
          <Bot size={15} />
        </span>
      )}
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

export const ProjectDetailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Kanban Board');
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [apiTasks, setApiTasks] = useState<ProjectTaskResponse[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [apiProject, setApiProject] = useState<ProjectResponse | null>(() => readSelectedProjectSnapshot());
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
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

    taskApi.getProjectTasks(currentProjectId)
      .then((payload) => {
        if (cancelled) return;
        const rows = unwrapList<ProjectTaskResponse>(payload);
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
  }, [currentProjectId]);

  useEffect(() => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) return;

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
  }, [currentProjectId]);

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

  const metrics = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'done').length;
    return {
      completed,
      remaining: tasks.length - completed,
      deadlines: [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 3),
    };
  }, [tasks]);

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

  const moveTask = (status: TaskStatus) => {
    if (!draggingTaskId) return;
    const taskId = Number(draggingTaskId.replace('APMS-', ''));
    const previousTasks = tasks;

    setTasks((current) => current.map((task) => (task.id === draggingTaskId ? { ...task, status } : task)));
    setDraggingTaskId(null);
    setOverColumn(null);

    if (!Number.isFinite(currentProjectId) || !Number.isFinite(taskId)) return;

    taskApi.updateTaskStatus(currentProjectId, taskId, columnToStatus[status])
      .then((payload) => {
        const updatedTask = payload?.data;
        if (updatedTask) {
          setApiTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        }
      })
      .catch((error) => {
        setTasks(previousTasks);
        setTaskError(error instanceof Error ? error.message : 'Cannot update task status.');
      });
  };

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

  const handleInviteMember = async () => {
    if (!Number.isFinite(currentProjectId) || currentProjectId <= 0) {
      setInviteError('Cannot find selected project id.');
      return;
    }

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
    } catch (error) {
      setCreateTaskError(error instanceof Error ? error.message : 'Cannot create task.');
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const openCandidateDetail = async (candidate: CandidateResponse) => {
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
    setCandidates((current) => current.map((item) => (item.id === candidate.id ? candidate : item)));
    setSelectedCandidate(candidate);
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
      setCandidateActionMessage('Candidate approved successfully.');
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
      setCandidateActionMessage('Candidate rejected.');
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : 'Cannot reject candidate.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <main className={styles.main}>
          <motion.header className={styles.header} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.breadcrumb}>
              Projects <ChevronRight size={14} /> {displayedProject.key}
            </div>
            {projectError && <div className={styles.inlineError}>{projectError}</div>}
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
                <button className={styles.button} type="button"><Edit3 size={16} />Edit Project</button>
                <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => setShowInviteModal(true)}>
                  <UserPlus size={16} />Invite Member
                </button>
                <button className={styles.iconButton} type="button" aria-label="More actions"><MoreHorizontal size={18} /></button>
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
            {tabs.map((tab) => (
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
              {taskError && <div className={styles.inlineError}>{taskError}</div>}
              <div className={styles.board}>
                {columns.map((column) => {
                  const columnTasks = tasks.filter((task) => task.status === column.id);
                  return (
                    <motion.section
                      layout
                      key={column.id}
                      className={`${styles.column} ${overColumn === column.id ? styles.columnOver : ''}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setOverColumn(column.id);
                      }}
                      onDragLeave={() => setOverColumn(null)}
                      onDrop={() => moveTask(column.id)}
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
                            <TaskCard key={task.id} task={task} onOpen={setSelectedTask} onDragStart={setDraggingTaskId} />
                          ))}
                        </AnimatePresence>
                        {columnTasks.length === 0 && <div className={styles.empty}>{tasksLoading ? 'Loading tasks...' : 'Drop tasks here'}</div>}
                        {column.id === 'todo' && (
                          <button className={styles.columnCreateButton} type="button" onClick={() => setShowCreateTaskModal(true)}>
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

              {candidateError && <div className={styles.inlineError}>{candidateError}</div>}
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
                <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => setShowInviteModal(true)}>
                  <UserPlus size={16} />Invite Member
                </button>
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
        {selectedCandidate && (() => {
          const identity = selectedCandidate.identity as { legalName?: string; tradeName?: string; taxId?: string; country?: string; registrationNumber?: string } | undefined;
          const business = selectedCandidate.business as { industries?: string[]; businessModel?: string; products?: string[]; services?: string[] } | undefined;
          const insights = selectedCandidate.insights;
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
                  <section>
                    <h3>AI insights</h3>
                    <pre>{candidateField(insights)}</pre>
                  </section>
                  <section>
                    <h3>Financial</h3>
                    <pre>{candidateField(financial)}</pre>
                  </section>
                  <section>
                    <h3>Risk analysis</h3>
                    <pre>{candidateField(risk)}</pre>
                  </section>
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
                  <button className={styles.button} type="button" onClick={() => setSelectedCandidate(null)}>Close</button>
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
