import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { FolderPlus, Plus } from 'lucide-react';
import { api } from '../services/api';
import { projectApi } from '../API/projectApi';
import type {
  CandidateResponse,
  CreateProjectRequest,
  DuplicateCompanyCheckResponse,
  ProfileResponse,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectType,
  RelationshipType,
  RelationshipTypeOption,
} from '../types/domain';
import { ProjectInspectionDrawer } from '../components/ProjectInspectionDrawer';

interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return i18n.t('projects-overview:companyName.unknown');
};

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: 'rgba(22,163,74,0.12)', fg: '#16A34A' },
  COMPLETED: { bg: 'rgba(22,163,74,0.12)', fg: '#16A34A' },
  CANCELLED: { bg: 'rgba(220,38,38,0.12)', fg: '#DC2626' },
  DRAFT: { bg: '#F1F5F9', fg: '#475569' },
  ARCHIVED: { bg: '#F1F5F9', fg: '#64748B' },
};

const TYPE_BADGE = { bg: 'rgba(37,99,235,0.12)', fg: '#2563EB' };

const BASE_BADGE: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: 1.4,
  padding: '2px 8px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  padding: '11px 10px',
  fontSize: 'var(--text-body)',
  lineHeight: 1.4,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  height: '38px',
  padding: '0 10px',
  fontSize: 'var(--text-body)',
  color: '#0F172A',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-label)',
  color: '#64748B',
  display: 'block',
  marginBottom: '3px',
};

const footerBtn: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1D4ED8',
  background: '#FFFFFF',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  padding: '0 12px',
  height: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
};

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: 'PARTNER_WITH', label: i18n.t('projects-overview:relationships.partner') },
  { value: 'COMPETITOR_OF', label: i18n.t('projects-overview:relationships.competitor') },
  { value: 'SUPPLIER_OF', label: i18n.t('projects-overview:relationships.supplier') },
  { value: 'CUSTOMER_OF', label: i18n.t('projects-overview:relationships.customer') },
  { value: 'POTENTIAL_PARTNER_OF', label: i18n.t('projects-overview:relationships.potentialPartner') },
];

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || profile.companyId;

