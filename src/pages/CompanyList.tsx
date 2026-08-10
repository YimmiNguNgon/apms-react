import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import i18n from '../i18n';
import { formatDate as utilFormatDate } from '../utils/format';
import type { PageResult, ProfileResponse } from '../types/domain';
import styles from './CompanyProfiles.module.css';

interface CompanyListProps {
  setActivePage: (page: string) => void;
}

const PAGE_SIZE = 8;

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || i18n.t('company-list:profile.nameFallback');

const profileLegalName = (profile: ProfileResponse) =>
  profile.identity?.legalName || profileName(profile);

const profileIndustry = (profile: ProfileResponse) =>
  profile.business?.industries?.filter(Boolean).join(', ') || i18n.t('company-list:profile.industryFallback');

const profileTicker = (profile: ProfileResponse) => {
  const ticker = profile.stockTicker?.trim();
  return ticker ? ticker.toUpperCase() : null;
};

const profileExchange = (profile: ProfileResponse) => {
  const exchange = profile.stockExchange;
  return exchange && exchange !== 'NONE' ? exchange : null;
};

const formatDate = (value?: string | null) => {
  if (!value) return i18n.t('company-list:table.notUpdated');
  const formatted = utilFormatDate(value);
  return formatted || value;
};

const statusTone = (status?: string) => {
  if (status === 'APPROVED' || status === 'VERIFIED') return styles.success;
  if (status === 'PENDING_REVIEW' || status === 'NEEDS_UPDATE') return styles.warning;
  if (status === 'REJECTED' || status === 'UNVERIFIED') return styles.danger;
  return styles.neutral;
};

const displayReviewStatus = (status?: string | null) => {
  if (status === 'VERIFIED' || status === 'APPROVED') return i18n.t('company-list:status.verified');
  if (status === 'PENDING_REVIEW') return i18n.t('company-list:status.pendingReview');
  if (status === 'NEEDS_UPDATE') return i18n.t('company-list:status.needsUpdate');
  return status || i18n.t('company-list:status.notVerified');
};

