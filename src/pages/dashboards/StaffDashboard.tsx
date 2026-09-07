import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
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
  IN_REVIEW: 'Waiting review',
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

const priorityTone = (priority?: string): 'danger' | 'warning' | 'neutral' => {
  if (priority === 'HIGH') return 'danger';
  if (priority === 'MEDIUM') return 'warning';
  return 'neutral';
};

const statusClass = (status: TaskStatus): 'success' | 'warning' | 'info' | 'neutral' | 'danger' => {
  if (status === 'DONE') return 'success';
  if (status === 'IN_REVIEW') return 'warning';
  if (status === 'IN_PROGRESS') return 'info';
  if (status === 'BLOCKED') return 'danger';
  return 'neutral';
};

export const StaffDashboard: React.FC<Props> = ({ setActivePage }) => {
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

  const activeTasksCount = useMemo(
    () => tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS').length,
    [tasks]
  );
  const waitingReviewCount = useMemo(
    () => tasks.filter((task) => task.status === 'IN_REVIEW').length,
    [tasks]
  );
  const completedTasksCount = useMemo(
    () => tasks.filter((task) => task.status === 'DONE').length,
    [tasks]
  );
  const overdueTasksCount = useMemo(
    () => tasks.filter((task) => task.status !== 'DONE' && isOverdue(task.dueDate)).length,
    [tasks]
  );

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
    <section className="workspace-page role-dashboard role-dashboard-staff staff-page project-page staff-dashboard-page" id="page-staff-dashboard">
      <div className="workspace-main-full">
        {/* Page Header */}
        <div className="workspace-page-head">
          <div>
            <h1>Staff Dashboard</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Overview of your assigned projects, active tasks, and recent progress
            </p>
          </div>
          <div className="workspace-head-actions">
            <button type="button" className="btn btn-outline" onClick={() => setActivePage?.('my-tasks')}>
              My Tasks
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setActivePage?.('project-management')}>
              Projects
            </button>
          </div>
        </div>

        {error && <div className="workspace-inline-error">{error}</div>}

        {/* Focus Metrics (5 compact cards) */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics staff-focus-metrics">
            <article>
              <strong>{loading ? '...' : projects.length}</strong>
              <span>My Projects</span>
            </article>
            <article>
              <strong>{loading ? '...' : activeTasksCount}</strong>
              <span>Active Tasks</span>
            </article>
            <article>
              <strong>{loading ? '...' : waitingReviewCount}</strong>
              <span>Waiting Review</span>
            </article>
            <article>
              <strong>{loading ? '...' : completedTasksCount}</strong>
              <span>Completed</span>
            </article>
            <article>
              <strong>{loading ? '...' : overdueTasksCount}</strong>
              <span>Overdue</span>
            </article>
          </div>
        </div>

        {/* Lower Section: 2 Columns */}
        <div className="dashboard-grid cols-main-side role-board-grid staff-dashboard-lower">
          {/* Left: My Task Queue */}
          <div className="workspace-panel staff-task-panel">
            <div className="workspace-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>My Task Queue</h3>
                <p>Tasks currently assigned to you across all projects</p>
              </div>
              {nextTask && (
                <button
                  type="button"
                  className="project-detail-btn"
                  onClick={() => openProject(nextTask.projectId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  Open board <ArrowRight size={12} />
                </button>
              )}
            </div>

            {loading && (
              <div className="project-table-empty">
                <p className="project-table-empty-title">Loading assigned tasks...</p>
              </div>
            )}

            {!loading && sortedTasks.length === 0 && (
              <div className="project-table-empty">
                <p className="project-table-empty-title">No assigned tasks yet</p>
                <p className="project-table-empty-desc">When your manager assigns work, it will appear here.</p>
              </div>
            )}

            {!loading && sortedTasks.length > 0 && (
              <div className="staff-task-queue-list">
                {sortedTasks.slice(0, 10).map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'DONE';
                  return (
                    <article key={task.id} className={`staff-task-row ${task.status === 'DONE' ? 'done' : ''}`}>
                      <div className="staff-task-row-main">
                        <div className="staff-task-row-header">
                          <span className="staff-task-row-title">{task.title}</span>
                          <div className="staff-task-row-badges">
                            <span className={`project-status-badge ${statusClass(task.status)}`}>
                              {statusLabel[task.status]}
                            </span>
                            <span className={`project-status-badge ${priorityTone(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <p className="staff-task-row-desc">
                          {task.description || taskTypeHint[task.taskType]}
                        </p>

                        <div className="staff-task-row-meta">
                          <span className="staff-task-meta-item">
                            <BriefcaseBusiness size={12} /> {task.projectName}
                          </span>
                          <span className="staff-task-meta-item">
                            <FileText size={12} /> {taskTypeLabel[task.taskType]}
                          </span>
                          <span className={`staff-task-meta-item ${overdue ? 'overdue' : ''}`}>
                            <Clock size={12} /> {dueLabel(task.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="staff-task-row-action">
                        <button
                          type="button"
                          className="project-detail-btn"
                          onClick={() => openProject(task.projectId, task.id)}
                        >
                          Open
                        </button>
                      </div>
                    </article>
                  );
                })}

                {sortedTasks.length > 10 && (
                  <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActivePage?.('my-tasks')}
                      style={{ fontSize: '0.82rem', color: 'var(--role-accent, #2563eb)' }}
                    >
                      View all tasks ({sortedTasks.length}) →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Next Best Action & My Projects */}
          <aside className="workspace-sidebar staff-side-stack">
            {/* Next Best Action Card */}
            <div className="workspace-side-card staff-next-action-card">
              <div className="workspace-section-head">
                <div>
                  <h3>Next Best Action</h3>
                  <p>Recommended priority work item</p>
                </div>
              </div>

              {nextTask ? (
                <div className="staff-recommendation-box">
                  <div className="staff-recommendation-context">
                    <span className="staff-context-pill">
                      {nextTask.status === 'IN_PROGRESS'
                        ? 'Active task in progress'
                        : isOverdue(nextTask.dueDate)
                        ? 'Overdue priority task'
                        : 'Next up in queue'}
                    </span>
                    <div className="staff-recommendation-badges">
                      <span className={`project-status-badge ${statusClass(nextTask.status)}`}>
                        {statusLabel[nextTask.status]}
                      </span>
                      <span className={`project-status-badge ${priorityTone(nextTask.priority)}`}>
                        {nextTask.priority}
                      </span>
                    </div>
                  </div>

                  <h4 className="staff-recommendation-title">{nextTask.title}</h4>
                  <p className="staff-recommendation-desc">
                    {nextTask.description || taskTypeHint[nextTask.taskType]}
                  </p>

                  <div className="staff-recommendation-meta">
                    <span className="staff-meta-chip">
                      <BriefcaseBusiness size={12} /> {nextTask.projectName}
                    </span>
                    <span className={`staff-meta-chip ${isOverdue(nextTask.dueDate) && nextTask.status !== 'DONE' ? 'overdue' : ''}`}>
                      <Clock size={12} /> {dueLabel(nextTask.dueDate)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="project-detail-btn primary staff-recommendation-btn"
                    onClick={() => openProject(nextTask.projectId, nextTask.id)}
                  >
                    Open task <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              ) : (
                <div className="project-table-empty" style={{ padding: '24px 16px' }}>
                  <p className="project-table-empty-title">Your queue is clear</p>
                  <p className="project-table-empty-desc">No actionable tasks pending right now.</p>
                </div>
              )}
            </div>

            {/* My Projects Card */}
            <div className="workspace-side-card staff-projects-card">
              <div className="workspace-section-head">
                <div>
                  <h3>My Projects</h3>
                  <p>Projects you are participating in</p>
                </div>
              </div>

              {loading && (
                <div className="project-table-empty" style={{ padding: '20px 16px' }}>
                  <p className="project-table-empty-title">Loading projects...</p>
                </div>
              )}

              {!loading && projects.length === 0 && (
                <div className="project-table-empty" style={{ padding: '20px 16px' }}>
                  <p className="project-table-empty-title">No joined projects yet</p>
                  <p className="project-table-empty-desc">Projects assigned to you will appear here.</p>
                </div>
              )}

              {!loading && projects.length > 0 && (
                <div className="staff-projects-list">
                  {projects.slice(0, 5).map((project) => {
                    const openTasks = tasks.filter(
                      (task) => task.projectId === project.id && task.status !== 'DONE'
                    ).length;
                    return (
                      <div key={project.id} className="staff-project-item">
                        <div className="staff-project-item-header">
                          <strong className="staff-project-name" title={project.projectName}>
                            {project.projectName}
                          </strong>
                          <button
                            type="button"
                            className="project-detail-btn"
                            onClick={() => openProject(project.id)}
                            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          >
                            View
                          </button>
                        </div>
                        <div className="staff-project-item-meta">
                          <span className="staff-project-task-count">
                            {openTasks} open task{openTasks === 1 ? '' : 's'}
                          </span>
                          <span className="staff-project-progress">
                            {project.progressPercentage ?? 0}% completed
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {projects.length > 5 && (
                    <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setActivePage?.('project-management')}
                        style={{ fontSize: '0.78rem', color: 'var(--role-accent, #2563eb)' }}
                      >
                        View all projects ({projects.length}) →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
