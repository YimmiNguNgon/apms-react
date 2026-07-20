import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '+84 901 234 567',
    dept: currentUser?.role?.includes('ADMIN') ? 'Platform Administration' : 'Business Development',
    bio: 'Maintains workspace access, system policy, and operational governance for APMS.',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  if (!currentUser) return null;

  const handleSave = () => {
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdMessage('');

    if (!currentPassword) {
      setPwdError('Enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('Password confirmation does not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res?.success) {
        setPwdMessage('Password updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setPwdError(err?.message || 'Could not update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const stats = [
    { label: 'Accessible pages', value: currentUser.allowedPages.length },
    { label: 'Role status', value: 'Active' },
    { label: 'Session mode', value: 'JWT' },
    { label: 'Admin scope', value: currentUser.role.includes('ADMIN') ? 'Full' : 'Role' },
  ];

  const accessItems = currentUser.allowedPages.slice(0, 8);

  return (
    <section className="page active admin-console-page role-dashboard role-dashboard-admin">
      <div className="workspace-page-head admin-console-hero">
        <div>
          <span className="workspace-side-eyebrow">Account profile</span>
          <h1>Profile</h1>
          <p>Review identity details, role scope, accessible pages, and password security for this account.</p>
        </div>
        <div className="workspace-head-actions">
          {saved && <span className="admin-save-state">Changes saved</span>}
          {!editMode ? (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit profile</button>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save changes</button>
            </>
          )}
        </div>
      </div>

      <div className="admin-profile-layout">
        <aside className="admin-profile-side">
          <div className="workspace-side-card admin-profile-card">
            <div className="admin-profile-avatar" style={{ background: currentUser.avatarColor }}>{currentUser.avatar}</div>
            <h2>{currentUser.name}</h2>
            <p>{currentUser.email}</p>
            <span className="workspace-chip">{currentUser.roleName}</span>
          </div>

          <div className="workspace-side-card">
            <div className="workspace-section-head">
              <div>
                <h3>Access summary</h3>
                <p>Primary permission envelope for this account.</p>
              </div>
            </div>
            <div className="admin-profile-stats">
              {stats.map((item) => (
                <article key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <main className="admin-profile-main">
          <div className="workspace-panel admin-console-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Personal information</h3>
                <p>Profile fields used by APMS workspace surfaces.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              {[
                { label: 'Full name', key: 'name' },
                { label: 'Email', key: 'email' },
                { label: 'Phone', key: 'phone' },
                { label: 'Department', key: 'dept' },
              ].map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  {editMode ? (
                    <input
                      className="admin-input"
                      value={form[field.key as keyof typeof form]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <div className="admin-read-field">{form[field.key as keyof typeof form]}</div>
                  )}
                </label>
              ))}
              <label className="admin-form-span">
                <span>Bio</span>
                {editMode ? (
                  <textarea
                    className="admin-input admin-textarea"
                    value={form.bio}
                    onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                    rows={3}
                  />
                ) : (
                  <div className="admin-read-field">{form.bio}</div>
                )}
              </label>
            </div>
          </div>

          <div className="workspace-panel admin-console-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Role and page access</h3>
                <p>Pages currently available to {currentUser.roleName}.</p>
              </div>
            </div>
            <div className="admin-access-chip-grid">
              {accessItems.map((page) => <span key={page}>{page.replace(/-/g, ' ')}</span>)}
              {currentUser.allowedPages.length > accessItems.length && <span>+{currentUser.allowedPages.length - accessItems.length} more</span>}
            </div>
          </div>

          <div className="workspace-panel admin-console-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Password security</h3>
                <p>Change password without leaving the administrator console.</p>
              </div>
            </div>
            {pwdMessage && <div className="workspace-inline-note">{pwdMessage}</div>}
            {pwdError && <div className="workspace-inline-error">{pwdError}</div>}
            <div className="admin-form-grid narrow">
              <label>
                <span>Current password</span>
                <input className="admin-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={pwdLoading} />
              </label>
              <label>
                <span>New password</span>
                <input className="admin-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={pwdLoading} />
              </label>
              <label>
                <span>Confirm password</span>
                <input className="admin-input" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={pwdLoading} />
              </label>
            </div>
            <button className="btn btn-outline" onClick={handleChangePassword} disabled={pwdLoading}>
              {pwdLoading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </main>
      </div>
    </section>
  );
};