const profileUpdatedTime = (profile: ProfileResponse) => {
  const value = profile.metadata?.updatedAt || profile.metadata?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const newestProfilesFirst = (profiles: ProfileResponse[]) =>
  [...profiles].sort((a, b) => profileUpdatedTime(b) - profileUpdatedTime(a));

export const CompanyList: React.FC<CompanyListProps> = ({ setActivePage }) => {
  const { t } = useTranslation('company-list');
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const [ownerProfile, setOwnerProfile] = useState<ProfileResponse | null>(null);

  const fetchProfiles = async (page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const [res, ownerRes] = await Promise.allSettled([
        api.get<PageResult<ProfileResponse>>('/profiles', {
          params: {
            keyword: searchQuery.trim() || undefined,
            reviewStatus: statusFilter || undefined,
            relationshipType: relationshipFilter || undefined,
            excludeOwner: true,
            page,
            size: PAGE_SIZE,
          },
        }),
        api.get<ProfileResponse>('/owner/company-profile'),
      ]);

      if (res.status === 'fulfilled') {
        const content = newestProfilesFirst(res.value.data?.content ?? []);
        setProfiles(content);
        setTotalElements(res.value.data?.totalElements ?? content.length);
        setCurrentPage(page);
      } else {
        setProfiles([]);
        setTotalElements(0);
        setError(res.reason instanceof Error ? res.reason.message : t('errors.loadFailed'));
      }

      if (ownerRes.status === 'fulfilled' && ownerRes.value?.data) {
        setOwnerProfile(ownerRes.value.data);
      }
    } catch (err) {
      setProfiles([]);
      setTotalElements(0);
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfiles(0);
  }, []);

  const metrics = useMemo(() => {
    const verified = profiles.filter((profile) => ['APPROVED', 'VERIFIED'].includes(profile.reviewStatus || '')).length;
    const needsUpdate = profiles.filter((profile) => ['PENDING_REVIEW', 'NEEDS_UPDATE'].includes(profile.reviewStatus || '')).length;
    const withWebsite = profiles.filter((profile) => Boolean(profile.contact?.website)).length;
    const industries = new Set(profiles.flatMap((profile) => profile.business?.industries ?? []));

    return [
      { label: t('stats.profiles.label'), value: totalElements || profiles.length, note: t('stats.profiles.note') },
      { label: t('status.verified'), value: verified, note: t('stats.verified.note') },
      { label: t('status.needsUpdate'), value: needsUpdate, note: t('stats.needsUpdate.note') },
      { label: t('stats.industries.label'), value: industries.size, note: t('stats.industries.note', { count: withWebsite }) },
    ];
  }, [profiles, totalElements, t]);

  const openProfile = (profile: ProfileResponse) => {
    const id = profile.companyId || profile.id;
    if (id) localStorage.setItem('apms-selected-company', id);
    setActivePage('company-detail');
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>{t('title')}</h1>
          <span className={styles.eyebrow}>{t('subtitle')}</span>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {/* ── Owner Enterprise Banner (Doanh nghiệp Chủ quản) ── */}
      {ownerProfile && (
        <section style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(14,165,233,0.06))',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--brand-primary, #2563eb)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏢 Doanh nghiệp Chủ quản (Owner Reference Enterprise)
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {ownerProfile.identity?.tradeName || ownerProfile.identity?.legalName}
              {ownerProfile.identity?.tradeName && ownerProfile.identity?.legalName && ownerProfile.identity.tradeName !== ownerProfile.identity.legalName
                ? ` — ${ownerProfile.identity.legalName}`
                : ''}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span><strong>Mã số thuế:</strong> {ownerProfile.identity?.taxCode || 'Chưa có dữ liệu'}</span>
              <span><strong>Mã CK:</strong> {ownerProfile.identity?.stockTicker || 'Chưa có dữ liệu'}{ownerProfile.identity?.stockExchange ? ` (${ownerProfile.identity.stockExchange})` : ''}</span>
              <span><strong>Ngành:</strong> {ownerProfile.business?.industries?.slice(0, 3).join(', ') || 'Chưa có dữ liệu'}</span>
              <span><strong>Quy mô:</strong> {ownerProfile.companySize?.employeeTier || 'Chưa có dữ liệu'}</span>
            </div>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => {
              if (ownerProfile.companyId || ownerProfile.id) {
                localStorage.setItem('apms-selected-company', ownerProfile.companyId || ownerProfile.id);
              }
              setActivePage('company-detail');
            }}
          >
            Xem chi tiết hồ sơ chủ quản →
          </button>
        </section>
      )}

      {/* ── KPI Row ── */}
      <section className={styles.metricGrid}>
        {metrics.map((item) => (
          <article className={styles.metricCard} key={item.label}>
            <span>{item.label}</span>
            <strong>{loading ? '...' : item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      {/* ── Main Panel ── */}
      <main className={styles.panel}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <input
              value={searchQuery}
              placeholder={t('filters.searchPlaceholder')}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void fetchProfiles(0);
              }}
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t('filters.allStatuses')}</option>
            <option value="APPROVED">{t('status.verified')}</option>
            <option value="NEEDS_UPDATE">{t('status.needsUpdate')}</option>
            <option value="PENDING_REVIEW">{t('status.pendingReview')}</option>
          </select>
          <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)}>
            <option value="">{t('filters.allRelationships')}</option>
            <option value="PARTNER_WITH">{t('filters.partner')}</option>
            <option value="COMPETITOR_OF">{t('filters.competitor')}</option>
            <option value="SUPPLIER_OF">{t('filters.supplier')}</option>
            <option value="CUSTOMER_OF">{t('filters.customer')}</option>
            <option value="POTENTIAL_PARTNER_OF">{t('filters.investorShareholder')}</option>
          </select>
          <button className={styles.primaryButton} type="button" onClick={() => void fetchProfiles(0)}>
            {t('filters.searchButton')}
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('table.company')}</th>
                <th>{t('table.ticker')}</th>
                <th>{t('table.industry')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.updated')}</th>
                <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}><div className={styles.empty}>{t('table.loading')}</div></td>
                </tr>
              )}
              {!loading && profiles.length === 0 && (
                <tr>
                  <td colSpan={6}><div className={styles.empty}>{t('table.empty')}</div></td>
                </tr>
              )}
              {!loading && profiles.map((profile) => (
                <tr key={profile.companyId || profile.id}>
                  <td>
                    <div className={styles.companyCell}>
                      <span>{profileName(profile).slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{profileName(profile)}</strong>
                        <small>{profileLegalName(profile)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {profileTicker(profile) ? (
                      <div className={styles.tickerCell}>
                        <strong>{profileTicker(profile)}</strong>
                        <small>{profileExchange(profile) || '—'}</small>
                      </div>
                    ) : (
                      <span className={styles.tickerEmpty}>—</span>
                    )}
                  </td>
                  <td>{profileIndustry(profile)}</td>
                  <td><span className={`${styles.badge} ${statusTone(profile.reviewStatus)}`}>{displayReviewStatus(profile.reviewStatus)}</span></td>
                  <td>{formatDate(profile.metadata?.updatedAt || profile.metadata?.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.secondaryButton} type="button" onClick={() => openProfile(profile)} title={t('table.viewTitle')}>
                      {t('table.viewButton')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <span>{t('pagination.showing', { shown: profiles.length, total: totalElements })}</span>
          <div>
            <button type="button" disabled={currentPage === 0 || loading} onClick={() => void fetchProfiles(currentPage - 1)}>{t('pagination.prev')}</button>
            <strong>{t('pagination.page', { current: currentPage + 1, total: totalPages })}</strong>
            <button type="button" disabled={currentPage >= totalPages - 1 || loading} onClick={() => void fetchProfiles(currentPage + 1)}>{t('pagination.next')}</button>
          </div>
        </div>
      </main>
    </div>
  );
};
