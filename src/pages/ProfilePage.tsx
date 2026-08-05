import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation('profile');
  const { currentUser } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '+84 901 234 567',
    dept: currentUser?.role?.includes('ADMIN') ? 'Platform Administration' : 'Business Development',
    bio: 'Quản trị viên hệ thống APMS, phụ trách giám sát phân quyền và vận hành nền tảng.',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  if (!currentUser) return null;

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await api.patch('/users/me', { fullName: form.name, email: form.email });
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdMessage('');

    if (!currentPassword) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res?.success) {
        setPwdMessage('Đã cập nhật mật khẩu thành công.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Không thể cập nhật mật khẩu.');
    } finally {
      setPwdLoading(false);
    }
  };

  const stats = [
    { label: 'Trang truy cập', value: currentUser.allowedPages.length },
    { label: 'Trạng thái', value: 'Hoạt động' },
    { label: 'Loại phiên', value: 'JWT' },
    { label: 'Phạm vi Admin', value: currentUser.role.includes('ADMIN') ? 'Toàn quyền' : 'Theo vai trò' },
  ];

  const accessItems = currentUser.allowedPages.slice(0, 10);

  return (
    <section style={{ background: '#F8FAFC', minHeight: '100vh', padding: '10px 16px 16px', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', background: '#FFFFFF', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('header.accountProfile')}</span>
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{t('header.title', { name: currentUser.name })}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saved && <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>{t('header.saved')}</span>}
          {saveError && <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>{saveError}</span>}
          {!editMode ? (
            <button type="button" className="btn btn-primary" onClick={() => setEditMode(true)} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, height: '28px' }}>
              {t('header.editProfile')}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={() => { setEditMode(false); setSaveError(''); }} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, height: '28px' }}>
                {t('header.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, height: '28px' }}>
                {saving ? t('header.saving') : t('header.save')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-column layout grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '10px', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
        {/* Left Sidebar Column */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* User Card */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: currentUser.avatarColor || '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, margin: '0 auto 8px' }}>
              {currentUser.avatar}
            </div>
            <h2 style={{ margin: '0 0 2px', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>{currentUser.name}</h2>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px', wordBreak: 'break-all' }}>{currentUser.email}</div>
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.65rem', fontWeight: 800 }}>
              {currentUser.roleName}
            </span>
          </div>

          {/* Access Stats Grid */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>{t('summary.permissionSummary')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {stats.map((item) => (
                <div key={item.label} style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{item.value}</strong>
                  <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 500 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allowed Pages Chips */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>{t('summary.allowedPages')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {accessItems.map((page) => (
                <span key={page} style={{ fontSize: '0.62rem', padding: '2px 6px', background: '#F1F5F9', color: '#334155', borderRadius: '3px', fontWeight: 600 }}>
                  {page.replace(/-/g, ' ')}
                </span>
              ))}
              {currentUser.allowedPages.length > accessItems.length && (
                <span style={{ fontSize: '0.62rem', padding: '2px 6px', background: '#E2E8F0', color: '#475569', borderRadius: '3px', fontWeight: 700 }}>
                  {t('summary.morePages', { count: currentUser.allowedPages.length - accessItems.length })}
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Right Main Column */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Personal Information Panel */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>{t('info.personalInfo')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: t('info.fullName'), key: 'name' },
                { label: t('info.email'), key: 'email' },
                { label: t('info.phone'), key: 'phone' },
                { label: t('info.dept'), key: 'dept' },
              ].map((field) => (
                <div key={field.key} style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{field.label}</span>
                  {editMode ? (
                    <input
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #CBD5E1', outline: 'none' }}
                      value={form[field.key as keyof typeof form]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>{form[field.key as keyof typeof form]}</div>
                  )}
                </div>
              ))}

              <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{t('info.bio')}</span>
                {editMode ? (
                  <textarea
                    style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    value={form.bio}
                    onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                    rows={2}
                  />
                ) : (
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', lineHeight: 1.4 }}>{form.bio}</div>
                )}
              </div>
            </div>
          </div>

          {/* Password Security Panel */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>{t('security.securityAccount')}</h3>
            {pwdMessage && <div style={{ fontSize: '0.72rem', background: '#F0FDF4', color: '#15803D', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', fontWeight: 600 }}>{pwdMessage}</div>}
            {pwdError && <div style={{ fontSize: '0.72rem', background: '#FEF2F2', color: '#B91C1C', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', fontWeight: 600 }}>{pwdError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{t('security.currentPassword')}</span>
                <input
                  type="password"
                  style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #CBD5E1', outline: 'none' }}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={pwdLoading}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{t('security.newPassword')}</span>
                <input
                  type="password"
                  style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #CBD5E1', outline: 'none' }}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={pwdLoading}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{t('security.confirmNewPassword')}</span>
                <input
                  type="password"
                  style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #CBD5E1', outline: 'none' }}
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  disabled={pwdLoading}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleChangePassword}
              disabled={pwdLoading}
              style={{ fontSize: '0.72rem', padding: '4px 10px', height: '26px', fontWeight: 700 }}
            >
              {pwdLoading ? t('security.changing') : t('security.changePassword')}
            </button>
          </div>
        </main>
      </div>
    </section>
  );
};
