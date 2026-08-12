const fs = require('fs');

const path = 'd:/SEP/apms-react/src/pages/UserManagement.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file currently has duplicate and corrupted blocks. 
// We want to keep everything up to the end of RolesTab which is around line 931.
// Let's find: `// ============================================================ // PERMISSIONS TAB // ============================================================`
// Wait, in the current file, this marker exists TWICE because I inserted it.
// Let's find the FIRST occurrence of it.
const marker = '// ============================================================\n// PERMISSIONS TAB\n// ============================================================';
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
    console.log("Could not find marker");
    process.exit(1);
}

// Keep the first part of the file
const firstPart = content.substring(0, markerIndex);

const newTabs = `// ============================================================
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
              <th>MÔ TẢ</th>
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
                <td style={{ padding: '16px', fontSize: '13px', color: '#6B7280', verticalAlign: 'middle' }}>
                  {perm.description || '—'}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {roleKeys.filter(rk => (rolePermissions[rk] || []).includes(perm.name)).map((rk) => (
                      <span key={rk} style={{ padding: '4px 8px', borderRadius: '12px', background: '#F3F4F6', color: '#374151', fontSize: '11px', fontWeight: 600 }}>
                        {rk.replace('ROLE_', '')}
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
      await api.put(\`/permissions/roles/\${selectedRole}\`, editPerms);
      setNotice(\`Permissions updated for \${selectedRole.replace('ROLE_', '')}\`);
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
                <span>{role.replace('ROLE_', '')}</span>
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
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>Manage permissions: {selectedRole.replace('ROLE_', '')}</h2>
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
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRoles: 0 });

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const pageMeta = useMemo(() => ({
    users: { skin: 'users' },
    roles: { skin: 'roles' },
    permissions: { skin: 'permissions' },
    assign: { skin: 'assign' }
  }), []);

  const current = pageMeta[tab] || { skin: 'users' };

  return (
    <section className={\`page active admin-console-page admin-user-management-page \${current.skin} role-dashboard role-dashboard-admin\`}>
      <div className="admin-tabs">
        {(['users', 'roles', 'permissions', 'assign'] as Tab[]).map((key) => {
          let label = t(\`tabs.\${key}\`);
          if (key === 'assign') label = 'Cấp Quyền';
          return (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'users' && (
        <div className="workspace-panel admin-console-panel users-panel">
          <UsersTab openCreate={openCreate} onStats={(next) => setStats((prev) => ({ ...prev, ...next }))} />
        </div>
      )}
      {tab === 'roles' && <RolesTab onCount={(count) => setStats((prev) => ({ ...prev, totalRoles: count }))} />}
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'assign' && <AssignPermissionsTab />}
    </section>
  );
};
`;

fs.writeFileSync(path, firstPart + newTabs);
console.log("File fixed successfully!");
