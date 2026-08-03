import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, FileText, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import type { PageResult, ProfileResponse } from '../types/domain';
import styles from './CompanyProfiles.module.css';

interface CompanyListProps {
  setActivePage: (page: string) => void;
}

const PAGE_SIZE = 10;

const profileName = (profile: ProfileResponse) =>
  profile.identity?.tradeName || profile.identity?.legalName || profile.companyId || profile.id || 'Company profile';

const profileLegalName = (profile: ProfileResponse) =>
  profile.identity?.legalName || profileName(profile);

const profileIndustry = (profile: ProfileResponse) =>
  profile.business?.industries?.filter(Boolean).join(', ') || 'Unclassified';

const formatDate = (value?: string | null) => {
  if (!value) return 'No update';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const statusTone = (status?: string) => {
  if (status === 'APPROVED' || status === 'VERIFIED') return styles.success;
  if (status === 'PENDING_REVIEW' || status === 'NEEDS_UPDATE') return styles.warning;
  if (status === 'REJECTED' || status === 'UNVERIFIED') return styles.danger;
  return styles.neutral;
};

const displayReviewStatus = (status?: string | null) => {
  if (status === 'VERIFIED') return 'APPROVED';
  return status || 'UNVERIFIED';
};

const profileUpdatedTime = (profile: ProfileResponse) => {
  const value = profile.metadata?.updatedAt || profile.metadata?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const newestProfilesFirst = (profiles: ProfileResponse[]) =>
  [...profiles].sort((a, b) => profileUpdatedTime(b) - profileUpdatedTime(a));

export const CompanyList: React.FC<CompanyListProps> = ({ setActivePage }) => {
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const fetchProfiles = async (page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<PageResult<ProfileResponse>>('/profiles', {
        params: {
          keyword: searchQuery.trim() || undefined,
          reviewStatus: statusFilter || undefined,
          relationshipType: relationshipFilter || undefined,
          page,
          size: PAGE_SIZE,
        },
      });

      const content = newestProfilesFirst(res.data?.content ?? []);
      setProfiles(content);
      setTotalElements(res.data?.totalElements ?? content.length);
      setCurrentPage(page);
    } catch (err) {
      setProfiles([]);
      setTotalElements(0);
      setError(err instanceof Error ? err.message : 'Cannot load company profiles.');
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
      { label: 'Profiles', value: totalElements || profiles.length, note: 'Official company records', icon: Building2 },
      { label: 'Verified', value: verified, note: 'Approved and ready to use', icon: ShieldCheck },
      { label: 'Need update', value: needsUpdate, note: 'Waiting review or enrichment', icon: RefreshCw },
      { label: 'Industries', value: industries.size, note: `${withWebsite} profiles include website`, icon: FileText },
    ];
  }, [profiles, totalElements]);

  const openProfile = (profile: ProfileResponse) => {
    const id = profile.companyId || profile.id;
    if (id) localStorage.setItem('apms-selected-company', id);
    setActivePage('company-detail');
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Company intelligence</span>
          <h1>Company Profiles</h1>
          <p>Search approved company profiles, review business facts, and open the official company record created from candidate approval.</p>
        </div>
        <div className={styles.actions}>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.metricGrid}>
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <article className={styles.metricCard} key={item.label}>
              <span><Icon size={18} />{item.label}</span>
              <strong>{loading ? '...' : item.value}</strong>
              <p>{item.note}</p>
            </article>
          );
        })}
      </div>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={17} />
            <input
              value={searchQuery}
              placeholder="Search by company name, tax ID, website..."
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void fetchProfiles(0);
              }}
            />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All status</option>
            <option value="APPROVED">Approved</option>
            <option value="NEEDS_UPDATE">Needs update</option>
            <option value="PENDING_REVIEW">Pending review</option>
          </select>
          <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)}>
            <option value="">All relationships</option>
            <option value="PARTNER_WITH">Partner</option>
            <option value="COMPETITOR_OF">Competitor</option>
            <option value="SUPPLIER_OF">Supplier</option>
            <option value="CUSTOMER_OF">Customer</option>
            <option value="POTENTIAL_PARTNER_OF">Potential partner</option>
          </select>
          <button className={styles.primaryButton} type="button" onClick={() => void fetchProfiles(0)}>
            Search
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Last updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}><div className={styles.empty}>Loading company profiles...</div></td>
                </tr>
              )}
              {!loading && profiles.length === 0 && (
                <tr>
                  <td colSpan={7}><div className={styles.empty}>No company profiles found.</div></td>
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
                  <td>{profileIndustry(profile)}</td>
                  <td><span className={`${styles.badge} ${statusTone(profile.reviewStatus)}`}>{displayReviewStatus(profile.reviewStatus)}</span></td>
                  <td>{formatDate(profile.metadata?.updatedAt || profile.metadata?.createdAt)}</td>
                  <td>
                    <button className={styles.iconButton} type="button" onClick={() => openProfile(profile)} title="View profile">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>Showing {profiles.length} of {totalElements} profiles</span>
          <div>
            <button type="button" disabled={currentPage === 0 || loading} onClick={() => void fetchProfiles(currentPage - 1)}>Prev</button>
            <strong>{currentPage + 1} / {totalPages}</strong>
            <button type="button" disabled={currentPage >= totalPages - 1 || loading} onClick={() => void fetchProfiles(currentPage + 1)}>Next</button>
          </div>
        </div>
      </section>
    </section>
  );
};
