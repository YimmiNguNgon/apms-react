import React, { useState } from 'react';

// ─── Shared mock ───
const COMPANIES_POOL = [
  { id: 1, name: 'FPT Corporation',   region: 'HCM', industry: 'Technology', score: 92 },
  { id: 2, name: 'VNPT Group',        region: 'HN',  industry: 'Telecom',    score: 85 },
  { id: 3, name: 'Viettel Digital',   region: 'HN',  industry: 'Technology', score: 88 },
  { id: 4, name: 'CMC Technology',    region: 'HCM', industry: 'IT',         score: 74 },
  { id: 5, name: 'MoMo',             region: 'HCM', industry: 'FinTech',    score: 69 },
  { id: 6, name: 'VinGroup',         region: 'HN',  industry: 'Conglomerate',score: 95 },
  { id: 7, name: 'Sacombank',        region: 'HCM', industry: 'Banking',    score: 71 },
  { id: 8, name: 'TH True Milk',     region: 'HN',  industry: 'FMCG',       score: 66 },
];

// ─── Partner Evaluation ───
const EVALUATIONS = [
  { id: 1, company: 'FPT Corporation', evaluator: 'Trần QB', date: '14/06/2026', score: 92, recommendation: 'Nâng cấp Platinum', status: 'approved' },
  { id: 2, company: 'MoMo',           evaluator: 'Lê HV',   date: '13/06/2026', score: 69, recommendation: 'Giữ nguyên Silver',  status: 'pending' },
  { id: 3, company: 'CMC Technology', evaluator: 'Hà ĐH',   date: '12/06/2026', score: 74, recommendation: 'Xem xét lại Q3',     status: 'review' },
  { id: 4, company: 'Sacombank',      evaluator: 'Trần QB', date: '10/06/2026', score: 71, recommendation: 'Cần bổ sung tài liệu',status: 'pending' },
];

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: '#D1FAE5', color: '#065F46', label: 'Đã duyệt' },
  pending:  { bg: '#FEF3C7', color: '#92400E', label: 'Chờ duyệt' },
  review:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Đang xem xét' },
  rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Từ chối' },
};

