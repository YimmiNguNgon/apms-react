import React, { useEffect, useMemo, useState } from 'react';
import { api, API_BASE_URL } from '../services/api';
import type { AuditLogDto, PageResult } from '../types/domain';

type Tab = 'activity' | 'audit';

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'USER_CREATED', label: 'USER_CREATED (Tạo tài khoản)' },
  { value: 'USER_UPDATED', label: 'USER_UPDATED (Sửa tài khoản)' },
  { value: 'USER_STATUS_CHANGED', label: 'USER_STATUS_CHANGED (Khóa/Mở tài khoản)' },
  { value: 'USER_ROLES_UPDATED', label: 'USER_ROLES_UPDATED (Gán Role)' },
  { value: 'LOGIN', label: 'LOGIN (Đăng nhập)' },
  { value: 'LOGOUT', label: 'LOGOUT (Đăng xuất)' },
  { value: 'COMPANY_PROFILE_UPDATED', label: 'COMPANY_PROFILE_UPDATED' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'Account', label: 'Account (Tài khoản)' },
  { value: 'UserProfile', label: 'UserProfile (Hồ sơ)' },
  { value: 'Project', label: 'Project (Dự án)' },
  { value: 'System', label: 'System (Hệ thống)' },
];

const getActionTypePill = (actionStr: string) => {
  const action = (actionStr || '').toUpperCase();
  if (action.includes('CREATE') || action.includes('APPROVE')) return { className: 'success', label: 'CREATE' };
  if (action.includes('STATUS') || action.includes('ROLE') || action.includes('UPDATE')) return { className: 'warning', label: 'UPDATE' };
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('LOCK')) return { className: 'danger', label: 'RISK' };
  return { className: 'info', label: 'INFO' };
};

