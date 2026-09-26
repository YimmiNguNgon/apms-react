import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, API_BASE_URL } from '../services/api';
import type { AuditLogDto, PageResult } from '../types/domain';
import styles from './ActivityAudit.module.css';

type Tab = 'audit';

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
      { value: 'AUTHENTICATOR_RESET', label: 'AUTHENTICATOR_RESET' },
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

  const pageMeta = {
    audit: {
      eyebrow: t('header.auditEyebrow'),
      title: t('header.auditTitle'),
      desc: t('header.auditDesc'),
      meter: totalElements,
      meterLabel: t('header.recordedEventsMeter'),
      stats: [
        { label: t('stats.totalAuditEvents'), value: totalElements, color: styles.statIconBlue },
        { label: t('stats.currentPage'), value: `${page + 1} / ${totalPages}`, color: styles.statIconGreen },
        { label: t('stats.actionsFiltered'), value: filterAction === 'all' ? t('stats.all') : filterAction, color: styles.statIconPurple },
        { label: t('stats.exportFormat'), value: 'CSV', color: styles.statIconAmber },
      ],
    },
  }[tab];

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page admin-page" id="page-activity-history">
      <div className="workspace-main-full">
        {/* Page Header Band */}
        <div className="workspace-page-head">
          <div>
            <h1>{pageMeta.title}</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {pageMeta.desc}
            </p>
          </div>
          <div className="workspace-head-actions">
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={fetchAuditLogs}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{t('filters.refresh', 'Refresh')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
            ❌ {error}
          </div>
        )}

        {/* Main Content Card Container */}
        <div className="manager-project-container" style={{ marginBottom: '32px' }}>
          {/* Unified Filter Toolbar */}
          <div className="company-profiles-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', padding: '10px 14px' }}>
            {/* Action filter */}
            <select
              className="search-input"
              style={{ width: 'auto', minWidth: '160px' }}
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
            >
              {actionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Entity filter */}
            <select
              className="search-input"
              style={{ width: 'auto', minWidth: '140px' }}
              value={filterEntityType}
              onChange={(e) => { setFilterEntityType(e.target.value); setPage(0); }}
            >
              {entityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Search User/Detail */}
            <input
              className="search-input"
              style={{ flex: '1 1 200px', minWidth: '180px' }}
              placeholder={t('filters.searchPlaceholder', 'Search by user, email, or details...')}
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />

            {/* Date Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                className="search-input"
                style={{ width: 'auto' }}
                type="date"
                title={t('filters.fromDate')}
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>–</span>
              <input
                className="search-input"
                style={{ width: 'auto' }}
                type="date"
                title={t('filters.toDate')}
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              />
            </div>
          </div>

          {/* Scrollable Table Area */}
          <div className="manager-project-table-scroll">
            <div className="manager-project-table-inner" style={{ minWidth: '820px' }}>
              {loading ? (
                <div className="project-table-empty">
                  <p className="project-table-empty-title">Loading audit logs...</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px', textAlign: 'center' }}>#</th>
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
                        : '—';

                      return (
                        <tr key={log.id || index}>
                          <td style={{ textAlign: 'center', width: '48px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {page * pageSize + index + 1}
                          </td>
                          <td className="admin-mono" style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {timeStr}
                          </td>
                          <td>
                            <strong>{log.actorEmail || `${t('table.actor')} #${log.actorAccountId || t('table.systemActor')}`}</strong>
                            {log.actorAccountId && <small style={{ display: 'block', color: 'var(--text-muted)' }}>ID: #{log.actorAccountId}</small>}
                          </td>
                          <td>
                            <span
                              className={`project-status-badge ${pill.className === 'success' ? 'success' : pill.className === 'warning' ? 'neutral' : pill.className === 'danger' ? 'danger' : 'info'}`}
                              style={{ marginRight: '6px' }}
                            >
                              {pill.label}
                            </span>
                            <strong>{log.action}</strong>
                          </td>
                          <td>
                            <span className="badge badge-gray">{log.entityType || 'General'}</span>
                            {log.entityId && <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>#{log.entityId}</span>}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {log.detail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="workspace-empty">{t('table.noLogs', 'No audit logs found.')}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Unified Table Pagination */}
          <div className="project-table-pagination">
            <span>Showing {totalElements === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements} audit events</span>
            <div>
              <button className="workspace-page-btn" disabled={page === 0 || loading} onClick={() => setPage(0)}>First</button>
              <button className="workspace-page-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                const pNum = totalPages <= 5 ? idx : Math.max(0, Math.min(page - 2, totalPages - 5)) + idx;
                return (
                  <button key={pNum} className={`workspace-page-btn ${page === pNum ? 'active' : ''}`} disabled={loading} onClick={() => setPage(pNum)}>
                    {pNum + 1}
                  </button>
                );
              })}
              <button className="workspace-page-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
              <button className="workspace-page-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}>Last</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
