import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, api } from '../../services/api';
import type { AuditLogDto, PageResult } from '../../types/domain';

import {
  PageHeader,
  MetricCard,
  PrimaryButton,
  SecondaryButton,
} from '../../components/ui';
import styles from './AdminDashboard.module.css';

// ─── Section header helper ──────────────────────────────────────────────────
const SectionTitle: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon && <span style={{ fontSize: '13px', display: 'flex' }}>{icon}</span>}
        {title}
      </h2>
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Divider ────────────────────────────────────────────────────────────────
const Divider: React.FC = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--cds-border-subtle-00)', margin: '8px 0' }} />
);

// ─── Card wrapper ────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({ children, style, onClick }) => (
  <section className="admin-dashboard-card" onClick={onClick} style={{
    background: 'var(--cds-background)',
    border: '1px solid var(--cds-border-color)',
    borderRadius: 'var(--cds-border-radius)',
    padding: '16px',
    ...style,
  }}>
    {children}
  </section>
);

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
  { label: 'Research Staff', keys: ['ROLE_RESEARCH_STAFF', 'ROLE_STAFF', 'RESEARCH_STAFF', 'STAFF', 'ROLE_BUSINESS_DEVELOPMENT_STAFF', 'BUSINESS_DEVELOPMENT_STAFF'] },
];

const containsAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

const isSecurityLog = (log: AuditLogDto) =>
  containsAny(`${log.action} ${log.entityType} ${log.detail || ''}`.toUpperCase(), ['SECURITY', 'DENIED', 'LOCK', 'OTP', 'JWT', 'WHITELIST']);

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
  const { t } = useTranslation('admin-dashboard');
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [auditAvailable, setAuditAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AuditFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthServices, setHealthServices] = useState<ServiceHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'audit' | 'activity' | 'system' | 'quick'>('audit');

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

  const roleCounts = useMemo(() => ROLE_OVERVIEW.map((role) => {
    if (!users) return { ...role, count: null };
    const count = users.filter((user) => {
      const assignedRoles = [user.role, user.roleName, ...(user.roles || [])].filter(Boolean).map((item) => String(item).toUpperCase());
      return assignedRoles.some((assigned) => role.keys.includes(assigned));
    }).length;
    return { ...role, count };
  }), [users]);

  const recentAdminActivities = useMemo(() => auditLogs.filter(isAdminActivity).slice(0, 10), [auditLogs]);



  const pendingAccounts = users?.filter((u) => !(u.enabled ?? u.active ?? u.isActive ?? u.status === 'active')).length;
  const securityAlerts = auditAvailable
    ? auditLogs.filter((log) => containsAny(`${log.action} ${log.detail || ''}`.toUpperCase(), ['FAILED', 'DENIED', 'LOCKED', 'BLOCKED', 'REJECTED'])).length
    : null;

  const kpis = [
    { label: t('stats.totalUsers', 'Total users'), value: totalUsers, detail: totalUsers === undefined ? t('bento.notAvailable', 'Not available') : t('stats.nonDeleted', 'Non-deleted accounts') },
    { label: t('stats.activeUsers', 'Active users'), value: activeUsers, detail: activeUsers === undefined ? t('bento.notAvailable', 'Not available') : t('stats.enabledAccounts', 'Enabled accounts') },
    { label: t('stats.pendingInactive', 'Pending / Inactive'), value: pendingAccounts, detail: pendingAccounts === undefined ? t('bento.notAvailable', 'Not available') : t('stats.disabledPending', 'Disabled or pending accounts') },
    { label: t('stats.securityAlerts', 'Security alerts'), value: securityAlerts, detail: securityAlerts === null ? t('bento.notAvailable', 'Not available') : t('stats.failedDenied', 'Failed/denied events in recent logs') },
  ];

  return (
    <main className="cds-page-shell admin-console-page" id="admin-dashboard">


      {/* 4 KPI Cards bound to Admin Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {kpis.map(({ label, value, detail }) => (
          <MetricCard
            key={label}
            label={label}
            value={loading ? 'Loading…' : (value !== undefined && value !== null ? String(value) : t('bento.notAvailable', 'Not available'))}
            description={detail}
          />
        ))}
      </div>

      <div className="admin-tabs" style={{ marginBottom: '16px' }}>
        <button className={dashboardTab === 'audit' ? 'active' : ''} onClick={() => setDashboardTab('audit')}>{t('tabs.audit')}</button>
        <button className={dashboardTab === 'activity' ? 'active' : ''} onClick={() => setDashboardTab('activity')}>{t('tabs.activity')}</button>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '32px' }}>
        {dashboardTab === 'audit' && (
          <Card>
            <SectionTitle title={t('audit.title', 'Security & Audit')} subtitle={t('audit.subtitle', 'Review security, authentication, access and configuration events.')} action={
              <SecondaryButton size="sm" onClick={() => setActivePage('audit-logs')}>{t('audit.viewAuditLog', 'View logs')}</SecondaryButton>
            } />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {([
                  ['ALL', t('audit.all', 'All')], 
                  ['SECURITY', t('audit.security', 'Security')], 
                  ['AUTHENTICATION', t('audit.authentication', 'Auth')], 
                  ['USERS_ROLES', t('audit.usersRoles', 'Users')], 
                ] as [AuditFilter, string][]).map(([key, label]) => (
                  <button key={key} style={{ background: filter === key ? 'var(--cds-layer-selected)' : 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', fontWeight: filter === key ? 600 : 500, color: filter === key ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }} onClick={() => setFilter(key)}>{label}</button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cds-field)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--cds-border-interactive)' }}>
                <input style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('audit.searchPlaceholder', 'Search audit log')} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '500px', overflowY: 'auto' }}>
              {loading ? <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('audit.loadingRecords', 'Loading audit records…')}</div> : !auditAvailable ? <div style={{ fontSize: '12px', color: 'var(--cds-support-error)' }}>{t('audit.loadError', 'Could not load audit logs from the server.')}</div> : filteredAuditLogs.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('audit.noRecords', 'No audit records available.')}</div> : (
                filteredAuditLogs.slice(0, 15).map((log, i) => (
                  <div key={log.id || i}>
                    {i > 0 && <Divider />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '2px', wordBreak: 'break-word' }}>{log.action || t('bento.notAvailable', 'Not available')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', wordBreak: 'break-word' }}>{log.detail || log.entityType || 'No detail available'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--cds-text-primary)' }}>{log.actorEmail || 'System'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{formatTimestamp(log.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {dashboardTab === 'activity' && (
          <Card>
            <SectionTitle title={t('activity.title', 'Recent Admin Activity')} subtitle={t('activity.subtitle', 'Latest recorded administrative events.')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {loading ? <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('activity.loading', 'Loading recent activity…')}</div> : !auditAvailable ? <div style={{ fontSize: '12px', color: 'var(--cds-support-error)' }}>{t('activity.loadError', 'Could not load recent activity from the server.')}</div> : recentAdminActivities.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{t('audit.noRecords', 'No audit records available.')}</div> : (
                recentAdminActivities.map((log, i) => (
                  <div key={log.id || i}>
                    {i > 0 && <Divider />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {log.action || t('bento.notAvailable', 'Not available')}
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '12px', fontWeight: 600, background: statusLabel(log.action || '') === 'Attention' ? 'var(--cds-support-error-bg)' : 'var(--cds-layer-01)', color: statusLabel(log.action || '') === 'Attention' ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)' }}>
                            {statusLabel(log.action || '')}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>
                          Target: {log.entityType || log.entityId || 'N/A'} · By: {log.actorEmail || 'System'}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)', textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}


      </div>
    </main>
  );
};
