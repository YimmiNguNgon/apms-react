import React, { useState } from 'react';

// ─── Mock Data ───
const PARTNERS = [
  { id: 1, name: 'FPT Corporation',     type: 'Strategic Partner', tier: 'Platinum', region: 'HCM',  revenue: '120B',  growth: +12, status: 'active',  contact: 'Nguyễn Văn A', deals: 8  },
  { id: 2, name: 'VNPT Group',          type: 'Strategic Partner', tier: 'Gold',     region: 'HN',   revenue: '95B',   growth: +8,  status: 'active',  contact: 'Trần Thị B',   deals: 5  },
  { id: 3, name: 'Viettel Digital',     type: 'Technology Partner',tier: 'Gold',     region: 'HN',   revenue: '78B',   growth: +15, status: 'active',  contact: 'Lê Văn C',     deals: 6  },
  { id: 4, name: 'CMC Technology',      type: 'Technology Partner',tier: 'Silver',   region: 'HCM',  revenue: '45B',   growth: +5,  status: 'review',  contact: 'Phạm Thị D',   deals: 3  },
  { id: 5, name: 'MoMo',               type: 'FinTech Partner',   tier: 'Silver',   region: 'HCM',  revenue: '32B',   growth: -3,  status: 'watch',   contact: 'Hoàng Văn E',  deals: 2  },
  { id: 6, name: 'VinGroup',           type: 'Strategic Partner', tier: 'Platinum', region: 'HN',   revenue: '200B',  growth: +18, status: 'active',  contact: 'Đỗ Thị F',     deals: 12 },
];

const COMPETITORS = [
  { id: 1, name: 'Deloitte Vietnam',   segment: 'Consulting',  threat: 'High',   marketShare: '22%', intel: 'Đang mở rộng vào mảng B2B SaaS tại HCM' },
  { id: 2, name: 'PwC Vietnam',        segment: 'Consulting',  threat: 'High',   marketShare: '18%', intel: 'Hợp tác với 3 tập đoàn lớn Q1/2026' },
  { id: 3, name: 'KPMG Vietnam',       segment: 'Advisory',    threat: 'Medium', marketShare: '12%', intel: 'Ra mắt nền tảng phân tích thị trường mới' },
  { id: 4, name: 'McKinsey VN',        segment: 'Strategy',    threat: 'Medium', marketShare: '8%',  intel: 'Tuyển dụng thêm 50 nhân sự tech tại HN' },
  { id: 5, name: 'BCG Vietnam',        segment: 'Strategy',    threat: 'Low',    marketShare: '5%',  intel: 'Tập trung vào healthcare và fintech' },
];

const OPPORTUNITIES = [
  { id: 1, title: 'Hợp tác AI với VinGroup',       value: '15 tỷ', probability: 85, deadline: '30/06/2026', owner: 'Nguyễn TT', stage: 'Negotiation' },
  { id: 2, title: 'Partnership mảng Cloud — VNPT', value: '8 tỷ',  probability: 72, deadline: '15/07/2026', owner: 'Trần QB',    stage: 'Proposal' },
  { id: 3, title: 'Tích hợp hệ thống CMC',         value: '5 tỷ',  probability: 55, deadline: '01/08/2026', owner: 'Lê HV',      stage: 'Discovery' },
  { id: 4, title: 'Mở rộng thị trường Miền Trung', value: '3 tỷ',  probability: 40, deadline: '01/09/2026', owner: 'Hà ĐH',      stage: 'Discovery' },
];

const TIER_COLOR: Record<string, string> = {
  Platinum: '#8B5CF6', Gold: '#F59E0B', Silver: '#64748B',
};
const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  review: { bg: '#FEF3C7', color: '#92400E', label: 'Đang xem xét' },
  watch:  { bg: '#FEE2E2', color: '#991B1B', label: 'Theo dõi' },
};
const THREAT_COLOR: Record<string, string> = {
  High: '#EF4444', Medium: '#F59E0B', Low: '#10B981',
};

