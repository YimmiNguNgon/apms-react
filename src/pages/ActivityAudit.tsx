import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Tab = 'activity' | 'audit';

const FALLBACK_AUDIT_LOGS = [
  { id: 1, time: '08:25', date: '16/06/2026', user: 'admin', action: 'Signed in to APMS', module: 'Auth', type: 'info' },
  { id: 2, time: '08:10', date: '16/06/2026', user: 'manager', action: 'Approved CMC Technology profile', module: 'Approvals', type: 'success' },
  { id: 3, time: '07:55', date: '16/06/2026', user: 'keymember', action: 'Validated Viettel Digital AI extraction', module: 'Validation', type: 'success' },
  { id: 4, time: '07:30', date: '16/06/2026', user: 'staff', action: 'Uploaded FPT Software evidence', module: 'Documents', type: 'info' },
  { id: 5, time: '23:10', date: '15/06/2026', user: 'manager', action: 'Rejected candidate profile', module: 'Approvals', type: 'danger' },
  { id: 6, time: '22:50', date: '15/06/2026', user: 'admin', action: 'Created key member account', module: 'Users', type: 'warning' },
];

const TYPE_STYLE: Record<string, { className: string; label: string }> = {
  info: { className: 'info', label: 'Info' },
  success: { className: 'success', label: 'Success' },
  danger: { className: 'danger', label: 'Risk' },
  warning: { className: 'warning', label: 'Warning' },
};

export const ActivityAudit: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'activity' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [filterModule, setFilterModule] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [auditLogs, setAuditLogs] = useState(FALLBACK_AUDIT_LOGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    api.get<any>('/audit-logs?page=0&size=50')
      .then((res) => {
        const items = res?.success && res.data?.content
          ? res.data.content
          : res?.success && Array.isArray(res.data)
            ? res.data
            : null;

        if (Array.isArray(items) && items.length > 0) {
          setAuditLogs(items.map((log: any, index: number) => {
            const action = String(log.action || '').toUpperCase();
            const type = action.includes('APPROVE') || action.includes('CREATE') || action.includes('UPDATE')
              ? 'success'
              : action.includes('REJECT') || action.includes('DELETE')
                ? 'danger'
                : action.includes('LOGIN') || action.includes('LOGOUT')
                  ? 'info'
                  : 'warning';

            return {
              id: log.id ?? index,
              time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '00:00',
              date: log.timestamp ? new Date(log.timestamp).toLocaleDateString('vi-VN') : '01/01/2026',
              user: log.actorEmail || `user-${log.actorAccountId ?? 'system'}`,
              action: action.replace(/_/g, ' ').toLowerCase(),
              module: log.entityType || 'Audit',
              type,
            };
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(() => ['all', ...Array.from(new Set(auditLogs.map((log) => log.module)))], [auditLogs]);
  const activity = useMemo(() => {
    const map = new Map<string, { user: string; count: number; lastSeen: string }>();
    auditLogs.forEach((log) => {
      const existing = map.get(log.user);
      map.set(log.user, {
        user: log.user,
        count: (existing?.count || 0) + 1,
        lastSeen: existing?.lastSeen || log.time,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [auditLogs]);

  const filtered = auditLogs.filter((log) =>
    (filterModule === 'all' || log.module === filterModule) &&
    (filterType === 'all' || log.type === filterType)
  );

  const pageMeta = {
    activity: {
      eyebrow: 'User pulse',
      title: 'Activity history',
      desc: 'Monitor who is active, where attention is building, and which accounts are driving workspace operations.',
      meter: activity.length,
      meterLabel: 'active users',
      stats: [
        { label: 'Active users', value: activity.length },
        { label: 'Most active count', value: activity[0]?.count || 0 },
        { label: 'Modules touched', value: modules.length - 1 },
        { label: 'Recent window', value: 'Live' },
      ],
    },
    audit: {
      eyebrow: 'Immutable trail',
      title: 'Audit logs',
      desc: 'Inspect timestamped system events, security warnings, and risky operations with module filters.',
      meter: loading ? '...' : filtered.length,
      meterLabel: 'log rows',
      stats: [
        { label: 'Audit events', value: auditLogs.length },
        { label: 'Warnings', value: auditLogs.filter((log) => log.type === 'warning').length },
        { label: 'Risk events', value: auditLogs.filter((log) => log.type === 'danger').length },
        { label: 'Filtered rows', value: filtered.length },
      ],
    },
  }[tab];

  return (
    <section className={`page active admin-console-page admin-security-page ${tab} role-dashboard role-dashboard-admin`}>
      <div className={`workspace-page-head admin-console-hero admin-security-hero ${tab}`}>
        <div>
          <span className="workspace-side-eyebrow">{pageMeta.eyebrow}</span>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.desc}</p>
        </div>
        <div className="admin-hero-meter">
          <strong>{pageMeta.meter}</strong>
          <span>{pageMeta.meterLabel}</span>
        </div>
      </div>

      <div className={`workspace-stats workspace-stats-compact admin-security-stats ${tab}`}>
        {pageMeta.stats.map((item) => (
          <article key={item.label} className="workspace-stat-card">
            <span className="workspace-stat-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-tabs">
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>User activity</button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit logs</button>
      </div>

      <div className={`admin-security-content ${tab}`}>
        {tab === 'activity' && (
          <div className="admin-activity-pulse">
            <aside className="admin-activity-focus">
              <span className="workspace-side-eyebrow">Activity focus</span>
              <strong>{activity[0]?.user || 'No user'}</strong>
              <p>{activity[0] ? `${activity[0].count} events captured in the current window.` : 'No activity has been captured yet.'}</p>
            </aside>
            <div className="admin-activity-timeline">
              {activity.map((item, index) => (
                <article key={item.user} className="admin-activity-card">
                  <div className="admin-activity-rank">{String(index + 1).padStart(2, '0')}</div>
                  <div className="admin-avatar">{item.user.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{item.user}</strong>
                    <p>{item.count} tracked event{item.count === 1 ? '' : 's'} today</p>
                    <div className="admin-progress"><div style={{ width: `${Math.min(100, item.count * 24)}%` }} /></div>
                  </div>
                  <span>{item.lastSeen}</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="admin-audit-console">
            <div className="admin-toolbar">
              <select className="admin-select" value={filterModule} onChange={(event) => setFilterModule(event.target.value)}>
                {modules.map((module) => <option key={module} value={module}>{module === 'all' ? 'All modules' : module}</option>)}
              </select>
              <select className="admin-select" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="all">All event types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Risk</option>
              </select>
              <button className="btn btn-outline">Export CSV</button>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    {['Time', 'User', 'Module', 'Action', 'Type'].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const type = TYPE_STYLE[log.type] || TYPE_STYLE.info;
                    return (
                      <tr key={log.id}>
                        <td className="admin-mono">{log.date}<br /><strong>{log.time}</strong></td>
                        <td><span className="badge badge-blue">{log.user}</span></td>
                        <td>{log.module}</td>
                        <td><strong>{log.action}</strong></td>
                        <td><span className={`admin-event-pill ${type.className}`}>{type.label}</span></td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5}><div className="workspace-empty">No audit events match the current filters.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
