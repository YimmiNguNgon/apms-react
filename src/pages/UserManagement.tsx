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
}

interface EditUserForm {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  password?: string;
}

interface RoleUserForm {
  id: number;
  name: string;
  currentRole: string;
  selectedRole: string;
}

type Tab = 'users' | 'roles' | 'permissions';

const ROLE_BADGE: Record<string, string> = {
  ROLE_ADMIN: 'badge-gray',
  ROLE_SYSTEM_ADMIN: 'badge-gray',
  ROLE_BUSINESS_OWNER: 'badge-gray',
  ROLE_DIRECTOR: 'badge-green',
  ROLE_BUSINESS_DIRECTOR: 'badge-green',
  ROLE_MANAGER: 'badge-yellow',
  ROLE_BUSINESS_DEVELOPMENT_MANAGER: 'badge-yellow',
  ROLE_KEY_MEMBER: 'badge-purple',
  ROLE_STAFF: 'badge-blue',
  ROLE_RESEARCH_STAFF: 'badge-blue',
  ROLE_BUSINESS_DEVELOPMENT_STAFF: 'badge-blue',
};

const ALL_ROLE_OPTIONS = [
  { value: 'ROLE_SYSTEM_ADMIN', label: 'System Administrator (Admin)' },
  { value: 'ROLE_BUSINESS_OWNER', label: 'Business Owner (Owner)' },
  { value: 'ROLE_BUSINESS_DEVELOPMENT_MANAGER', label: 'BD Manager' },
  { value: 'ROLE_RESEARCH_STAFF', label: 'Research Staff' },
];

const ROLE_RANKS: Record<string, number> = {
  ROLE_SYSTEM_ADMIN: 6,
  ROLE_ADMIN: 6,
  SYSTEM_ADMIN: 6,
  ADMIN: 6,
  ROLE_BUSINESS_OWNER: 5,
  ROLE_OWNER: 5,
  BUSINESS_OWNER: 5,
  OWNER: 5,
  ROLE_BUSINESS_DIRECTOR: 4,
  BUSINESS_DIRECTOR: 4,
  DIRECTOR: 4,
  ROLE_BUSINESS_DEVELOPMENT_MANAGER: 3,
  BUSINESS_DEVELOPMENT_MANAGER: 3,
  MANAGER: 3,
  ROLE_KEY_MEMBER: 2,
  KEY_MEMBER: 2,
  ROLE_RESEARCH_STAFF: 1,
  ROLE_BUSINESS_DEVELOPMENT_STAFF: 1,
  RESEARCH_STAFF: 1,
  BUSINESS_DEVELOPMENT_STAFF: 1,
  STAFF: 1,
};

const roleAccent = (role: string) => {
  const value = role.toUpperCase();
  if (value.includes('ADMIN') || value.includes('OWNER')) return 'slate';
  if (value.includes('DIRECTOR')) return 'green';
  if (value.includes('MANAGER')) return 'amber';
  if (value.includes('KEY')) return 'violet';
  return 'blue';
};