export const ProjectsOverview: React.FC = () => {
  const { t } = useTranslation('projects-overview');

  // Page list state
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Project Detail State
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectResponse | null>(null);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [, setDetailTab] = useState<'overview' | 'members' | 'candidates'>('overview');
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    projectName: '',
    projectType: 'RESEARCH_NEW_COMPANY' as ProjectType,
    targetCompanyProfileId: '',
    targetCompanyTaxCode: '',
    targetRelationshipType: '',
    description: '',
    plannedEndDate: '',
  });
  const [companyOptions, setCompanyOptions] = useState<ProfileResponse[]>([]);
  const [relationshipOptions, setRelationshipOptions] = useState<RelationshipTypeOption[]>(RELATIONSHIP_OPTIONS);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch Projects List
  const loadProjects = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string | number | boolean | undefined | null> = { page, size: 10 };
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (typeFilter !== 'ALL') params.type = typeFilter;

    return api.get<PageResponse<ProjectResponse>>('/projects', { params })
      .then((res) => {
        if (res?.success && res.data) {
          setProjects(res.data.content || []);
          setTotalPages(res.data.totalPages || 0);
          setTotalElements(res.data.totalElements || 0);
        } else {
          setProjects([]);
        }
      })
      .catch(() => {
        setProjects([]);
        setError(t('errors.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter, t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);



  // Client search filter
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.projectName?.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        p.targetCompanyName?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  // Load Selected Project Details
  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setDetailTab('overview');
    setDetailLoading(true);

    Promise.allSettled([
      api.get<ProjectResponse>(`/projects/${id}`),
      api.get<ProjectMemberResponse[]>(`/projects/${id}/members`),
      api.get<PageResponse<CandidateResponse>>(`/projects/${id}/candidates`),
    ])
      .then(([projRes, memRes, candRes]) => {
        if (projRes.status === 'fulfilled' && projRes.value?.data) {
          setProjectDetail(projRes.value.data);
        } else {
          setProjectDetail(null);
        }

        if (memRes.status === 'fulfilled' && Array.isArray(memRes.value?.data)) {
          setMembers(memRes.value.data);
        } else {
          setMembers([]);
        }

        if (candRes.status === 'fulfilled' && candRes.value?.data) {
          setCandidates(candRes.value.data.content || []);
        } else {
          setCandidates([]);
        }
      })
      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setSelectedProjectId(null);
    setProjectDetail(null);
    setMembers([]);
    setCandidates([]);
  };

  const openCreateModal = async () => {
    setCreateError(null);
    setCreateForm({
      projectName: '',
      projectType: 'RESEARCH_NEW_COMPANY',
      targetCompanyProfileId: '',
      targetCompanyTaxCode: '',
      targetRelationshipType: '',
      description: '',
      plannedEndDate: '',
    });
    setShowCreateModal(true);
    try {
      const [relRes, profilesRes] = await Promise.all([
        projectApi.getTargetRelationshipTypes(),
        api.get<PageResponse<ProfileResponse>>('/profiles', { params: { page: 0, size: 100 } }),
      ]);
      if (relRes?.success && Array.isArray(relRes.data) && relRes.data.length) {
        setRelationshipOptions(relRes.data);
      }
      if (profilesRes?.success && profilesRes.data) {
        setCompanyOptions(profilesRes.data.content || []);
      }
    } catch {
      // keep default options
    }
  };

  const handleCreateProject = async () => {
    const projectName = createForm.projectName.trim();
    if (!projectName) {
      setCreateError(t('errors.nameRequired'));
      return;
    }
    if (createForm.projectType === 'UPDATE_EXISTING_COMPANY' && !createForm.targetCompanyProfileId) {
      setCreateError(t('errors.targetCompanyRequired'));
      return;
    }
    if (!createForm.targetRelationshipType) {
      setCreateError(t('errors.relationshipRequired'));
      return;
    }
    if (!createForm.plannedEndDate) {
      setCreateError(t('errors.dateRequired'));
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    if (createForm.projectType === 'RESEARCH_NEW_COMPANY') {
      if (createForm.targetCompanyTaxCode) {
        try {
          const res = await api.get<boolean>(`/profiles/exists`, { params: { taxCode: createForm.targetCompanyTaxCode } });
          if (res.data === true) {
            setCreateError('A company with this tax ID already exists. Please select the "Existing company" project type.');
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
          setCreateError(t('create.duplicateWarningTitle'));
          setCreateLoading(false);
          return;
        }
      } catch (err) {
        // Ignore check error and proceed
      }
    }

    const selectedCompany = companyOptions.find(
      (profile) => profile.companyId === createForm.targetCompanyProfileId || profile.id === createForm.targetCompanyProfileId,
    );
    const payload: CreateProjectRequest = {
      projectName,
      projectType: createForm.projectType,
      targetCompanyProfileId: createForm.projectType === 'UPDATE_EXISTING_COMPANY' ? createForm.targetCompanyProfileId : null,
      targetCompanyName: createForm.projectType === 'UPDATE_EXISTING_COMPANY' && selectedCompany ? profileName(selectedCompany) : projectName,
      targetRelationshipType: createForm.targetRelationshipType as RelationshipType,
      description: createForm.description.trim() || null,
      plannedEndDate: createForm.plannedEndDate,
    };

    try {
      await projectApi.createProject(payload);
      setShowCreateModal(false);
      setPage(0);
      await loadProjects();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('errors.createFailed'));
    } finally {
      setCreateLoading(false);
    }
  };

  if (selectedProjectId) {
    return (
      <ProjectInspectionDrawer
        projectId={selectedProjectId}
        projectDetail={projectDetail}
        members={members}
        candidates={candidates}
        loading={detailLoading}
        onClose={closeDetail}
      />
    );
  }

  return (
    <section className="workspace-page" id="page-projects-overview">
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', color: '#64748B', fontSize: 'var(--text-caption)', fontWeight: 500 }}>
          <span>{t('breadcrumb.section')}</span>
          <span>/</span>
          <span>{t('breadcrumb.current')}</span>
        </div>

        {/* Banner tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 16px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-label)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563EB', display: 'block' }}>
              {t('title.eyebrow')}
            </span>
            <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {t('title.heading')}
            </h1>
          </div>
        </div>

        {/* Khối bộ lọc */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>{t('filters.statusLabel')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  style={inputStyle}
                >
                  <option value="ALL">{t('filters.statusAll')}</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('filters.typeLabel')}</label>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                  style={inputStyle}
                >
                  <option value="ALL">{t('filters.typeAll')}</option>
                  <option value="RESEARCH_NEW_COMPANY">RESEARCH_NEW_COMPANY</option>
                  <option value="UPDATE_EXISTING_COMPANY">UPDATE_EXISTING_COMPANY</option>
                  <option value="RESEARCH_MULTIPLE_COMPANIES">RESEARCH_MULTIPLE_COMPANIES</option>
                </select>
              </div>
            </div>

            <div style={{ width: '280px', maxWidth: '100%' }}>
              <label style={labelStyle}>{t('filters.searchLabel')}</label>
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Bảng danh sách dự án */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 'var(--text-body)', color: '#64748B' }}>
              {t('states.loading')}
            </div>
          ) : error ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 'var(--text-body)', color: '#DC2626' }}>
              {error}
            </div>
          ) : totalElements === 0 ? (
            <div style={{ padding: '56px 16px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', borderRadius: '16px', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderPlus size={32} color="#2563EB" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{t('empty.title')}</h2>
              <p style={{ margin: '0 auto 20px', maxWidth: '440px', fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
                {t('empty.description')}
              </p>
              <button className="btn btn-primary" onClick={() => void openCreateModal()}>
                <Plus size={16} />
                {t('create.submit')}
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 'var(--text-body)', color: '#64748B' }}>
              {t('states.notFound')}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.projectId')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.projectName')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.targetCompany')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.type')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.status')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--text-label)', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => {
                      const statusColor = STATUS_BADGE[p.status] || { bg: '#F1F5F9', fg: '#475569' };
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>#{p.id}</span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 600, color: '#0F172A' }}>{p.projectName}</td>
                          <td style={cellStyle}>{formatCompanyName(p.targetCompanyName)}</td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                            <span style={{ ...BASE_BADGE, ...TYPE_BADGE }}>{p.projectType}</span>
                          </td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                            <span style={{ ...BASE_BADGE, background: statusColor.bg, color: statusColor.fg }}>{p.status}</span>
                          </td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleSelectProject(p.id)}
                              style={{ fontSize: '13px', fontWeight: 600, color: '#1D4ED8', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 10px', height: '28px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
                            >
                              {t('table.viewDetail')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Chân bảng (phân trang) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-caption)', color: '#64748B' }}>
                  {t('pagination.summary', { total: totalElements, page: page + 1, totalPages: totalPages || 1 })}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...footerBtn, opacity: page === 0 ? 0.45 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                    disabled={page === 0}
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    {t('pagination.previous')}
                  </button>
                  <button
                    style={{ ...footerBtn, opacity: page >= totalPages - 1 ? 0.45 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    {t('pagination.next')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay project-modal-overlay" onClick={() => !createLoading && setShowCreateModal(false)}>
          <div className="modal project-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()}>
            <div className="project-modal-head">
              <div>
                <span className="workspace-side-eyebrow">{t('create.eyebrow')}</span>
                <h3 id="create-project-title">{t('create.title')}</h3>
                <p>{t('create.description')}</p>
              </div>
              <button className="project-modal-close" type="button" aria-label={t('create.closeAria')} onClick={() => !createLoading && setShowCreateModal(false)}>&times;</button>
            </div>
            {createError && <div className="project-modal-feedback workspace-inline-error">{createError}</div>}
            <div className="workspace-form-grid">
              <label>
                <span>{t('create.projectNameLabel')}</span>
                <input className="search-input" placeholder={t('create.projectNamePlaceholder')} value={createForm.projectName} onChange={(event) => setCreateForm((current) => ({ ...current, projectName: event.target.value }))} />
              </label>
              <label>
                <span>{t('create.projectTypeLabel')}</span>
                <select className="search-input" value={createForm.projectType} onChange={(event) => setCreateForm((current) => ({ ...current, projectType: event.target.value as ProjectType, targetCompanyProfileId: '' }))}>
                  <option value="RESEARCH_NEW_COMPANY">{t('create.typeNewCompany')}</option>
                  <option value="UPDATE_EXISTING_COMPANY">{t('create.typeUpdateCompany')}</option>
                </select>
              </label>
              {createForm.projectType === 'RESEARCH_NEW_COMPANY' && (
                <label>
                  <span>Mã số thuế (Để kiểm tra trùng lặp)</span>
                  <input className="search-input" placeholder="Nhập mã số thuế..." value={createForm.targetCompanyTaxCode} onChange={(event) => setCreateForm((current) => ({ ...current, targetCompanyTaxCode: event.target.value.replace(/[^0-9-]/g, '') }))} />
                </label>
              )}
              {createForm.projectType === 'UPDATE_EXISTING_COMPANY' && (
                <label>
                  <span>{t('create.existingCompanyLabel')}</span>
                  <select className="search-input" value={createForm.targetCompanyProfileId} onChange={(event) => setCreateForm((current) => ({ ...current, targetCompanyProfileId: event.target.value }))}>
                    <option value="">{companyOptions.length ? t('create.selectCompany') : t('create.loadingCompanies')}</option>
                    {companyOptions.map((profile) => (
                      <option key={profile.companyId || profile.id} value={profile.companyId}>{profileName(profile)}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>{t('create.relationshipLabel')}</span>
                <select className="search-input" value={createForm.targetRelationshipType} onChange={(event) => setCreateForm((current) => ({ ...current, targetRelationshipType: event.target.value }))}>
                  <option value="">{t('create.selectRelationship')}</option>
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('create.descriptionLabel')}</span>
                <input className="search-input" placeholder={t('create.descriptionPlaceholder')} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label>
                <span>{t('create.plannedEndDateLabel')}</span>
                <input
                  className="search-input"
                  type="date"
                  value={createForm.plannedEndDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(event) => setCreateForm((current) => ({ ...current, plannedEndDate: event.target.value }))}
                />
              </label>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)} disabled={createLoading}>{t('create.cancel')}</button>
              <button className="btn btn-primary" onClick={() => void handleCreateProject()} disabled={createLoading}>
                {createLoading ? t('create.submitting') : t('create.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
