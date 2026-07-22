import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DonutChart } from '../components/charts/Charts';

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  VERIFIED: { bg: '#D1FAE5', color: '#065F46', label: 'Đã duyệt' },
  PENDING_REVIEW:  { bg: '#FEF3C7', color: '#92400E', label: 'Chờ duyệt' },
  IN_PROGRESS:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Đang xem xét' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Từ chối' },
  ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Hoạt động' },
  DEFAULT: { bg: '#FEE2E2', color: '#991B1B', label: 'Chưa rõ' },
};

export const PartnerEvaluation: React.FC = () => {
  const [search, setSearch] = useState('');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    companyName: '',
    score: '75',
    reviewStatus: 'PENDING_REVIEW',
    note: '',
  });

  useEffect(() => {
    api.get<any>('/profiles').then(res => {
      if (res?.success && res.data) {
        const rows = res.data.content || res.data || [];
        setEvaluations(Array.isArray(rows) ? rows : []);
      }
    });
  }, []);

  const filtered = evaluations.filter(e =>
    (e.tradeName || e.legalName)?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateEvaluation = () => {
    const companyName = draft.companyName.trim();
    const parsedScore = Number(draft.score);

    if (!companyName) {
      setFeedback('Nhập tên công ty trước khi tạo đánh giá.');
      return;
    }

    const nextEvaluation = {
      companyId: `local-${Date.now()}`,
      tradeName: companyName,
      legalName: companyName,
      reviewStatus: draft.reviewStatus,
      score: Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, parsedScore)) : null,
      totalScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, parsedScore)) : null,
      industry: 'Manual entry',
      taxCode: 'N/A',
      createdFrom: 'local-draft',
      notes: draft.note.trim(),
    };

    setEvaluations(current => [nextEvaluation, ...current]);
    setDraft({
      companyName: '',
      score: '75',
      reviewStatus: 'PENDING_REVIEW',
      note: '',
    });
    setShowCreateForm(false);
    setFeedback(`Đã tạo đánh giá nháp cho ${companyName}.`);
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <h1>Partner Evaluation</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Đóng form' : '+ Tạo đánh giá'}
          </button>
        </div>
      </div>
      {feedback && <div className="workspace-inline-note" style={{ marginBottom: 16 }}>{feedback}</div>}
      {showCreateForm && (
        <div className="workspace-panel" style={{ marginBottom: 18 }}>
          <div className="workspace-section-head">
            <div>
              <h3>Create partner evaluation</h3>
              <p>Tạo nháp đánh giá trong phiên hiện tại. Khi chưa có API tạo riêng, mục này giữ cho nút hoạt động ngay.</p>
            </div>
          </div>
          <div className="workspace-form-grid">
            <label>
              <span>Company name</span>
              <input
                className="search-input"
                value={draft.companyName}
                onChange={(e) => setDraft((current) => ({ ...current, companyName: e.target.value }))}
                placeholder="FPT Software"
              />
            </label>
            <label>
              <span>Score</span>
              <input
                className="search-input"
                value={draft.score}
                onChange={(e) => setDraft((current) => ({ ...current, score: e.target.value }))}
                inputMode="numeric"
                placeholder="75"
              />
            </label>
            <label>
              <span>Status</span>
              <select
                className="search-input"
                value={draft.reviewStatus}
                onChange={(e) => setDraft((current) => ({ ...current, reviewStatus: e.target.value }))}
              >
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="ACTIVE">Active</option>
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Note</span>
              <textarea
                className="search-input"
                value={draft.note}
                onChange={(e) => setDraft((current) => ({ ...current, note: e.target.value }))}
                rows={3}
                placeholder="Short context for this evaluation"
                style={{ resize: 'vertical' }}
              />
            </label>
          </div>
          <div className="workspace-head-actions">
            <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateEvaluation}>Create draft</button>
          </div>
        </div>
      )}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng đánh giá', value: evaluations.length },
          { label: 'Đã duyệt',      value: evaluations.filter(e => e.reviewStatus === 'VERIFIED').length },
          { label: 'Chờ duyệt',     value: evaluations.filter(e => e.reviewStatus === 'PENDING_REVIEW').length },
          { label: 'Điểm TB',        value: 'N/A' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>
      <input className="search-input" placeholder="Tìm công ty..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16, width: '100%', maxWidth: 360 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(ev => {
          const sc = STATUS_MAP[ev.reviewStatus || 'DEFAULT'] || STATUS_MAP.DEFAULT;
          const score = typeof ev.score === 'number' ? ev.score : typeof ev.totalScore === 'number' ? ev.totalScore : null;
          return (
            <div key={ev.companyId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: score !== null ? `conic-gradient(#2563EB ${score * 3.6}deg, var(--border-light) 0deg)` : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{score ?? '—'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ev.tradeName || ev.legalName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mã số thuế: {ev.taxCode} · Lĩnh vực: {ev.industry}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Dữ liệu lấy từ hệ thống</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline">Xem</button>
                  {ev.reviewStatus === 'PENDING_REVIEW' && <button className="btn btn-sm btn-primary">Duyệt</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// â”€â”€â”€ Company Assignment â”€â”€â”€
export const CompanyAssignment: React.FC<{ setActivePage?: (p: string) => void }> = ({ setActivePage }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewingProject, setViewingProject] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/projects', { params: { page: 0, size: 50 } })
      .then(res => {
        if (res?.success && Array.isArray(res.data?.content)) setProjects(res.data.content);
        else if (res?.success && Array.isArray(res.data)) setProjects(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(project => {
    const label = `${project.projectName || ''} ${project.targetCompanyName || ''} ${project.projectType || ''}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const totalElements = filtered.length;
  const pageSize = 12;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedProjects = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const counts = {
    total: projects.length,
    active: projects.filter(p => p.status === 'IN_PROGRESS').length,
    draft: projects.filter(p => p.status === 'DRAFT').length,
    members: projects.reduce((sum, project) => sum + ((project.members || []).length || 0), 0),
  };

  const statusTone = (status: string) => {
    if (status === 'COMPLETED') return { bg: '#D1FAE5', color: '#065F46', label: 'Done' };
    if (status === 'IN_PROGRESS') return { bg: '#DBEAFE', color: '#1D4ED8', label: 'In progress' };
    if (status === 'CANCELLED') return { bg: '#FEE2E2', color: '#B91C1C', label: 'Cancelled' };
    return { bg: '#E2E8F0', color: '#475569', label: 'Draft' };
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <span className="page-subtitle">Manager workspace</span>
        <h1>Company Assignment</h1>
        <p>Review active projects, track ownership, and keep member assignments aligned with the current workload.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Projects', value: counts.total },
          { label: 'In progress', value: counts.active },
          { label: 'Drafts', value: counts.draft },
          { label: 'Assigned members', value: counts.members },
        ].map(item => (
          <div key={item.label} className="kpi-card">
            <div className="kpi-value">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Search project or company..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 380, marginBottom: 16 }}
      />

      {loading ? (
        <div className="card" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading projects...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {paginatedProjects.map(project => {
            const tone = statusTone(project.status);
            const memberCount = (project.members || []).length || 0;
            const createdDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString('vi-VN') : 'N/A';
            return (
              <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{project.projectName}</div>
                    <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>{project.targetCompanyName}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>{tone.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type & Created</div>
                    <div style={{ fontWeight: 700, marginTop: 2, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.projectType || 'N/A'} &middot; {createdDate}
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Members</div>
                    <div style={{ fontWeight: 700, marginTop: 2, fontSize: 12 }}>{memberCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                  {project.description || 'No description available for this project.'}
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => setViewingProject(project)}
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32, paddingBottom: 32 }}>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === 0} 
            onClick={() => {
              setCurrentPage(c => c - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Trang trước
          </button>
          
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Trang {currentPage + 1} / {totalPages}
          </span>
          
          <button 
            className="btn btn-outline" 
            disabled={currentPage >= totalPages - 1} 
            onClick={() => {
              setCurrentPage(c => c + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Trang sau
          </button>
        </div>
      )}
      
      {viewingProject && (
        <div className="modal-overlay" onClick={() => setViewingProject(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{viewingProject.projectName}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Target: <strong style={{ color: 'var(--text-secondary)' }}>{viewingProject.targetCompanyName}</strong>
                </div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 999, background: statusTone(viewingProject.status).bg, color: statusTone(viewingProject.status).color, fontSize: 12, fontWeight: 700 }}>
                {statusTone(viewingProject.status).label}
              </span>
            </div>
            
            <div className="modal-body" style={{ textAlign: 'left', margin: '20px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>Project Type</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{viewingProject.projectType || 'N/A'}</div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>Created Date</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{viewingProject.createdAt ? new Date(viewingProject.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Assigned Members ({viewingProject.members?.length || 0})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {viewingProject.members && viewingProject.members.length > 0 ? (
                    viewingProject.members.map((m: any, idx: number) => (
                      <div key={idx} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}></div>
                        {m.memberRole}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No members assigned yet.</div>
                  )}
                </div>
              </div>

              <div style={{ padding: 16, border: '1px solid var(--border-light)', borderRadius: 12, background: 'var(--surface)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Description</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {viewingProject.description || 'No description available for this project.'}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ paddingTop: 20, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setViewingProject(null)} style={{ padding: '10px 24px' }}>Đóng</button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px 24px' }}
                onClick={() => {
                  localStorage.setItem('apms-active-project', String(viewingProject.id));
                  if (setActivePage) setActivePage('project-management');
                }}
              >
                Mở Workspace chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Analysis History ───
export const AnalysisHistory: React.FC = () => {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/analysis/history')
      .then(res => {
        if (res?.success && Array.isArray(res.data)) setAnalyses(res.data);
        else if (res?.success && res.data?.content) setAnalyses(res.data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <h1>Analysis History {loading && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 'normal' }}>(Đang tải...)</span>}</h1>
      </div>
      {!loading && analyses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div>Chưa có lịch sử phân tích nào.</div>
        </div>
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
              {['Công ty', 'Loại phân tích', 'Ngày cập nhật', 'Trạng thái', 'Mô tả', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analyses.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{a.companyName || 'N/A'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{a.analysisType}</span>
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{a.date}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span className={`badge ${a.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                    {a.status}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.summary}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <button className="btn btn-sm btn-outline">Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
};

// ─── Risk Monitoring ───
export const RiskMonitoring: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/risk-monitoring')
      .then(res => {
        if (res?.success && Array.isArray(res.data)) setItems(res.data);
        else if (res?.success && Array.isArray(res.data?.content)) setItems(res.data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const high = items.filter(item => (Number(item?.riskScore) || 0) >= 60).length;
  const medium = items.filter(item => (Number(item?.riskScore) || 0) >= 40 && (Number(item?.riskScore) || 0) < 60).length;
  const low = items.filter(item => (Number(item?.riskScore) || 0) < 40).length;
  const averageRisk = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + (Number(item?.riskScore) || 0), 0) / items.length)
    : 0;

  const tone = (riskScore: number) => {
    if (riskScore >= 60) return { bg: '#FEE2E2', color: '#B91C1C', label: 'High' };
    if (riskScore >= 40) return { bg: '#FEF3C7', color: '#92400E', label: 'Medium' };
    return { bg: '#D1FAE5', color: '#065F46', label: 'Low' };
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <span className="page-subtitle">Risk dashboard</span>
        <h1>Risk Monitoring</h1>
        <p>Surface companies that need attention first, then separate the queue by risk intensity.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Average risk', value: `${averageRisk}%` },
          { label: 'High risk', value: high },
          { label: 'Medium risk', value: medium },
          { label: 'Low risk', value: low },
        ].map(item => (
          <div key={item.label} className="kpi-card">
            <div className="kpi-value">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading risk data...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {items.map(item => {
            const riskScore = Number(item?.riskScore) || 0;
            const rowTone = tone(riskScore);
            return (
              <div key={item.companyId} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.tradeName || item.legalName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{item.industry}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: rowTone.bg, color: rowTone.color, fontSize: 11, fontWeight: 700 }}>{rowTone.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-light)', overflow: 'hidden' }}>
                    <div style={{ width: `${riskScore}%`, height: '100%', borderRadius: 'inherit', background: riskScore >= 60 ? '#ef4444' : riskScore >= 40 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <strong style={{ minWidth: 36, textAlign: 'right' }}>{riskScore}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{item.reviewStatus}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tax code</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{item.taxCode || '—'}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk label</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{item.riskLevel}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// â”€â”€â”€ Approvals â”€â”€â”€
export const ApprovalsPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/projects', { params: { page: 0, size: 50 } })
      .then(res => {
        const rows = res?.data?.content || res?.data || [];
        const normalized = Array.isArray(rows) ? rows : [];
        setProjects(normalized);
        const stored = localStorage.getItem('apms-active-project');
        const nextProjectId = stored && normalized.some(project => String(project.id) === stored)
          ? stored
          : normalized[0]?.id ? String(normalized[0].id) : '';
        setSelectedProjectId(nextProjectId);
      })
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    api.get<any>(`/projects/${selectedProjectId}/candidates`, { params: { page: 0, size: 50 } })
      .then(res => {
        const rows = res?.data?.content || res?.data || [];
        setCandidates(Array.isArray(rows) ? rows : []);
      })
      .catch(console.error)
      .finally(() => setLoadingCandidates(false));
  }, [selectedProjectId]);

  const activeProject = projects.find(project => String(project.id) === selectedProjectId) || projects[0] || null;
  const queue = candidates.filter(candidate => candidate.status === 'PENDING_REVIEW' || candidate.status === 'CORRECTED');
  const ready = candidates.filter(candidate => candidate.status === 'APPROVED').length;
  const rejected = candidates.filter(candidate => candidate.status === 'REJECTED').length;
  const pending = queue.length;

  const approveCandidate = async (candidateId: string) => {
    try {
      await api.post(`/candidates/${candidateId}/approve`, {});
      setFeedback('Candidate approved.');
      if (selectedProjectId) {
        const res = await api.get<any>(`/projects/${selectedProjectId}/candidates`, { params: { page: 0, size: 50 } });
        const rows = res?.data?.content || res?.data || [];
        setCandidates(Array.isArray(rows) ? rows : []);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to approve candidate.');
    }
  };

  const rejectCandidate = async (candidateId: string) => {
    const reason = window.prompt('Rejection reason', 'Insufficient evidence');
    if (!reason) return;

    try {
      await api.post(`/candidates/${candidateId}/reject`, { rejectionReason: reason });
      setFeedback('Candidate rejected.');
      if (selectedProjectId) {
        const res = await api.get<any>(`/projects/${selectedProjectId}/candidates`, { params: { page: 0, size: 50 } });
        const rows = res?.data?.content || res?.data || [];
        setCandidates(Array.isArray(rows) ? rows : []);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to reject candidate.');
    }
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <span className="page-subtitle">Approval queue</span>
        <h1>Approvals</h1>
        <p>Review candidate suggestions inside the active project and decide whether they should move forward.</p>
      </div>

      {feedback && <div className="workspace-inline-note" style={{ marginBottom: 16 }}>{feedback}</div>}

      <div className="dashboard-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Pending', value: pending },
          { label: 'Approved', value: ready },
          { label: 'Rejected', value: rejected },
          { label: 'Project', value: activeProject ? 1 : 0 },
        ].map(item => (
          <div key={item.label} className="kpi-card">
            <div className="kpi-value">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      {loadingProjects || loadingCandidates ? (
        <div className="card" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading approvals...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Projects</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map(project => (
                <button
                  key={project.id}
                  className="btn btn-outline"
                  onClick={() => setSelectedProjectId(String(project.id))}
                  style={{
                    justifyContent: 'space-between',
                    background: String(project.id) === selectedProjectId ? 'rgba(37,99,235,0.08)' : undefined,
                    borderColor: String(project.id) === selectedProjectId ? 'rgba(37,99,235,0.28)' : undefined,
                  }}
                >
                  <span>{project.projectName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(project.members || []).length || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeProject && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{activeProject.projectName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{activeProject.targetCompanyName}</div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{activeProject.status}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{activeProject.description || 'No project description available.'}</div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map((candidate: any) => (
                <div key={candidate.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{candidate.companyName || candidate.suggestedCompanyName || candidate.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Status: {candidate.status} · Confidence: {candidate.relationshipConfidenceScore ?? '—'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                      {candidate.suggestedRelationshipType || 'No relationship suggestion available.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => approveCandidate(candidate.id)}>Approve</button>
                    <button className="btn btn-sm btn-outline" onClick={() => rejectCandidate(candidate.id)}>Reject</button>
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No pending approval items for this project.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// â”€â”€â”€ Team KPI â”€â”€â”€
export const TeamKPI: React.FC = () => {
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTeamKpi = () => {
    setLoading(true);
    api.get<any>('/kpi/team')
      .then(res => {
        if (res?.success && Array.isArray(res.data)) setKpiData(res.data);
        else if (res?.success && res.data?.content) setKpiData(res.data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeamKpi();
  }, []);

  const rows = [...kpiData].sort((a, b) => {
    const aRatio = (Number(a?.companiesReviewed) || 0) / Math.max(1, Number(a?.target) || 1);
    const bRatio = (Number(b?.companiesReviewed) || 0) / Math.max(1, Number(b?.target) || 1);
    return bRatio - aRatio;
  });

  const totalMembers = rows.length;
  const totalReviewed = rows.reduce((sum, row) => sum + (Number(row?.companiesReviewed) || 0), 0);
  const totalTarget = rows.reduce((sum, row) => sum + (Number(row?.target) || 0), 0);
  const avgAccuracy = totalMembers > 0
    ? Math.round(rows.reduce((sum, row) => sum + (Number(row?.accuracy) || 0), 0) / totalMembers)
    : 0;
  const hitTarget = rows.filter(row => (Number(row?.companiesReviewed) || 0) >= (Number(row?.target) || 0)).length;
  const bonusCount = rows.filter(row => Boolean(row?.bonus)).length;
  const nearTarget = rows.filter(row => {
    const target = Math.max(1, Number(row?.target) || 1);
    const pct = ((Number(row?.companiesReviewed) || 0) / target) * 100;
    return pct >= 70 && pct < 100;
  }).length;
  const behindCount = Math.max(0, totalMembers - hitTarget - nearTarget);
  const completionRate = totalTarget > 0 ? Math.round((totalReviewed / totalTarget) * 100) : 0;
  const topMember = rows[0];
  const topProgress = topMember
    ? Math.min(100, Math.round(((Number(topMember.companiesReviewed) || 0) / Math.max(1, Number(topMember.target) || 1)) * 100))
    : 0;
  const donutData = [
    { label: 'Hit target', value: hitTarget, color: '#2563EB' },
    { label: 'Near target', value: nearTarget, color: '#93C5FD' },
    { label: 'Behind', value: behindCount || 1, color: '#E2E8F0' },
  ];

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <span className="page-subtitle">Manager overview</span>
        <h1>Team KPI</h1>
        <p>Track output, accuracy, and bonus eligibility across the team.</p>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={loadTeamKpi} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
      </div>

      <div className="team-kpi-summary-grid">
        {[
          { label: 'Team members', value: totalMembers },
          { label: 'Hit target', value: hitTarget },
          { label: 'Avg accuracy', value: totalMembers > 0 ? `${avgAccuracy}%` : '—' },
          { label: 'Bonus eligible', value: bonusCount },
        ].map(s => (
          <div key={s.label} className="kpi-card team-kpi-summary-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {!loading && rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>KPI</div>
          <div>Chưa có dữ liệu KPI.</div>
        </div>
      ) : (
        <div className="team-kpi-layout">
          <div className="team-kpi-list">
            {rows.map((k: any, i: number) => {
              const target = Math.max(1, Number(k?.target) || 1);
              const reviewed = Number(k?.companiesReviewed) || 0;
              const pct = Math.min(100, Math.round((reviewed / target) * 100));
              const accuracy = Number(k?.accuracy) || 0;
              const progressTone = pct >= 100 ? 'good' : pct >= 70 ? 'warn' : 'danger';

              return (
                <div key={`${k?.name || 'member'}-${i}`} className="card team-kpi-row">
                  <div className="team-kpi-row-head">
                    <div className="team-kpi-rank">#{i + 1}</div>
                    <div className="team-kpi-identity">
                      <div className="team-kpi-name">{k?.name || 'Unknown'}</div>
                      <div className="team-kpi-role">{k?.role || 'Member'}</div>
                    </div>
                    {k?.bonus && <span className="team-kpi-badge">Bonus</span>}
                  </div>

                  <div className="team-kpi-metrics">
                    <div className="team-kpi-metric">
                      <strong>{reviewed}/{target}</strong>
                      <span>Companies</span>
                    </div>
                    <div className="team-kpi-metric">
                      <strong>{accuracy}%</strong>
                      <span>Accuracy</span>
                    </div>
                    <div className="team-kpi-metric">
                      <strong>{k?.aiReviewed ?? '—'}</strong>
                      <span>AI reviewed</span>
                    </div>
                  </div>

                  <div className="team-kpi-progress">
                    <div className={`team-kpi-progress-bar ${progressTone}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="team-kpi-row-foot">
                    <span>{pct}% of target</span>
                    <span>{reviewed} reviewed</span>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="team-kpi-rail">
            <div className="card team-kpi-graphic">
              <div className="team-kpi-rail-title">
                <div>
                  <span className="page-subtitle">Team mix</span>
                  <h3>{completionRate}% completion</h3>
                </div>
                <div className="team-kpi-mini-stat">
                  <strong>{totalReviewed}</strong>
                  <span>Total reviewed</span>
                </div>
              </div>
              <DonutChart
                data={donutData}
                size={168}
                centerValue={`${avgAccuracy}%`}
                centerLabel="avg accuracy"
              />
              <div className="team-kpi-legend">
                {donutData.map(item => (
                  <div key={item.label} className="team-kpi-legend-item">
                    <span className="team-kpi-legend-swatch" style={{ background: item.color }} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="card team-kpi-notes">
              <span className="page-subtitle">Manager notes</span>
              <div className="team-kpi-notes-list">
                <div className="team-kpi-note">
                  <strong>{topMember?.name || 'No leader yet'}</strong>
                  <span>Top progress at {topProgress}% of target.</span>
                </div>
                <div className="team-kpi-note">
                  <strong>{bonusCount} bonus eligible</strong>
                  <span>Keep reward review in sync with weekly output.</span>
                </div>
                <div className="team-kpi-note">
                  <strong>{completionRate}% team completion</strong>
                  <span>Use this to rebalance workloads before the next cycle.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

// â”€â”€â”€ Reports (Manager) â”€â”€â”€
export const ManagerReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [reportDraft, setReportDraft] = useState({
    title: '',
    type: 'Weekly summary',
    author: '',
    pages: '4',
    status: 'draft',
  });
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/reports')
      .then(res => {
        if (res?.success && Array.isArray(res.data)) setReports(res.data);
        else if (res?.success && res.data?.content) setReports(res.data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateReport = () => {
    const title = reportDraft.title.trim();
    const author = reportDraft.author.trim();

    if (!title || !author) {
      setReportFeedback('Title and author are required.');
      return;
    }

    const nextReport = {
      id: `draft-${Date.now()}`,
      title,
      type: reportDraft.type.trim() || 'Weekly summary',
      author,
      pages: Number(reportDraft.pages) || 1,
      status: reportDraft.status,
      date: new Date().toLocaleDateString('vi-VN'),
    };

    setReports((current) => [nextReport, ...current]);
    setReportDraft({
      title: '',
      type: 'Weekly summary',
      author: '',
      pages: '4',
      status: 'draft',
    });
    setShowCreateForm(false);
    setReportFeedback('Draft report created in the current view.');
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <h1>Reports {loading && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 'normal' }}>(Đang tải...)</span>}</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateForm((current) => !current)}>
            + Tạo báo cáo
          </button>
        </div>
      </div>
      {reportFeedback && <div className="workspace-inline-note" style={{ marginBottom: 16 }}>{reportFeedback}</div>}
      {showCreateForm && (
        <div className="workspace-panel" style={{ marginBottom: 18 }}>
          <div className="workspace-section-head">
            <div>
              <h3>Create report draft</h3>
              <p>Create a draft report in the current session. Backend persistence is not wired yet.</p>
            </div>
          </div>
          <div className="workspace-form-grid">
            <label>
              <span>Title</span>
              <input
                className="search-input"
                value={reportDraft.title}
                onChange={(e) => setReportDraft((current) => ({ ...current, title: e.target.value }))}
                placeholder="Weekly manager summary"
              />
            </label>
            <label>
              <span>Type</span>
              <input
                className="search-input"
                value={reportDraft.type}
                onChange={(e) => setReportDraft((current) => ({ ...current, type: e.target.value }))}
                placeholder="Weekly summary"
              />
            </label>
            <label>
              <span>Author</span>
              <input
                className="search-input"
                value={reportDraft.author}
                onChange={(e) => setReportDraft((current) => ({ ...current, author: e.target.value }))}
                placeholder="Manager name"
              />
            </label>
            <label>
              <span>Pages</span>
              <input
                className="search-input"
                value={reportDraft.pages}
                onChange={(e) => setReportDraft((current) => ({ ...current, pages: e.target.value }))}
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="workspace-head-actions">
            <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateReport}>Create draft</button>
          </div>
        </div>
      )}
      {!loading && reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div>Chưa có báo cáo nào.</div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {reports.map((r: any) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>{r.type}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: r.status === 'published' ? '#D1FAE5' : '#FEF3C7',
                color: r.status === 'published' ? '#065F46' : '#92400E',
              }}>{r.status === 'published' ? 'Đã đăng' : 'Bản nháp'}</span>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 10, color: 'var(--text-primary)' }}>{r.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{r.date}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm">Xem</button>
              {r.status === 'draft' && <button className="btn btn-primary btn-sm">Đăng</button>}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
};

// ─── Partner Status ───
export const PartnerStatus: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPartnerStatus = () => {
    setLoading(true);
    api.get<any>('/profiles?page=0&size=100')
      .then(res => {
        if (res?.success && res.data?.content) setProfiles(res.data.content);
        else if (res?.success && Array.isArray(res.data)) setProfiles(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPartnerStatus();
  }, []);

  const TIER_COLORS: Record<string, string> = {
    Platinum: '#2563EB',
    Gold: '#0F766E',
    Silver: '#64748B',
    Watch: '#DC2626',
  };

  const rows = profiles.filter(profile => {
    const label = `${profile.tradeName || ''} ${profile.legalName || ''} ${profile.partnerTier || profile.tier || ''}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const statusGroups = Object.entries(TIER_COLORS).map(([label, color]) => {
    const companies = rows.filter(p => (p.partnerTier || p.tier || 'Silver') === label);
    return { label, color, companies };
  });

  const summary = {
    total: rows.length,
    verified: rows.filter(p => p.reviewStatus === 'VERIFIED').length,
    pending: rows.filter(p => p.reviewStatus === 'PENDING_REVIEW').length,
    watch: rows.filter(p => (p.partnerTier || p.tier || 'Silver') === 'Watch').length,
  };

  const statusTone = (status?: string) => {
    if (status === 'VERIFIED') return { bg: '#D1FAE5', color: '#065F46', label: 'Verified' };
    if (status === 'PENDING_REVIEW') return { bg: '#FEF3C7', color: '#92400E', label: 'Pending' };
    if (status === 'IN_PROGRESS') return { bg: '#DBEAFE', color: '#1D4ED8', label: 'In progress' };
    if (status === 'REJECTED') return { bg: '#FEE2E2', color: '#B91C1C', label: 'Rejected' };
    return { bg: '#E2E8F0', color: '#475569', label: 'Unspecified' };
  };

  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager">
      <div className="page-header">
        <span className="page-subtitle">Partner portfolio</span>
        <h1>Partner Status</h1>
        <p>Monitor the current tier distribution and review state across all partners in one view.</p>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={loadPartnerStatus} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="team-kpi-summary-grid partner-status-summary-grid">
        {[
          { label: 'Partners', value: summary.total },
          { label: 'Verified', value: summary.verified },
          { label: 'Pending', value: summary.pending },
          { label: 'Watchlist', value: summary.watch },
        ].map(item => (
          <div key={item.label} className="kpi-card team-kpi-summary-card">
            <div className="kpi-value">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Search partner, legal name, tier..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 420, marginBottom: 16 }}
      />

      {loading ? (
        <div className="card" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading partner status...</div>
      ) : (
        <div className="partner-status-layout">
          <div className="partner-status-list">
            {statusGroups.map(group => (
              <div key={group.label} className="card partner-status-group" style={{ borderTop: `3px solid ${group.color}` }}>
                <div className="partner-status-group-head">
                  <div>
                    <div className="partner-status-group-title" style={{ color: group.color }}>{group.label}</div>
                    <div className="partner-status-group-subtitle">{group.companies.length} partners</div>
                  </div>
                  <span className="partner-status-badge" style={{ background: group.color, color: '#fff' }}>
                    {Math.round((group.companies.length / Math.max(1, rows.length)) * 100)}%
                  </span>
                </div>

                {group.companies.length === 0 ? (
                  <div className="partner-status-empty">No partners in this tier.</div>
                ) : (
                  <div className="partner-status-items">
                    {group.companies.map(profile => {
                      const tone = statusTone(profile.reviewStatus);
                      return (
                        <div key={profile.companyId || profile.id || profile.tradeName || profile.legalName} className="partner-status-item">
                          <div className="partner-status-item-head">
                            <div className="partner-status-item-title">
                              {profile.tradeName || profile.legalName || 'Doanh nghiệp'}
                            </div>
                            <span className="partner-status-chip" style={{ background: tone.bg, color: tone.color }}>
                              {tone.label}
                            </span>
                          </div>
                          <div className="partner-status-item-meta">
                            <span>{profile.industry || profile.business?.industries?.[0] || 'Unknown industry'}</span>
                            <span>{profile.taxCode || 'No tax code'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <aside className="partner-status-rail">
            <div className="card partner-status-rail-card">
              <span className="page-subtitle">Portfolio snapshot</span>
              <div className="partner-status-rail-title">What needs attention first</div>
              <div className="partner-status-rail-note">
                Watchlist partners stay visible here so the queue is not hidden inside the tier cards.
              </div>
              <div className="partner-status-rail-stats">
                <div>
                  <strong>{summary.watch}</strong>
                  <span>Watchlist</span>
                </div>
                <div>
                  <strong>{summary.pending}</strong>
                  <span>Pending review</span>
                </div>
              </div>
            </div>

            <div className="card partner-status-rail-card">
              <span className="page-subtitle">Tier mix</span>
              <div className="partner-status-legend">
                {Object.entries(TIER_COLORS).map(([tier, color]) => {
                  const count = rows.filter(p => (p.partnerTier || p.tier || 'Silver') === tier).length;
                  return (
                    <div key={tier} className="partner-status-legend-item">
                      <span className="partner-status-legend-swatch" style={{ background: color }} />
                      <span>{tier}</span>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};




