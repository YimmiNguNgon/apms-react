import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { formatAuditActionLabel, formatAuditLogTimestamp } from '../utils/format';
import type { AuditLogDto, PageResult } from '../types/domain';
import styles from './ActivityAudit.module.css';

type Tab = 'audit';

type AuditCategory = 'authentication' | 'user-management' | 'company-management' | 'role-permission' | 'security' | 'system';

interface AuditFilterState {
  action: string;
  category: string;
  keyword: string;
  fromDate: string;
  toDate: string;
  page: number;
}

const ALL = 'all';
const PAGE_SIZE = 15;

const actionCategory = (action: string): AuditCategory => {
  const value = (action || '').toUpperCase();
  if (
    value === 'LOGIN' || value === 'LOGOUT' || value === 'REFRESH_TOKEN' ||
    value.startsWith('TOTP_') || value.startsWith('CONFIDENTIAL_NEWS_OTP_') ||
    value === 'COMPANY_DOCUMENT_ACCESS_VERIFIED' || value === 'CONFIDENTIAL_NEWS_ACCESS_REQUESTED'
  ) return 'authentication';
  if (value.startsWith('USER_') || value === 'ACTIVATE_USER' || value === 'DEACTIVATE_USER') return 'user-management';
  if (value === 'USER_ROLES_UPDATED') return 'role-permission';
  if (
    value.startsWith('IP_WHITELIST_') || value.startsWith('COMPANY_DOCUMENT_ACCESS_') ||
    value === 'SYSTEM_SETTINGS_UPDATED' || value === 'CONFIDENTIAL_NEWS_ACCESS_DENIED' ||
    value === 'INTERNAL_NEWS_ACCESS_DENIED' || value === 'INTERNAL_NEWS_PUBLICATION_FAILED'
  ) return 'security';
  if (
    value.startsWith('COMPANY_') || value.startsWith('DOCUMENT_') || value.startsWith('EXTRACTION_') ||
    value.startsWith('RELATIONSHIP_CLOSENESS_') || value.startsWith('COMPANY_MEMBER_') ||
    value.startsWith('COMPANY_NEWS_') || value.startsWith('CONFIDENTIAL_NEWS_') ||
    value.startsWith('INTERNAL_NEWS_') || value.startsWith('PARTNER_CONTRACT_') ||
    value.startsWith('PARTNER_EVALUATION_') || value.startsWith('PROFILE_UPDATE_PROPOSAL_') ||
    value.startsWith('FIELD_') || value === 'DRAFT_RESUBMITTED'
  ) return 'company-management';
  return 'system';
};

const resolveActionValues = (filters: AuditFilterState, knownActions: string[]): string[] => {
  if (filters.action !== ALL) return [filters.action];
  if (filters.category !== ALL) return knownActions.filter((item) => actionCategory(item) === filters.category);
  return [];
};

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
  const [category, setCategory] = useState(ALL);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [applied, setApplied] = useState<AuditFilterState>({
    action: ALL,
    category: ALL,
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
      const actionValues = resolveActionValues(filters, actionOptions);
      if (actionValues.length > 0) params.actions = actionValues.join(',');
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
  }, [actionOptions]);

  useEffect(() => {
    fetchAuditLogs(applied);
  }, [applied, fetchAuditLogs]);

  const applyFilters = () => {
    setPage(0);
    setApplied({ action, category, keyword, fromDate, toDate, page: 0 });
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

  const categoryOptions = useMemo(
    () => [
      { value: ALL, label: t('filters.allCategories') },
      { value: 'authentication', label: t('filters.categoryAuthentication') },
      { value: 'user-management', label: t('filters.categoryUserManagement') },
      { value: 'company-management', label: t('filters.categoryCompanyManagement') },
      { value: 'role-permission', label: t('filters.categoryRolePermission') },
      { value: 'security', label: t('filters.categorySecurity') },
      { value: 'system', label: t('filters.categorySystem') },
    ],
    [t],
  );

  return (
    <div className={styles.container} id="page-activity-history">
      <section className={styles.hero}>
        <div>
          <span className={styles.heroEyebrow}>{t('header.auditEyebrow')}</span>
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

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{t('filters.categoryLabel')}</span>
                <select className="admin-select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: '170px' }}>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
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
                        <td className="admin-mono" style={{ whiteSpace: 'nowrap' }}>{formatAuditLogTimestamp(log.createdAt)}</td>
                        <td>
                          <strong>{log.actorEmail || `${t('table.actor')} #${log.actorUserId || t('table.systemActor')}`}</strong>
                          {log.actorUserId && <small style={{ display: 'block', color: 'var(--text-muted)' }}>ID: #{log.actorUserId}</small>}
                        </td>
                        <td>
                          <strong>{formatAuditActionLabel(log.action)}</strong>
                          {log.action && <small style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.action}</small>}
                        </td>
                        <td>
                          <span className="badge badge-gray">{log.entityType || 'General'}</span>
                          {log.entityId && <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>#{log.entityId}</span>}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                          {log.details || '-'}
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
