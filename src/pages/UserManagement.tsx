import React, { useState } from 'react';

// ─── Mock Data ───
const MOCK_USERS = [
  { id: 1, name: 'Đỗ Minh Trí',      username: 'admin',     email: 'owner@apms.com',   role: 'System Administrator',        roleBadge: 'badge-gray',   status: 'active', lastLogin: '16/06/2026 08:25', dept: 'IT' },
  { id: 2, name: 'Nguyễn Thế Trung', username: 'director',  email: 'owner@apms.com',   role: 'Business Director',           roleBadge: 'badge-green',  status: 'active', lastLogin: '16/06/2026 08:00', dept: 'Executive' },
  { id: 3, name: 'Trần Quốc Bảo',    username: 'manager',   email: 'manager@apms.com', role: 'BD Manager',                  roleBadge: 'badge-yellow', status: 'active', lastLogin: '16/06/2026 07:30', dept: 'Business Dev' },
  { id: 4, name: 'Lê Thị Hồng Vân',  username: 'keymember', email: 'staff@apms.com',   role: 'Key Member / Senior BD Staff',roleBadge: 'badge-purple', status: 'active', lastLogin: '15/06/2026 23:10', dept: 'Business Dev' },
  { id: 5, name: 'Hà Đức Huy',       username: 'staff',     email: 'staff@apms.com',   role: 'BD Staff',                    roleBadge: 'badge-blue',   status: 'active', lastLogin: '15/06/2026 22:45', dept: 'Research' },
  { id: 6, name: 'Phạm Thị Lan',     username: 'staff2',    email: 'lan@apms.com',     role: 'BD Staff',                    roleBadge: 'badge-blue',   status: 'inactive', lastLogin: '10/06/2026 11:00', dept: 'Research' },
];

const MOCK_ROLES = [
  { id: 1, name: 'System Administrator', key: 'ROLE_ADMIN',      users: 1, permissions: 24, desc: 'Full system access — manage users, roles, settings, logs.' },
  { id: 2, name: 'Business Director',    key: 'ROLE_DIRECTOR',   users: 1, permissions: 15, desc: 'Strategic overview, partner ecosystem, AI recommendations.' },
  { id: 3, name: 'BD Manager',           key: 'ROLE_MANAGER',    users: 2, permissions: 18, desc: 'Manage team, approve partner evaluations, risk monitoring.' },
  { id: 4, name: 'Key Member',           key: 'ROLE_KEY_MEMBER', users: 1, permissions: 12, desc: 'Validate company data, review AI output, classify partners.' },
  { id: 5, name: 'BD Staff',             key: 'ROLE_STAFF',      users: 2, permissions: 8,  desc: 'Upload docs, search companies, use AI tools.' },
];

const MOCK_PERMS = [
  { id: 'perm.companies.read',   module: 'Companies', action: 'Read',   admin: true, director: true, manager: true, keymember: true, staff: true },
  { id: 'perm.companies.create', module: 'Companies', action: 'Create', admin: true, director: false,manager: true, keymember: false,staff: true },
  { id: 'perm.companies.delete', module: 'Companies', action: 'Delete', admin: true, director: false,manager: false,keymember: false,staff: false },
  { id: 'perm.users.manage',     module: 'Users',     action: 'Manage', admin: true, director: false,manager: false,keymember: false,staff: false },
  { id: 'perm.ai.run',           module: 'AI Agent',  action: 'Run',    admin: true, director: true, manager: true, keymember: true, staff: true },
  { id: 'perm.reports.view',     module: 'Reports',   action: 'View',   admin: true, director: true, manager: true, keymember: false,staff: false },
  { id: 'perm.approvals.review', module: 'Approvals', action: 'Review', admin: true, director: true, manager: true, keymember: false,staff: false },
  { id: 'perm.system.configure', module: 'System',    action: 'Config', admin: true, director: false,manager: false,keymember: false,staff: false },
];

// ─── Sub-components ───
const Dot: React.FC<{ active: boolean }> = ({ active }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: active ? '#10B981' : '#94A3B8',
    marginRight: 6,
  }} />
);

const Check: React.FC<{ yes: boolean }> = ({ yes }) => (
  <span style={{ color: yes ? '#10B981' : '#CBD5E1', fontWeight: 700 }}>{yes ? '✓' : '—'}</span>
);

