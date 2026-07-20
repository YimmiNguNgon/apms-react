import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

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

const ROLE_OPTIONS = [
  { value: 'ROLE_SYSTEM_ADMIN', label: 'System Administrator' },
  { value: 'ROLE_BUSINESS_DIRECTOR', label: 'Business Director' },
  { value: 'ROLE_BUSINESS_DEVELOPMENT_MANAGER', label: 'BD Manager' },
  { value: 'ROLE_KEY_MEMBER', label: 'Key Member' },
  { value: 'ROLE_RESEARCH_STAFF', label: 'Research Staff' },
];

const Check: React.FC<{ yes: boolean }> = ({ yes }) => (
  <span className={`admin-check ${yes ? 'on' : ''}`}>{yes ? 'Allow' : 'Deny'}</span>
);

const roleAccent = (role: string) => {
  const value = role.toUpperCase();
  if (value.includes('ADMIN') || value.includes('OWNER')) return 'slate';
  if (value.includes('DIRECTOR')) return 'green';
  if (value.includes('MANAGER')) return 'amber';
  if (value.includes('KEY')) return 'violet';
  return 'blue';
};

const UsersTab: React.FC<{ onStats: (stats: { totalUsers: number; activeUsers: number }) => void }> = ({ onStats }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'ROLE_RESEARCH_STAFF',
  });

  const fetchUsers = () => {
    setLoading(true);
    api.get<any>('/accounts?page=0&size=100')
      .then((res) => {
        const rows = res?.success && res.data?.content
          ? res.data.content
          : res?.success && Array.isArray(res.data)
            ? res.data
            : [];
        setUsers(rows);
        onStats({
          totalUsers: rows.length,
          activeUsers: rows.filter((u: any) => (u.status || (u.active ? 'active' : 'inactive')) === 'active').length,
        });
      })
      .catch((err) => setError(err?.message || 'Could not load accounts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    api.get<any>('/roles')
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

    try {
      await api.post('/accounts', newUser);
      setShowModal(false);
      setNewUser({ name: '', email: '', username: '', password: '', role: 'ROLE_RESEARCH_STAFF' });
      setNotice('Account created. Refreshing user directory.');
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || 'Could not create account.');
    }
  };

  const filtered = users.filter((u) => {
    const name = String(u.name || u.fullName || u.email || '').toLowerCase();
    const username = String(u.username || u.email || '').toLowerCase();
    const status = u.status || (u.active ? 'active' : 'inactive');
    return (name.includes(search.toLowerCase()) || username.includes(search.toLowerCase())) &&
      (filter === 'all' || status === filter);
  });

  return (
    <div className="admin-users-view">
      <div className="admin-users-header">
        <div>
          <span className="workspace-side-eyebrow">Account directory</span>
          <h2>People with platform access</h2>
          <p>Operational list for creating, locking, and reviewing user accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create account</button>
      </div>

      <div className="admin-users-layout">
        <aside className="admin-directory-rail">
          <label>
            <span>Search directory</span>
            <input
              className="admin-input"
              placeholder="Name, username, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span>Status filter</span>
            <select className="admin-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Disabled</option>
            </select>
          </label>
          <button className="btn btn-outline" onClick={fetchUsers}>Refresh directory</button>
          <div className="admin-directory-summary">
            <strong>{filtered.length}</strong>
            <span>visible accounts</span>
          </div>
        </aside>

        <div className="admin-directory-main">
          {notice && <div className="workspace-inline-note">{notice}</div>}
          {error && <div className="workspace-inline-error">{error}</div>}
          {loading ? (
            <div className="admin-skeleton">Loading account directory...</div>
          ) : (
            <div className="admin-table-card user-directory-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    {['ID', 'User', 'Email', 'Role', 'Status', 'Actions'].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const status = user.status || (user.active ? 'active' : 'inactive');
                    const role = user.role || user.roleName || user.roles?.[0] || 'Unassigned';
                    return (
                      <tr key={user.id || user.email}>
                        <td className="admin-mono">#{user.id ?? '-'}</td>
                        <td>
                          <strong>{user.name || user.fullName || user.username || 'Unnamed user'}</strong>
                          <small>{user.username || 'No username'}</small>
                        </td>
                        <td>{user.email || '-'}</td>
                        <td><span className={`badge ${ROLE_BADGE[role] || 'badge-blue'}`}>{role}</span></td>
                        <td><span className={`admin-status ${status === 'active' ? 'active' : ''}`}>{status === 'active' ? 'Active' : 'Disabled'}</span></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="btn btn-sm btn-outline">Edit</button>
                            <button className="btn btn-sm btn-outline">{status === 'active' ? 'Lock' : 'Unlock'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6}><div className="workspace-empty">No accounts match the current filter.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="workspace-section-head">
              <div>
                <h3>Create account</h3>
                <p>Provision a user with one system role.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              {[
                { label: 'Full name', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Username', key: 'username', type: 'text' },
                { label: 'Password', key: 'password', type: 'password' },
              ].map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    className="admin-input"
                    type={field.type}
                    value={(newUser as any)[field.key]}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  />
                </label>
              ))}
              <label className="admin-form-span">
                <span>Role</span>
                <select className="admin-select" value={newUser.role} onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}>
                  {(roles.length > 0 ? roles.map((role) => ({ value: role.key || role.name, label: role.displayName || role.name || role.key })) : ROLE_OPTIONS)
                    .map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RolesTab: React.FC<{ onCount: (count: number) => void }> = ({ onCount }) => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/roles')
      .then((res) => {
        const rows = res?.success && Array.isArray(res.data)
          ? res.data
          : res?.success && res.data?.content
            ? res.data.content
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
                <p>{role.description || role.desc || 'No description is configured for this role.'}</p>
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
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/permissions')
      .then((res) => {
        const rows = res?.success && Array.isArray(res.data)
          ? res.data
          : res?.success && res.data?.content
            ? res.data.content
            : [];
        setPermissions(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-skeleton">Loading permission matrix...</div>;
  if (permissions.length === 0) return <div className="workspace-empty">No permission matrix is available from the backend.</div>;

  const grouped = permissions.reduce<Record<string, any[]>>((acc, permission) => {
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
          <p>Unlike the user directory, this view is grouped by module so administrators can scan policy coverage.</p>
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
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRoles: 0 });

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const pageMeta = useMemo(() => ({
    users: {
      eyebrow: 'Account operations',
      title: 'Users',
      desc: 'Create, search, lock, and review people who can sign in to APMS.',
      meter: stats.totalUsers || '-',
      meterLabel: 'accounts',
      skin: 'users',
      stats: [
        { label: 'Total accounts', value: stats.totalUsers || '-' },
        { label: 'Active accounts', value: stats.activeUsers || '-' },
        { label: 'Disabled accounts', value: Math.max(0, stats.totalUsers - stats.activeUsers) || '-' },
        { label: 'Provisioning', value: 'Open' },
      ],
    },
    roles: {
      eyebrow: 'RBAC architecture',
      title: 'Roles',
      desc: 'Inspect the five operating lanes that define APMS workspace responsibility.',
      meter: stats.totalRoles || '5',
      meterLabel: 'role lanes',
      skin: 'roles',
      stats: [
        { label: 'Role lanes', value: stats.totalRoles || '5' },
        { label: 'Admin role', value: 'Full' },
        { label: 'Business roles', value: '3' },
        { label: 'Research role', value: '1' },
      ],
    },
    permissions: {
      eyebrow: 'Policy matrix',
      title: 'Permissions',
      desc: 'Scan module-level access rules by action and role without reading account rows.',
      meter: 'A/D',
      meterLabel: 'allow / deny',
      skin: 'permissions',
      stats: [
        { label: 'Matrix mode', value: 'Module' },
        { label: 'Role columns', value: '5' },
        { label: 'Policy state', value: 'Live' },
        { label: 'Review cadence', value: 'Monthly' },
      ],
    },
  }), [stats]);

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
          ['users', 'Accounts'],
          ['roles', 'Roles'],
          ['permissions', 'Permissions'],
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
