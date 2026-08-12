import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { projectApi } from '../API/projectApi';
import { ROLES, useUser } from '../context/UserContext';
import type {
  CreateProjectRequest,
  DuplicateCompanyCheckResponse,
  PageResult,
  CandidateResponse,
  ProfileResponse,
  ProjectTaskResponse,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus,
  ProjectType,
  RelationshipType,
  RelationshipTypeOption,
  TaskPriority,
  TaskType,
  UpdateProjectRequest,
} from '../types/domain';

type ProjectFormState = {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId: string;
  targetCompanyName: string;
  targetRelationshipType: string;
  description: string;
  plannedEndDate: string;
};

type FeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

type ToastState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || profile.companyId;

const profileRoleLabel = (profile: ProfileResponse) => {
  if (profile.tags?.length) return profile.tags.join(', ');
  if (profile.reviewStatus === 'VERIFIED') return 'APPROVED';
  return profile.reviewStatus || 'Company profile';
};

const formatProjectDate = (value: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('vi-VN');
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New company research',
  UPDATE_EXISTING_COMPANY: 'Update existing company',
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Inactive',
  ACTIVE: 'Active',
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

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: 'PARTNER_WITH', label: 'Partner' },
  { value: 'COMPETITOR_OF', label: 'Competitor' },
  { value: 'SUPPLIER_OF', label: 'Supplier' },
  { value: 'CUSTOMER_OF', label: 'Customer' },
  { value: 'POTENTIAL_PARTNER_OF', label: 'Potential partner' },
];

const normalizeRelationshipInput = (input: string): RelationshipType | null => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const aliases: Record<string, RelationshipType> = {
    partner: 'PARTNER_WITH',
    'partner with': 'PARTNER_WITH',
    competitor: 'COMPETITOR_OF',
    'competitor of': 'COMPETITOR_OF',
    supplier: 'SUPPLIER_OF',
    'supplier of': 'SUPPLIER_OF',
    customer: 'CUSTOMER_OF',
    'customer of': 'CUSTOMER_OF',
    'potential partner': 'POTENTIAL_PARTNER_OF',
    'potential partner of': 'POTENTIAL_PARTNER_OF',
  };
  if (aliases[normalized]) return aliases[normalized];

  const matched = RELATIONSHIP_OPTIONS.find((option) =>
    option.label.toLowerCase() === normalized || option.value.toLowerCase() === normalized
  );

  return matched?.value ?? null;
};

const initialProjectForm = (): ProjectFormState => ({
  projectName: '',
  projectType: 'RESEARCH_NEW_COMPANY',
  targetCompanyProfileId: '',
  targetCompanyName: '',
  targetRelationshipType: 'PARTNER_WITH',
  description: '',
  plannedEndDate: '',
});

type ProjectManagementProps = {
  setActivePage?: (page: string) => void;
};