// ─── Users Tab ───
const UsersTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = MOCK_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.username.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || u.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Tìm theo tên hoặc username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}
        >
          <option value="all">Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Vô hiệu</option>
        </select>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo tài khoản</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
              {['Tên người dùng', 'Username', 'Email', 'Vai trò', 'Phòng ban', 'Trạng thái', 'Đăng nhập cuối', 'Thao tác'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>{u.username}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '12px 14px' }}><span className={`badge ${u.roleBadge}`} style={{ fontSize: 11 }}>{u.role}</span></td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{u.dept}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, color: u.status === 'active' ? '#10B981' : '#94A3B8' }}>
                    <Dot active={u.status === 'active'} />
                    {u.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{u.lastLogin}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-outline">Sửa</button>
                    <button className="btn btn-sm btn-outline" style={{ color: u.status === 'active' ? '#EF4444' : '#10B981', borderColor: u.status === 'active' ? '#EF4444' : '#10B981' }}>
                      {u.status === 'active' ? 'Khóa' : 'Mở'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
             onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', padding: 28, width: 420, boxShadow: 'var(--shadow-lg)' }}
               onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, fontSize: 16, color: 'var(--text-primary)' }}>Tạo tài khoản mới</h3>
            {['Họ và tên', 'Email', 'Username', 'Mật khẩu'].map(field => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{field}</label>
                <input type={field === 'Mật khẩu' ? 'password' : 'text'} className="search-input" style={{ width: '100%' }} placeholder={`Nhập ${field.toLowerCase()}...`} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Vai trò</label>
              <select style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
                {MOCK_ROLES.map(r => <option key={r.id} value={r.key}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Roles Tab ───
const RolesTab: React.FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
    {MOCK_ROLES.map(r => (
      <div key={r.id} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{r.name}</div>
            <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>{r.key}</code>
          </div>
          <button className="btn btn-sm btn-outline">Chỉnh sửa</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{r.desc}</p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{r.users}</strong> người dùng</span>
          <span><strong style={{ color: 'var(--text-primary)' }}>{r.permissions}</strong> quyền</span>
        </div>
      </div>
    ))}
  </div>
);

// ─── Permissions Tab ───
const PermissionsTab: React.FC = () => (
  <div className="card" style={{ padding: 0, overflow: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
          <th style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Module</th>
          <th style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Thao tác</th>
          <th style={{ padding: '11px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Admin</th>
          <th style={{ padding: '11px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Director</th>
          <th style={{ padding: '11px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Manager</th>
          <th style={{ padding: '11px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Key Member</th>
          <th style={{ padding: '11px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Staff</th>
        </tr>
      </thead>
      <tbody>
        {MOCK_PERMS.map(p => (
          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
            <td style={{ padding: '11px 16px', fontWeight: 600 }}>{p.module}</td>
            <td style={{ padding: '11px 16px', color: 'var(--text-secondary)' }}>{p.action}</td>
            <td style={{ padding: '11px 16px', textAlign: 'center' }}><Check yes={p.admin} /></td>
            <td style={{ padding: '11px 16px', textAlign: 'center' }}><Check yes={p.director} /></td>
            <td style={{ padding: '11px 16px', textAlign: 'center' }}><Check yes={p.manager} /></td>
            <td style={{ padding: '11px 16px', textAlign: 'center' }}><Check yes={p.keymember} /></td>
            <td style={{ padding: '11px 16px', textAlign: 'center' }}><Check yes={p.staff} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main Export ───
type Tab = 'users' | 'roles' | 'permissions';
export const UserManagement: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'users' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const stats = [
    { label: 'Tổng tài khoản', value: MOCK_USERS.length },
    { label: 'Đang hoạt động', value: MOCK_USERS.filter(u => u.status === 'active').length },
    { label: 'Vai trò', value: MOCK_ROLES.length },
    { label: 'Quyền hạn', value: MOCK_PERMS.length },
  ];

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Quản lý Người dùng</h1>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cập nhật: 16/06/2026 08:25</span>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {([['users', 'Tài khoản'], ['roles', 'Vai trò'], ['permissions', 'Phân quyền']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
    </section>
  );
};
