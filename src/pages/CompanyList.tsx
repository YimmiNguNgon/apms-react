import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import i18n from '../i18n';
import type { PageResult, ProfileResponse, DashboardSummaryDto } from '../types/domain';

interface CompanyListProps {
  setActivePage: (page: string) => void;
  createdByMe?: boolean;
  source?: string;
  subtitle?: string;
}

const PAGE_SIZE = 8;

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || i18n.t('company-list:profile.nameFallback');

const profileIndustry = (profile: ProfileResponse) =>
  profile.business?.industries?.filter(Boolean).join(', ') || i18n.t('company-list:profile.industryFallback');

const normalizeName = (name?: string | null) =>
  (name || '')
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');

export const getRelationshipBadge = (
  rel?: string,
): { label: string; tone: 'info' | 'danger' | 'warning' | 'success' | 'primary' | 'neutral' } => {
  if (!rel) {
    return { label: 'None', tone: 'neutral' };
  }

  const relStr = String(rel).toUpperCase();

  switch (relStr) {
    case 'PARTNER_WITH':
    case 'PARTNER':
      return { label: 'Partner', tone: 'info' };
    case 'COMPETITOR_OF':
    case 'COMPETITOR':
      return { label: 'Competitor', tone: 'danger' };
    case 'SUPPLIER_OF':
    case 'SUPPLIER':
      return { label: 'Supplier', tone: 'warning' };
    case 'CUSTOMER_OF':
    case 'CUSTOMER':
      return { label: 'Customer', tone: 'success' };
    case 'POTENTIAL_PARTNER_OF':
    case 'POTENTIAL_PARTNER':
    case 'INVESTOR':
      return { label: 'Potential Partner', tone: 'primary' };
    default: {
      const defaultLabel = relStr.charAt(0).toUpperCase() + relStr.slice(1).toLowerCase().replace(/_/g, ' ');
      return { label: defaultLabel, tone: 'neutral' };
    }
  }
};

const profileRelationshipBadge = (
  profile: ProfileResponse,
): { label: string; tone: 'info' | 'danger' | 'warning' | 'success' | 'primary' | 'neutral' } => {
  const rel = (profile as unknown as Record<string, unknown>).relationshipType ||
              (profile as unknown as Record<string, unknown>).relationship ||
              (profile as unknown as Record<string, unknown>).suggestedRelationshipType;

  return getRelationshipBadge(rel ? String(rel) : undefined);
};

export const countDistinctRelationshipTypes = (
  rawTypes: (string | null | undefined)[],
): number => {
  const distinctCanonicalTypes = new Set<string>();

  for (const raw of rawTypes) {
    if (!raw) continue;
    const badge = getRelationshipBadge(raw);
    if (badge && badge.label && badge.label !== 'None') {
      distinctCanonicalTypes.add(badge.label);
    }
  }

  return distinctCanonicalTypes.size;
};

