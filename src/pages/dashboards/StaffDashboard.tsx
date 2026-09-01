import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileText,
  KanbanSquare,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import type { PageResult, ProjectResponse, ProjectTaskResponse, TaskStatus, TaskType } from '../../types/domain';

interface Props {
  setActivePage?: (page: string) => void;
}

type StaffTaskRow = ProjectTaskResponse & {
  projectName: string;
  projectStatus?: string | null;
};

const statusLabel: Record<TaskStatus, string> = {
  AVAILABLE: 'Available',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'Waiting manager',
  DONE: 'Done',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

const taskTypeLabel: Record<TaskType, string> = {
  DOCUMENT_COLLECTION: 'Document collection',
  COMPANY_DATA_PREPARATION: 'AI company preparation',
  PARTNER_CONTRACT_COLLECTION: 'Partner contract collection',
  ROLE_EVALUATION: 'Role evaluation',
  COMPANY_MEMBER_RESEARCH: 'Company member research',
  COMPANY_NEWS_RESEARCH: 'Company news research',
  FINANCIAL_RESEARCH: 'Financial research',
  GENERAL_TASK: 'General task',
};

const taskTypeHint: Record<TaskType, string> = {
  DOCUMENT_COLLECTION: 'Upload evidence documents, then submit the package.',
  COMPANY_DATA_PREPARATION: 'Select project documents, run AI extract, create candidate, and submit.',
  PARTNER_CONTRACT_COLLECTION: 'Upload partner contracts and submit them for manager approval.',
  ROLE_EVALUATION: 'Evaluate relationship, risk, evidence, and recommendation.',
  COMPANY_MEMBER_RESEARCH: 'Research key people and attach verified source URLs.',
  COMPANY_NEWS_RESEARCH: 'Research and attach recent news about the target company.',
  FINANCIAL_RESEARCH: 'Select financial source documents, run AI extraction, verify metrics, and submit.',
  GENERAL_TASK: 'Complete the assigned request and submit a clear result note.',
};

const dueLabel = (value?: string | null) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date);
};

const isOverdue = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < new Date().setHours(0, 0, 0, 0);
};

const statusClass = (status: TaskStatus) => {
  if (status === 'DONE') return 'success';
  if (status === 'IN_REVIEW') return 'warning';
  if (status === 'IN_PROGRESS') return 'info';
  return 'neutral';
};

