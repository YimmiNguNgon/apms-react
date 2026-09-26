import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../API/projectApi';
import { ROLES, useUser } from '../context/UserContext';
import {
  balanceDeliverableWeights,
  RELATIONSHIP_OPTIONS,
  CONTRACT_ELIGIBLE_RELATIONSHIPS,
  isRelationshipContractEligible,
  normalizeRelationshipInput,
  getProfileCanonicalRelationship,
  filterAndRebalanceDeliverables,
  findCompanyProfile,
  isDeliverableMandatory,
  getDeliverableMandatoryReason,
  getLocalTodayDateString,
  validateProjectDueDate,
} from '../utils/deliverableUtils';
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
  matchType: 'COMPANY_PROFILE' | 'ACTIVE_PROJECT' | 'OPEN_RESEARCH_PROJECT' | null;
  companyProfileId?: string;
  projectId?: number;
  companyName?: string;
  taxCode?: string;
  hasOpenProject?: boolean;
  openProjectId?: number;
  openProjectName?: string;
  openProjectStatus?: string;
  existingOfficialCompany?: boolean;
  openResearchProject?: boolean;
  canCurrentManagerManage?: boolean;
} | null;

type OpenProjectConflictState = {
  loading: boolean;
  hasOpenProject: boolean;
  projectId?: number;
  projectName?: string;
  status?: string;
  companyName?: string;
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
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  RESEARCH_NEW_COMPANY: 'New Company Research',
  UPDATE_EXISTING_COMPANY: 'Existing Company Update',
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
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

const formatProjectStatus = (status?: string | null) => {
  if (!status) return 'Active';
  return PROJECT_STATUS_LABELS[status as ProjectStatus] || status;
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
  keyResults: [{ type: 'BASIC_COMPANY_INFORMATION', weight: 100 }],
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
  const [taxCodeError, setTaxCodeError] = useState<string | null>(null);
  const [openProjectConflict, setOpenProjectConflict] = useState<OpenProjectConflictState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const storedToast = sessionStorage.getItem('apms-toast-message');
    if (storedToast) {
      sessionStorage.removeItem('apms-toast-message');
      setToast({ kind: 'success', message: storedToast });
    }
  }, []);

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
        params: {
          page: 0,
          size: 100,
          excludeOwner: true,
          officialOnly: true,
          managedByMe: currentUser?.role === ROLES.MANAGER ? true : undefined,
        },
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
  }, [currentUser?.role]);

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
      setProjectForm((current) => {
        if (current.projectType === 'UPDATE_EXISTING_COMPANY') {
          return current;
        }
        return {
          ...current,
          targetRelationshipType: options.some((option) => option.value === current.targetRelationshipType)
            ? current.targetRelationshipType
            : options[0]?.value ?? 'PARTNER_WITH',
        };
      });
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
    if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && projectForm.targetCompanyProfileId && companyOptions.length > 0) {
      const profile = findCompanyProfile(companyOptions, projectForm.targetCompanyProfileId);
      if (profile) {
        const canonicalRel = getProfileCanonicalRelationship(profile);
        if (canonicalRel && !projectForm.targetRelationshipType) {
          setProjectForm((current) => {
            const rebalancedKrs = filterAndRebalanceDeliverables(current.keyResults, canonicalRel, krReference, 'UPDATE_EXISTING_COMPANY', false);
            return {
              ...current,
              targetRelationshipType: canonicalRel,
              targetCompanyName: current.targetCompanyName || profileName(profile),
              targetCompanyTaxCode: current.targetCompanyTaxCode || profile.identity?.taxCode || '',
              keyResults: rebalancedKrs,
            };
          });
        }
      }
    }
  }, [companyOptions, projectForm.projectType, projectForm.targetCompanyProfileId, projectForm.targetRelationshipType, krReference]);

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
    project.status === 'DRAFT';

  const openDeleteProjectModal = (project: ProjectResponse) => {
    if (!canDeleteProject(project)) {
      setToast({
        kind: 'error',
        message: 'Only draft projects can be deleted.',
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
        message: 'Only draft projects can be deleted.',
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

      setToast({ kind: 'success', message: 'Draft project deleted successfully.' });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['projectDetails', deletedId] });
      void queryClient.invalidateQueries({ queryKey: ['project', deletedId] });
      void queryClient.invalidateQueries({ queryKey: ['check-open-project'] });
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
          hasOpenProject: data.hasOpenProject,
          openProjectId: data.openProjectId,
          openProjectName: data.openProjectName,
          openProjectStatus: data.openProjectStatus,
          existingOfficialCompany: data.existingOfficialCompany,
          openResearchProject: data.openResearchProject,
          canCurrentManagerManage: data.canCurrentManagerManage,
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
    const selectedCompany = findCompanyProfile(companyOptions, targetCompanyProfileId);
    const targetRelationshipType = normalizeRelationshipInput(projectForm.targetRelationshipType);

    if (!projectName) {
      setFeedback({ kind: 'error', message: 'Project name is required.' });
      return;
    }

    if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY') {
      if (!targetCompanyProfileId || !selectedCompany) {
        setFeedback({ kind: 'error', message: 'Please select an existing company.' });
        return;
      }
      const currentRel = getProfileCanonicalRelationship(selectedCompany);
      const isRelChanged = currentRel && targetRelationshipType && currentRel !== targetRelationshipType;
      const isEligible = isRelationshipContractEligible(targetRelationshipType);
      if (isRelChanged && isEligible) {
        const hasContract = projectForm.keyResults.some((kr) => kr.type === 'CONTRACT_INFORMATION' && kr.weight > 0);
        if (!hasContract) {
          setFeedback({
            kind: 'error',
            message: 'Contract Information is required when changing the company relationship.',
          });
          return;
        }
      }
    }

    if (!targetRelationshipType) {
      setFeedback({ kind: 'error', message: 'Please enter a valid target relationship.' });
      return;
    }

    if (hasProjectConflict) {
      setFeedback({
        kind: 'error',
        message: 'An unfinished project already exists for this company. Complete or close the existing project before creating another one.',
      });
      return;
    }

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY' && projectForm.targetCompanyTaxCode) {
      if (!/^\d+$/.test(projectForm.targetCompanyTaxCode.trim())) {
        setTaxCodeError('Tax Code must contain numbers only.');
        setFeedback({ kind: 'error', message: 'Tax Code must contain numbers only.' });
        return;
      }
    }

    if (taxCodeError) {
      setFeedback({ kind: 'error', message: 'Tax Code must contain numbers only.' });
      return;
    }

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY' && taxCodeCheck?.checked && taxCodeCheck.exists) {
      if (taxCodeCheck.existingOfficialCompany || taxCodeCheck.matchType === 'COMPANY_PROFILE') {
        setFeedback({ kind: 'error', message: 'An official company already exists with this tax code. Please select the "Update existing company" project type.' });
        return;
      }
      if (taxCodeCheck.openResearchProject || taxCodeCheck.matchType === 'OPEN_RESEARCH_PROJECT' || taxCodeCheck.matchType === 'ACTIVE_PROJECT' || taxCodeCheck.hasOpenProject) {
        setFeedback({ kind: 'error', message: 'A New Company Research project already exists for this Tax Code. Complete or close the existing project before creating another one.' });
        return;
      }
    }

    if (!projectForm.plannedEndDate) {
      setFeedback({ kind: 'error', message: 'Planned end date is required.' });
      return;
    }

    const dueDateErr = validateProjectDueDate(projectForm.plannedEndDate);
    if (dueDateErr) {
      setFeedback({ kind: 'error', message: dueDateErr });
      return;
    }

    const isTargetContractEligible = isRelationshipContractEligible(targetRelationshipType);
    const sanitizedKRs = projectForm.keyResults.filter((kr) => {
      if (kr.type === 'CONTRACT_INFORMATION' && !isTargetContractEligible) {
        return false;
      }
      if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY') {
        return kr.type === 'FINANCIAL_INFORMATION' || kr.type === 'CONTRACT_INFORMATION';
      }
      return true;
    });

    const selectedKRs = sanitizedKRs.filter((kr) => kr.weight > 0);
    if (selectedKRs.length === 0) {
      setFeedback({ kind: 'error', message: 'At least one Project Deliverable must be selected.' });
      return;
    }

    if (projectForm.projectType === 'RESEARCH_NEW_COMPANY') {
      const hasBasic = selectedKRs.some((kr) => kr.type === 'BASIC_COMPANY_INFORMATION');
      if (!hasBasic) {
        setFeedback({ kind: 'error', message: 'Basic Company Information is mandatory for New Company Research projects.' });
        return;
      }
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
      const taxCode = projectForm.projectType === 'UPDATE_EXISTING_COMPANY'
        ? (selectedCompany?.identity?.taxCode || projectForm.targetCompanyTaxCode || undefined)
        : (projectForm.targetCompanyTaxCode || undefined);

      const canonicalTargetId = projectForm.projectType === 'UPDATE_EXISTING_COMPANY'
        ? (selectedCompany?.companyId || targetCompanyProfileId)
        : null;

      const payload: CreateProjectRequest = {
        projectName,
        projectType: projectForm.projectType,
        targetCompanyProfileId: canonicalTargetId,
        targetCompanyName: projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && selectedCompany ? profileName(selectedCompany) : projectForm.targetCompanyName,
        targetCompanyTaxCode: taxCode,
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
    const tone = PROJECT_STATUS_TONES[project.status];
    const rowNumber = currentPage * pageSize + index + 1;
    const displayStatus = project.status === 'ACTIVE' && project.isOverdue ? 'Overdue' : PROJECT_STATUS_LABELS[project.status];
    const displayTone = project.status === 'ACTIVE' && project.isOverdue ? 'danger' : tone;
    
    const pct = Math.max(0, Math.min(100, Math.round(project.progressPercentage ?? 0)));
    const barColor = pct === 100 ? 'var(--success, #10b981)' : 'var(--primary, #2563eb)';

    return (
      <div
        key={project.id}
        className="manager-project-row"
        role="row"
      >
        <span className="project-list-muted col-center">{rowNumber}</span>
        <div className="project-col-main" title={project.projectName}>
          <strong className="project-name-primary">{project.projectName}</strong>
        </div>
        <span className="project-list-target" title={project.targetCompanyName}>{project.targetCompanyName}</span>
        <span className="project-list-type" title={PROJECT_TYPE_LABELS[project.projectType]}>{PROJECT_TYPE_LABELS[project.projectType]}</span>
        <div className="manager-project-progress" title={`${pct}% complete`}>
          <div className="manager-project-progress-track">
            <div className="manager-project-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <span className="manager-project-progress-label">{pct}%</span>
        </div>
        <span className="project-list-date col-center">{project.plannedEndDate ? formatProjectDate(project.plannedEndDate) : '—'}</span>
        <div className="col-center">
          <span className={`project-status-badge ${displayTone}`}>{displayStatus}</span>
        </div>
        <span className="manager-project-action">
          <button className="project-detail-btn" type="button" onClick={() => openProjectDetail(project)}>
            View
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

  const selectedCompanyForRel = projectForm.projectType === 'UPDATE_EXISTING_COMPANY'
    ? findCompanyProfile(companyOptions, projectForm.targetCompanyProfileId)
    : null;
  const currentRelationship = getProfileCanonicalRelationship(selectedCompanyForRel);
  const currentRelOption = RELATIONSHIP_OPTIONS.find((o) => o.value === currentRelationship);
  const currentRelLabel = currentRelOption?.label || (currentRelationship ? currentRelationship.replace(/_/g, ' ') : '—');

  const normalizedTargetRel = normalizeRelationshipInput(projectForm.targetRelationshipType);
  const targetRelOption = relationshipOptions.find((o) => o.value === projectForm.targetRelationshipType) ||
                          RELATIONSHIP_OPTIONS.find((o) => o.value === normalizedTargetRel);
  const targetRelLabel = targetRelOption?.label || (projectForm.targetRelationshipType ? projectForm.targetRelationshipType.replace(/_/g, ' ') : '—');

  const isRelationshipChanged = projectForm.projectType === 'UPDATE_EXISTING_COMPANY' &&
    !!projectForm.targetCompanyProfileId &&
    !!currentRelationship &&
    !!normalizedTargetRel &&
    normalizedTargetRel !== currentRelationship;

  const isTargetContractEligible = isRelationshipContractEligible(normalizedTargetRel);
  const isContractMandatory = isRelationshipChanged && isTargetContractEligible;

  const hasProjectConflict =
    (projectForm.projectType === 'UPDATE_EXISTING_COMPANY' && !!openProjectConflict?.hasOpenProject) ||
    (projectForm.projectType === 'RESEARCH_NEW_COMPANY' &&
      !!taxCodeCheck?.checked &&
      !!taxCodeCheck.exists &&
      (taxCodeCheck.matchType === 'ACTIVE_PROJECT' || taxCodeCheck.matchType === 'OPEN_RESEARCH_PROJECT' || !!taxCodeCheck.openResearchProject || !!taxCodeCheck.hasOpenProject));

  const handleExistingTargetCompanyChange = (selectedId: string) => {
    const profile = findCompanyProfile(companyOptions, selectedId);
    const canonicalRel = getProfileCanonicalRelationship(profile);

    if (!selectedId) {
      setOpenProjectConflict(null);
    } else {
      setOpenProjectConflict({ loading: true, hasOpenProject: false });
      projectApi
        .checkOpenProject({
          companyProfileId: selectedId,
          taxCode: profile?.identity?.taxCode || undefined,
        })
        .then((res) => {
          const data = res?.data;
          if (data && data.hasOpenProject) {
            setOpenProjectConflict({
              loading: false,
              hasOpenProject: true,
              projectId: data.projectId,
              projectName: data.projectName,
              status: data.status,
              companyName: data.companyName,
            });
          } else {
            setOpenProjectConflict(null);
          }
        })
        .catch(() => {
          setOpenProjectConflict(null);
        });
    }

    setProjectForm((current) => {
      const newRelationship = canonicalRel || '';
      const allowedKrs = current.keyResults.filter(
        (k) => k.type === 'FINANCIAL_INFORMATION' || k.type === 'CONTRACT_INFORMATION'
      );
      const rebalancedKrs = filterAndRebalanceDeliverables(
        allowedKrs,
        canonicalRel,
        krReference,
        'UPDATE_EXISTING_COMPANY',
        false
      );
      return {
        ...current,
        targetCompanyProfileId: selectedId,
        targetCompanyName: profile ? profileName(profile) : '',
        targetCompanyTaxCode: profile?.identity?.taxCode || '',
        targetRelationshipType: newRelationship,
        keyResults: rebalancedKrs,
      };
    });
  };

  const handleExistingTargetRelationshipChange = (newTargetRel: string) => {
    const selectedCompany = findCompanyProfile(companyOptions, projectForm.targetCompanyProfileId);
    const currentRel = getProfileCanonicalRelationship(selectedCompany);
    const normalizedTarget = normalizeRelationshipInput(newTargetRel);
    const isChanged = !!projectForm.targetCompanyProfileId &&
      !!currentRel &&
      !!normalizedTarget &&
      normalizedTarget !== currentRel;
    const contractEligible = isRelationshipContractEligible(normalizedTarget);
    const contractRequired = isChanged && contractEligible;

    setProjectForm((current) => {
      const rebalancedKrs = filterAndRebalanceDeliverables(
        current.keyResults,
        normalizedTarget,
        krReference,
        'UPDATE_EXISTING_COMPANY',
        contractRequired
      );

      return {
        ...current,
        targetRelationshipType: newTargetRel,
        keyResults: rebalancedKrs,
      };
    });
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page" id="page-project-management">
      {toast && <div className={`apms-toast ${toast.kind}`}>{toast.message}</div>}
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <h1>Project Management</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overview of projects you manage</p>
          </div>
          <div className="workspace-head-actions">
            {!isStaffView && (
              <button className="btn btn-primary" onClick={() => {
                setProjectForm(initialProjectForm());
                setFeedback(null);
                setTaxCodeCheck(null);
                setOpenProjectConflict(null);
                setTaxCodeError(null);
                setShowCreateForm(true);
              }}>{t('create.submit') || 'Create project'}</button>
            )}
          </div>
        </div>
        {projectsError && <div className="workspace-inline-error">{projectsError}</div>}

        {showCreateForm && (
          <div className="modal-overlay project-modal-overlay" onClick={() => { setShowCreateForm(false); setFeedback(null); setTaxCodeCheck(null); setOpenProjectConflict(null); setTaxCodeError(null); }}>
          <div className="modal project-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="project-modal-head" style={{ flexShrink: 0 }}>
              <div>
                <span className="workspace-side-eyebrow">CREATE NEW PROJECT</span>
                <h3 id="create-project-title">Create new project</h3>
              </div>
              <button className="project-modal-close" type="button" aria-label={t('create.closeAria')} onClick={() => { setShowCreateForm(false); setFeedback(null); setTaxCodeCheck(null); setOpenProjectConflict(null); setTaxCodeError(null); }}>&times;</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {feedback?.kind === 'error' && (
                <div className="project-modal-feedback workspace-inline-error" style={{ marginTop: '16px' }}>{feedback.message}</div>
              )}
              
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT INFORMATION</h4>
                <div className="workspace-form-grid" style={{ marginBottom: 0 }}>
                  <label>
                    <span>Project Name</span>
                    <input
                      className="search-input"
                      placeholder={t('create.projectNamePlaceholder')}
                      value={projectForm.projectName}
                      onChange={(event) => setProjectForm((current) => ({ ...current, projectName: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Project Type</span>
                    <select
                      className="search-input"
                      value={projectForm.projectType}
                      onChange={(event) => {
                        const nextType = event.target.value as ProjectType;
                        setProjectForm((current) => {
                          const isUpdate = nextType === 'UPDATE_EXISTING_COMPANY';
                          const nextRel = isUpdate ? '' : 'PARTNER_WITH';
                          const rebalancedKrs = filterAndRebalanceDeliverables(
                            current.keyResults,
                            normalizeRelationshipInput(nextRel),
                            krReference,
                            nextType,
                            false
                          );
                          return {
                            ...current,
                            projectType: nextType,
                            targetCompanyName: '',
                            targetCompanyProfileId: '',
                            targetCompanyTaxCode: '',
                            targetRelationshipType: nextRel,
                            keyResults: rebalancedKrs,
                          };
                        });
                        setTaxCodeCheck(null);
                        setOpenProjectConflict(null);
                      }}
                    >
                      <option value="RESEARCH_NEW_COMPANY">{t('create.typeNewCompany')}</option>
                      <option value="UPDATE_EXISTING_COMPANY">{t('create.typeUpdateCompany')}</option>
                    </select>
                  </label>
                  <label>
                    <span>Target Company (Legal Name)</span>
                    {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' ? (
                      <>
                        <select
                          className="search-input"
                          value={projectForm.targetCompanyProfileId}
                          onChange={(event) => handleExistingTargetCompanyChange(event.target.value)}
                        >
                          <option value="">{companyOptionsLoading ? t('create.loadingCompanies') : t('create.selectCompany')}</option>
                          {companyOptions.map((profile) => {
                            const profileId = profile.companyId || profile.id;
                            return (
                              <option key={profileId} value={profileId}>
                                {profileName(profile)} - {profileRoleLabel(profile)}
                              </option>
                            );
                          })}
                        </select>
                        {openProjectConflict?.hasOpenProject && (
                          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', color: '#856404', marginTop: '6px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Project already in progress</div>
                            <div style={{ marginBottom: '2px' }}>
                              This company already has an unfinished project:
                              <br />
                              <strong>{openProjectConflict.projectName || (openProjectConflict.projectId ? `Project #${openProjectConflict.projectId}` : 'Existing Project')}</strong> — {formatProjectStatus(openProjectConflict.status)}
                            </div>
                            <div>
                              Complete or close the existing project before creating another project for this company.
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        className="search-input"
                        placeholder="Enter target company name"
                        value={projectForm.targetCompanyName}
                        onChange={(event) => setProjectForm((current) => ({ ...current, targetCompanyName: event.target.value }))}
                      />
                    )}
                  </label>
                  <label>
                    <span>Tax Code</span>
                    {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' ? (
                      <input
                        className="search-input"
                        placeholder="No tax code available"
                        value={findCompanyProfile(companyOptions, projectForm.targetCompanyProfileId)?.identity?.taxCode || projectForm.targetCompanyTaxCode || ''}
                        readOnly
                        style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' }}
                      />
                    ) : (
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="search-input"
                          placeholder="Enter company tax code"
                          value={projectForm.targetCompanyTaxCode}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const digitsOnly = raw.replace(/\D/g, '');
                            setProjectForm((current) => ({ ...current, targetCompanyTaxCode: digitsOnly }));
                            if (raw && raw !== digitsOnly) {
                              setTaxCodeError('Tax Code must contain numbers only.');
                            } else {
                              setTaxCodeError(null);
                            }
                          }}
                          onBlur={(event) => {
                            const raw = event.target.value;
                            const digitsOnly = raw.replace(/\D/g, '');
                            if (raw && raw !== digitsOnly) {
                              setTaxCodeError('Tax Code must contain numbers only.');
                            }
                            void handleTaxCodeCheck(digitsOnly);
                          }}
                        />
                        {taxCodeError && (
                          <div className="workspace-inline-error" style={{ marginTop: '4px', fontSize: '0.82rem' }}>
                            {taxCodeError}
                          </div>
                        )}
                        {taxCodeCheck?.loading && <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>Checking tax code...</span>}
                        {taxCodeCheck?.checked && taxCodeCheck.exists && (taxCodeCheck.existingOfficialCompany || taxCodeCheck.matchType === 'COMPANY_PROFILE') && (
                          taxCodeCheck.hasOpenProject ? (
                            <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', color: '#856404', marginTop: '6px' }}>
                              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                Existing company found: {taxCodeCheck.companyName || 'Company'}
                              </div>
                              <div style={{ marginBottom: '2px' }}>
                                An unfinished project already exists for this company:
                                <br />
                                <strong>{taxCodeCheck.openProjectName || (taxCodeCheck.openProjectId ? `Project #${taxCodeCheck.openProjectId}` : 'Existing Project')}</strong> — {formatProjectStatus(taxCodeCheck.openProjectStatus)}
                              </div>
                              <div>
                                Complete or close the existing project before creating another project.
                              </div>
                            </div>
                          ) : (
                            <div style={{ backgroundColor: '#fff3cd', padding: '6px 8px', borderRadius: '4px', fontSize: '0.82rem', color: '#856404', marginTop: '4px' }}>
                              {taxCodeCheck.canCurrentManagerManage === false ? (
                                <span>
                                  Found existing company: <strong>{taxCodeCheck.companyName}</strong>. This company is currently managed by another manager.
                                </span>
                              ) : (
                                <>
                                  Found existing company: <strong>{taxCodeCheck.companyName}</strong>.{' '}
                                  <button type="button" onClick={() => {
                                    const existingId = taxCodeCheck.companyProfileId || '';
                                    handleExistingTargetCompanyChange(existingId);
                                    setProjectForm((prev) => ({
                                      ...prev,
                                      projectType: 'UPDATE_EXISTING_COMPANY',
                                    }));
                                  }} style={{ marginLeft: '6px', border: 'none', background: 'transparent', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                                    Use existing company
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        )}
                        {taxCodeCheck?.checked && taxCodeCheck.exists && (taxCodeCheck.openResearchProject || taxCodeCheck.matchType === 'OPEN_RESEARCH_PROJECT' || (taxCodeCheck.matchType === 'ACTIVE_PROJECT' && !taxCodeCheck.existingOfficialCompany)) && (
                          <div style={{ backgroundColor: '#f8d7da', padding: '6px 8px', borderRadius: '4px', fontSize: '0.82rem', color: '#721c24', marginTop: '4px' }}>
                            A New Company Research project already exists for this Tax Code (<strong>{taxCodeCheck.companyName || taxCodeCheck.openProjectName || 'Open Project'}</strong>). Duplicate creation is blocked.
                          </div>
                        )}
                      </div>
                    )}
                  </label>

                  {projectForm.projectType === 'UPDATE_EXISTING_COMPANY' ? (
                    <>
                      <label>
                        <span>Current Relationship</span>
                        <input
                          className="search-input"
                          value={projectForm.targetCompanyProfileId ? currentRelLabel : 'Select an existing company'}
                          readOnly
                          style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', cursor: 'default' }}
                        />
                      </label>
                      <label>
                        <span>Target Relationship</span>
                        <select
                          className="search-input"
                          value={projectForm.targetRelationshipType}
                          onChange={(event) => handleExistingTargetRelationshipChange(event.target.value)}
                          disabled={relationshipOptionsLoading || !projectForm.targetCompanyProfileId}
                        >
                          <option value="">{relationshipOptionsLoading ? t('create.loadingRelationships') : (!projectForm.targetCompanyProfileId ? 'Select an existing company first' : t('create.selectRelationship'))}</option>
                          {relationshipOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {isRelationshipChanged && (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffeeba',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#856404',
                            fontSize: '0.85rem',
                            lineHeight: '1.4',
                            marginTop: '4px',
                          }}
                        >
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Relationship change detected</span>
                          </div>
                          <div style={{ marginTop: '2px' }}>
                            <strong>{currentRelLabel}</strong> &rarr; <strong>{targetRelLabel}</strong>
                          </div>
                          {isContractMandatory && (
                            <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#664d03' }}>
                              Contract Information is required for this relationship change.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <label>
                      <span>Target Relationship</span>
                      <select
                        className="search-input"
                        value={projectForm.targetRelationshipType}
                        onChange={(event) => {
                          const newRelationship = event.target.value;
                          const normalizedRel = normalizeRelationshipInput(newRelationship);
                          setProjectForm((current) => {
                            const rebalancedKrs = filterAndRebalanceDeliverables(current.keyResults, normalizedRel, krReference, 'RESEARCH_NEW_COMPANY', false);
                            return {
                              ...current,
                              targetRelationshipType: newRelationship,
                              keyResults: rebalancedKrs,
                            };
                          });
                        }}
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
                  )}

                  <label>
                    <span>Due Date</span>
                    <input
                      className="search-input"
                      type="date"
                      value={projectForm.plannedEndDate}
                      min={getLocalTodayDateString()}
                      onChange={(event) => setProjectForm((current) => ({ ...current, plannedEndDate: event.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT GOAL & NOTES</h4>
                <div className="workspace-form-grid" style={{ marginBottom: 0 }}>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span>Project Goal</span>
                    <textarea
                      className="search-input"
                      style={{ minHeight: '60px', padding: '10px 12px', resize: 'vertical' }}
                      placeholder="Describe the main outcome this project should deliver."
                      value={projectForm.objective}
                      onChange={(event) => setProjectForm((current) => ({ ...current, objective: event.target.value }))}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span>Additional Notes (Optional)</span>
                    <textarea
                      className="search-input"
                      placeholder="Enter any additional information..."
                      value={projectForm.description}
                      onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                      style={{ minHeight: '50px', padding: '10px 12px', resize: 'vertical' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT DELIVERABLES</h4>
                  </div>
                  {(() => {
                    const totalWeight = projectForm.keyResults.reduce((sum, kr) => sum + kr.weight, 0);
                    const is100 = totalWeight === 100;
                    const isOver = totalWeight > 100;
                    return (
                      <div style={{ fontSize: '0.88rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                          <div style={{ fontWeight: '700', color: is100 ? 'var(--success-text)' : isOver ? 'var(--danger-text)' : '#b45309' }}>
                            Total Progress Weight: {totalWeight} / 100
                          </div>
                          {projectForm.keyResults.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setProjectForm(prev => ({
                                  ...prev,
                                  keyResults: balanceDeliverableWeights(prev.keyResults),
                                }));
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '2px 7px',
                                fontSize: '0.75rem',
                                color: '#475569',
                                cursor: 'pointer',
                                lineHeight: 1.2
                              }}
                              title="Distribute 100% weight equally across selected deliverables"
                            >
                              Balance equally
                            </button>
                          )}
                        </div>
                        {!is100 && !isOver && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {100 - totalWeight}% remaining
                          </div>
                        )}
                        {isOver && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginTop: '2px' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {krReference
                      .filter((kr) => {
                        if (projectForm.projectType === 'UPDATE_EXISTING_COMPANY') {
                          return kr.type === 'FINANCIAL_INFORMATION' || kr.type === 'CONTRACT_INFORMATION';
                        }
                        return true;
                      })
                      .map((kr) => {
                        const isDeliverableMandatoryVal = isDeliverableMandatory(kr.type, projectForm.projectType, isContractMandatory);
                        const isContract = kr.type === 'CONTRACT_INFORMATION';
                        const isContractEligible = !isContract || isTargetContractEligible;
                        const isSupported = isContract
                          ? isContractEligible
                          : kr.supportedRelationshipTypes.length === 0 || kr.supportedRelationshipTypes.includes(normalizeRelationshipInput(projectForm.targetRelationshipType) as RelationshipType);
                        const selectedKr = projectForm.keyResults.find((k) => k.type === kr.type);
                        const isSelected = isDeliverableMandatoryVal || (isSupported && !!selectedKr);
                        const supportedLabels = kr.supportedRelationshipTypes.map(rt => relationshipOptions.find(o => o.value === rt)?.label || rt).join(', ');
                        const mandatoryReason = getDeliverableMandatoryReason(kr.type, projectForm.projectType, isContractMandatory, currentRelLabel, targetRelLabel);

                        return (
                          <div
                            key={kr.type}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                              background: isSelected ? 'var(--primary-light)' : 'transparent',
                              opacity: isSupported ? 1 : 0.6,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              id={`kr-checkbox-${kr.type}`}
                              checked={isSelected}
                              disabled={isDeliverableMandatoryVal || !isSupported}
                              onChange={(e) => {
                                if (isDeliverableMandatoryVal || !isSupported) return;
                                const checked = e.target.checked;
                                setProjectForm((current) => {
                                  const withoutCurrent = current.keyResults.filter((k) => k.type !== kr.type);
                                  const updatedList = checked ? [...withoutCurrent, { type: kr.type, weight: 0 }] : withoutCurrent;
                                  const rebalanced = filterAndRebalanceDeliverables(
                                    updatedList,
                                    normalizeRelationshipInput(current.targetRelationshipType),
                                    krReference,
                                    current.projectType,
                                    isContractMandatory
                                  );
                                  return { ...current, keyResults: rebalanced };
                                });
                              }}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: isDeliverableMandatoryVal ? 'not-allowed' : isSupported ? 'pointer' : 'not-allowed',
                                flexShrink: 0,
                                margin: 0
                              }}
                            />
                            <label htmlFor={`kr-checkbox-${kr.type}`} style={{ flex: 1, cursor: isDeliverableMandatoryVal ? 'default' : isSupported ? 'pointer' : 'not-allowed', margin: 0, display: 'block' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--primary-dark)' : 'inherit' }}>{kr.displayName}</span>
                                {isDeliverableMandatoryVal && (
                                  <span style={{ fontSize: '0.72rem', color: '#856404', background: '#fff3cd', border: '1px solid #ffeeba', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    Required
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{kr.description}</div>
                              {isDeliverableMandatoryVal && mandatoryReason && (
                                <div style={{ fontSize: '0.75rem', color: '#856404', marginTop: '3px', fontWeight: 500 }}>
                                  {mandatoryReason}
                                </div>
                              )}
                              {!isSupported && !isDeliverableMandatoryVal && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '4px' }}>
                                  Available only for {supportedLabels || 'Partner, Customer, Supplier'} projects.
                                </div>
                              )}
                            </label>
                            {isSelected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <input
                                  type="number"
                                  title="Progress Weight"
                                  className="search-input"
                                  style={{ width: '70px', padding: '5px 8px', textAlign: 'center', height: '32px' }}
                                  value={selectedKr ? selectedKr.weight : (projectForm.keyResults.length === 1 ? 100 : 50)}
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
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>%</span>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="workspace-head-actions" style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
              <button className="btn btn-outline" onClick={() => { setShowCreateForm(false); setFeedback(null); setTaxCodeCheck(null); setOpenProjectConflict(null); }}>{t('create.cancel')}</button>
              <button
                className="btn btn-primary"
                onClick={() => void handleCreateProject()}
                disabled={createLoading || hasProjectConflict || projectForm.keyResults.reduce((sum, kr) => sum + kr.weight, 0) !== 100}
              >
                {createLoading ? t('create.submitting') : 'Create project'}
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
                <p>Only draft projects are allowed to be deleted. This project is eligible for deletion.</p>
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
                placeholder="Search by project name or company..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
              <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
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
            <div className="manager-project-table-scroll">
              <div className="manager-project-table-inner">
                <div className="manager-project-header" role="row">
                  <span className="col-center">#</span>
                  <span>PROJECT</span>
                  <span>TARGET COMPANY</span>
                  <span>TYPE</span>
                  <span>PROGRESS</span>
                  <span className="col-center">END DATE</span>
                  <span className="col-center">STATUS</span>
                  <span className="col-center">ACTION</span>
                </div>
                {filteredProjects.length === 0 ? (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">No projects found.</p>
                    <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  filteredProjects.map(renderProjectRow)
                )}
              </div>
            </div>
            <div className="project-table-pagination">
              <span>Showing {pageStart}–{pageEnd} of {totalElements} projects</span>
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

