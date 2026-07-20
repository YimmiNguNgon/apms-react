import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type {
  AddMemberRequest,
  CreateProjectRequest,
  PageResult,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus,
  ProjectType,
  UpdateProjectRequest,
} from '../types/domain';

type ProjectMemberRole = AddMemberRequest['memberRole'];

type ProjectFormState = {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId: string;
  targetCompanyName: string;
  description: string;
};

type EditProjectFormState = {
  projectName: string;
  description: string;
  status: ProjectStatus;
};

type MemberFormState = {
  accountId: string;
  memberRole: ProjectMemberRole;
};

type FeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New company research',
  RESEARCH_MULTIPLE_COMPANIES: 'Multi-company research',
  UPDATE_EXISTING_COMPANY: 'Update existing company',
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

const PROJECT_STATUS_TONES: Record<ProjectStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const initialProjectForm = (): ProjectFormState => ({
  projectName: '',
  projectType: 'RESEARCH_NEW_COMPANY',
  targetCompanyProfileId: '',
  targetCompanyName: '',
  description: '',
});

const initialEditForm = (): EditProjectFormState => ({
  projectName: '',
  description: '',
  status: 'DRAFT',
});

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [editForm, setEditForm] = useState<EditProjectFormState>(initialEditForm);
  const [memberForm, setMemberForm] = useState<MemberFormState>({ accountId: '', memberRole: 'MANAGER' });
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const selectedMembers = selectedProject?.members ?? [];
  const activeProjectStorage = selectedProjectId ? `Project #${selectedProjectId}` : 'No active board';

  const reloadProjects = useCallback(async (signal?: AbortSignal) => {
    setProjectsLoading(true);
    setProjectsError(null);

    try {
      const res = await api.get<PageResult<ProjectResponse>>('/projects', {
        params: { page: 0, size: 50 },
        signal,
      });

      const rows = res?.data?.content ?? [];
      setProjects(rows);
      setSelectedProjectId((current) => {
        const nextId = current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null;
        if (nextId) {
          localStorage.setItem('apms-active-project', String(nextId));
        }
        return nextId;
      });
    } catch (err) {
      if (!signal?.aborted) {
        setProjects([]);
        setSelectedProject(null);
        setSelectedProjectId(null);
        setProjectsError(err instanceof Error ? err.message : 'Cannot load project list.');
      }
    } finally {
      if (!signal?.aborted) {
        setProjectsLoading(false);
      }
    }
  }, []);

  const reloadProjectDetail = useCallback(async (projectId: number, signal?: AbortSignal) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const [detailRes, membersRes] = await Promise.all([
        api.get<ProjectResponse>(`/projects/${projectId}`, { signal }),
        api.get<ProjectMemberResponse[]>(`/projects/${projectId}/members`, { signal }),
      ]);

      if (signal?.aborted) return;

      if (detailRes?.success && detailRes.data) {
        setSelectedProject({
          ...detailRes.data,
          members: Array.isArray(membersRes?.data) ? membersRes.data : detailRes.data.members ?? [],
        });
      } else {
        setDetailError('Project not found.');
      }
    } catch (err) {
      if (!signal?.aborted) {
        setDetailError(err instanceof Error ? err.message : 'Cannot load project detail.');
      }
    } finally {
      if (!signal?.aborted) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reloadProjects(controller.signal);
    return () => controller.abort();
  }, [reloadProjects]);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedProjectId) {
      setSelectedProject(null);
      return () => controller.abort();
    }

    const fallback = projects.find((project) => project.id === selectedProjectId) ?? null;
    if (fallback) {
      setSelectedProject(fallback);
    }

    void reloadProjectDetail(selectedProjectId, controller.signal);
    return () => controller.abort();
  }, [projects, reloadProjectDetail, selectedProjectId]);

  const groupedProjects = useMemo(() => ({
    DRAFT: projects.filter((project) => project.status === 'DRAFT'),
    IN_PROGRESS: projects.filter((project) => project.status === 'IN_PROGRESS'),
    COMPLETED: projects.filter((project) => project.status === 'COMPLETED' || project.status === 'CANCELLED'),
  }), [projects]);

  const refreshAll = async () => {
    const controller = new AbortController();
    await reloadProjects(controller.signal);
    if (selectedProjectId) {
      await reloadProjectDetail(selectedProjectId, controller.signal);
    }
  };

  const refreshCurrentProject = async () => {
    if (!selectedProjectId) return;
    const controller = new AbortController();
    await reloadProjectDetail(selectedProjectId, controller.signal);
    await reloadProjects(controller.signal);
  };

  const handleCreateProject = async () => {
    const projectName = projectForm.projectName.trim();
    const targetCompanyName = projectForm.targetCompanyName.trim();
    const targetCompanyProfileId = projectForm.targetCompanyProfileId.trim();
    const description = projectForm.description.trim();

    if (!projectName || !targetCompanyName) {
      setFeedback({ kind: 'error', message: 'Project name and target company are required.' });
      return;
    }

    if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && !targetCompanyProfileId) {
      setFeedback({ kind: 'error', message: 'Target company profile id is required for update projects.' });
      return;
    }

    setCreateLoading(true);
    setFeedback(null);

    try {
      const payload: CreateProjectRequest = {
        projectName,
        projectType: projectForm.projectType,
        targetCompanyProfileId: targetCompanyProfileId || null,
        targetCompanyName,
        description: description || null,
      };

      const res = await api.post<ProjectResponse>('/projects', payload);
      const created = res?.data;

      setProjectForm(initialProjectForm());
      setShowCreateForm(false);
      setFeedback({ kind: 'success', message: 'Project created successfully.' });
      await reloadProjects();
      if (created?.id) {
        localStorage.setItem('apms-active-project', String(created.id));
        setSelectedProjectId(created.id);
      }
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to create project.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedProject) return;
    setEditForm({
      projectName: selectedProject.projectName ?? '',
      description: selectedProject.description ?? '',
      status: selectedProject.status,
    });
    setShowEditForm((current) => !current);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;
    const projectName = editForm.projectName.trim();
    if (!projectName) {
      setFeedback({ kind: 'error', message: 'Project name cannot be empty.' });
      return;
    }

    setUpdateLoading(true);
    setFeedback(null);

    try {
      const payload: UpdateProjectRequest = {
        projectName,
        description: editForm.description.trim() || null,
        status: editForm.status,
      };

      await api.put<ProjectResponse>(`/projects/${selectedProject.id}`, payload);
      setShowEditForm(false);
      setFeedback({ kind: 'success', message: 'Project updated successfully.' });
      await refreshCurrentProject();
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to update project.' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProject) {
      setFeedback({ kind: 'error', message: 'Select a project before adding members.' });
      return;
    }

    const accountId = Number(memberForm.accountId);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      setFeedback({ kind: 'error', message: 'Provide a valid account id.' });
      return;
    }

    setMemberLoading(true);
    setFeedback(null);

    try {
      const payload: AddMemberRequest = {
        accountId,
        memberRole: memberForm.memberRole,
      };

      await api.post<ProjectMemberResponse>(`/projects/${selectedProject.id}/members`, payload);
      setMemberForm({ accountId: '', memberRole: 'MANAGER' });
      setShowMemberForm(false);
      setFeedback({ kind: 'success', message: 'Member added to project.' });
      await refreshCurrentProject();
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to add member.' });
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (member: ProjectMemberResponse) => {
    if (!selectedProject) return;
    if (!window.confirm('Remove this member from the project?')) return;

    setMemberLoading(true);
    setFeedback(null);

    try {
      await api.delete<void>(`/projects/${selectedProject.id}/members/${member.accountId}`);
      setFeedback({ kind: 'success', message: 'Member removed from project.' });
      await refreshCurrentProject();
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to remove member.' });
    } finally {
      setMemberLoading(false);
    }
  };

  const renderProjectCard = (project: ProjectResponse) => {
    const isSelected = selectedProjectId === project.id;
    const tone = PROJECT_STATUS_TONES[project.status];

    return (
      <article
        key={project.id}
        className={`workspace-kanban-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          localStorage.setItem('apms-active-project', String(project.id));
          setSelectedProjectId(project.id);
          setShowEditForm(false);
          setShowMemberForm(false);
        }}
      >
        <span className="workspace-chip">{PROJECT_TYPE_LABELS[project.projectType]}</span>
        <h4>{project.projectName}</h4>
        <p>{project.description || `Target company: ${project.targetCompanyName}`}</p>
        <div className="workspace-kanban-meta">
          <span>ID #{project.id}</span>
          <span className={`workspace-badge ${tone}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
        </div>
      </article>
    );
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page" id="page-project-management">
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <div className="workspace-breadcrumbs">Project workspace <span>/</span> APMS board</div>
            <h1>Project management</h1>
            <p>Manage the kanban board, project scope, and member assignments from one workspace.</p>
          </div>
          <div className="workspace-head-actions">
            <button className="btn btn-outline" onClick={() => void refreshAll()} disabled={projectsLoading || detailLoading}>Refresh</button>
            <button className="btn btn-primary" onClick={() => setShowCreateForm((current) => !current)}>Create project</button>
          </div>
        </div>

        {feedback && <div className={`workspace-inline-${feedback.kind === 'error' ? 'error' : 'note'}`}>{feedback.message}</div>}
        {projectsError && <div className="workspace-inline-error">{projectsError}</div>}

        {showCreateForm && (
          <div className="workspace-panel workspace-form-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Create project</h3>
                <p>Add a new research board and assign the target company context.</p>
              </div>
            </div>
            <div className="workspace-form-grid">
              <label>
                <span>Project name</span>
                <input className="search-input" value={projectForm.projectName} onChange={(event) => setProjectForm((current) => ({ ...current, projectName: event.target.value }))} />
              </label>
              <label>
                <span>Project type</span>
                <select className="search-input" value={projectForm.projectType} onChange={(event) => setProjectForm((current) => ({ ...current, projectType: event.target.value as ProjectType }))}>
                  <option value="RESEARCH_NEW_COMPANY">New company research</option>
                  <option value="UPDATE_EXISTING_COMPANY">Update existing company</option>
                  <option value="RESEARCH_MULTIPLE_COMPANIES">Multi-company research</option>
                </select>
              </label>
              <label>
                <span>Target company</span>
                <input className="search-input" value={projectForm.targetCompanyName} onChange={(event) => setProjectForm((current) => ({ ...current, targetCompanyName: event.target.value }))} />
              </label>
              <label>
                <span>Description</span>
                <input className="search-input" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && (
                <label className="workspace-form-span">
                  <span>Target company profile id</span>
                  <input className="search-input" value={projectForm.targetCompanyProfileId} onChange={(event) => setProjectForm((current) => ({ ...current, targetCompanyProfileId: event.target.value }))} />
                </label>
              )}
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleCreateProject()} disabled={createLoading}>
                {createLoading ? 'Saving...' : 'Save project'}
              </button>
            </div>
          </div>
        )}

        <div className="workspace-focus-card">
          <div>
            <span className="workspace-side-eyebrow">Board sync</span>
            <h3>Selected board drives downstream task intake</h3>
            <p>When you select a project here, APMS uses it as the active workspace for document upload, extraction, and candidate review.</p>
          </div>
          <div className="workspace-focus-metrics">
            <article>
              <strong>{projects.length}</strong>
              <span>Projects</span>
            </article>
            <article>
              <strong>{selectedMembers.length}</strong>
              <span>Members on selected board</span>
            </article>
            <article>
              <strong>{activeProjectStorage}</strong>
              <span>Current active project</span>
            </article>
          </div>
        </div>

        <div className="workspace-board-layout">
          <div className="workspace-kanban-board">
            <div className="workspace-kanban-column">
              <div className="workspace-kanban-head">To do <span>{groupedProjects.DRAFT.length}</span></div>
              {groupedProjects.DRAFT.length === 0 ? <div className="workspace-kanban-empty">No draft projects.</div> : groupedProjects.DRAFT.map(renderProjectCard)}
            </div>
            <div className="workspace-kanban-column">
              <div className="workspace-kanban-head">In progress <span>{groupedProjects.IN_PROGRESS.length}</span></div>
              {groupedProjects.IN_PROGRESS.length === 0 ? <div className="workspace-kanban-empty">No active projects.</div> : groupedProjects.IN_PROGRESS.map(renderProjectCard)}
            </div>
            <div className="workspace-kanban-column">
              <div className="workspace-kanban-head">Done <span>{groupedProjects.COMPLETED.length}</span></div>
              {groupedProjects.COMPLETED.length === 0 ? <div className="workspace-kanban-empty">No completed projects.</div> : groupedProjects.COMPLETED.map(renderProjectCard)}
            </div>
          </div>

          <aside className="workspace-sidebar">
            <div className="workspace-side-card">
              {!selectedProject ? (
                <div className="workspace-empty">Select a project card to inspect its detail.</div>
              ) : (
                <>
                  <div className="workspace-section-head">
                    <div>
                      <h3>{selectedProject.projectName}</h3>
                      <p>ID #{selectedProject.id} • {PROJECT_TYPE_LABELS[selectedProject.projectType]}</p>
                    </div>
                    <span className={`workspace-badge ${PROJECT_STATUS_TONES[selectedProject.status]}`}>{PROJECT_STATUS_LABELS[selectedProject.status]}</span>
                  </div>

                  <div className="workspace-detail-list">
                    <div><strong>Target</strong><span>{selectedProject.targetCompanyName}</span></div>
                    <div><strong>Description</strong><span>{selectedProject.description || 'No description'}</span></div>
                    <div><strong>Status</strong><span>{selectedProject.status}</span></div>
                  </div>

                  <div className="workspace-head-actions">
                    <button className="btn btn-outline" onClick={handleOpenEdit}>Edit</button>
                    <button className="btn btn-outline" onClick={() => setShowMemberForm((current) => !current)}>Add member</button>
                  </div>

                  {detailError && <div className="workspace-inline-error">{detailError}</div>}

                  {showEditForm && (
                    <div className="workspace-form-stack">
                      <label>
                        <span>Project name</span>
                        <input className="search-input" value={editForm.projectName} onChange={(event) => setEditForm((current) => ({ ...current, projectName: event.target.value }))} />
                      </label>
                      <label>
                        <span>Description</span>
                        <input className="search-input" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
                      </label>
                      <label>
                        <span>Status</span>
                        <select className="search-input" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>
                          <option value="DRAFT">DRAFT</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </label>
                      <div className="workspace-head-actions">
                        <button className="btn btn-outline" onClick={() => setShowEditForm(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => void handleUpdateProject()} disabled={updateLoading}>
                          {updateLoading ? 'Saving...' : 'Save update'}
                        </button>
                      </div>
                    </div>
                  )}

                  {showMemberForm && (
                    <div className="workspace-form-stack">
                      <label>
                        <span>Account id</span>
                        <input className="search-input" value={memberForm.accountId} onChange={(event) => setMemberForm((current) => ({ ...current, accountId: event.target.value }))} inputMode="numeric" />
                      </label>
                      <label>
                        <span>Member role</span>
                        <select className="search-input" value={memberForm.memberRole} onChange={(event) => setMemberForm((current) => ({ ...current, memberRole: event.target.value as ProjectMemberRole }))}>
                          <option value="MANAGER">Manager</option>
                          <option value="STAFF">Staff</option>
                        </select>
                      </label>
                      <div className="workspace-head-actions">
                        <button className="btn btn-outline" onClick={() => setShowMemberForm(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => void handleAddMember()} disabled={memberLoading}>
                          {memberLoading ? 'Saving...' : 'Save member'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="workspace-member-list">
                    <div className="workspace-side-eyebrow">Project members</div>
                    {detailLoading && <div className="workspace-inline-note">Loading project detail...</div>}
                    {selectedMembers.length === 0 ? (
                      <div className="workspace-empty">No members assigned yet.</div>
                    ) : selectedMembers.map((member) => (
                      <div key={member.id} className="workspace-member-card">
                        <div>
                          <strong>Account #{member.accountId}</strong>
                          <p>{MEMBER_ROLE_LABELS[member.memberRole] ?? member.memberRole}</p>
                          <small>{member.joinedAt ? new Date(member.joinedAt).toLocaleString('vi-VN') : 'No join date'}</small>
                        </div>
                        <button className="workspace-icon-btn danger" onClick={() => void handleRemoveMember(member)} disabled={memberLoading}>Remove</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