const profileUpdatedTime = (profile: ProfileResponse) => {
  const value = profile.metadata?.updatedAt || profile.metadata?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const newestProfilesFirst = (profiles: ProfileResponse[]) =>
  [...profiles].sort((a, b) => profileUpdatedTime(b) - profileUpdatedTime(a));

export const CompanyList: React.FC<CompanyListProps> = ({
  setActivePage,
  createdByMe,
  source,
  subtitle,
}) => {
  const { t } = useTranslation('company-list');
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [unfilteredTotal, setUnfilteredTotal] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [industriesList, setIndustriesList] = useState<string[]>([]);
  const [authoritativeRelationshipTypes, setAuthoritativeRelationshipTypes] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const fetchProfiles = async (page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const [res] = await Promise.allSettled([
        api.get<PageResult<ProfileResponse>>('/profiles', {
          params: {
            keyword: searchQuery.trim() || undefined,
            industry: industryFilter || undefined,
            relationshipType: relationshipFilter || undefined,
            excludeOwner: true,
            createdByMe: createdByMe ? true : undefined,
            page,
            size: PAGE_SIZE,
          },
        }),
      ]);

      if (res.status === 'fulfilled') {
        const content = newestProfilesFirst(res.value.data?.content ?? []);
        const total = res.value.data?.totalElements ?? content.length;
        setProfiles(content);
        setTotalElements(total);
        if (!searchQuery.trim() && !industryFilter && !relationshipFilter) {
          setUnfilteredTotal(total);
        }
        setCurrentPage(page);
      } else {
        setProfiles([]);
        setTotalElements(0);
        setError(res.reason instanceof Error ? res.reason.message : t('errors.loadFailed'));
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
    let active = true;
    setStatsLoading(true);

    const loadStats = async () => {
      try {
        const [summaryRes, industriesRes, relTypesRes] = await Promise.allSettled([
          api.get<DashboardSummaryDto>('/dashboard/summary'),
          api.get<string[]>('/profiles/industries'),
          api.get<string[]>('/profiles/relationship-types', {
            params: {
              excludeOwner: true,
              createdByMe: createdByMe ? true : undefined,
            },
          }),
        ]);

        if (!active) return;

        if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
          setSummary(summaryRes.value.data);
        }
        if (industriesRes.status === 'fulfilled' && industriesRes.value.data) {
          setIndustriesList(industriesRes.value.data.filter(Boolean).sort());
        }
        if (relTypesRes.status === 'fulfilled' && relTypesRes.value.data) {
          setAuthoritativeRelationshipTypes(relTypesRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load profile stats/metadata', err);
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [createdByMe]);

  const distinctRelationshipCount = useMemo(() => {
    if (authoritativeRelationshipTypes !== null && authoritativeRelationshipTypes.length > 0) {
      return countDistinctRelationshipTypes(authoritativeRelationshipTypes);
    }
    // Fallback if authoritativeRelationshipTypes is empty or not yet loaded: derive from summary
    if (summary?.relationshipComposition && summary.relationshipComposition.length > 0) {
      const activeCompositionTypes = summary.relationshipComposition
        .filter((item) => (item.count || 0) > 0)
        .map((item) => item.relationshipType);
      if (activeCompositionTypes.length > 0) {
        return countDistinctRelationshipTypes(activeCompositionTypes);
      }
    }
    const fallbackTypes: string[] = [];
    if ((summary?.partnerCount ?? 0) > 0) fallbackTypes.push('PARTNER');
    if ((summary?.competitorCount ?? 0) > 0) fallbackTypes.push('COMPETITOR');
    if ((summary?.supplierCount ?? 0) > 0) fallbackTypes.push('SUPPLIER');
    if ((summary?.customerCount ?? 0) > 0) fallbackTypes.push('CUSTOMER');
    if ((summary?.potentialPartnerCount ?? 0) > 0) fallbackTypes.push('POTENTIAL_PARTNER');
    if (fallbackTypes.length > 0) {
      return countDistinctRelationshipTypes(fallbackTypes);
    }
    return 0;
  }, [authoritativeRelationshipTypes, summary]);

  const totalCompanyProfiles = useMemo(() => {
    if (unfilteredTotal !== null && unfilteredTotal !== undefined) {
      return unfilteredTotal;
    }
    if (summary?.totalCompanyProfiles !== undefined && summary.totalCompanyProfiles !== null) {
      return summary.totalCompanyProfiles;
    }
    return totalElements;
  }, [unfilteredTotal, summary, totalElements]);

  const totalIndustriesCount = useMemo(() => {
    if (summary?.totalIndustries !== undefined && summary.totalIndustries !== null) {
      return summary.totalIndustries;
    }
    return industriesList.length;
  }, [summary, industriesList]);

  const metrics = useMemo(() => {
    return [
      { label: t('stats.profiles.label') || 'Company Profiles', value: totalCompanyProfiles },
      { label: 'Relationship Types', value: distinctRelationshipCount },
      { label: t('stats.industries.label') || 'Industries', value: totalIndustriesCount },
    ];
  }, [totalCompanyProfiles, distinctRelationshipCount, totalIndustriesCount, t]);

  const openProfile = (profile: ProfileResponse) => {
    const id = profile.companyId || profile.id;
    if (id) localStorage.setItem('apms-selected-company', id);
    localStorage.setItem('apms-back-page', source || 'companies');
    localStorage.removeItem('apms-context-project');
    setActivePage(`company-detail?source=${source || 'company-profiles'}&companyId=${id}`);
  };

  const pageStart = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page company-profiles-page" id="page-company-profiles">
      <div className="workspace-main-full">
        {/* ── Header ── */}
        <div className="workspace-page-head">
          <div>
            <h1>Company Profiles</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {subtitle || 'Manage company profiles and business information'}
            </p>
          </div>
        </div>


        {error && <div className="workspace-inline-error">{error}</div>}

        {/* ── KPI Row ── */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            {metrics.map((item) => (
              <article key={item.label}>
                <strong>{statsLoading ? '...' : item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="manager-project-container">
          <div role="table" aria-label="Company Profiles" style={{ width: '100%', minWidth: 0 }}>
            {/* Toolbar */}
            <div className="company-profiles-filters">
              <input
                className="search-input"
                value={searchQuery}
                placeholder={t('filters.searchPlaceholder') || 'Search by company name, tax code, website...'}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void fetchProfiles(0);
                }}
              />
              <select className="search-input" value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}>
                <option value="">All industries</option>
                {industriesList.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <select className="search-input" value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)}>
                <option value="">{t('filters.allRelationships')}</option>
                <option value="PARTNER_WITH">{t('filters.partner')}</option>
                <option value="COMPETITOR_OF">{t('filters.competitor')}</option>
                <option value="SUPPLIER_OF">{t('filters.supplier')}</option>
                <option value="CUSTOMER_OF">{t('filters.customer')}</option>
                <option value="POTENTIAL_PARTNER_OF">{t('filters.potentialPartner')}</option>
              </select>
            </div>

            {/* Table */}
            <div className="manager-project-table-scroll">
              <div className="manager-project-table-inner" style={{ minWidth: '760px' }}>
                <div className="company-profiles-header" role="row">
                  <span className="col-center">#</span>
                  <span>COMPANY</span>
                  <span>RELATIONSHIP</span>
                  <span>INDUSTRY</span>
                  <span className="col-center">ACTION</span>
                </div>
                {loading && (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">{t('table.loading') || 'Loading company profiles...'}</p>
                  </div>
                )}
                {!loading && profiles.length === 0 && (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">No company profiles found.</p>
                    <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                  </div>
                )}
                {!loading && profiles.map((profile, index) => {
                  const primary = profileName(profile);
                  const legal = profile.identity?.legalName?.trim();
                  const showSecondary = Boolean(legal && normalizeName(legal) !== normalizeName(primary));
                  const badge = profileRelationshipBadge(profile);
                  const industries = profile.business?.industries?.filter(Boolean) || [];
                  const industryText = industries.length > 0 ? industries.join(', ') : (profileIndustry(profile) || '—');

                  return (
                    <div key={profile.companyId || profile.id} className="company-profiles-row" role="row">
                      <span className="col-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {(currentPage * PAGE_SIZE) + index + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(37, 99, 235, 0.08)',
                          color: '#1d4ed8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}>
                          {primary.slice(0, 2).toUpperCase()}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                          <strong style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.25,
                          }}>
                            {primary}
                          </strong>
                          {showSecondary && (
                            <small style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                              marginTop: '1px',
                            }}>
                              {legal}
                            </small>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className={`project-status-badge ${badge.tone}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div
                        title={industryText}
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.35',
                          maxHeight: '2.7em',
                        }}
                      >
                        {industryText}
                      </div>
                      <div className="col-center">
                        <button
                          className="project-detail-btn"
                          type="button"
                          onClick={() => openProfile(profile)}
                          title={t('table.viewTitle') || 'View company details'}
                        >
                          {t('table.viewButton') || 'View'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            <div className="project-table-pagination">
              <span>Showing {pageStart}–{pageEnd} of {totalElements} profiles</span>
              <div>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage === 0 || loading}
                  onClick={() => void fetchProfiles(0)}
                >
                  First
                </button>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage === 0 || loading}
                  onClick={() => void fetchProfiles(currentPage - 1)}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                    onClick={() => void fetchProfiles(index)}
                    disabled={loading}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  className="workspace-page-btn"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => void fetchProfiles(currentPage + 1)}
                >
                  Next
                </button>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => void fetchProfiles(totalPages - 1)}
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