export const ProjectManagement: React.FC<ProjectManagementProps> = ({ setActivePage }) => {
  const { t } = useTranslation('projects-overview');
  const { currentUser } = useUser();
  const isStaffView = currentUser?.role === ROLES.STAFF;
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
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [, setTasks] = useState<ProjectTaskResponse[]>([]);
  const [, setCandidates] = useState<CandidateResponse[]>([]);
  const [companyOptions, setCompanyOptions] = useState<ProfileResponse[]>([]);
  const [companyOptionsLoading, setCompanyOptionsLoading] = useState(false);
  const [relationshipOptions, setRelationshipOptions] = useState<RelationshipTypeOption[]>(RELATIONSHIP_OPTIONS);
  const [relationshipOptionsLoading, setRelationshipOptionsLoading] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [, setDetailError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (selectedProject && sessionStorage.getItem('apms-focus-workspace') === 'true') {
      sessionStorage.removeItem('apms-focus-workspace');
      setTimeout(() => {
        document.getElementById('workspace-detail-sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [selectedProject]);

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

  const reloadCompanyOptions = useCallback(async (signal?: AbortSignal) => {
    setCompanyOptionsLoading(true);
    try {
      const res = await api.get<PageResult<ProfileResponse>>('/profiles', {
        params: { page: 0, size: 100, excludeOwner: true },
        signal,
      });

      if (!signal?.aborted) {
        setCompanyOptions(res.data?.content ?? []);
      }
    } catch {
      if (!signal?.aborted) {
        setCompanyOptions([]);
      }
    } finally {
      if (!signal?.aborted) {
        setCompanyOptionsLoading(false);
      }
    }
  }, []);

  const reloadRelationshipOptions = useCallback(async () => {
    setRelationshipOptionsLoading(true);
    try {
      const res = await projectApi.getTargetRelationshipTypes();
      const options = Array.isArray(res.data) && res.data.length > 0 ? res.data : RELATIONSHIP_OPTIONS;
      setRelationshipOptions(options);
      setProjectForm((current) => ({
        ...current,
        targetRelationshipType: options.some((option) => option.value === current.targetRelationshipType)
          ? current.targetRelationshipType
          : options[0]?.value ?? 'PARTNER_WITH',
      }));
    } catch {
      setRelationshipOptions(RELATIONSHIP_OPTIONS);
    } finally {
      setRelationshipOptionsLoading(false);
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
      const candidateRes = await api.get<PageResult<CandidateResponse>>(`/projects/${projectId}/candidates`, { params: { page: 0, size: 100 }, signal });
      if (signal?.aborted) return;
      setCandidates(candidateRes.data?.content ?? []);
    } catch (err) {
      if (!signal?.aborted) {
        setCandidates([]);
        setDetailError(err instanceof Error ? err.message : 'Cannot load the project board.');
      }
    } finally {
      if (!signal?.aborted) setBoardLoading(false);
    }
  }, []);

  const reloadProjectTasks = useCallback(async (projectId: number, signal?: AbortSignal) => {
    try {
      const res = await api.get<PageResult<ProjectTaskResponse>>(`/projects/${projectId}/tasks`, {
        params: { page: 0, size: 100 },
        signal,
      });

      if (!signal?.aborted) {
        setTasks(res.data?.content ?? []);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setTasks([]);
        setDetailError(err instanceof Error ? err.message : 'Cannot load project tasks.');
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reloadProjects(controller.signal);
    return () => controller.abort();
  }, [reloadProjects]);

  useEffect(() => {
    void reloadRelationshipOptions();
  }, [reloadRelationshipOptions]);

  useEffect(() => {
    setCurrentPage(0);
  }, [projectSearch]);



  useEffect(() => {
    if (!showCreateForm) return;
    const controller = new AbortController();
    void reloadCompanyOptions(controller.signal);
    return () => controller.abort();
  }, [reloadCompanyOptions, showCreateForm]);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedProjectId) {
      setSelectedProject(null);
      setDetailError(null);
      setTasks([]);
      setCandidates([]);
      return () => controller.abort();
    }

    const fallback = projects.find((project) => project.id === selectedProjectId) ?? null;
    if (fallback) {
      setSelectedProject(fallback);
    }

    void reloadProjectDetail(selectedProjectId, controller.signal);
    void reloadProjectBoard(selectedProjectId, controller.signal);
    void reloadProjectTasks(selectedProjectId, controller.signal);
    return () => controller.abort();
  }, [projects, reloadProjectBoard, reloadProjectDetail, reloadProjectTasks, selectedProjectId]);

  const refreshAll = async () => {
    const controller = new AbortController();
    await reloadProjects(controller.signal);
    if (selectedProjectId) {
      await reloadProjectDetail(selectedProjectId, controller.signal);
      await reloadProjectBoard(selectedProjectId, controller.signal);
      await reloadProjectTasks(selectedProjectId, controller.signal);
    }
  };

  const handleActivateProject = async (project: ProjectResponse) => {
    setFeedback(null);
    setToast(null);

    try {
      const payload = await projectApi.updateProjectStatus(project.id, {
        status: 'ACTIVE',
        note: 'Activate project from project management',
      });
      const updatedProject = payload?.data;
      setProjects((current) => current.map((item) => (
        item.id === project.id ? { ...item, ...(updatedProject ?? {}), status: 'ACTIVE' } : item
      )));
      if (selectedProjectId === project.id) {
        setSelectedProject((current) => (
          current ? { ...current, ...(updatedProject ?? {}), status: 'ACTIVE' } : current
        ));
      }
      setToast({ kind: 'success', message: 'Project activated successfully.' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to activate project.' });
    }
  };

  const canDeleteProject = (project: ProjectResponse) =>
    project.status === 'DRAFT' || project.status === 'COMPLETED';

  const openDeleteProjectModal = (project: ProjectResponse) => {
    if (!canDeleteProject(project)) {
      setToast({
        kind: 'error',
        message: 'Only Draft and Done projects can be deleted. In progress projects cannot be deleted.',
      });
      return;
    }
    setProjectToDelete(project);
    setFeedback(null);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    if (!canDeleteProject(projectToDelete)) {
      setProjectToDelete(null);
      setToast({
        kind: 'error',
        message: 'Only Draft and Done projects can be deleted. In progress projects cannot be deleted.',
      });
      return;
    }

    setDeleteLoading(true);
    try {
      await projectApi.deleteProject(projectToDelete.id);
      const deletedId = projectToDelete.id;
      const remaining = projects.filter((project) => project.id !== deletedId);
      setProjects(remaining);
      setCurrentPage((page) => Math.min(page, Math.max(Math.ceil(remaining.length / pageSize) - 1, 0)));
      setProjectToDelete(null);

      if (selectedProjectId === deletedId) {
        const nextProject = remaining[0] ?? null;
        setSelectedProjectId(nextProject?.id ?? null);
        setSelectedProject(nextProject);
        setTasks([]);
        if (nextProject) {
          localStorage.setItem('apms-active-project', String(nextProject.id));
        } else {
          localStorage.removeItem('apms-active-project');
        }
      }

      setToast({ kind: 'success', message: 'Project deleted successfully.' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete project.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateProject = async () => {
    const projectName = projectForm.projectName.trim();
    const targetCompanyProfileId = projectForm.targetCompanyProfileId.trim();
    const description = projectForm.description.trim();
    const selectedCompany = companyOptions.find((profile) => profile.companyId === targetCompanyProfileId || profile.id === targetCompanyProfileId);
    const targetRelationshipType = normalizeRelationshipInput(projectForm.targetRelationshipType);

    if (!projectName) {
      setFeedback({ kind: 'error', message: 'Project name is required.' });
      return;
    }

    if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && (!targetCompanyProfileId || !selectedCompany)) {
      setFeedback({ kind: 'error', message: 'Please select an existing company.' });
      return;
    }

    if (!targetRelationshipType) {
      setFeedback({ kind: 'error', message: 'Please enter a valid target relationship.' });
      return;
    }

    if (!projectForm.plannedEndDate) {
      setFeedback({ kind: 'error', message: 'Planned end date is required.' });
      return;
    }

    setCreateLoading(true);
    setFeedback(null);

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY') {
      try {
        const res = await projectApi.checkDuplicateCompanyName(projectName);
        if (res?.data?.duplicate) {
          setFeedback({ kind: 'error', message: 'Tên dự án hoặc doanh nghiệp đã tồn tại. Vui lòng nhập tên khác.' });
          setCreateLoading(false);
          return;
        }
      } catch (err) {
        // Ignore check error and proceed
      }
    }

    try {
      const payload: CreateProjectRequest = {
        projectName,
        projectType: projectForm.projectType,
        targetCompanyProfileId: projectForm.projectType === 'UPDATE_EXISTING_COMPANY' ? targetCompanyProfileId : null,
        targetCompanyName: projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && selectedCompany ? profileName(selectedCompany) : projectName,
        targetRelationshipType,
        description: description || null,
        plannedEndDate: projectForm.plannedEndDate,
      };

      const res = await projectApi.createProject(payload);
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

  const openProjectDetail = (project: ProjectResponse) => {
    const projectId = project.id;
    localStorage.setItem('apms-active-project', String(projectId));
    sessionStorage.setItem('apms-selected-project', JSON.stringify(project));
    setSelectedProjectId(projectId);
    setShowEditForm(false);
    setShowMemberForm(false);
    setShowTaskForm(false);
    setTasks([]);
    setActivePage?.('project-detail');
  };

  const renderProjectRow = (project: ProjectResponse, index: number) => {
    const isSelected = selectedProjectId === project.id;
    const tone = PROJECT_STATUS_TONES[project.status];
    const rowNumber = currentPage * pageSize + index + 1;

    return (
      <div
        key={project.id}
        className={`project-list-row ${isSelected ? 'selected' : ''}`}
        role="row"
      >
        <span className="project-list-index">{rowNumber}</span>
        <span className="project-list-name"><strong>{project.projectName}</strong></span>
        <span className="project-list-muted">{PROJECT_TYPE_LABELS[project.projectType]}</span>
        <span className="project-list-target">{project.targetCompanyName}</span>
        <span className="project-list-date">{formatProjectDate(project.createdAt)}</span>
        <span className={`workspace-badge ${tone}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
        <span className="project-row-actions">
          {!isStaffView && project.status === 'DRAFT' && (
            <button className="project-activate-btn" type="button" onClick={() => void handleActivateProject(project)}>
              Activate
            </button>
          )}
          <button className="project-detail-btn" type="button" onClick={() => openProjectDetail(project)}>
            View detail
          </button>
          {!isStaffView && (
            <button className="project-delete-btn" type="button" onClick={() => openDeleteProjectModal(project)}>
              Delete
            </button>
          )}
        </span>
      </div>
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
  const pageSize = 5;
  const totalPages = Math.ceil(totalElements / pageSize);
  const filteredProjects = filteredProjectsAll.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const pageStart = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const pageEnd = Math.min((currentPage + 1) * pageSize, totalElements);
  const pageCount = Math.max(totalPages, 1);

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page" id="page-project-management">
      {toast && <div className={`apms-toast ${toast.kind}`}>{toast.message}</div>}
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <div className="workspace-breadcrumbs">{t('breadcrumb.section')} <span>/</span> {t('breadcrumb.current')}</div>
            <h1>{t('title.heading')}</h1>
            {/* <p>Manage the kanban board, project scope, and member assignments from one workspace.</p> */}
          </div>
          <div className="workspace-head-actions">
            {/* <button className="btn btn-outline" onClick={() => void refreshAll()} disabled={projectsLoading || detailLoading}>Refresh</button> */}
            {!isStaffView && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm((current) => !current)}>{t('create.submit')}</button>
            )}
          </div>
        </div>
        {projectsError && <div className="workspace-inline-error">{projectsError}</div>}

        {showCreateForm && (
          <div className="modal-overlay project-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal project-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()}>
            <div className="project-modal-head">
              <div>
                <span className="workspace-side-eyebrow">{t('create.eyebrow')}</span>
                <h3 id="create-project-title">{t('create.title')}</h3>
                <p>{t('create.description')}</p>
              </div>
              <button className="project-modal-close" type="button" aria-label={t('create.closeAria')} onClick={() => setShowCreateForm(false)}>&times;</button>
            </div>
            {feedback?.kind === 'error' && (
              <div className="project-modal-feedback workspace-inline-error">{feedback.message}</div>
            )}
            <div className="workspace-form-grid">
              <label>
                <span>{t('create.projectNameLabel')}</span>
                <input
                  className="search-input"
                  placeholder={t('create.projectNamePlaceholder')}
                  value={projectForm.projectName}
                  onChange={(event) => setProjectForm((current) => ({ ...current, projectName: event.target.value }))}
                />
              </label>
              <label>
                <span>{t('create.projectTypeLabel')}</span>
                <select
                  className="search-input"
                  value={projectForm.projectType}
                  onChange={(event) => {
                    const projectType = event.target.value as ProjectType;
                    setProjectForm((current) => ({
                      ...current,
                      projectType,
                      targetCompanyName: '',
                      targetCompanyProfileId: '',
                    }));
                  }}
                >
                  <option value="RESEARCH_NEW_COMPANY">{t('create.typeNewCompany')}</option>
                  <option value="UPDATE_EXISTING_COMPANY">{t('create.typeUpdateCompany')}</option>
                </select>
              </label>
              {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && (
                <label>
                  <span>{t('create.existingCompanyLabel')}</span>
                  <select
                    className="search-input"
                    value={projectForm.targetCompanyProfileId}
                    onChange={(event) => {
                      const selectedId = event.target.value;
                      const profile = companyOptions.find((item) => item.companyId === selectedId || item.id === selectedId);
                      setProjectForm((current) => ({
                        ...current,
                        targetCompanyProfileId: selectedId,
                        targetCompanyName: profile ? profileName(profile) : '',
                      }));
                    }}
                  >
                    <option value="">{companyOptionsLoading ? t('create.loadingCompanies') : t('create.selectCompany')}</option>
                    {companyOptions.map((profile) => (
                      <option key={profile.companyId || profile.id} value={profile.companyId}>
                        {profileName(profile)} - {profileRoleLabel(profile)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>{t('create.relationshipLabel')}</span>
                <select
                  className="search-input"
                  value={projectForm.targetRelationshipType}
                  onChange={(event) => setProjectForm((current) => ({ ...current, targetRelationshipType: event.target.value }))}
                  disabled={relationshipOptionsLoading}
                >
                  <option value="">{relationshipOptionsLoading ? t('create.loadingRelationships') : t('create.selectRelationship')}</option>
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('create.descriptionLabel')}</span>
                <input className="search-input" placeholder={t('create.descriptionPlaceholder')} value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label>
                <span>{t('create.plannedEndDateLabel')}</span>
                <input
                  className="search-input"
                  type="date"
                  value={projectForm.plannedEndDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(event) => setProjectForm((current) => ({ ...current, plannedEndDate: event.target.value }))}
                />
              </label>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>{t('create.cancel')}</button>
              <button className="btn btn-primary" onClick={() => void handleCreateProject()} disabled={createLoading}>
                {createLoading ? t('create.submitting') : t('create.submit')}
              </button>
            </div>
          </div>
          </div>
        )}

        {projectToDelete && (
          <div className="modal-overlay project-modal-overlay" onClick={() => !deleteLoading && setProjectToDelete(null)}>
            <div className="modal project-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-project-title" onClick={(event) => event.stopPropagation()}>
              <div className="project-modal-head">
                <div>
                  <span className="workspace-side-eyebrow">Delete project</span>
                  <h3 id="delete-project-title">Confirm project deletion</h3>
                  <p>This action removes the project workspace from APMS.</p>
                </div>
                <button className="project-modal-close" type="button" aria-label="Close delete project modal" onClick={() => setProjectToDelete(null)} disabled={deleteLoading}>&times;</button>
              </div>
              <div className="project-delete-summary">
                <strong>{projectToDelete.projectName}</strong>
                <span className={`workspace-badge ${PROJECT_STATUS_TONES[projectToDelete.status]}`}>
                  {PROJECT_STATUS_LABELS[projectToDelete.status]}
                </span>
                <p>Only Draft and Done projects are allowed to be deleted. This project is eligible for deletion.</p>
              </div>
              <div className="workspace-head-actions">
                <button className="btn btn-outline" onClick={() => setProjectToDelete(null)} disabled={deleteLoading}>Cancel</button>
                <button className="btn btn-danger" onClick={() => void handleDeleteProject()} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Delete project'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="workspace-focus-card">
          <div>
            {/* <span className="workspace-side-eyebrow">Board sync</span> */}
            {/* <h3>Selected board drives downstream task intake</h3> */}
            {/* <p>When you select a project here, APMS uses it as the active workspace for document upload, extraction, and candidate review.</p> */}
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
            <div className="project-list-row project-list-head" role="row"><span>No.</span><span>Project</span><span>Type</span><span>Target company</span><span>Created</span><span>Status</span><span>Action</span></div>
            {filteredProjects.length === 0 ? <div className="workspace-empty">No projects found.</div> : filteredProjects.map(renderProjectRow)}
            <div className="project-table-pagination">
              <span>Showing {pageStart}-{pageEnd} of {totalElements} projects</span>
              <div>
                <button className="workspace-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(0)}>First</button>
                <button className="workspace-page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage((c) => Math.max(c - 1, 0))}>Prev</button>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                    onClick={() => setCurrentPage(index)}
                    disabled={totalElements === 0}
                  >
                    {index + 1}
                  </button>
                ))}
                <button className="workspace-page-btn" disabled={currentPage >= pageCount - 1} onClick={() => setCurrentPage((c) => Math.min(c + 1, pageCount - 1))}>Next</button>
                <button className="workspace-page-btn" disabled={currentPage >= pageCount - 1} onClick={() => setCurrentPage(pageCount - 1)}>Last</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

