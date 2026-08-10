import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type PageResponse } from '../services/api';
import { useUser } from '../context/UserContext';
import type { AccountAdminResponse, RoleDto, PermissionDto } from '../types/domain';

type PageOrData<T> = PageResponse<T> | T[];

interface UserRow extends AccountAdminResponse {
  fullName?: string;
  isActive?: boolean;
  status?: string;
  enabled?: boolean;
}

interface EditUserForm {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface PasswordResetForm {
  userId: number;
  userEmail: string;
  newPassword: string;
  confirmPassword: string;
}

interface RoleUserForm {
  id: number;
  name: string;
  currentRole: string;
  selectedRole: string;
}

interface DeleteConfirm {
  id: number;
  email: string;
}

interface RoleDetail {
  roleName: string;
  displayName: string;
  description: string;
  userCount: number | null;
  permissionCount: number | null;
}

type Tab = 'users' | 'roles' | 'permissions';

const ROLE_BADGE: Record<string, string> = {
  ROLE_ADMIN: 'badge-gray',
  ROLE_SYSTEM_ADMIN: 'badge-gray',
  SYSTEM_ADMIN: 'badge-gray',
  ROLE_BUSINESS_OWNER: 'badge-gray',
  BUSINESS_OWNER: 'badge-gray',
  ROLE_DIRECTOR: 'badge-green',
  ROLE_BUSINESS_DIRECTOR: 'badge-green',
  ROLE_MANAGER: 'badge-yellow',
  ROLE_BUSINESS_DEVELOPMENT_MANAGER: 'badge-yellow',
  BUSINESS_DEVELOPMENT_MANAGER: 'badge-yellow',
  ROLE_KEY_MEMBER: 'badge-purple',
  ROLE_STAFF: 'badge-blue',
  ROLE_RESEARCH_STAFF: 'badge-blue',
  ROLE_BUSINESS_DEVELOPMENT_STAFF: 'badge-blue',
  BUSINESS_DEVELOPMENT_STAFF: 'badge-blue',
};

const ALL_ROLE_OPTIONS = [
  { value: 'SYSTEM_ADMIN', label: 'System Administrator' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'BUSINESS_DEVELOPMENT_MANAGER', label: 'BD Manager' },
  { value: 'BUSINESS_DEVELOPMENT_STAFF', label: 'BD Staff' },
];

const ROLE_RANKS: Record<string, number> = {
  ROLE_SYSTEM_ADMIN: 6, SYSTEM_ADMIN: 6,
  ROLE_BUSINESS_OWNER: 5, BUSINESS_OWNER: 5,
  ROLE_BUSINESS_DEVELOPMENT_MANAGER: 3, BUSINESS_DEVELOPMENT_MANAGER: 3,
  ROLE_BUSINESS_DEVELOPMENT_STAFF: 1, BUSINESS_DEVELOPMENT_STAFF: 1,
  ROLE_RESEARCH_STAFF: 1, RESEARCH_STAFF: 1,
};

const roleAccent = (role: string) => {
  const v = role.toUpperCase();
  if (v.includes('ADMIN') || v.includes('OWNER')) return 'slate';
  if (v.includes('DIRECTOR')) return 'green';
  if (v.includes('MANAGER')) return 'amber';
  return 'blue';
};

const normalizeRole = (role: string | RoleDto): RoleDto => {
  if (typeof role !== 'string') return role;
  const label = role.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { id: role, key: role, name: role, displayName: label };
};

// --- Password validation helpers ---
const passwordErrors = (pw: string, confirm: string): string[] => {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('At least 8 characters');
  if (pw.length > 72) errors.push('Maximum 72 characters (BCrypt limit)');
  if (confirm && pw !== confirm) errors.push('Passwords do not match');
  return errors;
};

// ============================================================
// USERS TAB
// ============================================================
const UsersTab: React.FC<{ onStats: (stats: { totalUsers: number; activeUsers: number }) => void }> = ({ onStats }) => {
  const { t } = useTranslation('user-management');
  const { currentUser } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<EditUserForm | null>(null);
  const [passwordReset, setPasswordReset] = useState<PasswordResetForm | null>(null);
  const [roleUser, setRoleUser] = useState<RoleUserForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'BUSINESS_DEVELOPMENT_STAFF',
  });

  const currentUserRank = useMemo(() => {
    if (!currentUser) return 1;
    return ROLE_RANKS[currentUser.role] || 1;
  }, [currentUser]);

  const availableRoleOptions = useMemo(() => {
    if (currentUserRank >= 6) return ALL_ROLE_OPTIONS;
    return ALL_ROLE_OPTIONS.filter((opt) => (ROLE_RANKS[opt.value] || 0) < currentUserRank);
  }, [currentUserRank]);

  const fetchUsers = () => {
    setLoading(true);
    api.get<PageOrData<UserRow>>('/users')
      .then((res) => {
        const rows = res?.success && res.data && typeof res.data === 'object' && 'content' in res.data
          ? (res.data as PageResponse<UserRow>).content
          : res?.success && Array.isArray(res.data) ? res.data : [];
        setUsers(rows);
        onStats({
          totalUsers: rows.length,
          activeUsers: rows.filter((u) => u.enabled ?? u.active ?? u.isActive ?? u.status === 'active').length,
        });
      })
      .catch((err) => setError(err?.message || 'Could not load accounts directory.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 6000); };

  const handleCreate = async () => {
    setError('');
    if (!newUser.name || !newUser.email || !newUser.password) {
      showError('Full name, email, and password are required.');
      return;
    }
    const pwErrs = passwordErrors(newUser.password, newUser.password);
    const lengthErr = pwErrs.find(e => e !== 'Passwords do not match');
    if (lengthErr) { showError(lengthErr); return; }

    setActionLoading(true);
    try {
      await api.post('/users', {
        email: newUser.email,
        fullName: newUser.name,
        password: newUser.password,
        roles: [newUser.role],
      });
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'BUSINESS_DEVELOPMENT_STAFF' });
      showNotice('Account created successfully.');
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setError('');
    setActionLoading(true);
    try {
      await api.patch(`/users/${editUser.id}`, {
        fullName: editUser.name,
        email: editUser.email,
      });
      setEditUser(null);
      showNotice(`Account #${editUser.id} updated successfully.`);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not update account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordReset) return;
    const errs = passwordErrors(passwordReset.newPassword, passwordReset.confirmPassword);
    if (errs.length > 0) { showError(errs[0]); return; }

    setActionLoading(true);
    try {
      await api.patch(`/users/${passwordReset.userId}/password`, {
        newPassword: passwordReset.newPassword,
      });
      setPasswordReset(null);
      showNotice(`Password reset for ${passwordReset.userEmail} completed.`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!roleUser) return;
    setError('');
    setActionLoading(true);
    try {
      await api.post(`/users/${roleUser.id}/roles`, { roles: [roleUser.selectedRole] });
      setRoleUser(null);
      showNotice(`Updated roles for account #${roleUser.id}.`);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not assign role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);
    if (isSelf) { showError('Cannot lock your own account'); return; }
    setActionLoading(true);
    try {
      const isActive = user.enabled ?? user.active ?? user.isActive ?? user.status === 'active';
      await api.patch(`/users/${user.id}/status`, { enabled: !isActive });
      showNotice(`Status updated for ${user.email}.`);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not change status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      showNotice(`Account ${deleteConfirm.email} deleted.`);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const name = String(u.name || u.fullName || u.email || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const isActive = u.enabled ?? u.active ?? u.isActive ?? (u.status === 'active');
      const statusStr = isActive ? 'active' : 'inactive';
      const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || statusStr === filter;
      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Password reset form validation state
  const pwResetErrs = passwordReset
    ? passwordErrors(passwordReset.newPassword, passwordReset.confirmPassword)
    : [];
  const pwResetValid = passwordReset && passwordReset.newPassword.length >= 8 &&
    passwordReset.newPassword === passwordReset.confirmPassword;

  return (
    <div className="admin-users-view">
      <div className="admin-users-header">
        <div>
          <span className="workspace-side-eyebrow">{t('users.searchLabel')}</span>
          <h2>{t('users.title')}</h2>
          <p>{t('users.desc')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setNotice(''); setShowCreateModal(true); }}>
          {t('users.createAccount')}
        </button>
      </div>

      <div className="admin-users-layout">
        <aside className="admin-directory-rail">
          <label>
            <span>{t('users.searchLabel')}</span>
            <input className="admin-input" placeholder={t('users.searchPlaceholder')} value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </label>
          <label>
            <span>{t('users.statusFilter')}</span>
            <select className="admin-select" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
              <option value="all">{t('users.allStatuses')}</option>
              <option value="active">{t('users.active')}</option>
              <option value="inactive">{t('users.disabled')}</option>
            </select>
          </label>
          <button className="btn btn-outline" onClick={fetchUsers}>{t('users.refresh')}</button>
          <div className="admin-directory-summary">
            <strong>{filtered.length}</strong>
            <span>{t('users.visibleAccounts')}</span>
          </div>
        </aside>

        <div className="admin-directory-main">
          {notice && <div className="workspace-inline-note" style={{ marginBottom: '12px' }}>✅ {notice}</div>}
          {error && <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>❌ {error}</div>}
          {loading ? (
            <div className="admin-skeleton">Loading account directory...</div>
          ) : (
            <div className="admin-table-card user-directory-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    {['#ID', 'User', 'Email', 'Role', 'Status', 'Actions'].map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user) => {
                    const isActive = user.enabled ?? user.active ?? user.isActive ?? (user.status === 'active');
                    const roleRaw = user.role || user.roleName || (user.roles && user.roles[0]) || 'BUSINESS_DEVELOPMENT_STAFF';
                    const roleKey = String(roleRaw).replace('ROLE_', '');
                    const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);

                    return (
                      <tr key={user.id || user.email}>
                        <td className="admin-mono">#{user.id ?? '-'}</td>
                        <td>
                          <strong>{user.name || user.fullName || user.username || 'Unnamed'}{isSelf && <span style={{ fontSize: '10px', color: '#3B82F6', marginLeft: '4px' }}>(you)</span>}</strong>
                          <small>{user.username || ''}</small>
                        </td>
                        <td>{user.email || '-'}</td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[roleRaw] || ROLE_BADGE[roleKey] || 'badge-blue'}`}>
                            {roleKey}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status ${isActive ? 'active' : ''}`}>
                            {isActive ? t('users.active') : t('users.disabled')}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => {
                              setError('');
                              setEditUser({ id: user.id, name: user.name || user.fullName || '', username: user.username || '', email: user.email || '', role: roleKey });
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline" onClick={() => {
                              setError('');
                              setPasswordReset({ userId: user.id, userEmail: user.email || '', newPassword: '', confirmPassword: '' });
                            }}>Password</button>
                            <button className="btn btn-sm btn-outline" onClick={() => {
                              setError('');
                              setRoleUser({ id: user.id, name: user.name || user.email, currentRole: roleKey, selectedRole: roleKey });
                            }}>Role</button>
                            <button className="btn btn-sm btn-outline" disabled={!!isSelf || actionLoading}
                              title={isSelf ? 'Cannot lock own account' : isActive ? 'Lock' : 'Unlock'}
                              style={isSelf ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              onClick={() => handleToggleStatus(user)}>
                              {isActive ? 'Lock' : 'Unlock'}
                            </button>
                            <button className="btn btn-sm" disabled={!!isSelf || actionLoading}
                              style={{ background: isSelf ? 'transparent' : 'rgba(239,68,68,0.12)', color: isSelf ? '#999' : '#EF4444', border: '1px solid rgba(239,68,68,0.3)', opacity: isSelf ? 0.5 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                              title={isSelf ? 'Cannot delete own account' : 'Delete account'}
                              onClick={() => { setError(''); setDeleteConfirm({ id: user.id, email: user.email || '' }); }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6}><div className="workspace-empty">No accounts match the current filter.</div></td></tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages} ({filtered.length} total)</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
                    <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div><h3>Create Account</h3><p>Provision a new system user with a single role.</p></div>
            </div>
            <div className="admin-form-grid">
              <label><span>Full name *</span><input className="admin-input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></label>
              <label><span>Email *</span><input className="admin-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></label>
              <label><span>Initial password *</span><input className="admin-input" type="password" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></label>
              <label className="admin-form-span"><span>Role</span>
                <select className="admin-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {availableRoleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleCreate}>
                {actionLoading ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div><h3>Edit Account #{editUser.id}</h3><p>Update profile information. Use "Password" button to reset password.</p></div>
            </div>
            <div className="admin-form-grid">
              <label><span>Full name</span><input className="admin-input" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></label>
              <label><span>Email</span><input className="admin-input" type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></label>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleUpdate}>
                {actionLoading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordReset && (
        <div className="admin-modal-backdrop" onClick={() => setPasswordReset(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div>
                <h3>Reset Password</h3>
                <p style={{ color: '#6B7280' }}>Resetting password for <strong>{passwordReset.userEmail}</strong></p>
              </div>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#1D4ED8' }}>
              🔒 The user will need to use the new password at next login. The old password will no longer work.
            </div>
            <div className="admin-form-grid">
              <label>
                <span>New password *</span>
                <input
                  className="admin-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={passwordReset.newPassword}
                  onChange={(e) => setPasswordReset({ ...passwordReset, newPassword: e.target.value })}
                />
              </label>
              <label>
                <span>Confirm new password *</span>
                <input
                  className="admin-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the password"
                  value={passwordReset.confirmPassword}
                  onChange={(e) => setPasswordReset({ ...passwordReset, confirmPassword: e.target.value })}
                />
              </label>
            </div>
            {/* Live validation feedback */}
            {passwordReset.newPassword && pwResetErrs.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {pwResetErrs.map((err) => (
                  <div key={err} style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>⚠ {err}</div>
                ))}
              </div>
            )}
            {passwordReset.newPassword && pwResetErrs.length === 0 && (
              <div style={{ fontSize: '12px', color: '#10B981', marginBottom: '12px' }}>✓ Password meets requirements</div>
            )}
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setPasswordReset(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!pwResetValid || actionLoading}
                style={!pwResetValid ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                onClick={handlePasswordReset}
              >
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE ASSIGN MODAL */}
      {roleUser && (
        <div className="admin-modal-backdrop" onClick={() => setRoleUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div><h3>Assign Role — {roleUser.name}</h3><p>Select a new system role. Hierarchy rules strictly enforced.</p></div>
            </div>
            <div className="admin-form-grid">
              <label className="admin-form-span"><span>Role selection</span>
                <select className="admin-select" value={roleUser.selectedRole} onChange={(e) => setRoleUser({ ...roleUser, selectedRole: e.target.value })}>
                  {availableRoleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setRoleUser(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleAssignRole}>
                {actionLoading ? 'Assigning...' : 'Assign role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="workspace-section-head">
              <div><h3>Delete Account</h3></div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                <strong style={{ color: '#EF4444' }}>⚠ This action cannot be undone.</strong>
                <p style={{ marginTop: '6px', fontSize: '13px', color: '#6B7280' }}>
                  Account <strong>{deleteConfirm.email}</strong> will be deactivated and marked as deleted.
                  All business data created by this user will be retained for audit purposes.
                </p>
              </div>
              <p style={{ fontSize: '14px', color: '#374151' }}>Are you sure you want to delete this account?</p>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#EF4444', borderColor: '#EF4444' }}
                disabled={actionLoading}
                onClick={handleDelete}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// ROLES TAB with Review Drawer
// ============================================================
const RolesTab: React.FC<{ onCount: (count: number) => void }> = ({ onCount }) => {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null);
  const [roleDetailUsers, setRoleDetailUsers] = useState<UserRow[]>([]);
  const [roleDetailPermissions, setRoleDetailPermissions] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<PageOrData<string | RoleDto>>('/roles'),
      api.get<PageOrData<UserRow>>('/users'),
    ]).then(([rolesRes, usersRes]) => {
      const raw = rolesRes?.success && Array.isArray(rolesRes.data)
        ? rolesRes.data
        : rolesRes?.success && rolesRes.data && typeof rolesRes.data === 'object' && 'content' in rolesRes.data
          ? (rolesRes.data as PageResponse<string | RoleDto>).content : [];
      const normalized = raw.map((r) => normalizeRole(r));
      setRoles(normalized);
      onCount(normalized.length);

      if (usersRes?.success && Array.isArray(usersRes.data)) setUsers(usersRes.data);
      else if (usersRes?.success && usersRes.data && 'content' in (usersRes.data as object))
        setUsers((usersRes.data as PageResponse<UserRow>).content);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getUserCountForRole = (roleKey: string): number => {
    return users.filter((u) => {
      const assigned = [u.role, u.roleName, ...(u.roles || [])].filter(Boolean).map((r) => String(r).toUpperCase().replace('ROLE_', ''));
      return assigned.includes(roleKey.toUpperCase().replace('ROLE_', ''));
    }).length;
  };

  const openReview = async (role: RoleDto) => {
    const roleKey = role.key || role.name || '';
    const cleanKey = roleKey.replace('ROLE_', '');

    const detailUsers = users.filter((u) => {
      const assigned = [u.role, u.roleName, ...(u.roles || [])].filter(Boolean).map((r) => String(r).toUpperCase().replace('ROLE_', ''));
      return assigned.includes(cleanKey.toUpperCase());
    });

    setDetailLoading(true);
    setRoleDetail({
      roleName: cleanKey,
      displayName: role.displayName || role.name || cleanKey,
      description: role.description || 'No description configured.',
      userCount: detailUsers.length,
      permissionCount: null,
    });
    setRoleDetailUsers(detailUsers);

    try {
      const permRes = await api.get<string[]>(`/permissions/roles/${cleanKey}`);
      if (permRes?.success && Array.isArray(permRes.data)) {
        setRoleDetailPermissions(permRes.data);
        setRoleDetail((prev) => prev ? { ...prev, permissionCount: permRes.data.length } : prev);
      }
    } catch {
      setRoleDetailPermissions([]);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <div className="admin-skeleton">Loading role matrix...</div>;
  if (roles.length === 0) return <div className="workspace-empty">No roles were returned by the backend.</div>;

  return (
    <>
      <div className="admin-roles-view">
        <div className="admin-roles-map">
          <div className="admin-roles-spine">
            <span>APMS RBAC</span>
            <strong>{roles.length}</strong>
            <small>role lanes</small>
          </div>
          <div className="admin-role-grid">
            {roles.map((role) => {
              const key = role.key || role.name || 'ROLE';
              const accent = roleAccent(key);
              const userCount = getUserCountForRole(key);
              return (
                <article key={role.id || key} className={`admin-role-card ${accent}`}>
                  <div className="admin-role-card-head">
                    <span>{accent}</span>
                    <button className="btn btn-sm btn-outline" onClick={() => openReview(role)}>Review</button>
                  </div>
                  <h3>{role.displayName || role.name}</h3>
                  <code>{key.replace('ROLE_', '')}</code>
                  <p>{role.description || 'No description configured for this role.'}</p>
                  <div className="admin-role-scope">
                    <div><strong>{userCount}</strong><span>users</span></div>
                    <div><strong>{role.permissionCount ?? '—'}</strong><span>permissions</span></div>
                    <div><strong>{key.includes('ADMIN') || key.includes('OWNER') ? 'Full' : 'Scoped'}</strong><span>scope</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROLE DETAIL DRAWER */}
      {roleDetail && (
        <div className="admin-modal-backdrop" onClick={() => setRoleDetail(null)}>
          <div className="admin-modal" style={{ maxWidth: '580px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div>
                <span className="workspace-side-eyebrow">Role Detail</span>
                <h3>{roleDetail.displayName}</h3>
                <code style={{ fontSize: '12px', color: '#6B7280' }}>{roleDetail.roleName}</code>
              </div>
              <button className="btn btn-outline" onClick={() => setRoleDetail(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Users', value: roleDetail.userCount ?? '—' },
                { label: 'Permissions', value: detailLoading ? '…' : (roleDetail.permissionCount ?? '—') },
                { label: 'Scope', value: roleDetail.roleName.includes('ADMIN') || roleDetail.roleName.includes('OWNER') ? 'Full' : 'Scoped' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: 'var(--surface-raised, #F9FAFB)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '22px' }}>{stat.value}</strong>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{stat.label}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px' }}>{roleDetail.description}</p>

            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#111827' }}>
              Users ({roleDetailUsers.length})
            </h4>
            {roleDetailUsers.length === 0
              ? <div className="workspace-empty" style={{ marginBottom: '16px' }}>No users assigned to this role.</div>
              : (
                <div style={{ marginBottom: '20px' }}>
                  {roleDetailUsers.slice(0, 8).map((u) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                        {(u.name || u.fullName || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{u.name || u.fullName || u.email}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{u.email}</div>
                      </div>
                      <span className={`admin-status ${(u.enabled ?? u.isActive) ? 'active' : ''}`} style={{ marginLeft: 'auto', fontSize: '11px' }}>
                        {(u.enabled ?? u.isActive) ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                  {roleDetailUsers.length > 8 && <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>...and {roleDetailUsers.length - 8} more</div>}
                </div>
              )
            }

            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#111827' }}>
              Permissions ({detailLoading ? '…' : roleDetailPermissions.length})
            </h4>
            {detailLoading
              ? <div className="admin-skeleton">Loading permissions...</div>
              : roleDetailPermissions.length === 0
                ? <div className="workspace-empty">No permissions assigned.</div>
                : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {roleDetailPermissions.map((p) => (
                      <span key={p} style={{ background: 'rgba(59,130,246,0.1)', color: '#1D4ED8', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )
            }
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// PERMISSIONS TAB
// ============================================================
const PermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const fetchData = () => {
    Promise.all([
      api.get<PermissionDto[]>('/permissions'),
      api.get<Record<string, string[]>>('/permissions/roles'),
    ]).then(([permsRes, rolePermsRes]) => {
      if (permsRes?.success && Array.isArray(permsRes.data)) setPermissions(permsRes.data);
      if (rolePermsRes?.success && typeof rolePermsRes.data === 'object') setRolePermissions(rolePermsRes.data as Record<string, string[]>);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveRolePerms = async () => {
    if (!editRole) return;
    setSaving(true);
    try {
      await api.put(`/permissions/roles/${editRole}`, editPerms);
      setEditRole(null);
      setNotice(`Permissions updated for ${editRole}`);
      setTimeout(() => setNotice(''), 4000);
      fetchData();
    } catch {
      // error handled by api layer
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-skeleton">Loading permission matrix...</div>;
  if (permissions.length === 0) return <div className="workspace-empty">No permission matrix available from the backend.</div>;

  const grouped = permissions.reduce<Record<string, PermissionDto[]>>((acc, p) => {
    const mod = p.module || 'General';
    acc[mod] = [...(acc[mod] || []), p];
    return acc;
  }, {});

  const roleKeys = Object.keys(rolePermissions);

  return (
    <div className="admin-permissions-view">
      <div className="permission-board-head">
        <div>
          <span className="workspace-side-eyebrow">Permission matrix</span>
          <h2>Module access by action</h2>
          <p>Scan and edit policy coverage across system roles.</p>
        </div>
      </div>

      {notice && <div className="workspace-inline-note" style={{ marginBottom: '12px' }}>✅ {notice}</div>}

      {/* Role permission editor */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {roleKeys.map((rk) => (
          <button key={rk} className={`btn btn-sm ${editRole === rk ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setEditRole(rk); setEditPerms([...(rolePermissions[rk] || [])]); }}>
            Edit: {rk.replace('ROLE_', '')}
          </button>
        ))}
      </div>

      {/* Edit role permissions panel */}
      {editRole && (
        <div style={{ background: 'var(--surface-raised, #F9FAFB)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Editing permissions for <code>{editRole}</code></h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setEditRole(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={saving} onClick={handleSaveRolePerms}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {permissions.map((p) => {
              const has = editPerms.includes(p.name);
              return (
                <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', background: has ? 'rgba(59,130,246,0.1)' : 'transparent', border: '1px solid ' + (has ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'), fontSize: '12px' }}>
                  <input type="checkbox" checked={has} onChange={() => {
                    setEditPerms((prev) => prev.includes(p.name) ? prev.filter((x) => x !== p.name) : [...prev, p.name]);
                  }} style={{ margin: 0 }} />
                  <span style={{ fontFamily: 'monospace' }}>{p.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="permission-module-grid">
        {Object.entries(grouped).map(([module, rows]) => (
          <article key={module} className="permission-module-card">
            <header>
              <strong>{module}</strong>
              <span>{rows.length} action{rows.length === 1 ? '' : 's'}</span>
            </header>
            <div className="permission-action-list">
              {rows.map((perm) => (
                <div key={perm.id || perm.name} className="permission-action-row">
                  <div className="permission-action-name" title={perm.description}>{perm.name}</div>
                  <div className="permission-role-dots">
                    {roleKeys.map((rk) => {
                      const has = (rolePermissions[rk] || []).includes(perm.name);
                      const label = rk.replace('ROLE_', '').charAt(0);
                      return (
                        <span key={rk} className={has ? 'on' : ''} title={`${rk}: ${has ? 'Allow' : 'Deny'}`}>{label}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN EXPORT
// ============================================================
export const UserManagement: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'users' }) => {
  const { t } = useTranslation('user-management');
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRoles: 0 });

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const pageMeta = useMemo(() => ({
    users: {
      eyebrow: t('meta.users.eyebrow'),
      title: t('meta.users.title'),
      desc: t('meta.users.desc'),
      meter: stats.totalUsers || '-',
      meterLabel: t('meta.users.meterLabel'),
      skin: 'users',
      stats: [
        { label: t('meta.users.totalAccounts'), value: stats.totalUsers || '-' },
        { label: t('meta.users.activeAccounts'), value: stats.activeUsers || '-' },
        { label: t('meta.users.disabledAccounts'), value: Math.max(0, stats.totalUsers - stats.activeUsers) || '-' },
        { label: t('meta.users.provisioning'), value: 'Open' },
      ],
    },
    roles: {
      eyebrow: t('meta.roles.eyebrow'),
      title: t('meta.roles.title'),
      desc: t('meta.roles.desc'),
      meter: stats.totalRoles || '4',
      meterLabel: t('meta.roles.meterLabel'),
      skin: 'roles',
      stats: [
        { label: t('meta.roles.roleLanes'), value: stats.totalRoles || '4' },
        { label: t('meta.roles.adminRole'), value: 'Full' },
        { label: t('meta.roles.businessRoles'), value: '2' },
        { label: t('meta.roles.researchRole'), value: '1' },
      ],
    },
    permissions: {
      eyebrow: t('meta.permissions.eyebrow'),
      title: t('meta.permissions.title'),
      desc: t('meta.permissions.desc'),
      meter: 'Live',
      meterLabel: t('meta.permissions.meterLabel'),
      skin: 'permissions',
      stats: [
        { label: t('meta.permissions.matrixMode'), value: 'Module' },
        { label: t('meta.permissions.roleColumns'), value: '4' },
        { label: t('meta.permissions.policyState'), value: 'DB-backed' },
        { label: t('meta.permissions.reviewCadence'), value: 'On demand' },
      ],
    },
  }), [stats, t]);

  const current = pageMeta[tab];

  return (
    <section className={`page active admin-console-page admin-user-management-page ${current.skin} role-dashboard role-dashboard-admin`}>
      <div className={`workspace-page-head admin-console-hero admin-user-hero ${current.skin}`}>
        <div>
          <span className="workspace-side-eyebrow">{current.eyebrow}</span>
          <h1>{current.title}</h1>
          <p>{current.desc}</p>
        </div>
        <div className="admin-hero-meter">
          <strong>{current.meter}</strong>
          <span>{current.meterLabel}</span>
        </div>
      </div>

      <div className={`workspace-stats workspace-stats-compact admin-user-stats ${current.skin}`}>
        {current.stats.map((item) => (
          <article key={item.label} className="workspace-stat-card">
            <span className="workspace-stat-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-tabs">
        {(['users', 'roles', 'permissions'] as Tab[]).map((key) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="workspace-panel admin-console-panel users-panel">
          <UsersTab onStats={(next) => setStats((prev) => ({ ...prev, ...next }))} />
        </div>
      )}
      {tab === 'roles' && <RolesTab onCount={(count) => setStats((prev) => ({ ...prev, totalRoles: count }))} />}
      {tab === 'permissions' && <PermissionsTab />}
    </section>
  );
};
