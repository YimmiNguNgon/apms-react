import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '0901 234 567',
    dept: 'Business Development',
    bio: 'Chuyên viên phân tích hệ sinh thái đối tác và thị trường.',
  });
  const [saved, setSaved] = useState(false);

  if (!currentUser) return null;

  const handleSave = () => {
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const STATS = [
    { label: 'Công ty đã xử lý', value: 47 },
    { label: 'Phê duyệt thành công', value: 32 },
    { label: 'Tháng làm việc', value: 8 },
    { label: 'Điểm tích lũy', value: 920 },
  ];

  const RECENT_ACTIVITY = [
    { action: 'Xác thực dữ liệu FPT Corporation',  time: '08:10 hôm nay' },
    { action: 'Upload tài liệu VNPT Group',         time: '07:45 hôm nay' },
    { action: 'Chạy AI Agent phân tích Viettel',    time: '15:30 hôm qua' },
    { action: 'Hoàn thành khóa học BCTC cơ bản',   time: '10:00 hôm qua' },
  ];

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Hồ sơ Cá nhân</h1>
        <div className="page-header-actions">
          {saved && (
            <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>Đã lưu thay đổi</span>
          )}
          {!editMode ? (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>Chỉnh sửa</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setEditMode(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>Lưu thay đổi</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: Avatar + Role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: currentUser.avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 auto 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              {currentUser.avatar}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{currentUser.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{currentUser.email}</div>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'rgba(37,99,235,0.1)', color: 'var(--accent)',
            }}>
              {currentUser.roleName}
            </span>
          </div>

          {/* Stats */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thống kê</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STATS.map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hoạt động gần đây</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Personal Info */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Thông tin cá nhân</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Họ và tên', key: 'name' },
                { label: 'Email', key: 'email' },
                { label: 'Số điện thoại', key: 'phone' },
                { label: 'Phòng ban', key: 'dept' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.label}
                  </label>
                  {editMode ? (
                    <input
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '8px 0' }}>{form[f.key as keyof typeof form]}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Giới thiệu bản thân
              </label>
              {editMode ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical' }}
                />
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{form.bio}</div>
              )}
            </div>
          </div>

          {/* Role & Access */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Vai trò & Quyền truy cập</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Vai trò hiện tại</span>
                <strong>{currentUser.roleName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Số trang được truy cập</span>
                <strong>{currentUser.allowedPages.length} trang</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng thái tài khoản</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>Hoạt động</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Đổi mật khẩu</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
              {['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'].map(label => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
                  <input type="password" style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }} placeholder="••••••••" />
                </div>
              ))}
              <button className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>Cập nhật mật khẩu</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
