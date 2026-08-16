import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError, type PageResponse } from '../services/api';
import { useUser } from '../context/UserContext';
import type { AccountAdminResponse, RoleDto, PermissionDto } from '../types/domain';
import { ShieldCheck, Briefcase, Users, User, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type PageOrData<T> = PageResponse<T> | T[];

interface UserRow extends AccountAdminResponse {
  fullName?: string;
  isActive?: boolean;
  status?: string;
  enabled?: boolean;
  emailVerified?: boolean;
}

interface CreateFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
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

interface StatusConfirm {
  id: number;
  email: string;
  activate: boolean;
}

interface RoleDetail {
  roleName: string;
  displayName: string;
  description: string;
  userCount: number | null;
  permissionCount: number | null;
}

type Tab = 'users' | 'permissions';

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

const ROLE_RANKS: Record<string, number> = {
  ROLE_SYSTEM_ADMIN: 6, SYSTEM_ADMIN: 6,
  ROLE_ADMIN: 6,
  ROLE_BUSINESS_OWNER: 5, BUSINESS_OWNER: 5,
  ROLE_BUSINESS_DEVELOPMENT_MANAGER: 3, BUSINESS_DEVELOPMENT_MANAGER: 3,
  ROLE_BUSINESS_DEVELOPMENT_STAFF: 1, BUSINESS_DEVELOPMENT_STAFF: 1,
  ROLE_RESEARCH_STAFF: 1, RESEARCH_STAFF: 1,
};

const normalizeRole = (role: string | RoleDto): RoleDto => {
  if (typeof role !== 'string') return role;
  const label = role.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { id: role, key: role, name: role, displayName: label };
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  BUSINESS_OWNER: 'Business Owner',
  BUSINESS_DEVELOPMENT_MANAGER: 'Business Development Manager',
  BUSINESS_DEVELOPMENT_STAFF: 'Business Development Staff',
};

const roleDisplayName = (role: string | undefined | null): string => {
  const v = String(role || '').replace('ROLE_', '');
  if (ROLE_DISPLAY_NAMES[v]) return ROLE_DISPLAY_NAMES[v];
  if (!v) return 'Unknown';
  return v.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
};

const shortRoleName = (role: string) => {
  const v = role.toUpperCase();
  if (v.includes('ADMIN')) return 'admin';
  if (v.includes('OWNER')) return 'owner';
  if (v.includes('MANAGER')) return 'manager';
  if (v.includes('STAFF')) return 'staff';
  return role.replace('ROLE_', '').toLowerCase();
};

// --- Password validation helpers ---
const passwordErrors = (pw: string, confirm: string): string[] => {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('At least 8 characters');
  if (pw.length > 72) errors.push('Maximum 72 characters (BCrypt limit)');
  if (confirm && pw !== confirm) errors.push('Passwords do not match');
  return errors;
};

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <span className="admin-field-error">{msg}</span> : null;

const PasswordInput: React.FC<{
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
}> = ({ value, show, onToggle, onChange, disabled, autoComplete }) => (
  <span className="admin-password-field">
    <input
      className="admin-input"
      type={show ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
    <button
      type="button"
      className="admin-password-toggle"
      onClick={onToggle}
      disabled={disabled}
      title={show ? 'Hide password' : 'Show password'}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </span>
);

// ============================================================
// USERS TAB
// ============================================================
const UsersTab: React.FC<{
  onStats: (stats: { totalUsers: number; activeUsers: number }) => void;
  openCreate?: boolean;
}> = ({ onStats, openCreate = false }) => {
  const { t } = useTranslation('user-management');
  const { currentUser } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<EditUserForm | null>(null);
  const [passwordReset, setPasswordReset] = useState<PasswordResetForm | null>(null);
  const [roleUser, setRoleUser] = useState<RoleUserForm | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<StatusConfirm | null>(null);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<RoleDto[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState('');

  const [newUser, setNewUser] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', role: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createdUser, setCreatedUser] = useState<{ email: string; role: string } | null>(null);

  const currentUserRank = useMemo(() => {
    if (!currentUser) return 1;
    return ROLE_RANKS[currentUser.role] || 1;
  }, [currentUser]);

  const availableRoleOptions = useMemo(() => {
    const allowedKeys = [
      'BUSINESS_OWNER',
      'ROLE_BUSINESS_OWNER',
      'BUSINESS_DEVELOPMENT_MANAGER',
      'ROLE_BUSINESS_DEVELOPMENT_MANAGER',
      'BUSINESS_DEVELOPMENT_STAFF',
      'ROLE_BUSINESS_DEVELOPMENT_STAFF'
    ];
    const options = roleOptions
      .map((role) => ({ value: role.key || role.name, label: roleDisplayName(role.key || role.name) }))
      .filter((opt) => allowedKeys.includes(opt.value));
    if (currentUserRank >= 6) return options;
    return options.filter((opt) => (ROLE_RANKS[opt.value] || 0) < currentUserRank);
  }, [currentUserRank, roleOptions]);

  const fetchUsers = () => {
    setLoading(true);
    api.get<PageOrData<UserRow>>('/users')
      .then((res) => {
        const rows = res?.success && res.data && typeof res.data === 'object' && 'content' in res.data
          ? (res.data as PageResponse<UserRow>).content
          : res?.success && Array.isArray(res.data) ? res.data : [];
        setUsers(rows);
        setLoadFailed(false);
        onStats({
          totalUsers: rows.length,
          activeUsers: rows.filter((u) => u.enabled ?? u.active ?? u.isActive ?? u.status === 'active').length,
        });
      })
      .catch((err) => { setLoadFailed(true); setError(err?.message || 'Could not load accounts directory.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    setRoleLoading(true);
    setRoleError('');
    api.get<Array<RoleDto | string>>('/roles')
      .then((response) => {
        const roles = Array.isArray(response.data) ? response.data.map(normalizeRole).filter((role) => role.key !== 'RESEARCH_STAFF') : [];
        setRoleOptions(roles);
      })
      .catch(() => setRoleError(t('users.modal.roleLoadError')))
      .finally(() => setRoleLoading(false));
  }, []);

  useEffect(() => {
    if (openCreate) {
      setShowCreateModal(true);
    }
  }, [openCreate]);

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 6000); };

  const resetCreateForm = () => {
    setNewUser({ fullName: '', email: '', password: '', confirmPassword: '', role: '' });
    setCreateErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const updateCreateField = (field: keyof CreateFormErrors, value: string) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const openCreateForm = () => {
    setError('');
    setNotice('');
    setCreateErrors({});
    setShowCreateModal(true);
  };

  const validateCreateForm = (): CreateFormErrors => {
    const errors: CreateFormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newUser.fullName.trim()) errors.fullName = t('users.validation.requiredFullName');
    if (!newUser.email.trim()) {
      errors.email = t('users.validation.requiredEmail');
    } else if (!emailRegex.test(newUser.email.trim())) {
      errors.email = t('users.validation.invalidEmail');
    }
    if (!newUser.password) {
      errors.password = t('users.validation.requiredPassword');
    } else if (newUser.password.length < 8) {
      errors.password = t('users.validation.passwordMin');
    } else if (newUser.password.length > 72) {
      errors.password = t('users.validation.passwordMax');
    }
    if (!newUser.confirmPassword) {
      errors.confirmPassword = t('users.validation.requiredConfirmPassword');
    } else if (newUser.confirmPassword !== newUser.password) {
      errors.confirmPassword = t('users.validation.passwordMismatch');
    }
    if (!newUser.role) errors.role = t('users.validation.requiredRole');

    return errors;
  };

  const createErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 401) return t('users.errors.unauthorized');
      if (err.status === 403) return t('users.errors.forbidden');
      if (err.status === 409) return t('users.validation.emailExists');
      if (err.status === 400) {
        const msg = String(err.message || '');
        if (msg.toLowerCase().includes('already exists')) return t('users.validation.emailExists');
        if (msg.toLowerCase().includes('match')) return t('users.validation.passwordMismatch');
        return t('users.errors.badRequest');
      }
      if (err.status >= 500) return t('users.errors.serverError');
      return err.message || t('users.errors.default');
    }
    return t('users.errors.network');
  };

  const handleCreate = async () => {
    setError('');
    setNotice('');

    const errors = validateCreateForm();
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (roleLoading || roleError || availableRoleOptions.length === 0) {
      showError(roleError || t('users.modal.roleLoadError'));
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/users', {
        email: newUser.email.trim(),
        fullName: newUser.fullName.trim(),
        password: newUser.password,
        confirmPassword: newUser.confirmPassword,
        roles: [newUser.role],
      });
      setCreatedUser({ email: newUser.email.trim(), role: newUser.role });
      resetCreateForm();
      setShowCreateModal(false);
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const msg = String(err.message || '');
        if ((err.status === 400 || err.status === 409) && msg.toLowerCase().includes('already exists')) {
          setCreateErrors((prev) => ({ ...prev, email: t('users.validation.emailExists') }));
          return;
        }
      }
      showError(createErrorMessage(err));
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

  const handleConfirmStatus = async () => {
    if (!statusConfirm) return;
    setActionLoading(true);
    try {
      await api.patch(`/users/${statusConfirm.id}/status`, { enabled: statusConfirm.activate });
      setStatusConfirm(null);
      showNotice(statusConfirm.activate ? `Đã kích hoạt tài khoản ${statusConfirm.email}.` : `Đã vô hiệu hóa tài khoản ${statusConfirm.email}.`);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Could not change status.');
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

  const showEmailStatus = paginated.some((u) => u.emailVerified !== undefined);
  const tableColSpan = showEmailStatus ? 7 : 6;

  return (
    <div className="admin-users-view">
      <div className="admin-users-header">

        <button className="btn btn-primary" onClick={openCreateForm}>
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
                    {['ID', 'User', 'Email', 'Role', 'Status'].map((h) => <th key={h}>{h}</th>)}
                    {showEmailStatus && <th>{t('users.table.emailStatus')}</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user) => {
                    const isActive = user.enabled ?? user.active ?? user.isActive ?? (user.status === 'active');
                    const roleRaw = user.role || user.roleName || (user.roles && user.roles[0]) || 'BUSINESS_DEVELOPMENT_STAFF';
                    const roleKey = String(roleRaw).replace('ROLE_', '');
                    const formatRole = (key: string) => {
                      if (key === 'SYSTEM_ADMIN') return 'admin';
                      if (key === 'BUSINESS_OWNER') return 'owner';
                      if (key === 'BUSINESS_DEVELOPMENT_MANAGER') return 'manager';
                      if (key === 'BUSINESS_DEVELOPMENT_STAFF') return 'staff';
                      return key.toLowerCase();
                    };
                    const displayRole = formatRole(roleKey);
                    const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);

                    return (
                      <tr key={user.id || user.email}>
                        <td className="admin-mono">{user.id ?? '-'}</td>
                        <td>
                          <strong>{user.name || user.fullName || user.username || 'Unnamed'}{isSelf && <span style={{ fontSize: '10px', color: '#3B82F6', marginLeft: '4px' }}>(you)</span>}</strong>
                          <small>{user.username || ''}</small>
                        </td>
                        <td>{user.email || '-'}</td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[roleRaw] || ROLE_BADGE[roleKey] || 'badge-blue'}`}>
                            {displayRole}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status ${isActive ? 'active' : ''}`}>
                            {isActive ? t('users.active') : t('users.disabled')}
                          </span>
                        </td>
                        {showEmailStatus && (
                          <td>
                            {user.emailVerified === undefined ? (
                              <span className="admin-status">{t('users.table.emailUnknown')}</span>
                            ) : user.emailVerified ? (
                              <span className="admin-status active">✓ {t('users.table.emailVerified')}</span>
                            ) : (
                              <span className="admin-status" style={{ background: 'rgba(245,158,11,0.14)', color: '#B45309' }}>⚠ {t('users.table.emailUnverified')}</span>
                            )}
                          </td>
                        )}
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
                            <button className={`btn btn-sm ${isActive ? '' : 'btn-outline'}`} disabled={!!isSelf || actionLoading}
                              title={isSelf ? 'Không thể vô hiệu hóa tài khoản của chính mình' : isActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                              style={isActive ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' } : isSelf ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              onClick={() => { setError(''); setStatusConfirm({ id: user.id, email: user.email || '', activate: !isActive }); }}>
                              {isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={tableColSpan}><div className="workspace-empty">{loadFailed ? 'Could not load the account directory from the server. Check the connection and try again.' : 'No accounts match the current filter.'}</div></td></tr>
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
        <div className="admin-modal-backdrop" onClick={() => { if (!actionLoading) setShowCreateModal(false); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div><h3>{t('users.modal.createTitle')}</h3><p>{t('users.modal.createDesc')}</p></div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>{t('users.modal.fullName')}</span>
                <input
                  className="admin-input"
                  value={newUser.fullName}
                  disabled={actionLoading}
                  onChange={(e) => updateCreateField('fullName', e.target.value)}
                />
                <FieldError msg={createErrors.fullName} />
              </label>
              <label>
                <span>{t('users.modal.email')}</span>
                <input
                  className="admin-input"
                  type="email"
                  autoComplete="off"
                  value={newUser.email}
                  disabled={actionLoading}
                  onChange={(e) => updateCreateField('email', e.target.value)}
                />
                <FieldError msg={createErrors.email} />
              </label>
              <label>
                <span>{t('users.modal.password')}</span>
                <PasswordInput
                  value={newUser.password}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  onChange={(value) => updateCreateField('password', value)}
                  disabled={actionLoading}
                  autoComplete="new-password"
                />
                {createErrors.password ? <FieldError msg={createErrors.password} /> : <small className="admin-field-hint">{t('users.modal.passwordHint')}</small>}
              </label>
              <label>
                <span>{t('users.modal.confirmPassword')}</span>
                <PasswordInput
                  value={newUser.confirmPassword}
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                  onChange={(value) => updateCreateField('confirmPassword', value)}
                  disabled={actionLoading}
                  autoComplete="new-password"
                />
                <FieldError msg={createErrors.confirmPassword} />
              </label>
              <label className="admin-form-span">
                <span>{t('users.modal.role')}</span>
                <select
                  className="admin-select"
                  value={newUser.role}
                  disabled={roleLoading || roleError !== '' || availableRoleOptions.length === 0 || actionLoading}
                  onChange={(e) => updateCreateField('role', e.target.value)}
                >
                  <option value="">{roleLoading ? t('users.modal.roleLoading') : t('users.modal.rolePlaceholder')}</option>
                  {availableRoleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {roleError ? <FieldError msg={roleError} /> : <FieldError msg={createErrors.role} />}
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" disabled={actionLoading} onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                {t('users.modal.cancel')}
              </button>
              <button
                className="btn btn-primary"
                disabled={actionLoading || roleLoading || roleError !== '' || availableRoleOptions.length === 0}
                onClick={handleCreate}
              >
                {actionLoading ? t('users.modal.creating') : t('users.modal.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUCCESS MODAL */}
      {createdUser && (
        <div className="admin-modal-backdrop" onClick={() => setCreatedUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={34} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('users.success.title')}</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>{t('users.success.body')}</p>
            </div>
            <div style={{ marginTop: '18px', background: '#F9FAFB', border: '1px solid var(--workspace-muted-border)', borderRadius: '12px', padding: '14px 16px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('users.success.emailLabel')}</span>
                <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>{createdUser.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('users.success.roleLabel')}</span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{roleDisplayName(createdUser.role)}</strong>
              </div>
            </div>
            <div style={{ marginTop: '14px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#B45309', lineHeight: '1.5' }}>
              {t('users.success.pendingVerification')}
            </div>
            <div className="admin-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setCreatedUser(null)}>{t('users.success.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditUser(null)}>
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '460px', 
              padding: 0, 
              overflow: 'hidden',
              background: 'var(--cds-layer-01)',
              borderRadius: '12px',
              border: '1px solid var(--cds-border-subtle-00)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Edit Account #{editUser.id}</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--cds-text-secondary)' }}>Update profile information for this user.</p>
                </div>
                <button 
                  onClick={() => setEditUser(null)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cds-icon-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cds-layer-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</label>
                <input 
                  value={editUser.name} 
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} 
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    background: 'var(--cds-field)', 
                    border: '1px solid var(--cds-border-strong-01)', 
                    borderRadius: '6px', 
                    fontSize: '14px', 
                    color: 'var(--cds-text-primary)', 
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--cds-interactive)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--cds-border-strong-01)'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Address</label>
                <input 
                  type="email" 
                  value={editUser.email} 
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} 
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    background: 'var(--cds-field)', 
                    border: '1px solid var(--cds-border-strong-01)', 
                    borderRadius: '6px', 
                    fontSize: '14px', 
                    color: 'var(--cds-text-primary)', 
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--cds-interactive)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--cds-border-strong-01)'}
                />
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', background: 'var(--cds-layer-02)', borderTop: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setEditUser(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--cds-border-strong-01)',
                  color: 'var(--cds-text-primary)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                disabled={actionLoading} 
                onClick={handleUpdate}
                style={{
                  background: 'var(--cds-interactive)',
                  border: '1px solid var(--cds-interactive)',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
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

      {/* STATUS CONFIRMATION MODAL */}
      {statusConfirm && (
        <div className="admin-modal-backdrop" onClick={() => { if (!actionLoading) setStatusConfirm(null); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="workspace-section-head">
              <div><h3>{statusConfirm.activate ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản'}</h3></div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ background: statusConfirm.activate ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${statusConfirm.activate ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                <strong style={{ color: statusConfirm.activate ? '#059669' : '#EF4444' }}>{statusConfirm.activate ? 'Khôi phục quyền đăng nhập' : 'Không thể đăng nhập trong thời gian vô hiệu hóa.'}</strong>
                <p style={{ marginTop: '6px', fontSize: '13px', color: '#6B7280' }}>
                  Tài khoản <strong>{statusConfirm.email}</strong> sẽ được {statusConfirm.activate ? 'kích hoạt lại' : 'vô hiệu hóa'}.
                  Không có dữ liệu nào bị xóa.
                </p>
              </div>
              <p style={{ fontSize: '14px', color: '#374151' }}>{statusConfirm.activate ? 'Bạn có chắc muốn kích hoạt tài khoản này không?' : 'Bạn có chắc muốn vô hiệu hóa tài khoản này không?'}</p>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" disabled={actionLoading} onClick={() => setStatusConfirm(null)}>Hủy bỏ</button>
              <button
                className="btn btn-primary"
                style={statusConfirm.activate ? { background: '#059669', borderColor: '#059669' } : { background: '#EF4444', borderColor: '#EF4444' }}
                disabled={actionLoading}
                onClick={handleConfirmStatus}
              >
                {actionLoading ? 'Đang xử lý...' : statusConfirm.activate ? 'Kích hoạt' : 'Vô hiệu hóa'}
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
      <div className="admin-roles-view" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid var(--border-color, #E5E7EB)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border-color, #E5E7EB)' }}>
              <th style={{ padding: '16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Vai trò</th>
              <th style={{ padding: '16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Người dùng</th>
              <th style={{ padding: '16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Quyền</th>
              <th style={{ padding: '16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Phạm vi</th>
              <th style={{ padding: '16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Mã vai trò</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const key = role.key || role.name || 'ROLE';
              const cleanKey = key.replace('ROLE_', '');
              const userCount = getUserCountForRole(key);
              const isFull = key.includes('ADMIN') || key.includes('OWNER');
              const scope = isFull ? 'Full' : 'Scoped';
              
              let iconColor = '#3B82F6';
              let iconBg = '#EFF6FF';
              let RoleIcon = ShieldCheck;
              if (cleanKey.includes('ADMIN')) {
                iconColor = '#3B82F6';
                iconBg = '#EFF6FF';
                RoleIcon = ShieldCheck;
              } else if (cleanKey.includes('OWNER')) {
                iconColor = '#F97316';
                iconBg = '#FFF7ED';
                RoleIcon = Briefcase;
              } else if (cleanKey.includes('MANAGER')) {
                iconColor = '#10B981';
                iconBg = '#ECFDF5';
                RoleIcon = Users;
              } else if (cleanKey.includes('STAFF')) {
                iconColor = '#8B5CF6';
                iconBg = '#F5F3FF';
                RoleIcon = User;
              }

              return (
                <tr key={role.id || key} style={{ borderBottom: '1px solid var(--border-color, #E5E7EB)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RoleIcon size={24} strokeWidth={1.5} />
                      </div>
                      <div style={{ paddingTop: '2px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>{role.displayName || role.name}</div>
                        <button style={{ background: '#EFF6FF', color: '#2563EB', border: 'none', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }} onClick={() => openReview(role)}>Review</button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '80px', background: '#fff' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{userCount}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.02em' }}>Users</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '80px', background: '#fff' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{role.permissionCount ?? '—'}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.02em' }}>Permissions</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '80px', background: '#fff' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{scope}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.02em' }}>Scope</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '12px', fontFamily: 'monospace', color: '#4B5563', textTransform: 'uppercase', fontWeight: 500 }}>
                    {cleanKey}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get<PermissionDto[]>('/permissions'),
      api.get<Record<string, string[]>>('/permissions/roles'),
    ]).then(([permsRes, rolePermsRes]) => {
      if (permsRes?.success && Array.isArray(permsRes.data)) setPermissions(permsRes.data);
      if (rolePermsRes?.success && typeof rolePermsRes.data === 'object') setRolePermissions(rolePermsRes.data as Record<string, string[]>);
    }).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : 'Could not load the permission matrix.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="admin-skeleton">Loading permission matrix...</div>;
  if (permissions.length === 0) return <div className="workspace-empty">No permission matrix available from the backend.</div>;

  const roleKeys = Object.keys(rolePermissions);

  return (
    <div className="admin-permissions-view">
      {error && <div className="workspace-inline-error" style={{ marginBottom: '12px' }}>{error}</div>}
      <div className="workspace-section-head" style={{ marginBottom: '12px' }}>
        <div>
          <h3>Permission matrix</h3>
          <p>Read-only view of module access by system roles.</p>
        </div>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>MODULE</th>
              <th>MÃ QUYỀN</th>
              <th>VAI TRÒ ÁP DỤNG</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id || perm.name}>
                <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {perm.module || 'General'}
                </td>
                <td style={{ padding: '16px', fontSize: '12px', fontFamily: 'monospace', color: '#4B5563', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {perm.name}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {roleKeys.filter(rk => (rolePermissions[rk] || []).includes(perm.name)).map((rk) => (
                      <span key={rk} style={{ padding: '4px 8px', borderRadius: '12px', background: '#F3F4F6', color: '#374151', fontSize: '11px', fontWeight: 600 }}>
                        {shortRoleName(rk)}
                      </span>
                    ))}
                    {roleKeys.filter(rk => (rolePermissions[rk] || []).includes(perm.name)).length === 0 && (
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>Chưa cấp phát</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// ASSIGN PERMISSIONS TAB
// ============================================================
const AssignPermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get<PermissionDto[]>('/permissions'),
      api.get<Record<string, string[]>>('/permissions/roles'),
    ]).then(([permsRes, rolePermsRes]) => {
      if (permsRes?.success && Array.isArray(permsRes.data)) setPermissions(permsRes.data);
      if (rolePermsRes?.success && typeof rolePermsRes.data === 'object') {
        const rp = rolePermsRes.data as Record<string, string[]>;
        setRolePermissions(rp);
        
        setEditPerms((prevEditPerms) => {
          if (!selectedRole && Object.keys(rp).length > 0) {
            const firstRole = Object.keys(rp)[0];
            setSelectedRole(firstRole);
            return rp[firstRole] || [];
          }
          if (selectedRole) {
            return rp[selectedRole] || [];
          }
          return prevEditPerms;
        });
      }
    }).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : 'Could not load data.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleSelect = (role: string) => {
    if (saving) return;
    setSelectedRole(role);
    setEditPerms([...(rolePermissions[role] || [])]);
    setError('');
    setNotice('');
  };

  const handleSaveRolePerms = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/permissions/roles/${selectedRole}`, editPerms);
      setNotice(`Permissions updated for ${shortRoleName(selectedRole)}`);
      setTimeout(() => setNotice(''), 4000);
      fetchData();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update role permissions.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionName: string) => {
    setEditPerms((current) => current.includes(permissionName)
      ? current.filter((name) => name !== permissionName)
      : [...current, permissionName]);
  };

  if (loading) return <div className="admin-skeleton">Loading...</div>;

  const grouped = permissions.reduce<Record<string, PermissionDto[]>>((acc, p) => {
    const mod = p.module || 'General';
    acc[mod] = [...(acc[mod] || []), p];
    return acc;
  }, {});

  const roleKeys = Object.keys(rolePermissions);

  return (
    <div className="workspace-panel admin-console-panel" style={{ padding: 0 }}>
      <div style={{ display: 'flex', minHeight: '600px', background: 'var(--cds-layer-01)', borderRadius: '12px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden' }}>
        
        <div style={{ width: '280px', borderRight: '1px solid var(--cds-border-subtle-00)', background: 'var(--cds-layer-01)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Select Role</h3>
          </div>
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {roleKeys.map(role => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: selectedRole === role ? 'rgba(15, 98, 254, 0.08)' : 'transparent',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                  color: selectedRole === role ? 'var(--cds-interactive)' : 'var(--cds-text-primary)',
                  fontWeight: selectedRole === role ? 600 : 400
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>{shortRoleName(role)}</span>
                <span style={{ fontSize: '11px', background: selectedRole === role ? 'var(--cds-interactive)' : 'var(--cds-layer-02)', color: selectedRole === role ? '#fff' : 'var(--cds-text-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                  {rolePermissions[role]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--cds-layer-00)' }}>
          {selectedRole ? (
            <>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--cds-border-subtle-00)', background: 'var(--cds-layer-01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--cds-text-primary)', textTransform: 'capitalize' }}>Manage permissions: {shortRoleName(selectedRole)}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    {editPerms.length} of {permissions.length} permissions selected.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => { setEditPerms([...(rolePermissions[selectedRole] || [])]); setNotice(''); setError(''); }}
                    disabled={saving}
                  >
                    Reset
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveRolePerms} 
                    disabled={saving}
                    style={{ background: 'var(--cds-interactive)', border: 'none', color: '#fff' }}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>

              {error && <div className="admin-alert error" style={{ margin: '24px 32px 0' }}>{error}</div>}
              {notice && <div className="admin-alert success" style={{ margin: '24px 32px 0' }}>{notice}</div>}

              <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                {Object.entries(grouped).map(([module, modulePermissions]) => (
                  <section key={module} style={{ marginBottom: '32px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--cds-text-primary)' }}>{module}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {modulePermissions.map((permission) => (
                        <label 
                          key={permission.id || permission.name} 
                          style={{ 
                            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', 
                            background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', 
                            borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.2s',
                            ...(editPerms.includes(permission.name) ? { borderColor: 'var(--cds-interactive)', background: 'rgba(15, 98, 254, 0.02)' } : {})
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={editPerms.includes(permission.name)} 
                            onChange={() => togglePermission(permission.name)} 
                            style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--cds-interactive)' }}
                          />
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--cds-text-primary)' }}>{permission.name}</strong>
                            {permission.description && <span style={{ color: 'var(--cds-text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>{permission.description}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--cds-text-secondary)' }}>
              Select a role to manage permissions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN EXPORT
// ============================================================
export const UserManagement: React.FC<{ defaultTab?: Tab; openCreate?: boolean }> = ({ defaultTab = 'users', openCreate = false }) => {
  const { t } = useTranslation('user-management');
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRoles: 0 });

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const pageMeta = useMemo(() => ({
    users: { skin: 'users' },
    permissions: { skin: 'permissions' },
    assign: { skin: 'assign' }
  }), []);

  const current = pageMeta[tab] || { skin: 'users' };

  return (
    <section className={`page active admin-console-page admin-user-management-page ${current.skin} role-dashboard role-dashboard-admin`}>


      {tab === 'users' && (
        <div className="workspace-panel admin-console-panel users-panel">
          <UsersTab openCreate={openCreate} onStats={(next) => setStats((prev) => ({ ...prev, ...next }))} />
        </div>
      )}
    </section>
  );
};
