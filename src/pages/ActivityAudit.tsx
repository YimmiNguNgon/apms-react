import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { formatAuditActionLabel, formatAuditLogTimestamp } from '../utils/format';
import type { AuditLogDto, PageResult } from '../types/domain';
import styles from './ActivityAudit.module.css';

type Tab = 'audit';

interface AuditFilterState {
  action: string;
  keyword: string;
  fromDate: string;
  toDate: string;
  page: number;
}

const ALL = 'all';
const PAGE_SIZE = 15;

export const ActivityAudit: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'audit' }) => {
  const { t } = useTranslation('activity-history');
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [action, setAction] = useState(ALL);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [applied, setApplied] = useState<AuditFilterState>({
    action: ALL,
    keyword: '',
    fromDate: '',
    toDate: '',
    page: 0,
  });

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    api.get<string[]>('/audit-logs/actions')
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setActionOptions(res.data);
      })
      .catch(() => setActionOptions([]));
  }, []);

  const fetchAuditLogs = useCallback(async (filters: AuditFilterState) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: filters.page, size: PAGE_SIZE };
      if (filters.action !== ALL) params.action = filters.action;
      if (filters.keyword.trim()) params.keyword = filters.keyword.trim();
      if (filters.fromDate) params.fromDate = `${filters.fromDate}T00:00:00`;
      if (filters.toDate) params.toDate = `${filters.toDate}T23:59:59`;

      const res = await api.get<PageResult<AuditLogDto>>('/audit-logs', { params });
      if (res?.success && res.data) {
        const content = res.data.content || [];
        setAuditLogs(content);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || content.length);
      } else {
        setAuditLogs([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err) {
      setAuditLogs([]);
      setTotalPages(1);
      setTotalElements(0);
      setError((err as Error)?.message || 'Could not fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(applied);
  }, [applied, fetchAuditLogs]);

  const applyFilters = () => {
    setPage(0);
    setApplied({ action, keyword, fromDate, toDate, page: 0 });
  };

  const goToPage = (next: number) => {
    setPage(next);
    setApplied((prev) => ({ ...prev, page: next }));
  };

  const reload = () => {
    fetchAuditLogs(applied);
    api.get<string[]>('/audit-logs/actions')
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setActionOptions(res.data);
      })
      .catch(() => undefined);
  };

  return (
    <div className={styles.container} id="page-activity-history">
      <section className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>{t('header.auditTitle')}</h1>
          <p className={styles.heroDesc}>{t('header.auditDesc')}</p>
        </div>
        <div className={styles.heroMeter}>
          <span className={styles.heroMeterCount}>{totalElements}</span>
          <span className={styles.heroMeterLabel}>{t('header.recordedEventsMeter')}</span>
        </div>
      </section>

      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px', borderRadius: '10px' }}>
          ❌ {error}
        </div>
      )}

      <div>
        {tab === 'audit' && (
          <div className="admin-audit-console">
            <div className="admin-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{t('filters.actionLabel')}</span>
                <select className="admin-select" value={action} onChange={(e) => setAction(e.target.value)} style={{ minWidth: '180px' }}>
                  <option value={ALL}>{t('filters.allActions')}</option>
                  {actionOptions.map((item) => (
                    <option key={item} value={item}>{formatAuditActionLabel(item)}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '220px' }}>
                <span>{t('filters.searchLabel')}</span>
                <input
                  className="admin-input"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  placeholder={t('filters.searchPlaceholder')}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{t('filters.fromDate')}</span>
                <input className="admin-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{t('filters.toDate')}</span>
                <input className="admin-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={applyFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t('filters.applyFilters')}</span>
                </button>
                <button className="btn btn-outline" onClick={reload} title={t('filters.reload')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>⟳</span>
                </button>
              </div>
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
                    {auditLogs.map((log, index) => (
                      <tr key={log.id || index}>
                        <td className="admin-mono" style={{ whiteSpace: 'nowrap' }}>{formatAuditLogTimestamp(log.timestamp)}</td>
                        <td>
                          <strong>{log.actorEmail || t('table.systemActor')}</strong>
                        </td>
                        <td>
                          <strong>{log.actionLabel || formatAuditActionLabel(log.action)}</strong>
                        </td>
                        <td>
                          <span className="badge badge-gray">{log.entityType || 'General'}</span>
                          {log.entityName && (
                            <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-color)' }}>
                              {log.entityName}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                          {log.detail || '-'}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="workspace-empty">{t('table.noLogs')}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {t('table.pagination', { page: page + 1, totalPages, totalElements })}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => goToPage(Math.max(0, page - 1))} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{t('table.prev')}</span>
                      </button>
                      <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => goToPage(page + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{t('table.next')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
