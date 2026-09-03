import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
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
  KeyResultReferenceResponse,
} from '../types/domain';

type ProjectFormState = {
  projectName: string;
  projectType: ProjectType;
  targetCompanyProfileId: string;
  targetCompanyName: string;
  targetCompanyTaxCode: string;
  targetRelationshipType: string;
  description: string;
  objective: string;
  plannedEndDate: string;
  keyResults: Array<{ type: string; weight: number }>;
};

type DuplicateTaxCodeState = {
  loading: boolean;
  checked: boolean;
  exists: boolean;
  matchType: 'COMPANY_PROFILE' | 'ACTIVE_PROJECT' | null;
  companyProfileId?: string;
  projectId?: number;
  companyName?: string;
  taxCode?: string;
} | null;

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
  UPDATE_EXISTING_COMPANY: 'Existing company',
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Inactive',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
  CLOSED: 'Closed',
};

const PROJECT_STATUS_TONES: Record<ProjectStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  ACTIVE: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  ARCHIVED: 'neutral',
  CLOSED: 'neutral',
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
  targetCompanyTaxCode: '',
  targetCompanyName: '',
  targetRelationshipType: 'PARTNER_WITH',
  description: '',
  objective: '',
  plannedEndDate: '',
  keyResults: [],
});

type ProjectManagementProps = {
  setActivePage?: (page: string) => void;
};

