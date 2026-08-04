import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, API_BASE_URL } from '../services/api';
import type { AuditLogDto, PageResult } from '../types/domain';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import styles from './ActivityAudit.module.css';

type Tab = 'activity' | 'audit';

const getActionTypePill = (actionStr: string) => {
  const action = (actionStr || '').toUpperCase();
  if (action.includes('CREATE') || action.includes('APPROVE')) return { className: 'success', label: 'CREATE' };
  if (action.includes('STATUS') || action.includes('ROLE') || action.includes('UPDATE')) return { className: 'warning', label: 'UPDATE' };
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('LOCK')) return { className: 'danger', label: 'RISK' };
  return { className: 'info', label: 'INFO' };
};

export const ActivityAudit: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'audit' }) => {
  const { t } = useTranslation('activity-history');
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

  const actionOptions = useMemo(
    () => [
      { value: 'all', label: t('filters.allActions') },
      { value: 'USER_CREATED', label: 'USER_CREATED' },
      { value: 'USER_UPDATED', label: 'USER_UPDATED' },
      { value: 'USER_STATUS_CHANGED', label: 'USER_STATUS_CHANGED' },
      { value: 'USER_ROLES_UPDATED', label: 'USER_ROLES_UPDATED' },
      { value: 'LOGIN', label: 'LOGIN' },
      { value: 'LOGOUT', label: 'LOGOUT' },
      { value: 'COMPANY_PROFILE_UPDATED', label: 'COMPANY_PROFILE_UPDATED' },
    ],
    [t]
  );

  const entityOptions = useMemo(
    () => [
      { value: 'all', label: t('filters.allEntities') },
      { value: 'Account', label: 'Account' },
      { value: 'UserProfile', label: 'UserProfile' },
      { value: 'Project', label: 'Project' },
      { value: 'System', label: 'System' },
    ],
    [t]
  );

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
        // Fallback to /admin/audit-logs
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
      const user = log.actorEmail || `User #${log.actorAccountId || t('table.systemActor')}`;
      const existing = map.get(user);
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '00:00';
      map.set(user, {
        user,
        count: (existing?.count || 0) + 1,
        lastSeen: existing?.lastSeen || timeStr,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [auditLogs, t]);

  const pageMeta = {
    activity: {
      eyebrow: t('header.activityEyebrow'),
      title: t('header.activityTitle'),
      desc: t('header.activityDesc'),
      meter: userActivityPulse.length,
      meterLabel: t('header.activeUsersMeter'),
      stats: [
        { label: t('stats.activeUsers'), value: userActivityPulse.length, icon: Users, color: styles.statIconBlue },
        { label: t('stats.mostActiveCount'), value: userActivityPulse[0]?.count || 0, icon: Zap, color: styles.statIconAmber },
        { label: t('stats.totalLogItems'), value: totalElements, icon: FileText, color: styles.statIconPurple },
        { label: t('stats.streamState'), value: t('stats.live'), icon: Activity, color: styles.statIconGreen },
      ],
    },
    audit: {
      eyebrow: t('header.auditEyebrow'),
      title: t('header.auditTitle'),
      desc: t('header.auditDesc'),
      meter: totalElements,
      meterLabel: t('header.recordedEventsMeter'),
      stats: [
        { label: t('stats.totalAuditEvents'), value: totalElements, icon: FileText, color: styles.statIconBlue },
        { label: t('stats.currentPage'), value: `${page + 1} / ${totalPages}`, icon: Calendar, color: styles.statIconGreen },
        { label: t('stats.actionsFiltered'), value: filterAction === 'all' ? t('stats.all') : filterAction, icon: ShieldCheck, color: styles.statIconPurple },
        { label: t('stats.exportFormat'), value: 'CSV', icon: Download, color: styles.statIconAmber },
      ],
    },
  }[tab];

  const topUser = userActivityPulse[0];
  const topUserInitials = (topUser?.user || 'U').slice(0, 2).toUpperCase();

  return (
    <div className={styles.container} id="page-activity-history">
      {/* Normalized Header */}
      <section className={styles.hero}>
        <div>
          <span className={styles.heroEyebrow}>{pageMeta.eyebrow}</span>
          <h1 className={styles.heroTitle}>{pageMeta.title}</h1>
          <p className={styles.heroDesc}>{pageMeta.desc}</p>
        </div>
        <div className={styles.heroMeter}>
          <span className={styles.heroMeterCount}>{pageMeta.meter}</span>
          <span className={styles.heroMeterLabel}>{pageMeta.meterLabel}</span>
        </div>
      </section>

      {/* Standardized Stat Grid */}
      <section className={styles.statGrid}>
        {pageMeta.stats.map((item) => {
          const IconComp = item.icon;
          return (
            <article key={item.label} className={styles.statCard}>
              <div className={`${styles.statIcon} ${item.color}`}>
                <IconComp size={20} />
              </div>
              <div className={styles.statMeta}>
                <span className={styles.statLabel}>{item.label}</span>
                <strong className={styles.statValue}>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      {/* Navigation Tabs */}
      <div className={styles.tabsBar}>
        <button
          className={`${styles.tabButton} ${tab === 'audit' ? styles.tabButtonActive : ''}`}
          onClick={() => setTab('audit')}
        >
          <FileText size={16} />
          <span>{t('tabs.auditLogs')}</span>
        </button>
        <button
          className={`${styles.tabButton} ${tab === 'activity' ? styles.tabButtonActive : ''}`}
          onClick={() => setTab('activity')}
        >
          <Activity size={16} />
          <span>{t('tabs.userActivity')}</span>
        </button>
      </div>

      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px', borderRadius: '10px' }}>
          ❌ {error}
        </div>
      )}

      {/* Main Content Area */}
      <div>
        {tab === 'audit' && (
          <div className="admin-audit-console">
            <div className="admin-toolbar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              {/* Action filter */}
              <select className="admin-select" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}>
                {actionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              {/* Entity filter */}
              <select className="admin-select" value={filterEntityType} onChange={(e) => { setFilterEntityType(e.target.value); setPage(0); }}>
                {entityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              {/* Search User/Detail */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                <input
                  className="admin-input"
                  style={{ width: '220px', paddingLeft: '30px' }}
                  placeholder={t('filters.searchPlaceholder')}
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>

              {/* Date Filters */}
              <input
                className="admin-input"
                type="date"
                title={t('filters.fromDate')}
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              />
              <input
                className="admin-input"
                type="date"
                title={t('filters.toDate')}
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              />

              <button className="btn btn-outline" onClick={fetchAuditLogs} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} />
                <span>{t('filters.refresh')}</span>
              </button>
              <button className="btn btn-primary" disabled={exporting} onClick={handleExportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} />
                <span>{exporting ? t('filters.exporting') : t('filters.exportCsv')}</span>
              </button>
            </div>

            {loading ? (
              <div className="admin-skeleton">Loading audit logs...</div>
            ) : (
              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('table.timestamp')}</th>
                      <th>{t('table.actor')}</th>
                      <th>{t('table.action')}</th>
                      <th>{t('table.entity')}</th>
                      <th>{t('table.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const pill = getActionTypePill(log.action);
                      const timeStr = log.timestamp
                        ? new Date(log.timestamp).toLocaleString('vi-VN')
                        : '-';

                      return (
                        <tr key={log.id || index}>
                          <td className="admin-mono" style={{ whiteSpace: 'nowrap' }}>
                            {timeStr}
                          </td>
                          <td>
                            <strong>{log.actorEmail || `${t('table.actor')} #${log.actorAccountId || t('table.systemActor')}`}</strong>
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
                      <tr>
                        <td colSpan={5}>
                          <div className="workspace-empty">{t('table.noLogs')}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {t('table.pagination', { page: page + 1, totalPages, totalElements })}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ChevronLeft size={14} />
                        <span>{t('table.prev')}</span>
                      </button>
                      <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{t('table.next')}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className={styles.activityLayout}>
            {/* ACTIVITY FOCUS Card with Email Overflow Fix */}
            <aside className={styles.focusCard}>
              <span className={styles.focusEyebrow}>{t('focus.eyebrow')}</span>

              <div className={styles.focusUserWrap}>
                <div className={styles.focusAvatar}>{topUserInitials}</div>
                <h3 className={styles.focusUserEmail} title={topUser?.user || ''}>
                  {topUser?.user || t('focus.noActivity')}
                </h3>
              </div>

              <p className={styles.focusDesc}>
                {topUser
                  ? t('focus.recordedCount', { count: topUser.count })
                  : t('focus.noActivityDesc')}
              </p>
            </aside>

            {/* Timeline List with Contribution Percentage */}
            <div className={styles.timelineList}>
              {userActivityPulse.map((item, index) => {
                const percent = totalElements > 0 ? Math.min(100, Math.round((item.count / totalElements) * 100)) : Math.min(100, item.count * 15);
                const eventsText = t(`timeline.events_${item.count === 1 ? 'one' : 'other'}`, { count: item.count });

                return (
                  <article key={item.user} className={styles.timelineItem}>
                    <div className={styles.timelineRank}>{String(index + 1).padStart(2, '0')}</div>
                    <div className={styles.timelineAvatar}>{item.user.slice(0, 2).toUpperCase()}</div>

                    <div className={styles.timelineInfo}>
                      <span className={styles.timelineUser} title={item.user}>
                        {item.user}
                      </span>
                      <div className={styles.timelineStats}>
                        <span>{eventsText}</span>
                        <span>·</span>
                        <span>{t('timeline.shareOfTotal', { percent })}</span>
                      </div>
                      <div className={styles.timelineBarTrack}>
                        <div className={styles.timelineBarFill} style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <span className={styles.timelineTime}>
                      {t('timeline.lastSeen', { time: item.lastSeen })}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