export const ActivityAudit: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'audit' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntityType, setFilterEntityType] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const fetchAuditLogs = () => {
    setLoading(true);
    setError('');

    const params: Record<string, string | number> = {
      page,
      size: pageSize,
    };
    if (filterAction && filterAction !== 'all') params.action = filterAction;
    if (filterEntityType && filterEntityType !== 'all') params.entityType = filterEntityType;
    if (fromDate) params.fromDate = new Date(fromDate).toISOString();
    if (toDate) params.toDate = new Date(toDate).toISOString();

    api.get<PageResult<AuditLogDto>>('/audit-logs', { params })
      .then((res) => {
        if (res?.success && res.data) {
          const content = res.data.content || (Array.isArray(res.data) ? res.data : []);
          setAuditLogs(content);
          setTotalPages(res.data.totalPages || 1);
          setTotalElements(res.data.totalElements || content.length);
        } else {
          setAuditLogs([]);
        }
      })
      .catch((err) => {
        // Fallback to /admin/audit-logs if endpoint not filtered
          api.get<PageResult<AuditLogDto>>(`/admin/audit-logs?page=${page}&size=${pageSize}`)
          .then((fallbackRes) => {
            if (fallbackRes?.success && fallbackRes.data) {
              const content = fallbackRes.data.content || [];
              setAuditLogs(content);
              setTotalPages(fallbackRes.data.totalPages || 1);
              setTotalElements(fallbackRes.data.totalElements || content.length);
            }
          })
          .catch(() => setError(err?.message || 'Could not fetch audit logs.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, filterAction, filterEntityType, fromDate, toDate]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('apms-token');
      const queryParams = new URLSearchParams();
      if (filterAction && filterAction !== 'all') queryParams.set('action', filterAction);
      if (filterEntityType && filterEntityType !== 'all') queryParams.set('entityType', filterEntityType);
      if (fromDate) queryParams.set('fromDate', new Date(fromDate).toISOString());
      if (toDate) queryParams.set('toDate', new Date(toDate).toISOString());

      const url = `${API_BASE_URL}/audit-logs/export?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to export audit log CSV');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'CSV export failed.');
    } finally {
      setExporting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchUser.trim()) return auditLogs;
    const query = searchUser.toLowerCase();
    return auditLogs.filter((log) => {
      const email = String(log.actorEmail || '').toLowerCase();
      const userId = String(log.actorAccountId || '').toLowerCase();
      const details = String(log.detail || '').toLowerCase();
      return email.includes(query) || userId.includes(query) || details.includes(query);
    });
  }, [auditLogs, searchUser]);

  const userActivityPulse = useMemo(() => {
    const map = new Map<string, { user: string; count: number; lastSeen: string }>();
    auditLogs.forEach((log) => {
      const user = log.actorEmail || `User #${log.actorAccountId || 'System'}`;
      const existing = map.get(user);
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '00:00';
      map.set(user, {
        user,
        count: (existing?.count || 0) + 1,
        lastSeen: existing?.lastSeen || timeStr,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [auditLogs]);

  const pageMeta = {
    activity: {
      eyebrow: 'User pulse',
      title: 'Activity history',
      desc: 'Monitor user participation, security events, and active workspace operators.',
      meter: userActivityPulse.length,
      meterLabel: 'active users',
      stats: [
        { label: 'Active users', value: userActivityPulse.length },
        { label: 'Most active count', value: userActivityPulse[0]?.count || 0 },
        { label: 'Total log items', value: totalElements },
        { label: 'Stream state', value: 'Live' },
      ],
    },
    audit: {
      eyebrow: 'Immutable trail',
      title: 'Audit Logs',
      desc: 'Inspect timestamped security events, role modifications, and system operations with real-time filters.',
      meter: totalElements,
      meterLabel: 'recorded events',
      stats: [
        { label: 'Total audit events', value: totalElements },
        { label: 'Current page', value: `${page + 1} of ${totalPages}` },
        { label: 'Actions filtered', value: filterAction === 'all' ? 'All' : filterAction },
        { label: 'Export format', value: 'CSV' },
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
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit logs</button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>User activity</button>
      </div>

      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', margin: '16px 0' }}>
          ❌ {error}
        </div>
      )}

      <div className={`admin-security-content ${tab}`}>
        {tab === 'audit' && (
          <div className="admin-audit-console">
            <div className="admin-toolbar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              {/* Action filter */}
              <select className="admin-select" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}>
                {ACTION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              {/* Entity filter */}
              <select className="admin-select" value={filterEntityType} onChange={(e) => { setFilterEntityType(e.target.value); setPage(0); }}>
                {ENTITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              {/* Search User/Detail */}
              <input
                className="admin-input"
                style={{ width: '200px' }}
                placeholder="Search user / details"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />

              {/* Date Filters */}
              <input
                className="admin-input"
                type="date"
                title="From Date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              />
              <input
                className="admin-input"
                type="date"
                title="To Date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              />

              <button className="btn btn-outline" onClick={fetchAuditLogs}>Refresh</button>
              <button className="btn btn-primary" disabled={exporting} onClick={handleExportCsv}>
                {exporting ? 'Exporting...' : '📥 Export CSV'}
              </button>
            </div>

            {loading ? (
              <div className="admin-skeleton">Loading audit logs...</div>
            ) : (
              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {['Timestamp', 'User (Actor)', 'Action', 'Entity', 'Details'].map((header) => <th key={header}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const pill = getActionTypePill(log.action);
                      const timeStr = log.timestamp 
                        ? new Date(log.timestamp).toLocaleString('vi-VN')
                        : log.timestamp 
                          ? new Date(log.timestamp).toLocaleString('vi-VN') 
                          : '-';

                      return (
                        <tr key={log.id || index}>
                          <td className="admin-mono" style={{ whiteSpace: 'nowrap' }}>
                            {timeStr}
                          </td>
                          <td>
                            <strong>{log.actorEmail || `User #${log.actorAccountId || 'System'}`}</strong>
                            {log.actorAccountId && <small style={{ display: 'block', color: 'var(--text-muted)' }}>ID: #{log.actorAccountId}</small>}
                          </td>
                          <td>
                            <span className={`admin-event-pill ${pill.className}`} style={{ marginRight: '6px' }}>{pill.label}</span>
                            <strong>{log.action}</strong>
                          </td>
                          <td>
                            <span className="badge badge-gray">{log.entityType || 'General'}</span>
                            {log.entityId && <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>#{log.entityId}</span>}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                            {log.detail || '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr><td colSpan={5}><div className="workspace-empty">No audit logs match the current filters.</div></td></tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Page {page + 1} of {totalPages} ({totalElements} total entries)
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
        )}

        {tab === 'activity' && (
          <div className="admin-activity-pulse">
            <aside className="admin-activity-focus">
              <span className="workspace-side-eyebrow">Activity focus</span>
              <strong>{userActivityPulse[0]?.user || 'No user activity'}</strong>
              <p>{userActivityPulse[0] ? `${userActivityPulse[0].count} audit actions recorded in this window.` : 'No activity recorded.'}</p>
            </aside>
            <div className="admin-activity-timeline">
              {userActivityPulse.map((item, index) => (
                <article key={item.user} className="admin-activity-card">
                  <div className="admin-activity-rank">{String(index + 1).padStart(2, '0')}</div>
                  <div className="admin-avatar">{item.user.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{item.user}</strong>
                    <p>{item.count} recorded audit event{item.count === 1 ? '' : 's'}</p>
                    <div className="admin-progress"><div style={{ width: `${Math.min(100, item.count * 15)}%` }} /></div>
                  </div>
                  <span>{item.lastSeen}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