export const PartnerEvaluation: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = EVALUATIONS.filter(e =>
    e.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Partner Evaluation</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Tạo đánh giá</button>
        </div>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng đánh giá', value: EVALUATIONS.length },
          { label: 'Đã duyệt',      value: EVALUATIONS.filter(e => e.status === 'approved').length },
          { label: 'Chờ duyệt',     value: EVALUATIONS.filter(e => e.status === 'pending').length },
          { label: 'Điểm TB',        value: Math.round(EVALUATIONS.reduce((s,e) => s+e.score,0)/EVALUATIONS.length) },
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
          const sc = STATUS_MAP[ev.status];
          return (
            <div key={ev.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `conic-gradient(#2563EB ${ev.score * 3.6}deg, var(--border-light) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{ev.score}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ev.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đánh giá bởi {ev.evaluator} · {ev.date}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{ev.recommendation}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline">Xem</button>
                  {ev.status === 'pending' && <button className="btn btn-sm btn-primary">Duyệt</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ─── Company Assignment ───
const STAFF_LIST = [
  { id: 1, name: 'Lê Thị Hồng Vân', role: 'Key Member', assigned: 3 },
  { id: 2, name: 'Hà Đức Huy',      role: 'BD Staff',   assigned: 4 },
  { id: 3, name: 'Phạm Thị Lan',    role: 'BD Staff',   assigned: 2 },
];

export const CompanyAssignment: React.FC = () => {
  const [assignments, setAssignments] = useState<Record<number, number>>({
    1: 1, 2: 1, 3: 2, 4: 3, 5: 2, 6: 1, 7: 3, 8: 2,
  });

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Company Assignment</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">Lưu phân công</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phân công công ty</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  {['Công ty', 'Khu vực', 'Ngành', 'Điểm', 'Nhân viên phụ trách'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPANIES_POOL.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{c.region}</td>
                    <td style={{ padding: '11px 14px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{c.industry}</span></td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: c.score >= 80 ? '#10B981' : c.score >= 70 ? '#F59E0B' : '#EF4444' }}>{c.score}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <select
                        value={assignments[c.id] || ''}
                        onChange={e => setAssignments(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                        style={{ padding: '5px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 12 }}
                      >
                        {STAFF_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tải công việc</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STAFF_LIST.map(s => {
              const count = Object.values(assignments).filter(v => v === s.id).length;
              const pct = Math.round((count / COMPANIES_POOL.length) * 100);
              return (
                <div key={s.id} className="card">
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{s.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: pct > 60 ? '#EF4444' : '#2563EB', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 32 }}>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Risk Monitoring ───
const RISKS = [
  { id: 1, company: 'MoMo',           risk: 'Tài chính', level: 'High',   desc: 'Tăng trưởng giảm 3% liên tiếp 2 quý; burn rate tăng 15%.', lastUpdate: '15/06/2026' },
  { id: 2, company: 'CMC Technology', risk: 'Hoạt động', level: 'Medium', desc: 'Chưa nộp báo cáo kiểm toán Q1/2026 theo hợp đồng.', lastUpdate: '14/06/2026' },
  { id: 3, company: 'Sacombank',      risk: 'Pháp lý',   level: 'Medium', desc: 'Đang điều tra của Ngân hàng Nhà nước về một giao dịch.', lastUpdate: '12/06/2026' },
  { id: 4, company: 'TH True Milk',   risk: 'Thị trường',level: 'Low',    desc: 'Thị phần giảm nhẹ tại miền Nam do cạnh tranh mới.', lastUpdate: '10/06/2026' },
];

const RISK_COLOR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

export const RiskMonitoring: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Risk Monitoring</h1>
      <div className="page-header-actions">
        <button className="btn btn-outline">Xuất báo cáo rủi ro</button>
      </div>
    </div>
    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Tổng rủi ro',   value: RISKS.length },
        { label: 'Mức cao',       value: RISKS.filter(r => r.level === 'High').length },
        { label: 'Mức trung bình',value: RISKS.filter(r => r.level === 'Medium').length },
        { label: 'Mức thấp',      value: RISKS.filter(r => r.level === 'Low').length },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {RISKS.map(r => (
        <div key={r.id} className="card" style={{ borderLeft: `4px solid ${RISK_COLOR[r.level as keyof typeof RISK_COLOR]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{r.company}</div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>{r.risk}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${RISK_COLOR[r.level as keyof typeof RISK_COLOR]}15`, color: RISK_COLOR[r.level as keyof typeof RISK_COLOR] }}>
                {r.level}
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Cập nhật: {r.lastUpdate}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{r.desc}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline">Xem chi tiết</button>
            <button className="btn btn-sm btn-outline">Ghi chú</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Approvals (suggested-actions-approval) ───
const APPROVALS = [
  { id: 1, title: 'Phân loại FPT Corporation → Platinum Partner', requestedBy: 'Lê HV',  date: '16/06/2026', type: 'Classification', priority: 'High' },
  { id: 2, title: 'Thêm mới: Công ty Vinamilk vào hệ thống',      requestedBy: 'Hà ĐH',  date: '16/06/2026', type: 'New Company',    priority: 'Normal' },
  { id: 3, title: 'Cập nhật dữ liệu VNPT Group (Q2/2026)',         requestedBy: 'Hà ĐH',  date: '15/06/2026', type: 'Data Update',   priority: 'Normal' },
  { id: 4, title: 'Xóa công ty trùng: CMC Corp duplicate',         requestedBy: 'Lê HV',  date: '15/06/2026', type: 'Dedup',         priority: 'Low' },
  { id: 5, title: 'AI gợi ý: Theo dõi thêm MoMo 30 ngày',         requestedBy: 'AI Bot', date: '14/06/2026', type: 'AI Action',     priority: 'High' },
];

export const ApprovalsPage: React.FC = () => {
  const [decisions, setDecisions] = useState<Record<number, 'approved' | 'rejected' | null>>({});

  const decide = (id: number, d: 'approved' | 'rejected') =>
    setDecisions(prev => ({ ...prev, [id]: d }));

  const pending = APPROVALS.filter(a => !decisions[a.id]);

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Approvals</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pending.length} đang chờ</span>
        </div>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Chờ xử lý', value: pending.length },
          { label: 'Đã duyệt',  value: Object.values(decisions).filter(d => d === 'approved').length },
          { label: 'Từ chối',   value: Object.values(decisions).filter(d => d === 'rejected').length },
          { label: 'Ưu tiên cao',value: APPROVALS.filter(a => a.priority === 'High' && !decisions[a.id]).length },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {APPROVALS.map(a => {
          const d = decisions[a.id];
          return (
            <div key={a.id} className="card" style={{ opacity: d ? 0.6 : 1, transition: 'opacity 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{a.type}</span>
                    {a.priority === 'High' && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#991B1B' }}>Ưu tiên cao</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Yêu cầu bởi {a.requestedBy} · {a.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 20 }}>
                  {d ? (
                    <span style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: d === 'approved' ? '#D1FAE5' : '#FEE2E2',
                      color: d === 'approved' ? '#065F46' : '#991B1B',
                    }}>
                      {d === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                    </span>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => decide(a.id, 'approved')}>Duyệt</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }} onClick={() => decide(a.id, 'rejected')}>Từ chối</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ─── Team KPI ───
const KPI_DATA = [
  { name: 'Lê Thị Hồng Vân', role: 'Key Member', companiesReviewed: 24, accuracy: 96, aiReviewed: 18, target: 20, bonus: true },
  { name: 'Hà Đức Huy',      role: 'BD Staff',   companiesReviewed: 18, accuracy: 91, aiReviewed: 12, target: 15, bonus: true },
  { name: 'Phạm Thị Lan',    role: 'BD Staff',   companiesReviewed: 10, accuracy: 84, aiReviewed:  6, target: 15, bonus: false },
];

export const TeamKPI: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Team KPI</h1>
      <div className="page-header-actions">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kỳ: Tháng 6/2026</span>
      </div>
    </div>
    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Thành viên',      value: KPI_DATA.length },
        { label: 'Đạt KPI',        value: KPI_DATA.filter(k => k.companiesReviewed >= k.target).length },
        { label: 'Độ chính xác TB',value: `${Math.round(KPI_DATA.reduce((s,k) => s+k.accuracy,0)/KPI_DATA.length)}%` },
        { label: 'Đủ điều kiện thưởng', value: KPI_DATA.filter(k => k.bonus).length },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {KPI_DATA.map((k, i) => {
        const pct = Math.min(100, Math.round((k.companiesReviewed / k.target) * 100));
        return (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{k.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.role}</div>
              </div>
              {k.bonus && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46' }}>Đủ thưởng</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Công ty xử lý', value: `${k.companiesReviewed}/${k.target}` },
                { label: 'Độ chính xác', value: `${k.accuracy}%` },
                { label: 'AI đã xét duyệt', value: k.aiReviewed },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: '10px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: pct >= 100 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444', height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, color: 'var(--text-muted)' }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

// ─── Reports (Manager) ───
const MANAGER_REPORTS = [
  { id: 1, title: 'Báo cáo Hiệu suất Đội ngũ T6/2026',     date: '01/06/2026', type: 'Monthly',  status: 'published' },
  { id: 2, title: 'Tình trạng Đánh giá Đối tác Q2/2026',   date: '15/05/2026', type: 'Quarterly', status: 'published' },
  { id: 3, title: 'Báo cáo Rủi ro Danh mục T5/2026',       date: '31/05/2026', type: 'Monthly',  status: 'draft' },
  { id: 4, title: 'Phân tích Phân công Công việc H1/2026',  date: '30/04/2026', type: 'Ad-hoc',   status: 'published' },
];

export const ManagerReports: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Reports</h1>
      <div className="page-header-actions">
        <button className="btn btn-primary">+ Tạo báo cáo</button>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
      {MANAGER_REPORTS.map(r => (
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
  </section>
);

// ─── Analysis History ───
const ANALYSES = [
  { id: 1, company: 'FPT Corporation', analyst: 'Lê HV',  date: '16/06/2026', type: 'Toàn diện', duration: '2h 15m', result: 'Đề xuất Platinum' },
  { id: 2, company: 'VNPT Group',      analyst: 'Hà ĐH',  date: '15/06/2026', type: 'Nhanh',     duration: '35m',   result: 'Giữ nguyên Gold' },
  { id: 3, company: 'Viettel Digital', analyst: 'Lê HV',  date: '14/06/2026', type: 'Toàn diện', duration: '1h 50m', result: 'Tăng điểm +5' },
  { id: 4, company: 'CMC Technology',  analyst: 'Hà ĐH',  date: '13/06/2026', type: 'Rủi ro',    duration: '45m',   result: 'Cảnh báo tài chính' },
];

export const AnalysisHistory: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Analysis History</h1>
    </div>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
            {['Công ty', 'Phân tích viên', 'Ngày', 'Loại phân tích', 'Thời gian', 'Kết quả', ''].map(h => (
              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ANALYSES.map(a => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '11px 14px', fontWeight: 600 }}>{a.company}</td>
              <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{a.analyst}</td>
              <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{a.date}</td>
              <td style={{ padding: '11px 14px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{a.type}</span></td>
              <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{a.duration}</td>
              <td style={{ padding: '11px 14px', fontSize: 13 }}>{a.result}</td>
              <td style={{ padding: '11px 14px' }}><button className="btn btn-sm btn-outline">Chi tiết</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

// ─── Partner Status ───
export const PartnerStatus: React.FC = () => {
  const statusGroups = [
    { label: 'Platinum', color: '#8B5CF6', companies: ['FPT Corporation', 'VinGroup'] },
    { label: 'Gold',     color: '#F59E0B', companies: ['VNPT Group', 'Viettel Digital'] },
    { label: 'Silver',   color: '#64748B', companies: ['CMC Technology', 'MoMo', 'Sacombank'] },
    { label: 'Watch',    color: '#EF4444', companies: ['TH True Milk'] },
  ];
  return (
    <section className="page active">
      <div className="page-header"><h1>Partner Status</h1></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
        {statusGroups.map(g => (
          <div key={g.label} className="card" style={{ borderTop: `3px solid ${g.color}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: g.color }}>{g.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{g.companies.length} đối tác</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.companies.map(c => (
                <div key={c} style={{ padding: '6px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13 }}>{c}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
