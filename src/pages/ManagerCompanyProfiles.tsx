import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUser, ROLES, type Role } from '../context/UserContext';
import i18n from '../i18n';
import { formatDate as utilFormatDate } from '../utils/format';
import type { PageResult, ProfileResponse, GraphCompanyDto, DashboardSummaryDto } from '../types/domain';
import styles from './CompanyProfiles.module.css';

const relationshipLabel = (rel?: string | null) => {
  if (!rel) return 'ChÆ°a thiáº¿t láº­p';
  const r = rel.toUpperCase();
  if (r === 'PARTNER_WITH' || r === 'PARTNER') return 'Äá»‘i tÃ¡c';
  if (r === 'COMPETITOR_OF' || r === 'COMPETITOR') return 'Äá»‘i thá»§';
  if (r === 'SUPPLIER_OF' || r === 'SUPPLIER') return 'NhÃ  cung cáº¥p';
  if (r === 'CUSTOMER_OF' || r === 'CUSTOMER') return 'KhÃ¡ch hÃ ng';
  if (r === 'POTENTIAL_PARTNER_OF' || r === 'POTENTIAL_PARTNER') return 'Äá»‘i tÃ¡c tiá»m nÄƒng';
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

const profileIndustries = (profile: ProfileResponse) =>
  profile.business?.industries?.filter(Boolean) || [];

const profileRelationshipBadge = (profile: ProfileResponse) => {
  const rel = (profile as unknown as Record<string, unknown>).relationshipType ||
              (profile as unknown as Record<string, unknown>).relationship ||
              (profile as unknown as Record<string, unknown>).suggestedRelationshipType;

  if (!rel) {
    return { label: 'None', style: { color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0' } };
  }

  const relStr = String(rel);

  switch (relStr) {
    case 'PARTNER_WITH':
    case 'PARTNER':
      return { label: 'Partner', style: { color: '#0369A1', background: '#E0F2FE', border: '1px solid #BAE6FD' } };
    case 'COMPETITOR_OF':
    case 'COMPETITOR':
      return { label: 'Competitor', style: { color: '#B91C1C', background: '#FEE2E2', border: '1px solid #FECACA' } };
    case 'SUPPLIER_OF':
    case 'SUPPLIER':
      return { label: 'Supplier', style: { color: '#D97706', background: '#FEF3C7', border: '1px solid #FDE68A' } };
    case 'CUSTOMER_OF':
    case 'CUSTOMER':
      return { label: 'Customer', style: { color: '#15803D', background: '#DCFCE7', border: '1px solid #BBF7D0' } };
    case 'POTENTIAL_PARTNER_OF':
    case 'INVESTOR':
      return { label: 'Potential Partner', style: { color: '#7E22CE', background: '#FAF5FF', border: '1px solid #E9D5FF' } };
    default:
      const defaultLabel = relStr.charAt(0).toUpperCase() + relStr.slice(1).toLowerCase().replace(/_/g, ' ');
      return { label: defaultLabel, style: { color: '#475569', background: '#F8FAFC', border: '1px solid #CBD5E1' } };
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

export const ManagerCompanyProfiles: React.FC<CompanyListProps> = ({ setActivePage }) => {
  const { t } = useTranslation('company-list');
  const { currentUser } = useUser();
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [industriesList, setIndustriesList] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const [ownerProfile, setOwnerProfile] = useState<ProfileResponse | null>(null);
  const [relationsMap, setRelationsMap] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);

  const fetchProfiles = async (page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const [res, ownerRes] = await Promise.allSettled([
        api.get<PageResult<ProfileResponse>>('/profiles', {
          params: {
            keyword: searchQuery.trim() || undefined,
            industry: industryFilter || undefined,
            relationshipType: relationshipFilter || undefined,
            excludeOwner: true,
            createdByMe: true,
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
    const timer = setTimeout(() => void fetchProfiles(0), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, relationshipFilter, industryFilter]);

  useEffect(() => {
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

    api.get<DashboardSummaryDto>('/dashboard/summary', { params: { createdByMe: true } }).then((res) => {
      if (res.data) setSummary(res.data);
    }).catch(err => console.error('Failed to load dashboard summary', err));

    api.get<string[]>('/profiles/industries').then((res) => {
      if (res.data) {
        setIndustriesList(res.data.filter(Boolean).sort());
      }
    }).catch(err => console.error('Failed to load industries', err));
  }, []);

  const metrics = useMemo(() => {
    return [
      { label: t('stats.profiles.label'), value: summary?.totalCompanyProfiles || 0, note: t('stats.profiles.note') },
      { label: 'Relationships', value: (summary?.partnerCount || 0) + (summary?.competitorCount || 0) + (summary?.supplierCount || 0) + (summary?.potentialPartnerCount || 0), note: 'Total network relationships' },
      { label: t('stats.industries.label'), value: summary?.totalIndustries || 0, note: 'Distribution across sectors' },
    ];
  }, [summary, t]);

  const openProfile = (profile: ProfileResponse) => {
    const id = profile.companyId || profile.id;
    if (id) localStorage.setItem('apms-selected-company', id);
    localStorage.setItem('apms-back-page', 'my-companies');
    setActivePage('company-detail');
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>My company profile</h1>
          <span className={styles.eyebrow}>List of companies you created and manage</span>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

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

      {/* â”€â”€ Main Panel â”€â”€ */}
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
          <select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}>
            <option value="">All industries</option>
            {industriesList.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)}>
            <option value="">{t('filters.allRelationships')}</option>
            <option value="PARTNER_WITH">{t('filters.partner')}</option>
            <option value="COMPETITOR_OF">{t('filters.competitor')}</option>
            <option value="SUPPLIER_OF">{t('filters.supplier')}</option>
            <option value="CUSTOMER_OF">{t('filters.customer')}</option>
            <option value="POTENTIAL_PARTNER_OF">{t('filters.potentialPartner')}</option>
          </select>

          <button className={styles.primaryButton} onClick={() => void fetchProfiles(0)} disabled={loading}>
            {loading ? t('table.loading') : t('filters.searchButton')}
          </button>
        </div>

        {/* Table */}
        <div className={`${styles.tableWrap} ${loading ? styles.tableWrapLoading : ''}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th>{t('table.company')}</th>
                <th>{t('table.relationship')}</th>
                <th>{t('table.industry')}</th>
                <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}><div className={styles.empty}>{t('table.loading')}</div></td>
                </tr>
              )}
              {!loading && profiles.length === 0 && (
                <tr>
                  <td colSpan={5}><div className={styles.empty}>{t('table.empty')}</div></td>
                </tr>
              )}
              {!loading && profiles.map((profile, index) => (
                <tr key={profile.companyId || profile.id}>
                  <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                    {(currentPage * PAGE_SIZE) + index + 1}
                  </td>
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
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(() => {
                        const inds = profileIndustries(profile);
                        if (!inds.length) return <span style={{ color: '#94A3B8' }}>{t('profile.industryFallback', 'Chưa ghi nhận')}</span>;
                        const visible = inds.slice(0, 2);
                        const hidden = inds.length - 2;
                        return (
                          <>
                            {visible.map((ind, i) => (
                              <span key={i} style={{ background: '#F1F5F9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {ind}
                              </span>
                            ))}
                            {hidden > 0 && (
                              <span style={{ background: '#E2E8F0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
                                +{hidden}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
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
