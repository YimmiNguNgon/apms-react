import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, api } from '../../services/api';
import type { AuditLogDto, PageResult } from '../../types/domain';
import {
  Activity,
  Download,
  FileText,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Users,
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

type AuditFilter = 'ALL' | 'SECURITY' | 'AUTHENTICATION' | 'USERS_ROLES' | 'SYSTEM_CONFIGURATION';

interface ServiceHealth {
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'NOT_CONFIGURED' | string;
  latencyMs: number | null;
  lastChecked: string | null;
  errorReason?: string;
}

interface UserRow {
  id?: number;
  role?: string;
  roleName?: string;
  roles?: string[];
  enabled?: boolean;
  active?: boolean;
  isActive?: boolean;
  status?: string;
}

const ROLE_OVERVIEW = [
  { label: 'System Admin', keys: ['ROLE_SYSTEM_ADMIN', 'ROLE_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'] },
  { label: 'Business Owner', keys: ['ROLE_BUSINESS_OWNER', 'ROLE_OWNER', 'BUSINESS_OWNER', 'OWNER'] },
  { label: 'BD Manager', keys: ['ROLE_BUSINESS_DEVELOPMENT_MANAGER', 'ROLE_MANAGER', 'BUSINESS_DEVELOPMENT_MANAGER', 'MANAGER'] },
  { label: 'Research Staff', keys: ['ROLE_RESEARCH_STAFF', 'ROLE_STAFF', 'RESEARCH_STAFF', 'STAFF'] },
];



const containsAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

const isSecurityLog = (log: AuditLogDto) =>
  containsAny(`${log.action} ${log.entityType} ${log.detail || ''}`.toUpperCase(), ['SECURITY', 'DENIED', 'LOCK', 'OTP', 'JWT']);

const isAuthenticationLog = (log: AuditLogDto) =>
  containsAny(`${log.action} ${log.entityType} ${log.detail || ''}`.toUpperCase(), ['LOGIN', 'LOGOUT', 'AUTH', 'PASSWORD', 'OTP']);

const isUserRoleLog = (log: AuditLogDto) =>
  containsAny(`${log.action} ${log.entityType} ${log.detail || ''}`.toUpperCase(), ['USER', 'ACCOUNT', 'ROLE', 'PERMISSION']);

const isSystemConfigLog = (log: AuditLogDto) =>
  containsAny(`${log.action} ${log.entityType} ${log.detail || ''}`.toUpperCase(), ['SYSTEM', 'CONFIG', 'SETTING']);

const isAdminActivity = (log: AuditLogDto) =>
  isSecurityLog(log) || isAuthenticationLog(log) || isUserRoleLog(log) || isSystemConfigLog(log);

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Not available';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString('vi-VN');
};

const statusLabel = (action: string) => {
  const value = action.toUpperCase();
  return containsAny(value, ['FAILED', 'DENIED', 'REJECTED', 'LOCKED', 'ERROR']) ? 'Attention' : 'Recorded';
};

