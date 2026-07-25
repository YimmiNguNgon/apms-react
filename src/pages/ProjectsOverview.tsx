import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type {
  CandidateResponse,
  ProjectMemberResponse,
  ProjectResponse,
  ProjectStatus,
  ProjectType,
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

const formatCompanyName = (name?: string | null, rawId?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  if (rawId && rawId.trim()) {
    if (/^[0-9a-fA-F]{24}$/.test(rawId.trim())) {
      return `Công ty (ID: ${rawId.trim().substring(0, 8)}...)`;
    }
    return rawId.trim();
  }
  return 'Chưa xác định';
};

export const ProjectsOverview: React.FC = () => {
  // Page list state
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [detailTab, setDetailTab] = useState<'overview' | 'members' | 'candidates'>('overview');
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch Projects List
  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, size: 10 };
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (typeFilter !== 'ALL') params.type = typeFilter;

    api.get<PageResponse<ProjectResponse>>('/projects', { params })
      .then((res) => {
        if (res?.success && res.data) {
          setProjects(res.data.content || []);
          setTotalPages(res.data.totalPages || 0);
          setTotalElements(res.data.totalElements || 0);
        } else {
          setProjects([]);
        }
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter]);

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
      <div className="workspace-shell">
        <div className="workspace-main-full">
          <div className="workspace-breadcrumbs">Portfolio Governance <span>/</span> All Projects Overview</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Enterprise Project Directory</span>
              <h1>System-Wide Projects Overview</h1>
              <p>Read-only executive view across all enterprise intelligence projects system-wide.</p>
            </div>
            <div className="workspace-head-actions">
              <span className="badge badge-purple" style={{ padding: '8px 14px', fontSize: '13px' }}>
                👑 READ-ONLY OWNER ACCESS
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="workspace-panel" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status Filter</label>
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="NEEDS_APPROVAL">NEEDS_APPROVAL</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type Filter</label>
                  <select
                    className="form-control"
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="ALL">All Types</option>
                    <option value="PARTNER_EVALUATION">PARTNER_EVALUATION</option>
                    <option value="COMPETITOR_ANALYSIS">COMPETITOR_ANALYSIS</option>
                    <option value="MARKET_RESEARCH">MARKET_RESEARCH</option>
                  </select>
                </div>
              </div>

              <div style={{ maxWidth: '300px', width: '100%' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Search Project</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search project name or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="workspace-panel">
            {loading ? (
              <div className="workspace-empty">Loading system projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="workspace-empty">No projects found.</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Project ID</th>
                        <th style={{ padding: '12px' }}>Project Name</th>
                        <th style={{ padding: '12px' }}>Target Company</th>
                        <th style={{ padding: '12px' }}>Type</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>#{p.id}</td>
                          <td style={{ padding: '12px' }}>{p.projectName}</td>
                          <td style={{ padding: '12px' }}>{formatCompanyName(p.targetCompanyName, p.targetCompanyProfileId)}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge badge-blue">{p.projectType}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : p.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleSelectProject(p.id)}
                            >
                              Inspect Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Total {totalElements} projects (Page {page + 1} of {totalPages || 1})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page === 0}
                      onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    >
                      ← Previous
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
