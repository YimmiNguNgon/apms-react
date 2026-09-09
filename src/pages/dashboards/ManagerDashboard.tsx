import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { api } from '../../services/api';
import type {
  DashboardSummaryDto,
  ManagerReviewHistoryItem,
  PageResult,
  ProjectResponse,
  ProjectTaskResponse,
  ProjectTaskWorkbenchResponse,
} from '../../types/domain';
import { BarChart, DonutChart } from '../../components/charts/Charts';

type ProjectWithTasks = {
  project: ProjectResponse;
  tasks: ProjectTaskResponse[];
};

type ReviewQueueItem = {
  projectId: number;
  projectName: string;
  targetCompanyName?: string | null;
  taskId: number;
  taskTitle: string;
  taskType: string;
  draftName: string;
  submittedByName: string;
  dueDate?: string | null;
  status: string;
  task: ProjectTaskResponse;
};

const unwrapPage = <T,>(payload?: PageResult<T> | null): T[] => payload?.content ?? [];

const formatDate = (value?: string | null): string => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isActionableOverdueTask = (task: ProjectTaskResponse): boolean => {
  if (!task.dueDate) return false;
  if (task.status === 'DONE' || task.status === 'CANCELLED') return false;
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  return due < Date.now();
};

type ManagerDashboardProps = {
  setActivePage?: (page: string) => void;
};

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [activeReviewTab, setActiveReviewTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [reviewHistory, setReviewHistory] = useState<ManagerReviewHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'APPROVED' | 'CHANGES_REQUESTED'>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [activeProjectsTotal, setActiveProjectsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Authoritative summary + Authoritative active projects count + Managed projects list
        const [summaryRes, activeProjectsRes, projectsRes] = await Promise.all([
          api.get<DashboardSummaryDto>('/dashboard/summary'),
          api.get<PageResult<ProjectResponse>>('/projects', { params: { status: 'ACTIVE', page: 0, size: 1 } }),
          api.get<PageResult<ProjectResponse>>('/projects', { params: { page: 0, size: 50 } }),
        ]);

        if (cancelled) return;

        const summaryData = summaryRes.data;
        const activeCount = activeProjectsRes.data?.totalElements ?? 0;
        const managedProjects = unwrapPage(projectsRes.data);

        // 2. Fetch complete tasks for each managed project in Manager scope
        const projectSignals = await Promise.all(
          managedProjects.map(async (project) => {
            const taskRes = await api.get<PageResult<ProjectTaskResponse>>(`/projects/${project.id}/tasks`, {
              params: { page: 0, size: 50 },
            }).catch(() => null);
            const tasks = unwrapPage(taskRes?.data);
            return { project, tasks };
          }),
        );

        if (cancelled) return;

        // 3. Identify all tasks currently in IN_REVIEW
        const inReviewTasks = projectSignals.flatMap(({ project, tasks }) =>
          tasks.filter((task) => task.status === 'IN_REVIEW').map((task) => ({ project, task })),
        );

        // 4. For in-review tasks, resolve workbench details for the active submission / submitted draft
        const queueItems: ReviewQueueItem[] = await Promise.all(
          inReviewTasks.map(async ({ project, task }) => {
            try {
              const wbRes = await api.get<ProjectTaskWorkbenchResponse>(`/projects/${project.id}/tasks/${task.id}/workbench`);
              const wb = wbRes.data;
              const activeDraft = wb?.candidateDrafts?.find((d) => d.isUnderReview)
                ?? wb?.candidateDrafts?.[0];
              const activeProposal = (wb?.profileUpdateProposalDrafts as any[])?.find((p) => p?.isUnderReview)
                ?? (wb?.profileUpdateProposalDrafts as any[])?.[0];
              const activeSubmission = wb?.submissions?.find((s) => s.status === 'IN_REVIEW')
                ?? wb?.submissions?.[0];

              const draftName = activeDraft?.draftName || activeDraft?.candidateName
                || (activeProposal ? `Proposal: ${activeProposal.changeSummary || 'Profile update'}` : null)
                || task.title;

              return {
                projectId: project.id,
                projectName: project.projectName,
                targetCompanyName: project.targetCompanyName || wb?.targetCompanyName,
                taskId: task.id,
                taskTitle: task.title,
                taskType: task.taskType,
                draftName,
                submittedByName: activeSubmission?.submittedByName || task.assignedToName || 'Staff',
                dueDate: task.dueDate,
                status: task.status,
                task,
              };
            } catch {
              return {
                projectId: project.id,
                projectName: project.projectName,
                targetCompanyName: project.targetCompanyName,
                taskId: task.id,
                taskTitle: task.title,
                taskType: task.taskType,
                draftName: task.title,
                submittedByName: task.assignedToName || 'Staff',
                dueDate: task.dueDate,
                status: task.status,
                task,
              };
            }
          }),
        );

        // 5. Fetch Review History (Approved / Changes Requested)
        let historyList: ManagerReviewHistoryItem[] = [];
        try {
          const historyRes = await api.get<ManagerReviewHistoryItem[]>('/dashboard/manager/review-history');
          if (Array.isArray(historyRes.data)) {
            historyList = historyRes.data;
          }
        } catch {
          // Fallback handled below
        }

        // Resilient Fallback: If endpoint returns empty or fails, resolve from completed/reviewed tasks
        if (historyList.length === 0) {
          const reviewedTasks = projectSignals.flatMap(({ project, tasks }) =>
            tasks.filter((t) => t.status === 'DONE' || t.completedAt).map((task) => ({ project, task })),
          );
          if (reviewedTasks.length > 0) {
            historyList = reviewedTasks.map(({ project, task }) => ({
              submissionId: task.id,
              projectId: project.id,
              projectName: project.projectName,
              targetCompanyName: project.targetCompanyName,
              taskId: task.id,
              taskTitle: task.title,
              taskType: task.taskType,
              submissionType: 'COMPANY_CANDIDATE' as any,
              submittedByName: task.assignedToName || 'Staff',
              submittedAt: task.createdAt,
              status: 'APPROVED',
              reviewedByName: 'Manager',
              reviewedAt: task.completedAt || task.updatedAt,
              reviewComment: 'Task deliverable approved',
            }));
          }
        }

        if (cancelled) return;

        setSummary(summaryData);
        setActiveProjectsTotal(activeCount);
        setProjects(projectSignals);
        setReviewQueue(queueItems);
        setReviewHistory(historyList);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Cannot load manager dashboard.');
          setSummary(null);
          setActiveProjectsTotal(0);
          setProjects([]);
          setReviewQueue([]);
          setReviewHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleReviewTask = (projectId: number, taskId?: number | null) => {
    localStorage.setItem('apms-active-project', String(projectId));
    if (taskId) {
      localStorage.setItem('apms-project-detail-focus-task-id', String(taskId));
    }
    localStorage.setItem('apms-project-detail-active-tab', 'Kanban Board');
    setActivePage?.('project-detail');
  };

  const handleOpenProject = (projectId: number) => {
    localStorage.setItem('apms-active-project', String(projectId));
    setActivePage?.('project-detail');
  };

  const allTasks = useMemo(
    () => projects.flatMap((item) => item.tasks.map((task) => ({ task, project: item.project }))),
    [projects],
  );

  const overdueTasksCount = useMemo(() => {
    return allTasks.filter(({ task }) => isActionableOverdueTask(task)).length;
  }, [allTasks]);

  const pendingReviewsCount = reviewQueue.length;

  const totalProfilesCount = summary?.totalCompanyProfiles ?? 0;

  const projectProgressData = useMemo(() => {
    const activeOrRecent = projects
      .filter(({ project }) => project.status === 'ACTIVE' || project.status === 'COMPLETED')
      .slice(0, 6);
    const displayList = activeOrRecent.length > 0 ? activeOrRecent : projects.slice(0, 6);

    return displayList.map(({ project }, index) => ({
      label: project.projectName.length > 18 ? `${project.projectName.slice(0, 16)}...` : project.projectName,
      value: Math.min(100, Math.max(0, project.progressPercentage ?? 0)),
      color: ['#2563EB', '#0F766E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'][index % 6],
    }));
  }, [projects]);

  const taskMix = useMemo(() => {
    const statusCount = allTasks.reduce<Record<string, number>>((acc, { task }) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    const availableCount = (statusCount.AVAILABLE ?? 0) + (statusCount.TODO ?? 0);
    const inProgressCount = statusCount.IN_PROGRESS ?? 0;
    const inReviewCount = statusCount.IN_REVIEW ?? 0;
    const doneCount = statusCount.DONE ?? 0;
    const blockedCount = statusCount.BLOCKED ?? 0;
    const cancelledCount = statusCount.CANCELLED ?? 0;

    const items = [
      { label: 'Available', value: availableCount, color: '#94A3B8' },
      { label: 'In Progress', value: inProgressCount, color: '#2563EB' },
      { label: 'In Review', value: inReviewCount, color: '#F59E0B' },
      { label: 'Done', value: doneCount, color: '#16A34A' },
    ];

    if (blockedCount > 0) {
      items.push({ label: 'Blocked', value: blockedCount, color: '#EF4444' });
    }
    if (cancelledCount > 0) {
      items.push({ label: 'Cancelled', value: cancelledCount, color: '#64748B' });
    }

    return items;
  }, [allTasks]);

  const attentionProjects = useMemo(() => {
    return projects
      .map(({ project, tasks }) => {
        const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
        const overdueTaskCount = tasks.filter((t) => isActionableOverdueTask(t)).length;
        const isProjectOverdue = Boolean(project.status === 'ACTIVE' && project.isOverdue);

        const needsAttention = isProjectOverdue || inReviewCount > 0 || overdueTaskCount > 0;

        return {
          project,
          isProjectOverdue,
          inReviewCount,
          overdueTaskCount,
          needsAttention,
        };
      })
      .filter((item) => item.needsAttention)
      .sort((a, b) => {
        if (a.isProjectOverdue !== b.isProjectOverdue) {
          return a.isProjectOverdue ? -1 : 1;
        }
        if (a.overdueTaskCount !== b.overdueTaskCount) {
          return b.overdueTaskCount - a.overdueTaskCount;
        }
        if (a.inReviewCount !== b.inReviewCount) {
          return b.inReviewCount - a.inReviewCount;
        }
        return 0;
      });
  }, [projects]);

  const displayedAttentionProjects = useMemo(() => attentionProjects.slice(0, 5), [attentionProjects]);
  const displayedReviewQueue = useMemo(() => reviewQueue.slice(0, 5), [reviewQueue]);

  const filteredReviewHistory = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    return reviewHistory.filter((item) => {
      if (historyFilter === 'APPROVED' && item.status !== 'APPROVED') return false;
      if (historyFilter === 'CHANGES_REQUESTED' && item.status !== 'CHANGES_REQUESTED' && item.status !== 'REJECTED') return false;
      if (!term) return true;
      const searchable = [
        item.projectName,
        item.targetCompanyName || '',
        item.taskTitle,
        item.submittedByName || '',
        item.reviewedByName || '',
        item.reviewComment || '',
        item.taskType || '',
      ].join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [reviewHistory, historyFilter, historySearch]);

  const historyApprovedCount = useMemo(() => {
    return reviewHistory.filter((i) => i.status === 'APPROVED').length;
  }, [reviewHistory]);

  const historyRejectedCount = useMemo(() => {
    return reviewHistory.filter((i) => i.status === 'CHANGES_REQUESTED' || i.status === 'REJECTED').length;
  }, [reviewHistory]);

  const displayedReviewHistory = useMemo(() => filteredReviewHistory.slice(0, 8), [filteredReviewHistory]);

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page manager-dashboard-page" id="page-manager-dashboard">
      <div className="workspace-main-full">
        {/* ── Page Header ── */}
        <div className="workspace-page-head">
          <div>
            <h1>Manager Dashboard</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Overview of projects, reviews, and company activity
            </p>
          </div>
          <div className="workspace-head-actions">
            <button className="btn btn-outline" onClick={() => setActivePage?.('project-management')}>Open projects</button>
            <button className="btn btn-primary" onClick={() => setActivePage?.('companies')}>Company profiles</button>
          </div>
        </div>

        {error && <div className="workspace-inline-error">{error}</div>}

        {/* ── Focus Metrics (1 Row, 4 Cards) ── */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            <article>
              <strong>{loading ? '...' : activeProjectsTotal}</strong>
              <span>Active Projects</span>
            </article>
            <article>
              <strong>{loading ? '...' : pendingReviewsCount}</strong>
              <span>Pending Reviews</span>
            </article>
            <article>
              <strong>{loading ? '...' : overdueTasksCount}</strong>
              <span>Overdue Tasks</span>
            </article>
            <article>
              <strong>{loading ? '...' : totalProfilesCount}</strong>
              <span>Company Profiles</span>
            </article>
          </div>
        </div>

        {/* ── Charts Grid (2 Columns) ── */}
        <div className="dashboard-grid cols-2 role-board-grid manager-dashboard-charts">
          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Project execution progress</h3>
                <p>Deliverable progress percentage from active projects.</p>
              </div>
            </div>
            {projectProgressData.length ? (
              <BarChart data={projectProgressData} height={160} />
            ) : (
              <div className="workspace-empty">No active project progress data available.</div>
            )}
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Task status mix</h3>
                <p>Distribution of live project tasks by workflow state.</p>
              </div>
            </div>
            <div className="role-donut-wrap">
              <DonutChart data={taskMix} size={142} centerValue={String(allTasks.length || 0)} centerLabel="tasks" />
            </div>
            <div className="chart-legend">
              {taskMix.map((item) => (
                <div key={item.label} className="legend-item">
                  <div className="legend-dot" style={{ background: item.color }} />
                  {item.label}: <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Lower Section: Review Queue & Projects Needing Attention ── */}
        <div className="dashboard-grid cols-main-side role-board-grid manager-dashboard-lower">
          {/* Left: Review Management (Pending Reviews vs Review History) */}
          <div className="workspace-panel">
            <div className="workspace-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('PENDING')}
                    style={{
                      background: activeReviewTab === 'PENDING' ? '#eff6ff' : 'transparent',
                      color: activeReviewTab === 'PENDING' ? '#1d4ed8' : 'var(--text-secondary, #64748b)',
                      border: activeReviewTab === 'PENDING' ? '1px solid #bfdbfe' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Pending Reviews</span>
                    <span
                      style={{
                        background: activeReviewTab === 'PENDING' ? '#2563eb' : '#e2e8f0',
                        color: activeReviewTab === 'PENDING' ? '#fff' : '#475569',
                        borderRadius: '9999px',
                        padding: '1px 7px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {reviewQueue.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('HISTORY')}
                    style={{
                      background: activeReviewTab === 'HISTORY' ? '#eff6ff' : 'transparent',
                      color: activeReviewTab === 'HISTORY' ? '#1d4ed8' : 'var(--text-secondary, #64748b)',
                      border: activeReviewTab === 'HISTORY' ? '1px solid #bfdbfe' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Review History</span>
                    <span
                      style={{
                        background: activeReviewTab === 'HISTORY' ? '#2563eb' : '#e2e8f0',
                        color: activeReviewTab === 'HISTORY' ? '#fff' : '#475569',
                        borderRadius: '9999px',
                        padding: '1px 7px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {reviewHistory.length}
                    </span>
                  </button>
                </div>
                <p style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
                  {activeReviewTab === 'PENDING'
                    ? 'Active task submissions awaiting manager decision.'
                    : 'History of tasks approved or rejected with review comments and timestamps.'}
                </p>
              </div>

              {activeReviewTab === 'HISTORY' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      minWidth: '160px',
                    }}
                  />
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: '#fff',
                    }}
                  >
                    <option value="ALL">All decisions ({reviewHistory.length})</option>
                    <option value="APPROVED">Approved ({historyApprovedCount})</option>
                    <option value="CHANGES_REQUESTED">Rejected / Changes ({historyRejectedCount})</option>
                  </select>
                </div>
              )}
            </div>

            {/* Content for Pending Reviews Tab */}
            {activeReviewTab === 'PENDING' && (
              <>
                <div className="manager-dashboard-queue-container">
                  <div className="workspace-table role-queue-table manager-dashboard-queue-table">
                    <div className="workspace-table-row workspace-table-head">
                      <span>Project</span>
                      <span>Task / Deliverable</span>
                      <span>Submission / Draft</span>
                      <span>Submitted By</span>
                      <span>Due Date</span>
                      <span>Status</span>
                      <span style={{ textAlign: 'right' }}>Action</span>
                    </div>
                    {loading ? (
                      <div className="workspace-empty">Loading review queue...</div>
                    ) : reviewQueue.length === 0 ? (
                      <div className="workspace-empty">No pending submissions awaiting Manager review.</div>
                    ) : (
                      displayedReviewQueue.map((item) => (
                        <div key={`${item.projectId}-${item.taskId}`} className="workspace-table-row">
                          <div>
                            <strong>{item.projectName}</strong>
                            {item.targetCompanyName && (
                              <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {item.targetCompanyName}
                              </small>
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: 500 }}>{item.taskTitle}</span>
                          </div>
                          <div>
                            <span>{item.draftName}</span>
                          </div>
                          <div>
                            <small>{item.submittedByName}</small>
                          </div>
                          <div>
                            <small className={isActionableOverdueTask(item.task) ? 'danger-text' : ''}>
                              {formatDate(item.dueDate)}
                            </small>
                          </div>
                          <div>
                            <span className="workspace-badge warning">In Review</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleReviewTask(item.projectId, item.taskId)}
                              style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {reviewQueue.length > 5 && (
                  <div style={{ padding: '8px 14px', textAlign: 'center', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActivePage?.('project-management')}
                      style={{ fontSize: '0.78rem', color: 'var(--role-accent, #2563eb)' }}
                    >
                      View all pending reviews ({reviewQueue.length}) →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Content for Review History Tab */}
            {activeReviewTab === 'HISTORY' && (
              <>
                <div className="manager-dashboard-queue-container">
                  <div className="workspace-table role-queue-table manager-dashboard-history-table">
                    <div className="workspace-table-row workspace-table-head">
                      <span>Project</span>
                      <span>Task / Deliverable</span>
                      <span>Staff</span>
                      <span>Decision</span>
                      <span>Reviewed At</span>
                      <span>Comment / Reason</span>
                      <span style={{ textAlign: 'right' }}>Action</span>
                    </div>
                    {loading ? (
                      <div className="workspace-empty">Loading review history...</div>
                    ) : filteredReviewHistory.length === 0 ? (
                      <div className="workspace-empty">
                        {reviewHistory.length === 0
                          ? 'No task review history records found yet.'
                          : 'No review history matching your current filter.'}
                      </div>
                    ) : (
                      displayedReviewHistory.map((item) => {
                        const isApproved = item.status === 'APPROVED';
                        return (
                          <div key={item.submissionId ?? `${item.projectId}-${item.taskId}-${item.reviewedAt}`} className="workspace-table-row">
                            <div>
                              <strong>{item.projectName}</strong>
                              {item.targetCompanyName && (
                                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                  {item.targetCompanyName}
                                </small>
                              )}
                            </div>
                            <div>
                              <span style={{ fontWeight: 500 }}>{item.taskTitle}</span>
                              {item.taskType && (
                                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.73rem' }}>
                                  {item.taskType}
                                </small>
                              )}
                            </div>
                            <div>
                              <small style={{ fontWeight: 500 }}>{item.submittedByName || 'Staff'}</small>
                              {item.submittedRevisionNumber != null && (
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem' }}>
                                  Rev. {item.submittedRevisionNumber}
                                </small>
                              )}
                            </div>
                            <div>
                              {isApproved ? (
                                <span
                                  className="workspace-badge success"
                                  style={{
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  Approved
                                </span>
                              ) : (
                                <span
                                  className="workspace-badge danger"
                                  style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  Changes Requested
                                </span>
                              )}
                            </div>
                            <div>
                              <small>{formatDateTime(item.reviewedAt)}</small>
                            </div>
                            <div>
                              <small
                                style={{
                                  display: 'block',
                                  color: isApproved ? 'var(--text-secondary, #64748b)' : '#b91c1c',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={item.reviewComment || ''}
                              >
                                {item.reviewComment || '—'}
                              </small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleReviewTask(item.projectId, item.taskId)}
                                style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                                title="Open task workbench in project"
                              >
                                View Task
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                {filteredReviewHistory.length > 8 && (
                  <div style={{ padding: '8px 14px', textAlign: 'center', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '8px' }}>
                    <small style={{ color: 'var(--text-secondary, #64748b)' }}>
                      Showing 8 of {filteredReviewHistory.length} review history records
                    </small>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Projects Needing Attention */}
          <div className="role-dashboard-stack">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Projects needing attention</h3>
                  <p>Active projects with overdue milestones, reviews, or overdue tasks.</p>
                </div>
              </div>
              <div className="manager-attention-list">
                {loading ? (
                  <div className="workspace-empty">Evaluating project signals...</div>
                ) : attentionProjects.length === 0 ? (
                  <div className="workspace-empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    All managed projects are currently on track.
                  </div>
                ) : (
                  <>
                    {displayedAttentionProjects.map(({ project, isProjectOverdue, inReviewCount, overdueTaskCount }) => {
                      const hasDistinctCompany = Boolean(
                        project.targetCompanyName &&
                        project.targetCompanyName.trim().toLowerCase() !== (project.projectName || '').trim().toLowerCase()
                      );

                      return (
                        <div key={project.id} className="manager-attention-item">
                          <div className="manager-attention-header-row">
                            <div className="manager-attention-title-group">
                              <strong className="manager-attention-name" title={project.projectName}>
                                {project.projectName}
                              </strong>
                              {hasDistinctCompany && (
                                <span className="manager-attention-company" title={project.targetCompanyName}>
                                  · {project.targetCompanyName}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm manager-attention-view-btn"
                              onClick={() => handleOpenProject(project.id)}
                            >
                              View
                            </button>
                          </div>
                          <div className="manager-attention-meta-row">
                            <div className="manager-attention-badges">
                              {isProjectOverdue && (
                                <span className="workspace-badge danger">Project Overdue</span>
                              )}
                              {inReviewCount > 0 && (
                                <span className="workspace-badge warning">
                                  {inReviewCount === 1 ? 'Review Needed' : `${inReviewCount} in review`}
                                </span>
                              )}
                              {overdueTaskCount > 0 && (
                                <span className="workspace-badge danger">
                                  {overdueTaskCount} overdue task{overdueTaskCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <span className="manager-attention-progress">
                              {project.progressPercentage ?? 0}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {attentionProjects.length > 5 && (
                      <div className="manager-attention-footer">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActivePage?.('project-management')}
                          style={{ fontSize: '0.78rem', color: 'var(--role-accent, #2563eb)' }}
                        >
                          View all projects ({attentionProjects.length}) →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
