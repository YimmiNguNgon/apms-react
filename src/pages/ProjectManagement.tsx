import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type {
  AddMemberRequest,
  CreateProjectRequest,
  PageResult,
  CreateProjectTaskRequest,
  CandidateResponse,
  CandidateStatus,
  ProfileResponse,
  ProjectTaskResponse,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus,
  ProjectType,
  RelationshipType,
  TaskPriority,
  TaskType,
  UpdateProjectRequest,
} from '../types/domain';

type ProjectMemberRole = AddMemberRequest['memberRole'];

type ProjectFormState = {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId: string;
  targetCompanyName: string;
  targetRelationshipType: RelationshipType;
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

type TaskFormState = {
  title: string;
  description: string;
  assignedToUserId: string;
  priority: TaskPriority;
  dueDate: string;
  taskType: TaskType;
};

type FeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const CANDIDATE_COLUMNS: Array<{ status: CandidateStatus; label: string }> = [
  { status: 'DRAFT', label: 'Tiềm năng' },
  { status: 'CORRECTED', label: 'Đã cập nhật' },
  { status: 'PENDING_REVIEW', label: 'Đang thẩm định' },
  { status: 'APPROVED', label: 'Đã phê duyệt' },
  { status: 'REJECTED', label: 'Từ chối' },
];

const candidateName = (candidate: CandidateResponse) => {
  const identity = candidate.identity as { tradeName?: string; legalName?: string } | undefined;
  return identity?.tradeName || identity?.legalName || `Candidate #${candidate.id.slice(-6)}`;
};

const candidateIndustry = (candidate: CandidateResponse) => {
  const business = candidate.business as { industries?: string[] } | undefined;
  return business?.industries?.filter(Boolean).join(', ') || 'Industry not specified';
};

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || profile.companyId;

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New company research',
  RESEARCH_MULTIPLE_COMPANIES: 'Multi-company research',
  UPDATE_EXISTING_COMPANY: 'Update existing company',
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'To do',
  ACTIVE: 'In progress',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

const PROJECT_STATUS_TONES: Record<ProjectStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  ACTIVE: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  ARCHIVED: 'neutral',
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
  targetRelationshipType: 'PARTNER_WITH',
  description: '',
});

const initialTaskForm = (): TaskFormState => ({
  title: '',
  description: '',
  assignedToUserId: '',
  priority: 'MEDIUM',
  dueDate: '',
  taskType: 'DOCUMENT_COLLECTION',
});