export const AdminDashboard: React.FC<{ setActivePage: (page: string) => void }> = ({ setActivePage }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [auditAvailable, setAuditAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AuditFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthServices, setHealthServices] = useState<ServiceHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const [auditResult, usersResult] = await Promise.allSettled([
      api.get<PageResult<AuditLogDto>>('/audit-logs', { params: { page: 0, size: 50 } }),
      api.get<PageResult<UserRow>>('/users'),
    ]);

    if (auditResult.status === 'fulfilled' && auditResult.value.success) {
      const payload = auditResult.value.data;
      setAuditLogs(Array.isArray(payload) ? payload : payload?.content || []);
      setAuditAvailable(true);
    } else {
      setAuditLogs([]);
      setAuditAvailable(false);
    }

    if (usersResult.status === 'fulfilled' && usersResult.value.success) {
      const payload = usersResult.value.data;
      setUsers(Array.isArray(payload) ? payload : payload?.content || []);
    } else {
      setUsers(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await api.get<{ services: ServiceHealth[] }>('/admin/system-health');
      if (res?.success && res.data?.services) {
        setHealthServices(res.data.services);
      }
    } catch {
      setHealthServices([]);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadHealth();
  }, [loadDashboard, loadHealth]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
    loadHealth();
  };

  const filteredAuditLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesFilter = filter === 'ALL'
        || (filter === 'SECURITY' && isSecurityLog(log))
        || (filter === 'AUTHENTICATION' && isAuthenticationLog(log))
        || (filter === 'USERS_ROLES' && isUserRoleLog(log))
        || (filter === 'SYSTEM_CONFIGURATION' && isSystemConfigLog(log));
      const searchable = `${log.actorEmail || ''} ${log.action || ''} ${log.entityType || ''} ${log.detail || ''}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [auditLogs, filter, searchQuery]);

  const totalUsers = users?.length;
  const activeUsers = users?.filter((user) => user.enabled ?? user.active ?? user.isActive ?? user.status === 'active').length;
  const failedLogins = auditAvailable
    ? auditLogs.filter((log) => containsAny(`${log.action} ${log.detail || ''}`.toUpperCase(), ['LOGIN_FAILED', 'FAILED_LOGIN', 'LOGIN FAILURE'])).length
    : null;
  const permissionChanges = auditAvailable
    ? auditLogs.filter((log) => containsAny(`${log.action} ${log.detail || ''}`.toUpperCase(), ['PERMISSION', 'ROLE'])).length
    : null;

  const roleCounts = useMemo(() => ROLE_OVERVIEW.map((role) => {
    if (!users) return { ...role, count: null };
    const count = users.filter((user) => {
      const assignedRoles = [user.role, user.roleName, ...(user.roles || [])].filter(Boolean).map((item) => String(item).toUpperCase());
      return assignedRoles.some((assigned) => role.keys.includes(assigned));
    }).length;
    return { ...role, count };
  }), [users]);

  const recentAdminActivities = useMemo(() => auditLogs.filter(isAdminActivity).slice(0, 10), [auditLogs]);

  const exportAudit = async () => {
    const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${API_BASE_URL}/audit-logs/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // The dashboard does not present a successful export when the backend export is unavailable.
    }
  };

  const pendingAccounts = users?.filter((u) => !(u.enabled ?? u.active ?? u.isActive ?? u.status === 'active')).length;
  const securityAlerts = auditAvailable
    ? auditLogs.filter((log) => containsAny(`${log.action} ${log.detail || ''}`.toUpperCase(), ['FAILED', 'DENIED', 'LOCKED', 'BLOCKED', 'REJECTED'])).length
    : null;

  const kpis = [
    { label: 'Total users', value: totalUsers, detail: totalUsers === undefined ? 'Not available' : 'Non-deleted accounts', icon: Users, tone: 'blue' },
    { label: 'Active users', value: activeUsers, detail: activeUsers === undefined ? 'Not available' : 'Enabled accounts', icon: Activity, tone: 'green' },
    { label: 'Pending / Inactive', value: pendingAccounts, detail: pendingAccounts === undefined ? 'Not available' : 'Disabled or pending accounts', icon: UserCog, tone: 'amber' },
    { label: 'Security alerts', value: securityAlerts, detail: securityAlerts === null ? 'Not available' : 'Failed/denied events in recent logs', icon: ShieldAlert, tone: 'red' },
  ];

  return (
    <main className={styles.adminDashboard} id="admin-dashboard">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1>System Administrator Workspace</h1>
          <p className={styles.subtitle}>Monitor platform health, security, users and system activity.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? styles.spin : undefined} /> Refresh
          </button>
          <button className={styles.secondaryButton} onClick={exportAudit}>
            <Download size={16} /> Export Audit
          </button>
          <button className={styles.primaryButton} onClick={() => setActivePage('users')}>
            <Plus size={16} /> Create Account
          </button>
        </div>
      </header>

      <section className={styles.kpiGrid} aria-label="User and security metrics">
        {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles[`tone${tone}`]}`}><Icon size={20} /></div>
            <p>{label}</p>
            <strong>{loading ? 'Loading…' : value ?? 'Not available'}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="system-health-heading">
        <div className={styles.sectionHeading}>
          <div><h2 id="system-health-heading">System Health</h2><p>Real-time database and service connectivity checks.</p></div>
          <span className={styles.availabilityNote}>{healthLoading ? 'Checking…' : healthServices.length > 0 ? `${healthServices.filter(s => s.status === 'UP').length}/${healthServices.length} UP` : 'Not available'}</span>
        </div>
        <div className={styles.healthGrid}>
          {healthLoading && [1,2,3,4].map((i) => (
            <article key={i} className={styles.healthCard}>
              <Server size={18} />
              <div><strong>Checking…</strong><span>Status: Loading</span></div>
            </article>
          ))}
          {!healthLoading && healthServices.length === 0 && (
            <article className={styles.healthCard}>
              <Server size={18} />
              <div><strong>Health check unavailable</strong><span>Backend health endpoint did not respond</span></div>
            </article>
          )}
          {!healthLoading && healthServices.map((svc) => {
            const isUp = svc.status === 'UP';
            const isDown = svc.status === 'DOWN';
            const statusColor = isUp ? '#10B981' : isDown ? '#EF4444' : '#F59E0B';
            const statusLabel = isUp ? '● UP' : isDown ? '● DOWN' : `● ${svc.status}`;
            return (
              <article key={svc.name} className={styles.healthCard} style={{ borderLeft: `3px solid ${statusColor}` }}>
                <Server size={18} style={{ color: statusColor }} />
                <div>
                  <strong>{svc.name}</strong>
                  <span style={{ color: statusColor, fontWeight: 600 }}>Status: {statusLabel}</span>
                  {svc.errorReason && <span style={{ fontSize: '11px', color: '#EF4444' }}>{svc.errorReason}</span>}
                </div>
                <div className={styles.healthMeta}>
                  <span>Latency: {svc.latencyMs !== null && svc.latencyMs !== undefined ? `${svc.latencyMs}ms` : 'N/A'}</span>
                  <span>Checked: {svc.lastChecked ? new Date(svc.lastChecked).toLocaleTimeString('vi-VN') : 'N/A'}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.auditSection} aria-labelledby="security-audit-heading">
        <div className={styles.sectionHeading}>
          <div><h2 id="security-audit-heading">Security &amp; Audit</h2><p>Review security, authentication, access and configuration events.</p></div>
          <button className={styles.textButton} onClick={() => setActivePage('audit-logs')}>View audit log</button>
        </div>
        <div className={styles.auditLayout}>
          <aside className={styles.securitySummary}>
            <div><ShieldAlert size={18} /><span>Security alerts</span><strong>{securityAlerts ?? 'Not available'}</strong></div>
            <div><KeyRound size={18} /><span>Failed login attempts</span><strong>{failedLogins ?? 'Not available'}</strong></div>
            <div><UserCog size={18} /><span>Permission changes</span><strong>{permissionChanges ?? 'Not available'}</strong></div>
          </aside>
          <div className={styles.auditLog}>
            <div className={styles.auditToolbar}>
              <div className={styles.filterTabs} role="tablist" aria-label="Audit filters">
                {([
                  ['ALL', 'All'], ['SECURITY', 'Security'], ['AUTHENTICATION', 'Authentication'], ['USERS_ROLES', 'Users & Roles'], ['SYSTEM_CONFIGURATION', 'System Configuration'],
                ] as [AuditFilter, string][]).map(([key, label]) => (
                  <button key={key} className={filter === key ? styles.activeFilter : ''} onClick={() => setFilter(key)}>{label}</button>
                ))}
              </div>
              <label className={styles.searchBox}><Search size={16} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search audit log" /></label>
            </div>
            {loading ? <div className={styles.emptyState}>Loading audit records…</div> : filteredAuditLogs.length === 0 ? <div className={styles.emptyState}>No audit records available.</div> : (
              <div className={styles.auditList}>
                {filteredAuditLogs.slice(0, 8).map((log) => <AuditRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="role-overview-heading">
        <div className={styles.sectionHeading}><div><h2 id="role-overview-heading">User &amp; Role Overview</h2><p>Account distribution by role.</p></div></div>
        <div className={styles.roleGrid}>
          {roleCounts.map((role) => (
            <button key={role.label} className={styles.roleCard} onClick={() => setActivePage('roles')}>
              <span>{role.label}</span><strong>{role.count ?? 'Not available'}</strong><span className={styles.manageLink}>Manage roles</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="recent-activity-heading">
        <div className={styles.sectionHeading}><div><h2 id="recent-activity-heading">Recent Admin Activity</h2><p>Latest recorded administrative and security events.</p></div></div>
        {loading ? <div className={styles.emptyState}>Loading recent activity…</div> : recentAdminActivities.length === 0 ? <div className={styles.emptyState}>No audit records available.</div> : (
          <div className={styles.tableWrap}><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Status</th></tr></thead><tbody>
            {recentAdminActivities.map((log) => <tr key={log.id}><td>{formatTimestamp(log.timestamp)}</td><td>{log.actorEmail || 'System'}</td><td>{log.action || 'Not available'}</td><td>{log.entityType || log.entityId || 'Not available'}</td><td><span className={styles.status}>{statusLabel(log.action || '')}</span></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="quick-actions-heading">
        <div className={styles.sectionHeading}><div><h2 id="quick-actions-heading">Quick Actions</h2><p>Open administrative tools.</p></div></div>
        <div className={styles.quickActions}>
          {[
            ['Create User', Plus, 'users'], ['Manage Users', Users, 'users'], ['Manage Roles', UserCog, 'roles'], ['Manage Permissions', ShieldCheck, 'permissions'], ['View Audit Log', FileText, 'audit-logs'], ['System Settings', Settings, 'system-settings'],
          ].map(([label, Icon, page]) => {
            const ActionIcon = Icon as typeof Plus;
            return <button key={label as string} onClick={() => setActivePage(page as string)}><ActionIcon size={18} /><span>{label as string}</span></button>;
          })}
        </div>
      </section>
    </main>
  );
};

const AuditRow: React.FC<{ log: AuditLogDto }> = ({ log }) => (
  <article className={styles.auditRow}>
    <div><strong>{log.action || 'Not available'}</strong><span>{log.detail || log.entityType || 'No detail available'}</span></div>
    <div><span>{log.actorEmail || 'System'}</span><time>{formatTimestamp(log.timestamp)}</time></div>
  </article>
);
