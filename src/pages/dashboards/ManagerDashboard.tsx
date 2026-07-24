import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { api } from '../../services/api';
import type {
  CandidateResponse,
  DashboardSummaryDto,
  PageResult,
  ProfileResponse,
  ProjectResponse,
  ProjectTaskResponse,
} from '../../types/domain';
import { BarChart, DonutChart } from '../../components/charts/Charts';

type ProjectWithSignals = {
  project: ProjectResponse;
  candidates: CandidateResponse[];
  tasks: ProjectTaskResponse[];
};

const unwrapPage = <T,>(payload?: PageResult<T> | null) => payload?.content ?? [];

const candidateName = (candidate: CandidateResponse) => {
  const identity = candidate.identity as { tradeName?: string; legalName?: string } | undefined;
  return identity?.tradeName || identity?.legalName || `Candidate ${candidate.id.slice(-6)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const isOverdue = (task: ProjectTaskResponse) => {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || profile.companyId || 'Company profile';

type ManagerDashboardProps = {
  setActivePage?: (page: string) => void;
};

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [projects, setProjects] = useState<ProjectWithSignals[]>([]);
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryRes, projectsRes, profilesRes] = await Promise.all([
          api.get<DashboardSummaryDto>('/dashboard/summary'),
          api.get<PageResult<ProjectResponse>>('/projects', { params: { page: 0, size: 8 } }),
          api.get<PageResult<ProfileResponse>>('/profiles', { params: { page: 0, size: 8 } }).catch(() => null),
        ]);

        if (cancelled) return;

        const projectRows = unwrapPage(projectsRes.data);
        const projectSignals = await Promise.all(
          projectRows.slice(0, 6).map(async (project) => {
            const [candidateRes, taskRes] = await Promise.all([
              api.get<PageResult<CandidateResponse>>(`/projects/${project.id}/candidates`, {
                params: { page: 0, size: 20 },
              }).catch(() => null),
              api.get<PageResult<ProjectTaskResponse>>(`/projects/${project.id}/tasks`, {
                params: { page: 0, size: 50 },
              }).catch(() => null),
            ]);

            return {
              project,
              candidates: unwrapPage(candidateRes?.data),
              tasks: unwrapPage(taskRes?.data),
            };
          }),
        );

        if (cancelled) return;
        setSummary(summaryRes.data);
        setProjects(projectSignals);
        setProfiles(profilesRes?.data?.content ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Cannot load manager dashboard.');
          setSummary(null);
          setProjects([]);
          setProfiles([]);
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

  const allCandidates = projects.flatMap((item) =>
    item.candidates.map((candidate) => ({ candidate, project: item.project })),
  );
  const allTasks = projects.flatMap((item) => item.tasks.map((task) => ({ task, project: item.project })));
  const pendingCandidates = allCandidates.filter(({ candidate }) =>
    candidate.status === 'PENDING_REVIEW' || candidate.status === 'CORRECTED' || candidate.status === 'DRAFT',
  );
  const approvedCandidates = allCandidates.filter(({ candidate }) => candidate.status === 'APPROVED');
  const overdueTasks = allTasks.filter(({ task }) => isOverdue(task));
  const activeProjects = projects.filter(({ project }) => project.status === 'ACTIVE' || project.status === 'DRAFT');

  const topStats = [
    { label: 'Projects', value: summary?.totalProjects ?? activeProjects.length, note: 'Available to manage.' },
    { label: 'Pending candidates', value: summary?.pendingReviewCandidates ?? pendingCandidates.length, note: 'Candidates waiting for review.' },
    { label: 'Approved', value: summary?.approvedCandidates ?? approvedCandidates.length, note: 'Cleared into profile pipeline.' },
    { label: 'Company profiles', value: summary?.totalCompanyProfiles ?? profiles.length, note: 'Official company records.' },
  ];

  const taskMix = useMemo(() => {
    const statusCount = allTasks.reduce<Record<string, number>>((acc, { task }) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    return [
      { label: 'To Do', value: statusCount.TODO ?? 0, color: '#94A3B8' },
      { label: 'In Progress', value: statusCount.IN_PROGRESS ?? 0, color: '#2563EB' },
      { label: 'In Review', value: statusCount.IN_REVIEW ?? 0, color: '#F59E0B' },
      { label: 'Done', value: statusCount.DONE ?? 0, color: '#22C55E' },
    ];
  }, [allTasks]);

  const projectProgress = projects.slice(0, 5).map(({ project, tasks }, index) => {
    const done = tasks.filter((task) => task.status === 'DONE').length;
    const value = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return {
      label: project.projectName.slice(0, 16),
      value,
      color: ['#2563EB', '#0F766E', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5],
    };
  });

  const profileHealth = [
    { label: 'With website', value: profiles.filter((profile) => Boolean(profile.contact?.website)).length },
    { label: 'Missing tax code', value: profiles.filter((profile) => !profile.identity?.taxCode).length },
    { label: 'With insights', value: profiles.filter((profile) => Boolean(profile.insights)).length },
  ];

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page manager-dashboard-v2" id="page-manager-dashboard">
      <div className="workspace-shell manager-dashboard-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Operations <span>/</span> Manager workspace</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Operations command center</span>
              <h1>Manager Dashboard</h1>
              <p>
                {loading
                  ? 'Loading project execution, candidate approvals, and company profile signals.'
                  : `${currentUser?.name}, review candidate bottlenecks, project task flow, and company profile health from live backend data.`}
              </p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setActivePage?.('project-management')}>Open projects</button>
              <button className="btn btn-primary" onClick={() => setActivePage?.('companies')}>Company profiles</button>
            </div>
          </div>

          {error && <div className="workspace-inline-error">{error}</div>}

          <div className="workspace-focus-card role-focus-card manager manager-dashboard-focus">
            <div>
              <span className="workspace-chip">Live manager queue</span>
              <h3>{pendingCandidates.length} candidates need review across {projects.length} loaded projects.</h3>
              <p>Approve clean candidates to create official Company Profiles, and use task signals to unblock project execution.</p>
            </div>
            <div className="workspace-focus-metrics">
              <article><strong>{pendingCandidates.length}</strong><span>candidate reviews</span></article>
              <article><strong>{overdueTasks.length}</strong><span>overdue tasks</span></article>
              <article><strong>{profiles.length}</strong><span>profiles sampled</span></article>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact manager-dashboard-stats">
            {topStats.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{loading ? '...' : item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="dashboard-grid cols-2 role-board-grid manager-dashboard-charts">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Project execution progress</h3>
                  <p>Task completion rate for the latest loaded projects.</p>
                </div>
              </div>
              {projectProgress.length ? <BarChart data={projectProgress} height={160} /> : <div className="workspace-empty">No project task data yet.</div>}
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

          <div className="dashboard-grid cols-main-side role-board-grid manager-dashboard-lower">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Candidate approval queue</h3>
                  <p>Live candidates from project candidate APIs that are closest to manager decision.</p>
                </div>
              </div>
              <div className="workspace-table role-queue-table">
                <div className="workspace-table-row workspace-table-head">
                  <span>Candidate</span>
                  <span>Project</span>
                  <span>Relationship</span>
                  <span>Status</span>
                  <span>Source</span>
                </div>
                {pendingCandidates.length === 0 ? (
                  <div className="workspace-empty">No pending candidate review found.</div>
                ) : pendingCandidates.slice(0, 6).map(({ candidate, project }) => (
                  <div key={candidate.id} className="workspace-table-row">
                    <div><strong>{candidateName(candidate)}</strong><small>Candidate #{candidate.candidateOrder ?? candidate.id.slice(-6)}</small></div>
                    <span>{project.projectName}</span>
                    <span>{candidate.relationshipTypeOverride || candidate.suggestedRelationshipType || project.targetRelationshipType || 'Project default'}</span>
                    <span className="workspace-badge neutral">{candidate.status.replaceAll('_', ' ')}</span>
                    <span>{candidate.rawDocumentId || candidate.importJobId || 'No source'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="role-dashboard-stack">
              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Projects needing attention</h3>
                    <p>Projects with pending candidates or overdue tasks.</p>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {projects.length === 0 && <div className="workspace-empty">No projects loaded.</div>}
                  {projects.slice(0, 5).map(({ project, candidates, tasks }) => (
                    <div key={project.id}>
                      <strong>{project.projectName}</strong>
                      <span>{candidates.filter((candidate) => candidate.status !== 'APPROVED').length} reviews - {tasks.filter(isOverdue).length} overdue</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Company profile health</h3>
                    <p>Quick quality checks from the profile API sample.</p>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {profileHealth.map((item) => (
                    <div key={item.label}><strong>{item.label}</strong><span>{item.value}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Immediate focus</span>
            <h3>Review pressure</h3>
            <div className="workspace-alert-list">
              <article className={pendingCandidates.length ? 'workspace-alert warning' : 'workspace-alert neutral'}>
                <strong>{pendingCandidates.length ? 'Candidate queue active' : 'Queue is clear'}</strong>
                <p>{pendingCandidates.length} candidates are waiting for manager review in the loaded projects.</p>
              </article>
              <article className={overdueTasks.length ? 'workspace-alert warning' : 'workspace-alert neutral'}>
                <strong>{overdueTasks.length ? 'Overdue work exists' : 'No overdue tasks'}</strong>
                <p>{overdueTasks.length} tasks are past due and not completed.</p>
              </article>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Recent profiles</span>
            <div className="workspace-activity-list">
              {profiles.length === 0 ? (
                <article><strong>No profiles loaded</strong><p>Approved candidates will appear in the company profile index.</p></article>
              ) : profiles.slice(0, 5).map((profile) => (
                <article key={profile.companyId || profile.id}>
                  <strong>{profileName(profile)}</strong>
                  <p>{profile.business?.industries?.[0] || 'Unclassified'} - {formatDate(profile.metadata?.updatedAt)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Decision checklist</span>
            <div className="workspace-activity-list">
              <article><strong>Review candidate evidence</strong><p>Open the project detail candidate tab before approving a profile.</p></article>
              <article><strong>Unblock overdue tasks</strong><p>Use the project Kanban board to reassign or complete blocked work.</p></article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
