import React, { useState } from 'react';

// ─── Mock Data ───
const AUDIT_LOGS = [
  { id: 1, time: '08:25', date: '16/06/2026', user: 'admin',     action: 'Đăng nhập hệ thống',                        module: 'Auth',     type: 'info' },
  { id: 2, time: '08:10', date: '16/06/2026', user: 'manager',   action: 'Phê duyệt hồ sơ CMC Technology',            module: 'Approvals',type: 'success' },
  { id: 3, time: '07:55', date: '16/06/2026', user: 'keymember', action: 'Xác thực dữ liệu AI — Viettel Digital',     module: 'Validation',type: 'success' },
  { id: 4, time: '07:30', date: '16/06/2026', user: 'staff',     action: 'Upload tài liệu năng lực FPT Software',     module: 'Documents',type: 'info' },
  { id: 5, time: '23:10', date: '15/06/2026', user: 'manager',   action: 'Từ chối hồ sơ Công ty XYZ',                module: 'Approvals',type: 'danger' },
  { id: 6, time: '22:50', date: '15/06/2026', user: 'admin',     action: 'Tạo tài khoản mới: keymember',              module: 'Users',    type: 'warning' },
  { id: 7, time: '21:00', date: '15/06/2026', user: 'director',  action: 'Xem báo cáo chiến lược Q2/2026',            module: 'Reports',  type: 'info' },
  { id: 8, time: '20:15', date: '15/06/2026', user: 'staff',     action: 'Chạy AI Agent — phân tích VNPT',            module: 'AI Agent', type: 'info' },
  { id: 9, time: '18:30', date: '15/06/2026', user: 'admin',     action: 'Thay đổi cài đặt AI threshold: 70% → 75%',  module: 'System',   type: 'warning' },
  { id:10, time: '17:00', date: '15/06/2026', user: 'keymember', action: 'Phân loại Partner: VNPT Group — Premium',   module: 'Classification',type: 'success' },
];

const ACTIVITIES = [
  { user: 'admin',     count: 3, lastSeen: '08:25' },
  { user: 'manager',   count: 2, lastSeen: '08:10' },
  { user: 'keymember', count: 2, lastSeen: '07:55' },
  { user: 'staff',     count: 2, lastSeen: '07:30' },
  { user: 'director',  count: 1, lastSeen: '21:00' },
];

const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  info:    { bg: '#DBEAFE', color: '#1E40AF', label: 'Info' },
  success: { bg: '#D1FAE5', color: '#065F46', label: 'Success' },
  danger:  { bg: '#FEE2E2', color: '#991B1B', label: 'Error' },
  warning: { bg: '#FEF3C7', color: '#92400E', label: 'Warning' },
};

export const ActivityAudit: React.FC<{ defaultTab?: 'activity' | 'audit' }> = ({ defaultTab = 'activity' }) => {
  const [tab, setTab] = useState<'activity' | 'audit'>(defaultTab);
  const [filterModule, setFilterModule] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const modules = ['all', ...Array.from(new Set(AUDIT_LOGS.map(l => l.module)))];

  const filtered = AUDIT_LOGS.filter(l =>
    (filterModule === 'all' || l.module === filterModule) &&
    (filterType === 'all' || l.type === filterType)
  );

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Nhật ký & Hoạt động</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline">Xuất CSV</button>
        </div>
      </div>

      {/* Summary */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Sự kiện hôm nay', value: AUDIT_LOGS.filter(l => l.date === '16/06/2026').length },
          { label: 'Cảnh báo', value: AUDIT_LOGS.filter(l => l.type === 'warning').length },
          { label: 'Lỗi', value: AUDIT_LOGS.filter(l => l.type === 'danger').length },
          { label: 'Người dùng active', value: ACTIVITIES.length },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Hoạt động Người dùng</button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>Audit Logs</button>
      </div>

      {tab === 'activity' && (
        <div className="card">
          <h3 className="card-title">Thống kê hoạt động (hôm nay)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ACTIVITIES.map(a => (
              <div key={a.user} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', flexShrink: 0 }}>
                  {a.user.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{a.user}</div>
                  <div style={{ width: '100%', background: 'var(--border-light)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(a.count / 3) * 100}%`, background: 'var(--accent)', height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div><strong style={{ color: 'var(--text-primary)' }}>{a.count}</strong> sự kiện</div>
                  <div>Lần cuối: {a.lastSeen}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
              {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'Tất cả module' : m}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="all">Tất cả loại</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="danger">Error</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  {['Thời gian', 'Người dùng', 'Module', 'Hành động', 'Loại'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const ts = TYPE_STYLE[l.type];
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {l.date}<br /><strong style={{ color: 'var(--text-primary)' }}>{l.time}</strong>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span className="badge badge-blue" style={{ fontSize: 11 }}>{l.user}</span>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{l.module}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-primary)' }}>{l.action}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ts.bg, color: ts.color }}>
                          {ts.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
