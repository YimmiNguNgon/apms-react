import React, { useState } from 'react';

const mockUsers = [
  { id: 1, name: 'Nguyễn Thế Trung', username: 'director',  role: 'Business Director',          status: 'active',   lastLogin: '15/06/2026 22:30' },
  { id: 2, name: 'Trần Quốc Bảo',   username: 'manager',   role: 'BD Manager',                 status: 'active',   lastLogin: '15/06/2026 21:45' },
  { id: 3, name: 'Lê Thị Hồng Vân', username: 'keymember', role: 'Key Member / Senior BD Staff',status: 'active',   lastLogin: '15/06/2026 20:10' },
  { id: 4, name: 'Hà Đức Huy',      username: 'staff',     role: 'BD Staff',                   status: 'active',   lastLogin: '15/06/2026 19:55' },
  { id: 5, name: 'Đỗ Minh Trí',     username: 'admin',     role: 'System Administrator',        status: 'active',   lastLogin: '15/06/2026 22:50' },
];

const auditLogs = [
  { time: '22:50', user: 'admin',     action: 'Đăng nhập hệ thống',                        type: 'info' },
  { time: '21:45', user: 'manager',   action: 'Phê duyệt hồ sơ CMC Technology',            type: 'success' },
  { time: '20:30', user: 'keymember', action: 'Xác thực dữ liệu AI — Viettel Digital',      type: 'success' },
  { time: '19:55', user: 'staff',     action: 'Upload tài liệu năng lực FPT Software',      type: 'info' },
  { time: '19:10', user: 'manager',   action: 'Từ chối hồ sơ Công ty XYZ (dữ liệu thiếu)', type: 'danger' },
  { time: '18:00', user: 'admin',     action: 'Tạo tài khoản mới: keymember',               type: 'warning' },
];

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'settings'>('users');

  return (
    <section className="page active" id="page-admin-panel">
      <div className="page-header">
        <h1>⚙️ Quản trị Hệ thống</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary">+ Tạo tài khoản</button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(100,116,139,0.06)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(100,116,139,0.15)', fontSize: 13, color: '#334155' }}>
        🔐 Vai trò của bạn: <strong>System Administrator</strong> — Quản lý tài khoản, phân quyền, bảo mật và nhật ký hoạt động.
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Tài khoản &amp; Phân quyền</button>
        <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📋 Nhật ký Hoạt động</button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>🔧 Cài đặt Hệ thống</button>
      </div>

      {/* User Management */}
      {activeTab === 'users' && (
        <div className="card">
          <h3 className="card-title">Danh sách Tài khoản ({mockUsers.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Tên</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Tài khoản</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Vai trò</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Trạng thái</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Đăng nhập lần cuối</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.username}</td>
                  <td style={{ padding: '12px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{u.role}</span></td>
                  <td style={{ padding: '12px' }}><span className="badge badge-active" style={{ fontSize: 11 }}>🟢 {u.status}</span></td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12 }}>{u.lastLogin}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-outline">Chỉnh sửa</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Khóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'logs' && (
        <div className="card">
          <h3 className="card-title">Nhật ký Hoạt động Hôm nay (15/06/2026)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLogs.map((log, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--bg)', border: '1px solid var(--border-light)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12, width: 45, flexShrink: 0 }}>{log.time}</span>
                <span className="badge badge-blue" style={{ fontSize: 11, flexShrink: 0 }}>{log.user}</span>
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{log.action}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: log.type === 'success' ? '#d1fae5' : log.type === 'danger' ? '#fee2e2' : log.type === 'warning' ? '#fef3c7' : '#dbeafe',
                  color: log.type === 'success' ? '#065f46' : log.type === 'danger' ? '#991b1b' : log.type === 'warning' ? '#92400e' : '#1e40af'
                }}>
                  {log.type === 'success' ? '✅' : log.type === 'danger' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Settings */}
      {activeTab === 'settings' && (
        <div className="card">
          <h3 className="card-title">Cài đặt Hệ thống</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
            {[
              { label: 'Ngưỡng tin cậy AI tối thiểu', desc: 'Dữ liệu dưới ngưỡng này sẽ bị đưa vào hàng chờ xác thực thủ công.', val: '75%' },
              { label: 'Tần suất crawl tự động', desc: 'Tần suất AI thu thập tin tức và dữ liệu từ các nguồn bên ngoài.', val: 'Mỗi 6 giờ' },
              { label: 'Thời hạn phê duyệt', desc: 'Sau thời gian này, dữ liệu chưa duyệt sẽ được tự động nhắc nhở Manager.', val: '48 giờ' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</p>
                </div>
                <button className="btn btn-outline" style={{ flexShrink: 0 }}>{s.val}</button>
              </div>
            ))}
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Lưu cài đặt</button>
          </div>
        </div>
      )}
    </section>
  );
};
