import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import i18n from '../i18n';
import { formatDate as utilFormatDate } from '../utils/format';
import type { PageResult, ProfileResponse, GraphCompanyDto } from '../types/domain';
import styles from './CompanyProfiles.module.css';

const relationshipLabel = (rel?: string | null) => {
  if (!rel) return 'Chưa thiết lập';
  const r = rel.toUpperCase();
  if (r === 'PARTNER_WITH' || r === 'PARTNER') return 'Đối tác';
  if (r === 'COMPETITOR_OF' || r === 'COMPETITOR') return 'Đối thủ';
  if (r === 'SUPPLIER_OF' || r === 'SUPPLIER') return 'Nhà cung cấp';
  if (r === 'CUSTOMER_OF' || r === 'CUSTOMER') return 'Khách hàng';
  if (r === 'POTENTIAL_PARTNER_OF' || r === 'POTENTIAL_PARTNER') return 'Đối tác tiềm năng';
  return r;
};

const relationshipStyle = (rel?: string | null): React.CSSProperties => {
  if (!rel) return { background: '#f1f5f9', color: '#64748b' };
  const r = rel.toUpperCase();
  if (r === 'PARTNER_WITH' || r === 'PARTNER') return { background: '#e0f2fe', color: '#0369a1' };
  if (r === 'COMPETITOR_OF' || r === 'COMPETITOR') return { background: '#fee2e2', color: '#b91c1c' };
  if (r === 'SUPPLIER_OF' || r === 'SUPPLIER') return { background: '#fef3c7', color: '#d97706' };
  if (r === 'CUSTOMER_OF' || r === 'CUSTOMER') return { background: '#dcfce7', color: '#15803d' };
  if (r === 'POTENTIAL_PARTNER_OF' || r === 'POTENTIAL_PARTNER') return { background: '#faf5ff', color: '#7e22ce' };
  return { background: '#f1f5f9', color: '#64748b' };
};

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

const profileRelationshipBadge = (profile: ProfileResponse) => {
  const rel = (profile as unknown as Record<string, unknown>).relationshipType ||
              (profile as unknown as Record<string, unknown>).relationship ||
              (profile as unknown as Record<string, unknown>).suggestedRelationshipType;

  const relStr = String(rel || 'PARTNER_WITH');

  switch (relStr) {
    case 'PARTNER_WITH':
    case 'PARTNER':
      return {
        label: 'Partner',
        style: { color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #DBEAFE' },
      };
    case 'COMPETITOR_OF':
    case 'COMPETITOR':
      return {
        label: 'COMPETITOR',
        style: { color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' },
      };
    case 'SUPPLIER_OF':
    case 'SUPPLIER':
      return {
        label: 'SUPPLIER',
        style: { color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0' },
      };
    case 'CUSTOMER_OF':
    case 'CUSTOMER':
      return {
        label: 'CUSTOMER',
        style: { color: '#6B21A8', background: '#F3E8FF', border: '1px solid #E9D5FF' },
      };
    case 'POTENTIAL_PARTNER_OF':
    case 'INVESTOR':
      return {
        label: 'POTENTIAL PARTNER',
        style: { color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' },
      };
    default:
      return {
        label: relStr,
        style: { color: '#334155', background: '#F1F5F9', border: '1px solid #E2E8F0' },
      };
  }
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
  const [relationsMap, setRelationsMap] = useState<Record<string, string>>({});

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
    api.get<GraphCompanyDto[]>('/graph/network').then((res) => {
      if (res.data) {
        const map: Record<string, string> = {};
        res.data.forEach((c) => {
          if (c.companyId && c.relationshipType) {
            map[c.companyId] = c.relationshipType;
          }
          if (c.relationships && Array.isArray(c.relationships)) {
            c.relationships.forEach((r: any) => {
              if (r.targetCompanyId && r.relationshipType) {
                map[r.targetCompanyId] = r.relationshipType;
              }
            });
          }
        });
        setRelationsMap(map);
      }
    }).catch(err => console.error('Failed to load graph network', err));
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
                <th>{t('table.relationship')}</th>
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
                    {(() => {
                      const badge = profileRelationshipBadge(profile);
                      return (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          ...badge.style,
                        }}>
                          {badge.label}
                        </span>
                      );
                    })()}
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
