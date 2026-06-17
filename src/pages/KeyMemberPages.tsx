import React, { useState } from 'react';

// ─── Shared mock ───
const EXTRACTED_ITEMS = [
  { id: 1, company: 'FPT Corporation',   field: 'Doanh thu 2025',        aiValue: '120,000 tỷ VND', confidence: 94, source: 'BCTC 2025', status: 'pending' },
  { id: 2, company: 'FPT Corporation',   field: 'Số nhân viên',          aiValue: '47,000 người',   confidence: 88, source: 'LinkedIn', status: 'pending' },
  { id: 3, company: 'VNPT Group',        field: 'Thị phần Viễn thông',   aiValue: '31.4%',          confidence: 79, source: 'VNPT Report', status: 'approved' },
  { id: 4, company: 'Viettel Digital',   field: 'Sản phẩm chủ lực',     aiValue: 'ViettelPay, Viettel++', confidence: 91, source: 'Website', status: 'pending' },
  { id: 5, company: 'CMC Technology',    field: 'Năm thành lập',         aiValue: '1993',           confidence: 99, source: 'ĐKKD', status: 'approved' },
  { id: 6, company: 'MoMo',             field: 'Số người dùng',         aiValue: '31 triệu',       confidence: 72, source: 'Press Release', status: 'pending' },
  { id: 7, company: 'VinGroup',         field: 'Lĩnh vực kinh doanh',  aiValue: 'BĐS, Ô tô, Công nghệ, Y tế', confidence: 97, source: 'Annual Report', status: 'rejected' },
  { id: 8, company: 'Sacombank',        field: 'Tổng tài sản',         aiValue: '620,000 tỷ VND', confidence: 85, source: 'BCTC 2025', status: 'pending' },
];