export const StaffDashboard: React.FC<Props> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [tasks, setTasks] = useState<StaffTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaffWorkspace = async (signal?: AbortSignal, options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    setError(null);

    try {
      const projectRes = await api.get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 50 },
        signal,
      });

      const projectRows = projectRes.data?.content ?? [];
      if (signal?.aborted) return;

      setProjects(projectRows);

      const taskResults = await Promise.allSettled(
        projectRows.map(async (project) => {
          const taskRes = await api.get<PageResult<ProjectTaskResponse>>(`/projects/${project.id}/tasks`, {
            params: { page: 0, size: 100 },
            signal,
          });

          return (taskRes.data?.content ?? []).map((task) => ({
            ...task,
            projectName: project.projectName,
            projectStatus: project.status,
          }));
        })
      );

      if (signal?.aborted) return;

      const assignedTasks = taskResults.flatMap((result) => (
        result.status === 'fulfilled' ? result.value : []
      ));
      setTasks(assignedTasks);
    } catch (err) {
      if (!signal?.aborted) {
        setProjects([]);
        setTasks([]);
        setError(err instanceof Error ? err.message : 'Cannot load your staff workspace.');
      }
    } finally {
      if (!signal?.aborted && !options.silent) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadStaffWorkspace(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const refreshSilently = () => {
      const controller = new AbortController();
      void loadStaffWorkspace(controller.signal, { silent: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshSilently();
    };

    const interval = window.setInterval(refreshSilently, 8000);
    window.addEventListener('focus', refreshSilently);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSilently);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const stats = useMemo(() => {
    const active = tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS').length;
    const review = tasks.filter((task) => task.status === 'IN_REVIEW').length;
    const done = tasks.filter((task) => task.status === 'DONE').length;
    const overdue = tasks.filter((task) => task.status !== 'DONE' && isOverdue(task.dueDate)).length;

    return [
      { label: 'My projects', value: projects.length, note: 'Projects you joined', icon: BriefcaseBusiness },
      { label: 'Active tasks', value: active, note: 'To do and in progress', icon: KanbanSquare },
      { label: 'Waiting review', value: review, note: 'Submitted to manager', icon: Clock },
      { label: 'Completed', value: done, note: 'Approved work', icon: CheckCircle2 },
      { label: 'Overdue', value: overdue, note: 'Needs attention', icon: AlertCircle },
    ];
  }, [projects.length, tasks]);

  const sortedTasks = useMemo(() => {
    const weight: Record<TaskStatus, number> = {
      IN_PROGRESS: 0,
      AVAILABLE: 1,
      TODO: 2,
      IN_REVIEW: 3,
      DONE: 4,
      BLOCKED: 5,
      CANCELLED: 6,
    };

    return [...tasks].sort((a, b) => {
      const statusDiff = weight[a.status] - weight[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.dueDate || '2999-12-31').getTime() - new Date(b.dueDate || '2999-12-31').getTime();
    });
  }, [tasks]);

  const nextTask = sortedTasks.find((task) => task.status === 'IN_PROGRESS')
    ?? sortedTasks.find((task) => task.status === 'TODO')
    ?? sortedTasks[0];

  const openProject = (projectId: number, taskId?: number) => {
    const project = projects.find((item) => item.id === projectId);
    localStorage.setItem('apms-active-project', String(projectId));
    if (project) sessionStorage.setItem('apms-selected-project', JSON.stringify(project));
    if (taskId) sessionStorage.setItem('apms-open-task-id', String(taskId));
    setActivePage?.('project-detail');
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-staff staff-workspace-page" id="page-staff-dashboard">
      <div className="workspace-main-full">
        <div className="workspace-page-head staff-dashboard-head">
          <div>
            <div className="workspace-breadcrumbs">Execution <span>/</span> Staff workspace</div>
            <span className="workspace-side-eyebrow">My assigned work</span>
            <h1>Staff Dashboard</h1>
            {/* <p>
              {loading
                ? 'Loading your projects and assigned tasks from APMS.'
                : `${currentUser?.name || 'Staff'}, you have ${tasks.filter((task) => task.status !== 'DONE').length} open task(s) across ${projects.length} project(s).`}
            </p> */}
          </div>
          <div className="workspace-head-actions">
            {/* <button className="btn btn-outline" onClick={() => void loadStaffWorkspace()} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Refresh
            </button> */}
            {/* <button className="btn btn-primary" onClick={() => nextTask && openProject(nextTask.projectId, nextTask.id)} disabled={!nextTask}>
              Continue work <ArrowRight size={16} />
            </button> */}
          </div>
        </div>

        {error && <div className="workspace-inline-error">{error}</div>}

        <div className="workspace-stats staff-task-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="workspace-stat-card">
                <Icon size={20} />
                <span className="workspace-stat-label">{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.note}</p>
              </article>
            );
          })}
        </div>

        <div className="staff-dashboard-grid">
          <main className="workspace-panel staff-task-panel">
            <div className="workspace-section-head">
              <div>
                <h3>My task queue</h3>
                <p>Only tasks assigned to your staff account are shown here.</p>
              </div>
              <button className="workspace-link-btn" onClick={() => nextTask && openProject(nextTask.projectId)} disabled={!nextTask}>
                Open board
              </button>
            </div>

            {loading && <div className="workspace-empty">Loading assigned tasks...</div>}
            {!loading && sortedTasks.length === 0 && (
              <div className="workspace-empty">No assigned tasks yet. When your manager assigns work, it will appear here.</div>
            )}

            <div className="staff-task-list">
              {sortedTasks.slice(0, 8).map((task) => (
                <article key={task.id} className={`staff-task-card ${task.status === 'DONE' ? 'done' : ''}`}>
                  <div className="staff-task-icon">
                    {task.taskType === 'COMPANY_DATA_PREPARATION' ? <Sparkles size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="staff-task-body">
                    <div className="staff-task-title">
                      <strong>{task.title}</strong>
                      <span className={`workspace-badge ${statusClass(task.status)}`}>{statusLabel[task.status]}</span>
                    </div>
                    <p>{taskTypeHint[task.taskType]}</p>
                    <div className="staff-task-meta">
                      <span>{task.projectName}</span>
                      <span>{taskTypeLabel[task.taskType]}</span>
                      <span className={isOverdue(task.dueDate) && task.status !== 'DONE' ? 'danger-text' : ''}>
                        {dueLabel(task.dueDate)}
                      </span>
                      <span>{task.priority}</span>
                    </div>
                  </div>
                  <button className="workspace-icon-btn" onClick={() => openProject(task.projectId, task.id)}>
                    Open
                  </button>
                </article>
              ))}
            </div>
          </main>

          <aside className="staff-side-stack">
            <section className="workspace-side-card">
              <span className="workspace-side-eyebrow">Next best action</span>
              {nextTask ? (
                <div className="staff-next-task">
                  <span className={`workspace-badge ${statusClass(nextTask.status)}`}>{statusLabel[nextTask.status]}</span>
                  <h3>{nextTask.title}</h3>
                  <p>{taskTypeHint[nextTask.taskType]}</p>
                  <div className="staff-task-meta compact">
                    <span>{nextTask.projectName}</span>
                    <span>{dueLabel(nextTask.dueDate)}</span>
                  </div>
                  <button className="btn btn-primary" onClick={() => openProject(nextTask.projectId, nextTask.id)}>
                    Start from here
                  </button>
                </div>
              ) : (
                <div className="workspace-empty">Your queue is clear.</div>
              )}
            </section>

            <section className="workspace-side-card">
              <span className="workspace-side-eyebrow">My projects</span>
              <div className="staff-project-list">
                {projects.slice(0, 6).map((project) => {
                  const openTasks = tasks.filter((task) => task.projectId === project.id && task.status !== 'DONE').length;
                  return (
                    <button key={project.id} type="button" onClick={() => openProject(project.id)}>
                      <strong>{project.projectName}</strong>
                      <span>{openTasks} open task(s)</span>
                    </button>
                  );
                })}
                {!loading && projects.length === 0 && <div className="workspace-empty">No joined projects yet.</div>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
};
