import React, { useState, useRef } from 'react';

// ─── Upload Documents ───
interface UploadFile {
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
}

const DEMO_DOCS = [
  { name: 'FPT_BCTC_2025.pdf',          size: '4.2 MB', type: 'PDF',  status: 'done'  as const, progress: 100 },
  { name: 'VNPT_NangLuc_2025.docx',     size: '2.8 MB', type: 'DOCX', status: 'done'  as const, progress: 100 },
  { name: 'Viettel_GioiThieu.pptx',     size: '8.1 MB', type: 'PPTX', status: 'error' as const, progress: 40  },
  { name: 'CMC_HoSoNangLuc_2025.pdf',   size: '5.5 MB', type: 'PDF',  status: 'done'  as const, progress: 100 },
];

export const UploadDocuments: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>(DEMO_DOCS);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const newFiles = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'done' as const,
      progress: 100,
    }));
    setFiles(prev => [...newFiles, ...prev]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map(f => ({
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'done' as const,
      progress: 100,
    }));
    setFiles(prev => [...selected, ...prev]);
  };

  const TYPE_COLOR: Record<string, string> = { PDF: '#EF4444', DOCX: '#2563EB', PPTX: '#F59E0B', XLSX: '#10B981' };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Upload Documents</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{files.filter(f => f.status === 'done').length} tệp đã xử lý</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
          background: dragging ? 'rgba(37,99,235,0.04)' : 'var(--surface)',
          cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
          Kéo thả tệp vào đây
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Hỗ trợ PDF, DOCX, PPTX, XLSX — tối đa 50MB/tệp
        </div>
        <button className="btn btn-primary" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
          Chọn tệp
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleSelect} accept=".pdf,.docx,.pptx,.xlsx" />
      </div>

      {/* File list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
          Tệp đã tải ({files.length})
        </div>
        {files.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `${TYPE_COLOR[f.type] || '#64748B'}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: TYPE_COLOR[f.type] || '#64748B',
            }}>{f.type}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{f.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 5, overflow: 'hidden', maxWidth: 200 }}>
                  <div style={{ width: `${f.progress}%`, height: '100%', borderRadius: 4, background: f.status === 'error' ? '#EF4444' : '#10B981' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.size}</span>
              </div>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: f.status === 'done' ? '#D1FAE5' : f.status === 'error' ? '#FEE2E2' : '#FEF3C7',
              color: f.status === 'done' ? '#065F46' : f.status === 'error' ? '#991B1B' : '#92400E',
            }}>
              {f.status === 'done' ? 'Hoàn tất' : f.status === 'error' ? 'Lỗi' : 'Đang xử lý'}
            </span>
            {f.status === 'error' && <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }}>Thử lại</button>}
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Partner Management (Staff) ───
const STAFF_PARTNERS = [
  { id: 1, company: 'FPT Corporation',  contact: 'Nguyễn Văn A',  phone: '024-3456-7890', email: 'contact@fpt.com',   tier: 'Platinum', lastContact: '15/06/2026' },
  { id: 2, company: 'VNPT Group',       contact: 'Trần Thị B',   phone: '024-1234-5678', email: 'bd@vnpt.vn',        tier: 'Gold',     lastContact: '13/06/2026' },
  { id: 3, company: 'Viettel Digital',  contact: 'Lê Văn C',     phone: '028-9876-5432', email: 'partner@viettel.vn',tier: 'Gold',     lastContact: '10/06/2026' },
  { id: 4, company: 'CMC Technology',   contact: 'Phạm Thị D',   phone: '028-5555-1234', email: 'cmc@cmc.com.vn',   tier: 'Silver',   lastContact: '08/06/2026' },
];

const TIER_CLR: Record<string, string> = { Platinum: '#8B5CF6', Gold: '#F59E0B', Silver: '#64748B' };

export const PartnerManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const filtered = STAFF_PARTNERS.filter(p => p.company.toLowerCase().includes(search.toLowerCase()) || p.contact.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Partner Management</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Thêm liên hệ</button>
        </div>
      </div>
      <input className="search-input" placeholder="Tìm đối tác..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16, width: '100%', maxWidth: 360 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.id} className="card" style={{ borderLeft: `4px solid ${TIER_CLR[p.tier]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.company}</div>
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: TIER_CLR[p.tier], background: `${TIER_CLR[p.tier]}15` }}>{p.tier}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              <div>Liên hệ: <strong>{p.contact}</strong></div>
              <div>{p.phone} · {p.email}</div>
              <div style={{ color: 'var(--text-muted)' }}>Liên hệ cuối: {p.lastContact}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline">Xem hồ sơ</button>
              <button className="btn btn-sm btn-outline">Ghi nhận liên hệ</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Competitor Management (Staff) ───
const STAFF_COMPETITORS = [
  { id: 1, company: 'Deloitte Vietnam', segment: 'Consulting', threat: 'High',   lastActivity: 'Ra mắt dịch vụ AI Advisory', date: '15/06/2026' },
  { id: 2, company: 'PwC Vietnam',      segment: 'Audit',      threat: 'High',   lastActivity: 'Ký MOU với 3 tập đoàn lớn', date: '12/06/2026' },
  { id: 3, company: 'KPMG Vietnam',     segment: 'Advisory',   threat: 'Medium', lastActivity: 'Tuyển dụng 20 nhân sự data', date: '10/06/2026' },
  { id: 4, company: 'McKinsey VN',      segment: 'Strategy',   threat: 'Medium', lastActivity: 'Mở văn phòng tại HCM',       date: '08/06/2026' },
];

export const CompetitorManagement: React.FC = () => {
  const TH_CLR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };
  return (
    <section className="page active">
      <div className="page-header">
        <h1>Competitor Management</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Thêm đối thủ</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STAFF_COMPETITORS.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.company}</span>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{c.segment}</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: TH_CLR[c.threat as 'High' | 'Medium' | 'Low'], background: `${TH_CLR[c.threat as 'High' | 'Medium' | 'Low']}15` }}>
                  {c.threat} Threat
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.lastActivity}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.date}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline">Chi tiết</button>
              <button className="btn btn-sm btn-outline">Ghi nhận</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── AI Extracted Data ───
const AI_EXTRACTED = [
  { id: 1, company: 'TechVision Ltd',       field: 'Doanh thu', value: '45 tỷ VND',   confidence: 88, source: 'BCTC',     time: '08:10' },
  { id: 2, company: 'Green Energy VN',      field: 'Ngành nghề', value: 'Năng lượng tái tạo', confidence: 95, source: 'Website', time: '08:05' },
  { id: 3, company: 'Digital Payments JSC', field: 'CEO',        value: 'Nguyễn Minh Khoa', confidence: 79, source: 'LinkedIn', time: '07:55' },
  { id: 4, company: 'Smart Logistics VN',   field: 'Số nhân viên', value: '1,200 người', confidence: 72, source: 'LinkedIn', time: '07:40' },
  { id: 5, company: 'TechVision Ltd',       field: 'Địa chỉ',   value: 'Tầng 18, Lotte Center, HN', confidence: 91, source: 'ĐKKD', time: '07:30' },
  { id: 6, company: 'AgroTech Vietnam',     field: 'Website',   value: 'https://agrotech.vn', confidence: 99, source: 'Auto', time: '07:20' },
  { id: 7, company: 'MedTech Solutions',    field: 'Doanh thu', value: '12 tỷ VND',   confidence: 61, source: 'Ước tính', time: '07:00' },
];

export const AIExtractedData: React.FC = () => {
  const [sent, setSent] = useState<Record<number, boolean>>({});
  return (
    <section className="page active">
      <div className="page-header">
        <h1>AI Extracted Data</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{AI_EXTRACTED.length} mục mới hôm nay</span>
        </div>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng mục AI', value: AI_EXTRACTED.length },
          { label: 'Tin cậy cao (>80%)', value: AI_EXTRACTED.filter(a => a.confidence > 80).length },
          { label: 'Cần xem lại (<75%)', value: AI_EXTRACTED.filter(a => a.confidence < 75).length },
          { label: 'Đã gửi xét duyệt',  value: Object.values(sent).filter(Boolean).length },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AI_EXTRACTED.map(a => (
          <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{a.company}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.source} · {a.time}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{a.field}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.value}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: a.confidence >= 80 ? '#10B981' : a.confidence >= 70 ? '#F59E0B' : '#EF4444' }}>
                {a.confidence}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tin cậy</div>
            </div>
            <button
              className="btn btn-sm btn-outline"
              disabled={sent[a.id]}
              style={{ opacity: sent[a.id] ? 0.5 : 1 }}
              onClick={() => setSent(prev => ({ ...prev, [a.id]: true }))}
            >
              {sent[a.id] ? 'Đã gửi' : 'Gửi xét duyệt'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Search Companies ───
const ALL_COMPANIES = [
  { id: 1, name: 'FPT Corporation',    industry: 'Technology',    region: 'HCM', employees: '47,000', revenue: '120B', status: 'Partner' },
  { id: 2, name: 'VNPT Group',         industry: 'Telecom',       region: 'HN',  employees: '90,000', revenue: '95B',  status: 'Partner' },
  { id: 3, name: 'Viettel Digital',    industry: 'Technology',    region: 'HN',  employees: '35,000', revenue: '78B',  status: 'Partner' },
  { id: 4, name: 'CMC Technology',     industry: 'IT Services',   region: 'HCM', employees: '5,000',  revenue: '45B',  status: 'Partner' },
  { id: 5, name: 'MoMo',             industry: 'FinTech',       region: 'HCM', employees: '4,000',  revenue: '32B',  status: 'Partner' },
  { id: 6, name: 'VinGroup',          industry: 'Conglomerate',  region: 'HN',  employees: '100,000',revenue: '200B', status: 'Partner' },
  { id: 7, name: 'Deloitte Vietnam',   industry: 'Consulting',    region: 'HCM', employees: '3,000',  revenue: '25B',  status: 'Competitor' },
  { id: 8, name: 'TechVision Ltd',     industry: 'Technology',    region: 'HN',  employees: '800',    revenue: '5B',   status: 'Prospect' },
  { id: 9, name: 'Green Energy VN',    industry: 'Energy',        region: 'HCM', employees: '1,200',  revenue: '8B',   status: 'Prospect' },
  { id:10, name: 'AgroTech Vietnam',   industry: 'Agriculture',   region: 'HN',  employees: '500',    revenue: '3B',   status: 'Prospect' },
];

export const SearchCompanies: React.FC = () => {
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('all');
  const [region, setRegion] = useState('all');
  const [statusF, setStatusF] = useState('all');

  const industries = ['all', ...Array.from(new Set(ALL_COMPANIES.map(c => c.industry)))];
  const regions    = ['all', 'HCM', 'HN'];

  const filtered = ALL_COMPANIES.filter(c =>
    (query === '' || c.name.toLowerCase().includes(query.toLowerCase())) &&
    (industry === 'all' || c.industry === industry) &&
    (region === 'all' || c.region === region) &&
    (statusF === 'all' || c.status === statusF)
  );

  const STATUS_CLR: Record<string, string> = { Partner: '#10B981', Competitor: '#EF4444', Prospect: '#F59E0B' };

  return (
    <section className="page active">
      <div className="page-header"><h1>Search Companies</h1></div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="search-input" placeholder="Tên công ty..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={industry} onChange={e => setIndustry(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
          {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'Tất cả ngành' : i}</option>)}
        </select>
        <select value={region} onChange={e => setRegion(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="all">Tất cả khu vực</option>
          <option value="HCM">TP. HCM</option>
          <option value="HN">Hà Nội</option>
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="all">Tất cả loại</option>
          <option value="Partner">Đối tác</option>
          <option value="Competitor">Đối thủ</option>
          <option value="Prospect">Tiềm năng</option>
        </select>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} kết quả</div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
              {['Công ty', 'Ngành', 'Khu vực', 'Nhân viên', 'Doanh thu', 'Phân loại', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '11px 14px', fontWeight: 700 }}>{c.name}</td>
                <td style={{ padding: '11px 14px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{c.industry}</span></td>
                <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{c.region}</td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{c.employees}</td>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.revenue}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: STATUS_CLR[c.status], background: `${STATUS_CLR[c.status]}15` }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}><button className="btn btn-sm btn-outline">Xem</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ─── AI Training Mode ───
const TRAINING_SESSIONS = [
  { id: 1, topic: 'Phân tích BCTC',         score: 85, time: '14:32', date: '16/06/2026', status: 'completed' },
  { id: 2, topic: 'Nhận diện ngành nghề',   score: 72, time: '10:15', date: '15/06/2026', status: 'completed' },
  { id: 3, topic: 'Đánh giá rủi ro Partner',score: 90, time: '09:00', date: '14/06/2026', status: 'completed' },
];

const QUIZ_QUESTIONS = [
  { q: 'Công ty có doanh thu 120B VND và tăng trưởng 12% — phân loại tier?', options: ['Platinum', 'Gold', 'Silver', 'Watch'], correct: 0 },
  { q: 'Đối tác giảm 3% tăng trưởng trong 2 quý liên tiếp — hành động ưu tiên?', options: ['Nâng cấp tier', 'Theo dõi rủi ro', 'Chấm dứt hợp đồng', 'Không làm gì'], correct: 1 },
];

export const AITrainingMode: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = QUIZ_QUESTIONS.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

  return (
    <section className="page active">
      <div className="page-header">
        <h1>AI Training Mode</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cấp độ: Junior BD Analyst</span>
        </div>
      </div>

      {!started ? (
        <div>
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Buổi đã hoàn thành', value: TRAINING_SESSIONS.length },
              { label: 'Điểm TB',             value: `${Math.round(TRAINING_SESSIONS.reduce((s,t) => s+t.score,0)/TRAINING_SESSIONS.length)}%` },
              { label: 'Điểm cao nhất',        value: `${Math.max(...TRAINING_SESSIONS.map(t => t.score))}%` },
              { label: 'Thứ hạng',            value: '#3/5' },
            ].map(s => (
              <div key={s.label} className="kpi-card">
                <div className="kpi-value">{s.value}</div>
                <div className="kpi-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lịch sử luyện tập</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TRAINING_SESSIONS.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.topic}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.date} lúc {s.time}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.score >= 85 ? '#10B981' : s.score >= 70 ? '#F59E0B' : '#EF4444' }}>
                    {s.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => { setStarted(true); setCurrent(0); setAnswers({}); setSubmitted(false); }}>
            Bắt đầu bài kiểm tra mới
          </button>
        </div>
      ) : submitted ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: score === QUIZ_QUESTIONS.length ? '#10B981' : '#F59E0B', marginBottom: 12 }}>
            {score}/{QUIZ_QUESTIONS.length}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {score === QUIZ_QUESTIONS.length ? 'Xuất sắc!' : score > 0 ? 'Khá tốt!' : 'Cần luyện tập thêm'}
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Điểm: {Math.round((score / QUIZ_QUESTIONS.length) * 100)}%</p>
          <button className="btn btn-primary" onClick={() => setStarted(false)}>Xem lịch sử</button>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Câu {current + 1}/{QUIZ_QUESTIONS.length}</div>
          <div style={{ width: '100%', background: 'var(--border-light)', borderRadius: 4, height: 6, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ width: `${((current) / QUIZ_QUESTIONS.length) * 100}%`, background: 'var(--accent)', height: '100%', borderRadius: 4 }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>{QUIZ_QUESTIONS[current].q}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {QUIZ_QUESTIONS[current].options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--radius)', border: `2px solid ${answers[current] === i ? 'var(--accent)' : 'var(--border)'}`,
                        background: answers[current] === i ? 'rgba(37,99,235,0.08)' : 'var(--surface)',
                        color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: answers[current] === i ? 700 : 400,
                        transition: 'all 0.15s',
                      }}>
                {opt}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {current < QUIZ_QUESTIONS.length - 1 ? (
              <button className="btn btn-primary" disabled={answers[current] === undefined} onClick={() => setCurrent(c => c + 1)}>
                Tiếp theo
              </button>
            ) : (
              <button className="btn btn-primary" disabled={answers[current] === undefined} onClick={() => setSubmitted(true)}>
                Nộp bài
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Learning Center ───
const COURSES = [
  { id: 1, title: 'Phân tích Doanh nghiệp cơ bản',       duration: '2h 30m', level: 'Beginner',     progress: 100, lessons: 8 },
  { id: 2, title: 'Hiểu BCTC và chỉ số tài chính',        duration: '3h 15m', level: 'Intermediate', progress: 65,  lessons: 10 },
  { id: 3, title: 'Phân loại Đối tác chiến lược',         duration: '1h 45m', level: 'Intermediate', progress: 30,  lessons: 6 },
  { id: 4, title: 'Sử dụng AI Agent hiệu quả',            duration: '1h 00m', level: 'Beginner',     progress: 0,   lessons: 4 },
  { id: 5, title: 'Phân tích Cạnh tranh thị trường',      duration: '4h 00m', level: 'Advanced',     progress: 0,   lessons: 12 },
];

const LEVEL_CLR: Record<string, string> = { Beginner: '#10B981', Intermediate: '#F59E0B', Advanced: '#EF4444' };

export const LearningCenter: React.FC = () => (
  <section className="page active">
    <div className="page-header">
      <h1>Learning Center</h1>
      <div className="page-header-actions">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {COURSES.filter(c => c.progress === 100).length}/{COURSES.length} khóa hoàn thành
        </span>
      </div>
    </div>
    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Tổng khóa học', value: COURSES.length },
        { label: 'Đã hoàn thành', value: COURSES.filter(c => c.progress === 100).length },
        { label: 'Đang học',      value: COURSES.filter(c => c.progress > 0 && c.progress < 100).length },
        { label: 'Chứng chỉ',     value: 1 },
      ].map(s => (
        <div key={s.label} className="kpi-card">
          <div className="kpi-value">{s.value}</div>
          <div className="kpi-label">{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
      {COURSES.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${LEVEL_CLR[c.level]}15`, color: LEVEL_CLR[c.level] }}>{c.level}</span>
            {c.progress === 100 && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#D1FAE5', color: '#065F46' }}>Hoàn thành</span>}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 10 }}>{c.title}</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{c.lessons} bài · {c.duration}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: 'var(--border-light)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${c.progress}%`, background: c.progress === 100 ? '#10B981' : '#2563EB', height: '100%', borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{c.progress}%</span>
          </div>
          <button className="btn btn-sm btn-primary" style={{ width: '100%' }}>
            {c.progress === 0 ? 'Bắt đầu' : c.progress === 100 ? 'Xem lại' : 'Tiếp tục'}
          </button>
        </div>
      ))}
    </div>
  </section>
);