// ─── Review Extracted Data ───
export const ReviewExtractedData: React.FC = () => {
  const [data, setData] = useState(EXTRACTED_ITEMS);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  const update = (id: number, status: 'approved' | 'rejected') =>
    setData(prev => prev.map(d => d.id === id ? { ...d, status } : d));

  const startEdit = (item: typeof EXTRACTED_ITEMS[0]) => {
    setEditId(item.id);
    setEditVal(item.aiValue);
  };

  const saveEdit = (id: number) => {
    setData(prev => prev.map(d => d.id === id ? { ...d, aiValue: editVal, status: 'approved' } : d));
    setEditId(null);
  };

  const filtered = data.filter(d => filterStatus === 'all' || d.status === filterStatus);

  const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: '#FEF3C7', color: '#92400E', label: 'Chờ xem xét' },
    approved: { bg: '#D1FAE5', color: '#065F46', label: 'Đã xác nhận' },
    rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Từ chối' },
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Review Extracted Data</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.filter(d => d.status === 'pending').length} mục chờ xem xét</span>
        </div>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng mục', value: data.length },
          { label: 'Chờ xem xét', value: data.filter(d => d.status === 'pending').length },
          { label: 'Đã xác nhận', value: data.filter(d => d.status === 'approved').length },
          { label: 'Đã từ chối',  value: data.filter(d => d.status === 'rejected').length },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['all','Tất cả'],['pending','Chờ xem xét'],['approved','Đã xác nhận'],['rejected','Đã từ chối']].map(([v,l]) => (
          <button key={v} className={`tab ${filterStatus === v ? 'active' : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(item => {
          const sc = STATUS_COLOR[item.status];
          return (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{item.company}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nguồn: {item.source}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.field}</div>
                  {editId === item.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={editVal} onChange={e => setEditVal(e.target.value)}
                             style={{ padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, flex: 1 }} />
                      <button className="btn btn-sm btn-primary" onClick={() => saveEdit(item.id)}>Lưu</button>
                      <button className="btn btn-sm btn-outline" onClick={() => setEditId(null)}>Hủy</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.aiValue}</div>
                  )}
                </div>
                <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `conic-gradient(${item.confidence >= 80 ? '#10B981' : item.confidence >= 60 ? '#F59E0B' : '#EF4444'} ${item.confidence * 3.6}deg, var(--border-light) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{item.confidence}%</div>
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  {item.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => startEdit(item)}>Sửa</button>
                      <button className="btn btn-sm btn-primary" onClick={() => update(item.id, 'approved')}>OK</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }} onClick={() => update(item.id, 'rejected')}>X</button>
                    </div>
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

// ─── Company Validation ───
const VALIDATION_QUEUE = [
  { id: 1, company: 'TechVision Ltd',      submittedBy: 'Hà ĐH',  date: '16/06/2026', completeness: 92, issues: [], },
  { id: 2, company: 'Green Energy VN',     submittedBy: 'Phạm TL', date: '15/06/2026', completeness: 74, issues: ['Thiếu BCTC 2024', 'Địa chỉ không khớp ĐKKD'] },
  { id: 3, company: 'Digital Payments JSC',submittedBy: 'Hà ĐH',  date: '14/06/2026', completeness: 88, issues: ['Số điện thoại sai định dạng'] },
];

export const CompanyValidation: React.FC = () => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Company Validation</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hàng đợi: {VALIDATION_QUEUE.length} hồ sơ</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VALIDATION_QUEUE.map(v => (
            <div key={v.id} className="card" style={{ cursor: 'pointer', borderColor: selected === v.id ? 'var(--accent)' : '' }}
                 onClick={() => setSelected(selected === v.id ? null : v.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{v.company}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: v.completeness >= 90 ? '#10B981' : v.completeness >= 75 ? '#F59E0B' : '#EF4444' }}>
                  {v.completeness}%
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Gửi bởi {v.submittedBy} · {v.date}
              </div>
              <div style={{ width: '100%', background: 'var(--border-light)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${v.completeness}%`, height: '100%', borderRadius: 4,
                              background: v.completeness >= 90 ? '#10B981' : v.completeness >= 75 ? '#F59E0B' : '#EF4444' }} />
              </div>
              {v.issues.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#EF4444' }}>
                  {v.issues.length} vấn đề cần xử lý
                </div>
              )}
            </div>
          ))}
        </div>

        {selected && (() => {
          const v = VALIDATION_QUEUE.find(x => x.id === selected)!;
          return (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{v.company} — Chi tiết xác thực</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {['Tên công ty', 'Mã số thuế', 'Địa chỉ', 'Ngành nghề', 'Năm thành lập', 'Website', 'BCTC'].map((field, i) => {
                  const ok = v.completeness >= 90 || i < 4;
                  return (
                    <div key={field} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span>{field}</span>
                      <span style={{ fontWeight: 600, color: ok ? '#10B981' : '#EF4444' }}>{ok ? 'Hợp lệ' : 'Thiếu/Sai'}</span>
                    </div>
                  );
                })}
              </div>
              {v.issues.length > 0 && (
                <div style={{ background: '#FEF3C7', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#92400E', marginBottom: 6 }}>Vấn đề cần xử lý:</div>
                  {v.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#92400E' }}>• {issue}</div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary">Xác nhận hợp lệ</button>
                <button className="btn btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }}>Yêu cầu bổ sung</button>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};

// ─── Partner & Competitor Classification ───
const CLASSIFY_DATA = [
  { id: 1, company: 'FPT Corporation',   aiClass: 'Strategic Partner', aiTier: 'Platinum', confidence: 95 },
  { id: 2, company: 'VNPT Group',        aiClass: 'Strategic Partner', aiTier: 'Gold',     confidence: 88 },
  { id: 3, company: 'Viettel Digital',   aiClass: 'Tech Partner',      aiTier: 'Gold',     confidence: 82 },
  { id: 4, company: 'CMC Technology',    aiClass: 'Technology Partner',aiTier: 'Silver',   confidence: 77 },
  { id: 5, company: 'MoMo',             aiClass: 'FinTech Partner',   aiTier: 'Silver',   confidence: 70 },
];

const COMP_CLASSIFY = [
  { id: 1, company: 'Deloitte Vietnam', aiClass: 'Direct Competitor',   aiThreat: 'High',   confidence: 92 },
  { id: 2, company: 'PwC Vietnam',      aiClass: 'Direct Competitor',   aiThreat: 'High',   confidence: 89 },
  { id: 3, company: 'KPMG Vietnam',     aiClass: 'Indirect Competitor', aiThreat: 'Medium', confidence: 81 },
  { id: 4, company: 'McKinsey VN',      aiClass: 'Indirect Competitor', aiThreat: 'Medium', confidence: 76 },
];

const ClassifyTable: React.FC<{ data: typeof CLASSIFY_DATA; mode: 'partner' }> = ({ data, mode }) => {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const tiers = ['Platinum', 'Gold', 'Silver', 'Watch'];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
            {['Công ty', 'AI Phân loại', 'AI Đề xuất Tier', 'Tin cậy', 'Xác nhận Tier', 'Thao tác'].map(h => (
              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '11px 14px', fontWeight: 600 }}>{d.company}</td>
              <td style={{ padding: '11px 14px', fontSize: 12 }}>{d.aiClass}</td>
              <td style={{ padding: '11px 14px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{d.aiTier}</span></td>
              <td style={{ padding: '11px 14px', fontWeight: 700, color: d.confidence >= 85 ? '#10B981' : '#F59E0B' }}>{d.confidence}%</td>
              <td style={{ padding: '11px 14px' }}>
                <select value={overrides[d.id] || d.aiTier}
                        onChange={e => setOverrides(prev => ({ ...prev, [d.id]: e.target.value }))}
                        style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 12 }}>
                  {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={{ padding: '11px 14px' }}>
                <button className="btn btn-sm btn-primary">Xác nhận</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PartnerClassification: React.FC = () => (
  <section className="page active">
    <div className="page-header"><h1>Partner Classification</h1></div>
    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>AI đã phân loại {CLASSIFY_DATA.length} đối tác. Xem xét và xác nhận hoặc điều chỉnh phân loại.</p>
    <ClassifyTable data={CLASSIFY_DATA} mode="partner" />
  </section>
);

export const CompetitorClassification: React.FC = () => {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const threats = ['High', 'Medium', 'Low'];
  return (
    <section className="page active">
      <div className="page-header"><h1>Competitor Classification</h1></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
              {['Công ty', 'AI Phân loại', 'AI Mức đe dọa', 'Tin cậy', 'Xác nhận Mức', 'Thao tác'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMP_CLASSIFY.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{d.company}</td>
                <td style={{ padding: '11px 14px', fontSize: 12 }}>{d.aiClass}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                 background: d.aiThreat === 'High' ? '#FEE2E2' : d.aiThreat === 'Medium' ? '#FEF3C7' : '#D1FAE5',
                                 color: d.aiThreat === 'High' ? '#991B1B' : d.aiThreat === 'Medium' ? '#92400E' : '#065F46' }}>
                    {d.aiThreat}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 700, color: d.confidence >= 85 ? '#10B981' : '#F59E0B' }}>{d.confidence}%</td>
                <td style={{ padding: '11px 14px' }}>
                  <select value={overrides[d.id] || d.aiThreat}
                          onChange={e => setOverrides(prev => ({ ...prev, [d.id]: e.target.value }))}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 12 }}>
                    {threats.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ padding: '11px 14px' }}><button className="btn btn-sm btn-primary">Xác nhận</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ─── AI Suggestion Review ───
const AI_SUGGESTIONS = [
  { id: 1, type: 'Partner Upgrade',  company: 'FPT Corporation', suggestion: 'Nâng cấp từ Gold → Platinum dựa trên tăng trưởng 12% và 8 hợp đồng thành công.', confidence: 94 },
  { id: 2, type: 'Risk Alert',       company: 'MoMo',           suggestion: 'Theo dõi chặt — doanh thu Q1 giảm 3%, cần đánh giá lại khả năng thanh khoản.', confidence: 87 },
  { id: 3, type: 'New Opportunity',  company: 'VinGroup',       suggestion: 'VinGroup đang tìm kiếm đối tác AI/Data — nên tiếp cận trong vòng 2 tuần.', confidence: 79 },
  { id: 4, type: 'Data Enrichment',  company: 'Sacombank',      suggestion: 'Cập nhật thông tin lãnh đạo từ nguồn LinkedIn và BCTN 2025.', confidence: 82 },
  { id: 5, type: 'Dedup Detection',  company: 'CMC Corp',       suggestion: 'Phát hiện trùng lặp với CMC Technology — đề xuất hợp nhất hồ sơ.', confidence: 96 },
  { id: 6, type: 'Competitor Move',  company: 'Deloitte VN',    suggestion: 'Deloitte vừa ra mắt sản phẩm tương tự APMS — cần phân tích chiến lược đối phó.', confidence: 88 },
];

export const AISuggestionReview: React.FC = () => {
  const [reviews, setReviews] = useState<Record<number, 'accepted' | 'rejected' | null>>({});

  const decide = (id: number, d: 'accepted' | 'rejected') =>
    setReviews(prev => ({ ...prev, [id]: d }));

  const TYPE_BADGE: Record<string, string> = {
    'Partner Upgrade': 'badge-green',
    'Risk Alert': 'badge-red',
    'New Opportunity': 'badge-blue',
    'Data Enrichment': 'badge-purple',
    'Dedup Detection': 'badge-yellow',
    'Competitor Move': 'badge-red',
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>AI Suggestion Review</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{AI_SUGGESTIONS.filter(s => !reviews[s.id]).length} chờ xem xét</span>
        </div>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng gợi ý',  value: AI_SUGGESTIONS.length },
          { label: 'Đã chấp nhận',value: Object.values(reviews).filter(v => v === 'accepted').length },
          { label: 'Đã từ chối',  value: Object.values(reviews).filter(v => v === 'rejected').length },
          { label: 'Độ tin cậy TB',value: `${Math.round(AI_SUGGESTIONS.reduce((s,r) => s+r.confidence,0)/AI_SUGGESTIONS.length)}%` },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AI_SUGGESTIONS.map(s => {
          const r = reviews[s.id];
          return (
            <div key={s.id} className="card" style={{ opacity: r ? 0.65 : 1, transition: 'opacity 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className={`badge ${TYPE_BADGE[s.type] || 'badge-blue'}`} style={{ fontSize: 11 }}>{s.type}</span>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{s.company}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{s.suggestion}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, maxWidth: 160, background: 'var(--border-light)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${s.confidence}%`, background: s.confidence >= 85 ? '#10B981' : '#F59E0B', height: '100%', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tin cậy: <strong style={{ color: 'var(--text-primary)' }}>{s.confidence}%</strong></span>
                  </div>
                </div>
                <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  {r ? (
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                   background: r === 'accepted' ? '#D1FAE5' : '#FEE2E2',
                                   color: r === 'accepted' ? '#065F46' : '#991B1B' }}>
                      {r === 'accepted' ? 'Chấp nhận' : 'Từ chối'}
                    </span>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => decide(s.id, 'accepted')}>Chấp nhận</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }} onClick={() => decide(s.id, 'rejected')}>Từ chối</button>
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

// ─── Relationship Updates ───
const REL_UPDATES = [
  { id: 1, from: 'FPT Corporation',  to: 'VinGroup',        type: 'Partnership', change: 'Mới',         date: '15/06/2026' },
  { id: 2, from: 'VNPT Group',       to: 'Viettel Digital', type: 'Competition', change: 'Tăng cường',  date: '14/06/2026' },
  { id: 3, from: 'CMC Technology',   to: 'FPT Corporation', type: 'Supply',      change: 'Cập nhật',    date: '12/06/2026' },
  { id: 4, from: 'MoMo',            to: 'Sacombank',       type: 'Partnership', change: 'Chấm dứt',    date: '10/06/2026' },
];

export const RelationshipUpdates: React.FC = () => (
  <section className="page active">
    <div className="page-header"><h1>Relationship Updates</h1></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {REL_UPDATES.map(r => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.from}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {r.type === 'Competition' ? 'cạnh tranh với' : r.type === 'Supply' ? 'cung cấp cho' : 'hợp tác với'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.to}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{r.type}</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                               background: r.change === 'Mới' ? '#D1FAE5' : r.change === 'Chấm dứt' ? '#FEE2E2' : '#FEF3C7',
                               color: r.change === 'Mới' ? '#065F46' : r.change === 'Chấm dứt' ? '#991B1B' : '#92400E' }}>
                  {r.change}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</div>
              <button className="btn btn-sm btn-outline" style={{ marginTop: 6 }}>Xác nhận</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Onboarding Support ───
const ONBOARDING_LIST = [
  { id: 1, company: 'TechVision Ltd',      step: 4, totalSteps: 5, assignee: 'Hà ĐH',  startDate: '10/06/2026', status: 'on-track' },
  { id: 2, company: 'Green Energy VN',     step: 2, totalSteps: 5, assignee: 'Phạm TL', startDate: '12/06/2026', status: 'delayed' },
  { id: 3, company: 'Digital Payments JSC',step: 5, totalSteps: 5, assignee: 'Hà ĐH',  startDate: '05/06/2026', status: 'completed' },
];

const STEPS = ['Hồ sơ ban đầu', 'Xác thực dữ liệu', 'Phân loại', 'Thẩm định', 'Hoàn tất'];

export const OnboardingSupport: React.FC = () => (
  <section className="page active">
    <div className="page-header"><h1>Onboarding Support</h1></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ONBOARDING_LIST.map(o => {
        const pct = Math.round((o.step / o.totalSteps) * 100);
        const sc = o.status === 'completed' ? { bg: '#D1FAE5', color: '#065F46', label: 'Hoàn thành' }
                 : o.status === 'on-track'  ? { bg: '#DBEAFE', color: '#1E40AF', label: 'Đúng tiến độ' }
                 : { bg: '#FEE2E2', color: '#991B1B', label: 'Trễ tiến độ' };
        return (
          <div key={o.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{o.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bắt đầu: {o.startDate} · Phụ trách: {o.assignee}</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, alignSelf: 'flex-start' }}>{sc.label}</span>
            </div>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {STEPS.map((step, i) => (
                <div key={step} style={{ flex: 1 }}>
                  <div style={{
                    height: 6, borderRadius: 3,
                    background: i < o.step ? (o.status === 'completed' ? '#10B981' : '#2563EB') : 'var(--border-light)',
                    marginBottom: 4,
                  }} />
                  <div style={{ fontSize: 9, color: i < o.step ? 'var(--text-secondary)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{step}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Bước {o.step}/{o.totalSteps} — {pct}% hoàn thành
            </div>
            {o.status !== 'completed' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary">Bước tiếp theo</button>
                <button className="btn btn-sm btn-outline">Ghi chú</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
);