const initialEditForm = (): EditProjectFormState => ({
  projectName: '',
  description: '',
  status: 'DRAFT',
});

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem('apms-active-project');
    return saved ? Number(saved) : null;
  });
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [editForm, setEditForm] = useState<EditProjectFormState>(initialEditForm);
  const [memberForm, setMemberForm] = useState<MemberFormState>({ accountId: '', memberRole: 'MANAGER' });
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [tasks, setTasks] = useState<ProjectTaskResponse[]>([]);
  const [detailTab, setDetailTab] = useState<'board' | 'companies'>('board');
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [approvedProfiles, setApprovedProfiles] = useState<ProfileResponse[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
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

  const reloadProjectBoard = useCallback(async (projectId: number, signal?: AbortSignal) => {
    setBoardLoading(true);
    try {
      const [candidateRes, profileRes] = await Promise.all([
        api.get<PageResult<CandidateResponse>>(`/projects/${projectId}/candidates`, { params: { page: 0, size: 100 }, signal }),
        api.get<ProfileResponse[]>(`/projects/${projectId}/company-profiles`, { signal }),
      ]);
      if (signal?.aborted) return;
      
      let loadedCandidates = candidateRes.data?.content ?? [];
      // --- DEMO DATA INJECTION ---
      if (loadedCandidates.length === 0) {
        loadedCandidates = [
          {
            id: 'mock-1',
            projectId: String(projectId),
            importJobId: 'job-1',
            rawDocumentId: 'doc-1',
            status: 'DRAFT',
            identity: { tradeName: 'Alpha Tech Corp' },
            business: { industries: ['Công nghệ', 'AI'] },
            relationshipConfidenceScore: 0.85
          },
          {
            id: 'mock-2',
            projectId: String(projectId),
            importJobId: 'job-2',
            rawDocumentId: 'doc-2',
            status: 'CORRECTED',
            identity: { tradeName: 'VinaLogistics LLC' },
            business: { industries: ['Vận tải', 'Logistics'] },
            relationshipConfidenceScore: 0.92
          },
          {
            id: 'mock-3',
            projectId: String(projectId),
            importJobId: 'job-3',
            rawDocumentId: 'doc-3',
            status: 'PENDING_REVIEW',
            identity: { tradeName: 'Green Energy Group' },
            business: { industries: ['Năng lượng sạch'] },
            relationshipConfidenceScore: 0.78
          },
          {
            id: 'mock-4',
            projectId: String(projectId),
            importJobId: 'job-4',
            rawDocumentId: 'doc-4',
            status: 'APPROVED',
            identity: { tradeName: 'HealthPlus Hospital' },
            business: { industries: ['Y tế', 'Chăm sóc sức khỏe'] },
            relationshipConfidenceScore: 0.95
          }
        ];
      }
      
      setCandidates(loadedCandidates);
      setApprovedProfiles(profileRes.data ?? []);
    } catch (err) {
      if (!signal?.aborted) {
        setCandidates([]);
        setApprovedProfiles([]);
        setDetailError(err instanceof Error ? err.message : 'Cannot load the project board.');
      }
    } finally {
      if (!signal?.aborted) setBoardLoading(false);
    }
  }, []);

  const moveCandidate = async (candidateId: string, status: CandidateStatus) => {
    if (!selectedProjectId) return;
    const before = candidates;
    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, status } : candidate));
    
    // --- DEMO MODE BYPASS ---
    if (candidateId.startsWith('mock-')) {
      return;
    }
    
    try {
      const response = await api.patch<CandidateResponse>(`/projects/${selectedProjectId}/candidates/${candidateId}/stage`, { status });
      if (response.data) {
        setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? response.data : candidate));
      }
      if (status === 'APPROVED') await reloadProjectBoard(selectedProjectId);
    } catch (err) {
      setCandidates(before);
      setDetailError(err instanceof Error ? err.message : 'Unable to move candidate.');
    }
  };


  useEffect(() => {
    const controller = new AbortController();
    void reloadProjects(controller.signal);
    return () => controller.abort();
  }, [reloadProjects]);

  useEffect(() => {
    setCurrentPage(0);
  }, [projectSearch]);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedProjectId) {
      setSelectedProject(null);
      setTasks([]);
      setCandidates([]);
      setApprovedProfiles([]);
      return () => controller.abort();
    }

    const fallback = projects.find((project) => project.id === selectedProjectId) ?? null;
    if (fallback) {
      setSelectedProject(fallback);
    }

    void reloadProjectDetail(selectedProjectId, controller.signal);
    void reloadProjectBoard(selectedProjectId, controller.signal);
    return () => controller.abort();
  }, [projects, reloadProjectBoard, reloadProjectDetail, selectedProjectId]);

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
        targetRelationshipType: projectForm.targetRelationshipType,
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
      if (editForm.status !== selectedProject.status) {
        await api.patch<ProjectResponse>(`/projects/${selectedProject.id}/status`, { status: editForm.status });
      }
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

  const handleCreateTask = async () => {
    if (!selectedProject) return;
    const title = taskForm.title.trim();
    const assignedToUserId = Number(taskForm.assignedToUserId);
    if (!title || !Number.isFinite(assignedToUserId) || assignedToUserId <= 0) {
      setFeedback({ kind: 'error', message: 'Task title and assigned staff are required.' });
      return;
    }

    setTaskLoading(true);
    setFeedback(null);
    try {
      const payload: CreateProjectTaskRequest = {
        title,
        description: taskForm.description.trim() || null,
        assignedToUserId,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        taskType: taskForm.taskType,
      };
      const res = await api.post<ProjectTaskResponse>(`/projects/${selectedProject.id}/tasks`, payload);
      if (res?.data) {
        setTasks((current) => [res.data, ...current.filter((task) => task.id !== res.data.id)]);
      }
      setTaskForm(initialTaskForm());
      setShowTaskForm(false);
      setFeedback({ kind: 'success', message: 'Task assigned successfully.' });
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to assign task.' });
    } finally {
      setTaskLoading(false);
    }
  };

  const renderProjectRow = (project: ProjectResponse) => {
    const isSelected = selectedProjectId === project.id;
    const tone = PROJECT_STATUS_TONES[project.status];

    return (
      <button
        key={project.id}
        className={`project-list-row ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          localStorage.setItem('apms-active-project', String(project.id));
          setSelectedProjectId(project.id);
          setShowEditForm(false);
          setShowMemberForm(false);
          setShowTaskForm(false);
          setTasks([]);
        }}
      >
        <span><strong>{project.projectName}</strong><small>#{project.id}</small></span>
        <span>{PROJECT_TYPE_LABELS[project.projectType]}</span>
        <span>{project.targetCompanyName}</span>
        <span>{project.members?.length ?? 0} members</span>
        <span className={`workspace-badge ${tone}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
      </button>
    );
  };
  const filteredProjectsAll = projects.filter((p) => {
    if (!projectSearch) return true;
    const term = projectSearch.toLowerCase();
    return (
      p.projectName?.toLowerCase().includes(term) ||
      p.targetCompanyName?.toLowerCase().includes(term) ||
      String(p.id).includes(term)
    );
  });

  const totalElements = filteredProjectsAll.length;
  const pageSize = 10;
  const totalPages = Math.ceil(totalElements / pageSize);
  const filteredProjects = filteredProjectsAll.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

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
                <span>Target relationship</span>
                <select className="search-input" value={projectForm.targetRelationshipType} onChange={(event) => setProjectForm((current) => ({ ...current, targetRelationshipType: event.target.value as RelationshipType }))}>
                  <option value="PARTNER_WITH">Partner with</option>
                  <option value="COMPETITOR_OF">Competitor of</option>
                  <option value="SUPPLIER_OF">Supplier of</option>
                  <option value="CUSTOMER_OF">Customer of</option>
                  <option value="POTENTIAL_PARTNER_OF">Potential partner of</option>
                </select>
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

        <div className="workspace-board-layout project-detail-layout">
          <div className="project-list-table" role="table" aria-label="Projects">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <input
                className="search-input"
                type="text"
                placeholder="Filter projects by name, ID, or company..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                style={{ width: '100%', maxWidth: '320px' }}
              />
            </div>
            <div className="project-list-row project-list-head" role="row"><span>Project</span><span>Type</span><span>Target company</span><span>Team</span><span>Status</span></div>
            {filteredProjects.length === 0 ? <div className="workspace-empty">No projects found.</div> : filteredProjects.map(renderProjectRow)}
          </div>

          {totalPages > 1 && (
            <div className="workspace-pagination">
              <span>Showing {filteredProjects.length} of {totalElements} projects</span>
              <div>
                <button className="workspace-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage((c) => c - 1)}>Prev</button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                    onClick={() => setCurrentPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button className="workspace-page-btn" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((c) => c + 1)}>Next</button>
              </div>
            </div>
          )}

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
                    <div><strong>Relationship</strong><span>{selectedProject.targetRelationshipType || 'Not set'}</span></div>
                    <div><strong>Description</strong><span>{selectedProject.description || 'No description'}</span></div>
                    <div><strong>Status</strong><span>{selectedProject.status}</span></div>
                  </div>

                  <div className="workspace-head-actions">
                    <button className="btn btn-outline" onClick={handleOpenEdit}>Edit</button>
                    <button className="btn btn-outline" onClick={() => setShowMemberForm((current) => !current)}>Add member</button>
                    <button className="btn btn-primary" onClick={() => setShowTaskForm((current) => !current)}>Assign task</button>
                  </div>

                  <div className="project-detail-tabs" role="tablist" aria-label="Project detail views">
                    <button className={detailTab === 'board' ? 'active' : ''} role="tab" aria-selected={detailTab === 'board'} onClick={() => setDetailTab('board')}>Board</button>
                    <button className={detailTab === 'companies' ? 'active' : ''} role="tab" aria-selected={detailTab === 'companies'} onClick={() => setDetailTab('companies')}>Companies <span>{approvedProfiles.length}</span></button>
                  </div>

                  {detailTab === 'board' ? (
                    <div className="project-candidate-board" aria-label="Candidate pipeline">
                      <div className="project-board-title"><div><h4>Candidate pipeline</h4><p>Drag a company candidate between workflow stages.</p></div>{boardLoading && <span>Refreshing...</span>}</div>
                      <div className="project-candidate-columns">
                        {CANDIDATE_COLUMNS.map((column) => {
                          const items = candidates.filter((candidate) => candidate.status === column.status);
                          return (
                            <section
                              key={column.status}
                              className={`project-candidate-column ${column.status.toLowerCase()}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                const candidateId = event.dataTransfer.getData('text/plain');
                                if (candidateId) void moveCandidate(candidateId, column.status);
                              }}
                            >
                              <header><span>{column.label}</span><strong>{items.length}</strong></header>
                              <div className="project-candidate-list">
                                {items.map((candidate) => (
                                  <article
                                    key={candidate.id}
                                    className="project-candidate-card"
                                    draggable={candidate.status !== 'APPROVED' && candidate.status !== 'REJECTED'}
                                    onDragStart={(event) => event.dataTransfer.setData('text/plain', candidate.id)}
                                  >
                                    <strong>{candidateName(candidate)}</strong>
                                    <p>{candidateIndustry(candidate)}</p>
                                    <div><span>#{candidate.id.slice(-6)}</span><span>{candidate.relationshipConfidenceScore ? `${Math.round(candidate.relationshipConfidenceScore * 100)}% match` : 'Unscored'}</span></div>
                                  </article>
                                ))}
                                {items.length === 0 && <div className="project-candidate-empty">Drop candidate here</div>}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="project-company-list">
                      <div className="project-board-title"><div><h4>Approved company profiles</h4><p>Profiles verified from candidates belonging to this project.</p></div>{boardLoading && <span>Refreshing...</span>}</div>
                      {approvedProfiles.length === 0 ? <div className="workspace-empty">No approved company profiles are linked to this project yet.</div> : approvedProfiles.map((profile) => (
                        <article key={profile.id} className="project-company-card">
                          <div><strong>{profileName(profile)}</strong><p>{profile.business?.industries?.join(', ') || 'Industry not specified'}</p></div>
                          <div><span className="workspace-badge success">{profile.reviewStatus || 'VERIFIED'}</span><small>{profile.companyId}</small></div>
                        </article>
                      ))}
                    </div>
                  )}

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
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
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

                  {showTaskForm && (
                    <div className="workspace-form-stack">
                      <label>
                        <span>Task title</span>
                        <input className="search-input" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
                      </label>
                      <label>
                        <span>Description</span>
                        <textarea className="search-input" rows={3} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} />
                      </label>
                      <label>
                        <span>Assign to staff</span>
                        <select className="search-input" value={taskForm.assignedToUserId} onChange={(event) => setTaskForm((current) => ({ ...current, assignedToUserId: event.target.value }))}>
                          <option value="">Select staff</option>
                          {selectedMembers.filter((member) => member.memberRole === 'STAFF').map((member) => <option key={member.id} value={member.accountId}>Staff #{member.accountId}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Priority</span>
                        <select className="search-input" value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                        </select>
                      </label>
                      <label>
                        <span>Due date</span>
                        <input className="search-input" type="datetime-local" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
                      </label>
                      <label>
                        <span>Task type</span>
                        <select className="search-input" value={taskForm.taskType} onChange={(event) => setTaskForm((current) => ({ ...current, taskType: event.target.value as TaskType }))}>
                          <option value="DOCUMENT_COLLECTION">Document collection</option><option value="COMPANY_DATA_PREPARATION">Company data preparation</option><option value="ROLE_EVALUATION">Role evaluation</option><option value="GENERAL_TASK">General task</option>
                        </select>
                      </label>
                      <div className="workspace-head-actions">
                        <button className="btn btn-outline" onClick={() => setShowTaskForm(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => void handleCreateTask()} disabled={taskLoading}>{taskLoading ? 'Assigning...' : 'Assign task'}</button>
                      </div>
                    </div>
                  )}

                  <div className="workspace-member-list">
                    <div className="workspace-side-eyebrow">Project tasks</div>
                    {tasks.length === 0 && <div className="workspace-empty">Newly assigned tasks will appear here in this session.</div>}
                    {tasks.map((task) => (
                      <div key={task.id} className="workspace-member-card">
                        <div><strong>{task.title}</strong><p>{task.taskType} · {task.priority}</p><small>{task.assignedToName || `Staff #${task.assignedToUserId ?? 'Unassigned'}`}</small></div>
                        <span className="workspace-badge info">{task.status}</span>
                      </div>
                    ))}
                  </div>

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