const UsersTab: React.FC<{ onStats: (stats: { totalUsers: number; activeUsers: number }) => void }> = ({ onStats }) => {
  const { t } = useTranslation('user-management');
  const { currentUser } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<EditUserForm | null>(null);
  const [roleUser, setRoleUser] = useState<RoleUserForm | null>(null);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'ROLE_RESEARCH_STAFF',
  });

  const currentUserRank = useMemo(() => {
    if (!currentUser) return 1;
    return ROLE_RANKS[currentUser.role] || 1;
  }, [currentUser]);

  const availableRoleOptions = useMemo(() => {
    if (currentUserRank >= 6) {
      return ALL_ROLE_OPTIONS;
    }
    return ALL_ROLE_OPTIONS.filter((opt) => (ROLE_RANKS[opt.value] || 0) < currentUserRank);
  }, [currentUserRank]);

  const fetchUsers = () => {
    setLoading(true);
    api.get<PageOrData<UserRow>>('/accounts?page=0&size=200')
      .then((res) => {
        const rows = res?.success && res.data && typeof res.data === 'object' && 'content' in res.data
          ? (res.data as PageResponse<UserRow>).content
          : res?.success && Array.isArray(res.data)
            ? res.data
            : [];
        setUsers(rows);
        onStats({
          totalUsers: rows.length,
          activeUsers: rows.filter((u) => u.active || u.status === 'active' || u.isActive).length,
        });
      })
      .catch((err) => setError(err?.message || 'Could not load accounts directory.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    api.get<PageOrData<RoleDto>>('/admin/roles')
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setRoles(res.data);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setError('');
    setNotice('');
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('Name, email, and password are required.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/accounts', newUser);
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', username: '', password: '', role: 'ROLE_RESEARCH_STAFF' });
      setNotice('Account created successfully.');
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setError('');
    setNotice('');
    setActionLoading(true);
    try {
      await api.put(`/accounts/${editUser.id}`, {
        email: editUser.email,
        username: editUser.username,
        name: editUser.name,
        password: editUser.password || undefined,
        role: editUser.role,
      });
      setEditUser(null);
      setNotice(`Account #${editUser.id} updated successfully.`);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!roleUser) return;
    setError('');
    setNotice('');
    setActionLoading(true);
    try {
      await api.post(`/users/${roleUser.id}/roles`, {
        roles: [roleUser.selectedRole],
      });
      setRoleUser(null);
      setNotice(`Updated roles for account #${roleUser.id}.`);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not assign role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    setError('');
    setNotice('');
    const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);
    if (isSelf) {
      setError('Không thể tự khóa tài khoản của chính mình');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/accounts/${user.id}/status`);
      setNotice(`Updated status for ${user.email || user.username}.`);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not change account status.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const name = String(u.name || u.fullName || u.email || '').toLowerCase();
      const username = String(u.username || u.email || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const isActive = u.active ?? u.isActive ?? (u.status === 'active');
      const statusStr = isActive ? 'active' : 'inactive';
      
      const matchesSearch = name.includes(search.toLowerCase()) || 
                            username.includes(search.toLowerCase()) || 
                            email.includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || statusStr === filter;

      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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
            <input
              className="admin-input"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
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
          {notice && <div className="workspace-inline-note">{notice}</div>}
          {error && <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>❌ {error}</div>}
          {loading ? (
            <div className="admin-skeleton">Loading account directory...</div>
          ) : (
            <div className="admin-table-card user-directory-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    {[t('users.table.id'), t('users.table.user'), t('users.table.email'), t('users.table.role'), t('users.table.status'), t('users.table.actions')].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user) => {
                    const isActive = user.active ?? user.isActive ?? (user.status === 'active');
                    const role = user.role || user.roleName || (user.roles && user.roles[0]) || 'ROLE_RESEARCH_STAFF';
                    const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);

                    return (
                      <tr key={user.id || user.email}>
                        <td className="admin-mono">#{user.id ?? '-'}</td>
                        <td>
                          <strong>{user.name || user.fullName || user.username || 'Unnamed user'} {isSelf && <span style={{ fontSize: '10px', color: '#3B82F6', marginLeft: '4px' }}>{t('users.table.you')}</span>}</strong>
                          <small>{user.username || ''}</small>
                        </td>
                        <td>{user.email || '-'}</td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[role] || 'badge-blue'}`}>
                            {user.roleName || role.replace('ROLE_', '')}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status ${isActive ? 'active' : ''}`}>
                            {isActive ? t('users.active') : t('users.disabled')}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions" style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setError('');
                                setEditUser({
                                  id: user.id,
                                  name: user.name || user.fullName || '',
                                  username: user.username || '',
                                  email: user.email || '',
                                  role: role,
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setError('');
                                setRoleUser({
                                  id: user.id,
                                  name: user.name || user.email,
                                  currentRole: role,
                                  selectedRole: role,
                                });
                              }}
                            >
                              Role
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              disabled={isSelf || actionLoading}
                              title={isSelf ? 'Không thể tự khóa tài khoản của chính mình' : isActive ? 'Lock account' : 'Unlock account'}
                              style={isSelf ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {isActive ? 'Lock' : 'Unlock'}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Page {page + 1} of {totalPages} ({filtered.length} total)
                  </span>
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
              <div>
                <h3>Create Account</h3>
                <p>Provision a new system user with a single role.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>Full name *</span>
                <input className="admin-input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </label>
              <label>
                <span>Email *</span>
                <input className="admin-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </label>
              <label>
                <span>Username</span>
                <input className="admin-input" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              </label>
              <label>
                <span>Password *</span>
                <input className="admin-input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </label>
              <label className="admin-form-span">
                <span>Role</span>
                <select className="admin-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {availableRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
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
              <div>
                <h3>Edit Account #{editUser.id}</h3>
                <p>Update profile information and identity.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>Full name</span>
                <input className="admin-input" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
              </label>
              <label>
                <span>Email</span>
                <input className="admin-input" type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
              </label>
              <label>
                <span>Username</span>
                <input className="admin-input" value={editUser.username} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} />
              </label>
              <label>
                <span>New password (leave blank to keep current)</span>
                <input className="admin-input" type="password" placeholder="••••••••" value={editUser.password || ''} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} />
              </label>
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

      {/* ROLE ASSIGN MODAL */}
      {roleUser && (
        <div className="admin-modal-backdrop" onClick={() => setRoleUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div>
                <h3>Assign Role for {roleUser.name}</h3>
                <p>Select a new system role. Hierarchy rules strictly enforced.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label className="admin-form-span">
                <span>Role selection</span>
                <select className="admin-select" value={roleUser.selectedRole} onChange={(e) => setRoleUser({ ...roleUser, selectedRole: e.target.value })}>
                  {availableRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
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
    </div>
  );
};

const RolesTab: React.FC<{ onCount: (count: number) => void }> = ({ onCount }) => {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PageOrData<RoleDto>>('/admin/roles')
      .then((res) => {
        const rows = res?.success && Array.isArray(res.data)
          ? res.data
          : res?.success && res.data && typeof res.data === 'object' && 'content' in res.data
            ? (res.data as PageResponse<RoleDto>).content
            : [];
        setRoles(rows);
        onCount(rows.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-skeleton">Loading role matrix...</div>;
  if (roles.length === 0) return <div className="workspace-empty">No roles were returned by the backend.</div>;

  return (
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
            return (
              <article key={role.id || key} className={`admin-role-card ${accent}`}>
                <div className="admin-role-card-head">
                  <span>{accent}</span>
                  <button className="btn btn-sm btn-outline">Review</button>
                </div>
                <h3>{role.displayName || role.name}</h3>
                <code>{key}</code>
                <p>{role.description || (role as unknown as Record<string, unknown>).desc as string || 'No description is configured for this role.'}</p>
                <div className="admin-role-scope">
                  <div><strong>{role.userCount ?? '-'}</strong><span>users</span></div>
                  <div><strong>{role.permissionCount ?? '-'}</strong><span>permissions</span></div>
                  <div><strong>{key.includes('ADMIN') || key.includes('OWNER') ? 'Full' : 'Scoped'}</strong><span>scope</span></div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PageOrData<PermissionDto>>('/permissions')
      .then((res) => {
        const rows = res?.success && Array.isArray(res.data)
          ? res.data
          : res?.success && res.data && typeof res.data === 'object' && 'content' in res.data
            ? (res.data as PageResponse<PermissionDto>).content
            : [];
        setPermissions(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-skeleton">Loading permission matrix...</div>;
  if (permissions.length === 0) return <div className="workspace-empty">No permission matrix is available from the backend.</div>;

  const grouped = permissions.reduce<Record<string, PermissionDto[]>>((acc, permission) => {
    const module = permission.module || 'General';
    acc[module] = [...(acc[module] || []), permission];
    return acc;
  }, {});

  return (
    <div className="admin-permissions-view">
      <div className="permission-board-head">
        <div>
          <span className="workspace-side-eyebrow">Permission matrix</span>
          <h2>Module access by action</h2>
          <p>Scan policy coverage across system roles.</p>
        </div>
        <div className="permission-legend">
          <span><i className="allow" /> Allow</span>
          <span><i /> Deny</span>
        </div>
      </div>

      <div className="permission-module-grid">
        {Object.entries(grouped).map(([module, rows]) => (
          <article key={module} className="permission-module-card">
            <header>
              <strong>{module}</strong>
              <span>{rows.length} action{rows.length === 1 ? '' : 's'}</span>
            </header>
            <div className="permission-action-list">
              {rows.map((permission) => (
                <div key={permission.id || `${permission.module}-${permission.action}`} className="permission-action-row">
                  <div className="permission-action-name">{permission.action || 'Action'}</div>
                  <div className="permission-role-dots">
                    {[
                      ['A', permission.admin],
                      ['D', permission.director],
                      ['M', permission.manager],
                      ['K', permission.keymember],
                      ['S', permission.staff],
                    ].map(([label, yes]) => (
                      <span key={String(label)} className={yes ? 'on' : ''} title={`${label}: ${yes ? 'Allow' : 'Deny'}`}>{label}</span>
                    ))}
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

export const UserManagement: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'users' }) => {
  const { t } = useTranslation('user-management');
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRoles: 0 });

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

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
      meter: 'A/D',
      meterLabel: t('meta.permissions.meterLabel'),
      skin: 'permissions',
      stats: [
        { label: t('meta.permissions.matrixMode'), value: 'Module' },
        { label: t('meta.permissions.roleColumns'), value: '4' },
        { label: t('meta.permissions.policyState'), value: 'Live' },
        { label: t('meta.permissions.reviewCadence'), value: 'Monthly' },
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
        {([
          ['users', t('tabs.users')],
          ['roles', t('tabs.roles')],
          ['permissions', t('tabs.permissions')],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
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