export const ProjectManagement: React.FC<ProjectManagementProps> = ({ setActivePage }) => {
  const { t } = useTranslation('projects-overview');
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const isStaffView = currentUser?.role === ROLES.STAFF;
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
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
  const [krReference, setKrReference] = useState<KeyResultReferenceResponse[]>([]);
  const [krReferenceLoading, setKrReferenceLoading] = useState(false);
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
  const [taxCodeCheck, setTaxCodeCheck] = useState<DuplicateTaxCodeState>(null);

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

  const reloadKrReference = useCallback(async (signal?: AbortSignal) => {
    setKrReferenceLoading(true);
    try {
      const res = await projectApi.getKeyResultReference();
      if (!signal?.aborted && Array.isArray(res.data)) {
        setKrReference(res.data);
      }
    } catch {
      if (!signal?.aborted) setKrReference([]);
    } finally {
      if (!signal?.aborted) setKrReferenceLoading(false);
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
    void reloadKrReference(controller.signal);
    return () => controller.abort();
  }, [reloadCompanyOptions, reloadKrReference, showCreateForm]);

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
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['projectDetails', project.id] });
      void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
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
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['projectDetails', deletedId] });
      void queryClient.invalidateQueries({ queryKey: ['project', deletedId] });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete project.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTaxCodeCheck = async (taxCode: string) => {
    if (!taxCode.trim()) {
      setTaxCodeCheck(null);
      return;
    }
    setTaxCodeCheck({ loading: true, checked: false, exists: false, matchType: null });
    try {
      const res = await projectApi.checkDuplicateTaxCode(taxCode);
      const data = res?.data;
      if (data) {
        setTaxCodeCheck({
          loading: false,
          checked: true,
          exists: data.exists,
          matchType: data.matchType,
          companyProfileId: data.companyProfileId,
          projectId: data.projectId,
          companyName: data.companyName,
          taxCode: data.taxCode,
        });
      }
    } catch (err) {
      setTaxCodeCheck({ loading: false, checked: true, exists: false, matchType: null });
    }
  };

  const handleCreateProject = async () => {
    const projectName = projectForm.projectName.trim();
    const targetCompanyProfileId = projectForm.targetCompanyProfileId.trim();
    const description = projectForm.description.trim();
    const objective = projectForm.objective.trim();
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

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY' && taxCodeCheck?.checked && taxCodeCheck.exists && taxCodeCheck.matchType === 'ACTIVE_PROJECT') {
      setFeedback({ kind: 'error', message: 'Company tax code already exists in an active project. Duplicate creation is not allowed.' });
      return;
    }

    if (!projectForm.plannedEndDate) {
      setFeedback({ kind: 'error', message: 'Planned end date is required.' });
      return;
    }

    const selectedKRs = projectForm.keyResults.filter((kr) => kr.weight > 0);
    if (selectedKRs.length === 0) {
      setFeedback({ kind: 'error', message: 'At least one Project Deliverable must be selected.' });
      return;
    }

    const totalWeight = selectedKRs.reduce((sum, kr) => sum + kr.weight, 0);
    if (totalWeight !== 100) {
      setFeedback({ kind: 'error', message: 'Total Progress Weight of Project Deliverables must be exactly 100.' });
      return;
    }

    setCreateLoading(true);
    setFeedback(null);

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY') {
      if (projectForm.targetCompanyTaxCode) {
        try {
          const res = await api.get<boolean>(`/profiles/exists`, { params: { taxCode: projectForm.targetCompanyTaxCode } });
          if (res.data === true) {
            setFeedback({ kind: 'error', message: 'A company with this tax ID already exists. Please select the "Existing company" project type.' });
            setCreateLoading(false);
            return;
          }
        } catch (error) {
          console.error("Failed to check tax code", error);
        }
      }

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
        targetCompanyName: projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && selectedCompany ? profileName(selectedCompany) : projectForm.targetCompanyName,
        targetCompanyTaxCode: projectForm.projectType === 'RESEARCH_NEW_COMPANY' ? projectForm.targetCompanyTaxCode : undefined,
        targetRelationshipType,
        description: description || null,
        objective: objective || null,
        plannedEndDate: projectForm.plannedEndDate,
        keyResults: selectedKRs,
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
    const displayStatus = project.status === 'ACTIVE' && project.isOverdue ? 'Overdue' : PROJECT_STATUS_LABELS[project.status];
    const displayTone = project.status === 'ACTIVE' && project.isOverdue ? 'danger' : tone;
    
    let barColor = 'var(--bg-input)';
    const pct = Math.max(0, Math.min(100, project.progressPercentage ?? 0));
    if (pct > 0 && pct < 50) barColor = 'var(--danger, #ef4444)';
    else if (pct >= 50 && pct < 80) barColor = 'var(--warning, #f59e0b)';
    else if (pct >= 80 && pct < 100) barColor = 'var(--primary, #3b82f6)';
    else if (pct === 100) barColor = 'var(--success, #10b981)';

    return (
      <div
        key={project.id}
        className={`manager-project-row ${isSelected ? 'selected' : ''}`}
        role="row"
      >
        <span className="project-list-muted">{rowNumber}</span>
        <span className="project-list-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}><strong>{project.projectName}</strong></span>
        <span className="project-list-target" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{project.targetCompanyName}</span>
        <span className="project-list-muted">{PROJECT_TYPE_LABELS[project.projectType]}</span>
        <div className="manager-project-progress" title={`${Math.round(pct)}% complete`}>
          <div className="manager-project-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
          <span className="manager-project-progress-label">{Math.round(pct)}%</span>
        </div>
        <span className="project-list-date">{project.plannedEndDate ? formatProjectDate(project.plannedEndDate) : '—'}</span>
        <span className={`workspace-badge ${displayTone}`}>{displayStatus}</span>
        <span className="manager-project-action">
          <button className="project-detail-btn" type="button" onClick={() => openProjectDetail(project)}>
            View detail
          </button>
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
  }).filter((p) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return p.status === 'ACTIVE' && p.isOverdue;
    if (statusFilter === 'ACTIVE') return p.status === 'ACTIVE' && !p.isOverdue;
    return p.status === statusFilter;
  }).filter((p) => {
    if (typeFilter === 'ALL') return true;
    return p.projectType === typeFilter;
  });

  useEffect(() => {
    setCurrentPage(0);
  }, [projectSearch, statusFilter, typeFilter]);

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
            <h1>Project Management</h1>
            <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overview of projects you manage</p>
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
          <div className="modal project-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="project-modal-head" style={{ flexShrink: 0 }}>
              <div>
                <span className="workspace-side-eyebrow">{t('create.eyebrow')}</span>
                <h3 id="create-project-title">{t('create.title')}</h3>
                <p>Define the project goal, target company, and deliverables.</p>
              </div>
              <button className="project-modal-close" type="button" aria-label={t('create.closeAria')} onClick={() => setShowCreateForm(false)}>&times;</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {feedback?.kind === 'error' && (
                <div className="project-modal-feedback workspace-inline-error" style={{ marginTop: '16px' }}>{feedback.message}</div>
              )}
              
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Information</h4>
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
                  <label>
                    <span>Target company</span>
                    {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                        className="search-input"
                        value={projectForm.targetCompanyProfileId}
                        onChange={(event) => {
                          const selectedId = event.target.value;
                          const profile = companyOptions.find((item) => item.companyId === selectedId || item.id === selectedId);
                          setProjectForm((current) => {
                            const newRelationship = profile?.relationshipType || current.targetRelationshipType;
                            const normalizedRel = normalizeRelationshipInput(newRelationship);
                            const validKrs = current.keyResults.filter((kr) => {
                              const ref = krReference.find((r) => r.type === kr.type);
                              return !ref || ref.supportedRelationshipTypes.length === 0 || ref.supportedRelationshipTypes.includes(normalizedRel as RelationshipType);
                            });
                            return {
                              ...current,
                              targetCompanyProfileId: selectedId,
                              targetCompanyName: profile ? profileName(profile) : '',
                              targetRelationshipType: newRelationship,
                              keyResults: validKrs,
                            };
                          });
                        }}
                      >
                        <option value="">{companyOptionsLoading ? t('create.loadingCompanies') : t('create.selectCompany')}</option>
                        {companyOptions.map((profile) => (
                          <option key={profile.companyId || profile.id} value={profile.companyId}>
                            {profileName(profile)} - {profileRoleLabel(profile)}
                          </option>
                        ))}
                      </select>
                      {projectForm.targetCompanyProfileId && (
                        <input
                          className="search-input"
                          placeholder="No tax code available"
                          value={companyOptions.find(item => item.companyId === projectForm.targetCompanyProfileId || item.id === projectForm.targetCompanyProfileId)?.identity?.taxCode || ''}
                          readOnly
                          style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)' }}
                        />
                      )}
                    </div>
                  ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          className="search-input"
                          placeholder="Enter target company name"
                          value={projectForm.targetCompanyName}
                          onChange={(event) => setProjectForm((current) => ({ ...current, targetCompanyName: event.target.value }))}
                        />
                        <input
                          className="search-input"
                          placeholder="Enter company tax code"
                          value={projectForm.targetCompanyTaxCode}
                          onChange={(event) => setProjectForm((current) => ({ ...current, targetCompanyTaxCode: event.target.value }))}
                          onBlur={(event) => void handleTaxCodeCheck(event.target.value)}
                        />
                        {taxCodeCheck?.loading && <span style={{ fontSize: '0.85rem', color: '#666' }}>Checking tax code...</span>}
                        {taxCodeCheck?.checked && taxCodeCheck.exists && taxCodeCheck.matchType === 'COMPANY_PROFILE' && (
                          <div style={{ backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', color: '#856404', marginTop: '4px' }}>
                            Found existing company: <strong>{taxCodeCheck.companyName}</strong>. 
                            <button type="button" onClick={() => {
                              setProjectForm(current => ({
                                ...current, 
                                projectType: 'UPDATE_EXISTING_COMPANY',
                                targetCompanyProfileId: taxCodeCheck.companyProfileId || ''
                              }));
                            }} style={{ marginLeft: '8px', border: 'none', background: 'transparent', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                              Use existing company
                            </button>
                          </div>
                        )}
                        {taxCodeCheck?.checked && taxCodeCheck.exists && taxCodeCheck.matchType === 'ACTIVE_PROJECT' && (
                          <div style={{ backgroundColor: '#f8d7da', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', color: '#721c24', marginTop: '4px' }}>
                            Company is already being researched in an active project (<strong>{taxCodeCheck.companyName}</strong>). Duplicate creation is blocked.
                          </div>
                        )}
                      </div>
                    )}
                  </label>
                  <label>
                    <span>{t('create.relationshipLabel')}</span>
                    <select
                      className="search-input"
                      value={projectForm.targetRelationshipType}
                      onChange={(event) => {
                        const newRelationship = event.target.value;
                        const normalizedRel = normalizeRelationshipInput(newRelationship);
                        setProjectForm((current) => {
                          const validKrs = current.keyResults.filter((kr) => {
                            const ref = krReference.find((r) => r.type === kr.type);
                            return !ref || ref.supportedRelationshipTypes.length === 0 || ref.supportedRelationshipTypes.includes(normalizedRel as RelationshipType);
                          });
                          return {
                            ...current,
                            targetRelationshipType: newRelationship,
                            keyResults: validKrs,
                          };
                        });
                      }}
                      disabled={relationshipOptionsLoading || projectForm.projectType === 'UPDATE_EXISTING_COMPANY'}
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
                    <span>Due date</span>
                    <input
                      className="search-input"
                      type="date"
                      value={projectForm.plannedEndDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(event) => setProjectForm((current) => ({ ...current, plannedEndDate: event.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Goal</h4>
                <label style={{ display: 'block' }}>
                  <textarea
                    className="search-input"
                    style={{ minHeight: '60px', padding: '12px', width: '100%', resize: 'vertical' }}
                    placeholder="Describe the main outcome this project should deliver."
                    value={projectForm.objective}
                    onChange={(event) => setProjectForm((current) => ({ ...current, objective: event.target.value }))}
                  />
                </label>
              </div>

              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Project Deliverables</h4>
                  {(() => {
                    const totalWeight = projectForm.keyResults.reduce((sum, kr) => sum + kr.weight, 0);
                    const is100 = totalWeight === 100;
                    const isOver = totalWeight > 100;
                    return (
                      <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: is100 ? 'var(--success-text)' : isOver ? 'var(--danger-text)' : 'inherit' }}>
                          Total Progress Weight: {totalWeight} / 100
                        </div>
                        {!is100 && !isOver && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {100 - totalWeight}% remaining
                          </div>
                        )}
                        {isOver && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)' }}>
                            Exceeds 100%
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {krReferenceLoading ? (
                  <div>Loading Project Deliverables...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {krReference.map((kr) => {
                      const isSupported = kr.supportedRelationshipTypes.length === 0 || kr.supportedRelationshipTypes.includes(normalizeRelationshipInput(projectForm.targetRelationshipType) as RelationshipType);
                      const selectedKr = projectForm.keyResults.find((k) => k.type === kr.type);
                      const isSelected = !!selectedKr;
                      const supportedLabels = kr.supportedRelationshipTypes.map(rt => relationshipOptions.find(o => o.value === rt)?.label || rt).join(', ');

                      return (
                        <div
                          key={kr.type}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--primary-light)' : 'transparent',
                            opacity: isSupported ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`kr-checkbox-${kr.type}`}
                            checked={isSelected}
                            disabled={!isSupported}
                            onChange={(e) => {
                              if (!isSupported) return;
                              const checked = e.target.checked;
                              setProjectForm((current) => {
                                const existing = current.keyResults.filter((k) => k.type !== kr.type);
                                if (checked) {
                                  return { ...current, keyResults: [...existing, { type: kr.type, weight: 10 }] };
                                } else {
                                  return { ...current, keyResults: existing };
                                }
                              });
                            }}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: isSupported ? 'pointer' : 'not-allowed',
                              flexShrink: 0,
                              margin: 0
                            }}
                          />
                          <label htmlFor={`kr-checkbox-${kr.type}`} style={{ flex: 1, cursor: isSupported ? 'pointer' : 'not-allowed', margin: 0, display: 'block' }}>
                            <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary-dark)' : 'inherit' }}>{kr.displayName}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{kr.description}</div>
                            {!isSupported && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginTop: '8px' }}>
                                Available only for {supportedLabels} projects.
                              </div>
                            )}
                          </label>
                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <input
                                type="number"
                                title="Progress Weight"
                                className="search-input"
                                style={{ width: '70px', padding: '6px 10px', textAlign: 'center' }}
                                value={selectedKr.weight}
                                min={1}
                                max={100}
                                onChange={(e) => {
                                  const newWeight = parseInt(e.target.value, 10) || 0;
                                  setProjectForm((current) => ({
                                    ...current,
                                    keyResults: current.keyResults.map((k) => (k.type === kr.type ? { ...k, weight: newWeight } : k)),
                                  }));
                                }}
                              />
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '32px', marginBottom: '32px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional notes (optional)</h4>
                <label style={{ display: 'block' }}>
                  <textarea
                    className="search-input"
                    placeholder="Enter any additional information..."
                    value={projectForm.description}
                    onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                    style={{ minHeight: '60px', padding: '12px', width: '100%', resize: 'vertical' }}
                  />
                </label>
              </div>
            </div>

            <div className="workspace-head-actions" style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>{t('create.cancel')}</button>
              <button
                className="btn btn-primary"
                onClick={() => void handleCreateProject()}
                disabled={createLoading || projectForm.keyResults.reduce((sum, kr) => sum + kr.weight, 0) !== 100}
              >
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
          <div className="workspace-focus-metrics">
            <article>
              <strong>{projects.length}</strong>
              <span>Total Projects</span>
            </article>
            <article>
              <strong>{projects.filter(p => p.status === 'ACTIVE' && !p.isOverdue).length}</strong>
              <span>Active</span>
            </article>
            <article>
              <strong>{projects.filter(p => p.status === 'ACTIVE' && p.isOverdue).length}</strong>
              <span>Overdue</span>
            </article>
            <article>
              <strong>{projects.filter(p => p.status === 'CLOSED' || p.status === 'COMPLETED').length}</strong>
              <span>Closed / Completed</span>
            </article>
          </div>
        </div>

        <div className="manager-project-container">
          <div role="table" aria-label="Projects" style={{ width: '100%', minWidth: 0 }}>
            <div className="manager-project-filters">
              <input
                className="search-input"
                type="text"
                placeholder="Search by project name, ID, or company..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
              <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="DRAFT">Inactive</option>
                <option value="ACTIVE">Active</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CLOSED">Closed</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select className="search-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="RESEARCH_NEW_COMPANY">New Company Research</option>
                <option value="UPDATE_EXISTING_COMPANY">Update Existing Company</option>
              </select>
            </div>
            <div className="manager-project-header" role="row">
              <span>STT</span><span>PROJECT</span><span>TARGET COMPANY</span><span>TYPE</span><span>PROGRESS</span><span>END DATE</span><span>STATUS</span><span>ACTION</span>
            </div>
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