// ─── Partner Ecosystem ───
export const PartnerEcosystem: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const filtered = PARTNERS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterTier === 'all' || p.tier === filterTier)
  );

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Partner Ecosystem</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Thêm Đối tác</button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng đối tác', value: PARTNERS.length },
          { label: 'Platinum', value: PARTNERS.filter(p => p.tier === 'Platinum').length },
          { label: 'Đang tăng trưởng', value: PARTNERS.filter(p => p.growth > 0).length },
          { label: 'Cần theo dõi', value: PARTNERS.filter(p => p.status !== 'active').length },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input className="search-input" placeholder="Tìm đối tác..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="all">Tất cả cấp</option>
          <option value="Platinum">Platinum</option>
          <option value="Gold">Gold</option>
          <option value="Silver">Silver</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(p => {
          const sc = STATUS_COLOR[p.status];
          return (
            <div key={p.id} className="card" style={{ borderLeft: `4px solid ${TIER_COLOR[p.tier]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.type} — {p.region}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${TIER_COLOR[p.tier]}20`, color: TIER_COLOR[p.tier] }}>
                  {p.tier}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 12 }}>
                <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Doanh thu</div>
                  <div style={{ fontWeight: 700 }}>{p.revenue}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Tăng trưởng</div>
                  <div style={{ fontWeight: 700, color: p.growth >= 0 ? '#10B981' : '#EF4444' }}>
                    {p.growth >= 0 ? '+' : ''}{p.growth}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Liên hệ: {p.contact} · {p.deals} hợp đồng</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ─── Competitor Intelligence ───
export const CompetitorIntelligence: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Competitor Intelligence</h1>
      <div className="page-header-actions">
        <button className="btn btn-outline">Cập nhật dữ liệu</button>
      </div>
    </div>

    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Đối thủ theo dõi', value: COMPETITORS.length },
        { label: 'Mối đe dọa cao', value: COMPETITORS.filter(c => c.threat === 'High').length },
        { label: 'Tổng thị phần', value: '65%' },
        { label: 'Cập nhật gần nhất', value: 'Hôm nay' },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {COMPETITORS.map(c => (
        <div key={c.id} className="card" style={{ borderLeft: `4px solid ${THREAT_COLOR[c.threat]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${THREAT_COLOR[c.threat]}15`, color: THREAT_COLOR[c.threat] }}>
                  {c.threat} Threat
                </span>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{c.segment}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0 }}>{c.intel}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{c.marketShare}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thị phần</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Market Opportunities ───
export const MarketOpportunities: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Market Opportunities</h1>
      <div className="page-header-actions">
        <button className="btn btn-primary">+ Cơ hội mới</button>
      </div>
    </div>

    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Cơ hội đang theo dõi', value: OPPORTUNITIES.length },
        { label: 'Tổng giá trị', value: '31 tỷ' },
        { label: 'Xác suất trung bình', value: '63%' },
        { label: 'Sắp đến hạn', value: 2 },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {OPPORTUNITIES.map(o => (
        <div key={o.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{o.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Owner: {o.owner} · Deadline: {o.deadline}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{o.value}</div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>{o.stage}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${o.probability}%`,
                background: o.probability >= 70 ? '#10B981' : o.probability >= 50 ? '#F59E0B' : '#EF4444',
                height: '100%', borderRadius: 4, transition: 'width 0.5s',
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 36, color: 'var(--text-primary)' }}>{o.probability}%</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── AI Recommendations (Director) ───
const AI_RECS = [
  { id: 1, title: 'Nâng cấp đối tác MoMo lên Gold tier',          confidence: 91, category: 'Partnership', impact: 'High',   reason: 'MoMo tăng trưởng 28% trong Q1; phù hợp chiến lược FinTech 2026.' },
  { id: 2, title: 'Theo dõi sát Deloitte sau thỏa thuận VinGroup', confidence: 87, category: 'Risk',        impact: 'High',   reason: 'Deloitte vừa ký MOU với VinGroup — nguy cơ mất dự án trị giá 20B.' },
  { id: 3, title: 'Mở rộng vào thị trường Đà Nẵng Q3/2026',       confidence: 79, category: 'Growth',      impact: 'Medium', reason: 'AI phát hiện 34 doanh nghiệp tiềm năng tại khu công nghệ Đà Nẵng.' },
  { id: 4, title: 'Tái đàm phán hợp đồng CMC Technology',          confidence: 74, category: 'Revenue',     impact: 'Medium', reason: 'CMC giảm 5% tăng trưởng; cơ hội tái cơ cấu điều khoản hợp đồng.' },
];

export const AIRecommendations: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>AI Recommendations</h1>
      <div className="page-header-actions">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cập nhật lúc 08:00 • Mô hình GPT-4o</span>
      </div>
    </div>
    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Khuyến nghị mới', value: AI_RECS.length },
        { label: 'Độ tin cậy TB', value: '83%' },
        { label: 'Đã thực hiện', value: 12 },
        { label: 'Đang chờ xem xét', value: AI_RECS.length },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {AI_RECS.map(r => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{r.category}</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                               background: r.impact === 'High' ? '#FEE2E2' : '#FEF3C7',
                               color: r.impact === 'High' ? '#991B1B' : '#92400E' }}>
                  {r.impact} Impact
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{r.title}</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.reason}</p>
            </div>
            <div style={{ textAlign: 'center', marginLeft: 20, flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `conic-gradient(#10B981 ${r.confidence * 3.6}deg, var(--border-light) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                  {r.confidence}%
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Tin cậy</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm">Chấp nhận</button>
            <button className="btn btn-outline btn-sm">Bỏ qua</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Strategic Reports ───
const REPORTS = [
  { id: 1, title: 'Báo cáo Hệ sinh thái Đối tác Q2/2026', date: '01/06/2026', type: 'Quarterly', pages: 42, author: 'AI + Nguyễn TT' },
  { id: 2, title: 'Phân tích Đối thủ Cạnh tranh H1/2026', date: '15/05/2026', type: 'Semi-annual', pages: 28, author: 'AI + Trần QB' },
  { id: 3, title: 'Cơ hội Thị trường Khu vực Miền Trung',  date: '01/04/2026', type: 'Ad-hoc',    pages: 18, author: 'Lê HV' },
  { id: 4, title: 'KPI Đội ngũ BD Q1/2026',                date: '31/03/2026', type: 'Quarterly', pages: 15, author: 'Trần QB' },
];

export const StrategicReports: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Strategic Reports</h1>
      <div className="page-header-actions">
        <button className="btn btn-primary">+ Tạo báo cáo</button>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {REPORTS.map(r => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span className="badge badge-blue" style={{ fontSize: 11 }}>{r.type}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</span>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 12, color: 'var(--text-primary)' }}>{r.title}</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            <span>Tác giả: {r.author}</span>
            <span>{r.pages} trang</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">Xem</button>
            <button className="btn btn-outline btn-sm">Tải xuống</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);
