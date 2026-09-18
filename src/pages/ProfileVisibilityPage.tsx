import React, { useEffect, useState, useCallback } from 'react';
import { companyProfileApi } from '../API/companyProfileApi';
import type { ProfileResponse, ProfileVisibilitySummaryDto } from '../types/domain';
import { getRelationshipBadge } from './CompanyList';
import { Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useUser, ROLES } from '../context/UserContext';

interface ProfileVisibilityPageProps {
  setActivePage: (page: string) => void;
}

const PAGE_SIZE = 10;

export const ProfileVisibilityPage: React.FC<ProfileVisibilityPageProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'' | 'PUBLISHED' | 'HIDDEN'>('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'' | 'ALL' | 'ELIGIBLE' | 'BLOCKED'>('');

  // KPIs
  const [summary, setSummary] = useState<ProfileVisibilitySummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Action pending state
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await companyProfileApi.getVisibilityManagementSummary();
      if (res) {
        setSummary(res);
      }
    } catch (err) {
      console.error('Failed to load visibility summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchProfiles = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await companyProfileApi.getVisibilityManagementProfiles({
        keyword: debouncedSearch || undefined,
        visibility: visibilityFilter || undefined,
        eligibility: eligibilityFilter && eligibilityFilter !== 'ALL' ? eligibilityFilter : undefined,
        page,
        size: PAGE_SIZE,
      });

      if (res) {
        setProfiles(res.content ?? []);
        setTotalElements(res.totalElements ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setCurrentPage(res.pageNumber ?? page);
      }
    } catch (err) {
      console.error('Failed to load manageable profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company profiles.');
      setProfiles([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, visibilityFilter, eligibilityFilter]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchProfiles(currentPage);
  }, [fetchProfiles, currentPage]);

  const handleToggleVisibility = async (profile: ProfileResponse) => {
    const targetId = profile.companyId || profile.id;
    if (!targetId) return;

    const isCurrentlyHidden = profile.isHidden === true || (profile.isHidden === undefined && profile.visibility === 'HIDDEN');
    const newVisibility = isCurrentlyHidden ? 'PUBLISHED' : 'HIDDEN';

    setActionInProgressId(targetId);
    try {
      const updatedResponse = await companyProfileApi.updateProfileVisibility(targetId, newVisibility);
      const data = (updatedResponse as any)?.data ?? updatedResponse;

      // Update row immediately with authoritative capability response
      setProfiles((prev) =>
        prev.map((p) => {
          const currentId = p.companyId || p.id;
          if (currentId === targetId) {
            const updatedIsHidden = typeof data?.isHidden === 'boolean'
              ? data.isHidden
              : (data?.visibility ? data.visibility === 'HIDDEN' : (newVisibility === 'HIDDEN'));
            return {
              ...p,
              ...data,
              isHidden: updatedIsHidden,
              visibility: updatedIsHidden ? 'HIDDEN' : 'PUBLISHED',
              canPublish: data?.canPublish !== undefined ? data.canPublish : p.canPublish,
              publishBlockReason: data?.publishBlockReason !== undefined ? data.publishBlockReason : p.publishBlockReason,
            };
          }
          return p;
        })
      );

      // Refetch summary KPI counts immediately
      void fetchSummary();
    } catch (err) {
      console.error('Failed to toggle profile visibility:', err);
      alert(err instanceof Error ? err.message : 'Failed to toggle visibility');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleViewProfile = (profile: ProfileResponse) => {
    const companyId = profile.companyId || profile.id;
    if (!companyId) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('apms-selected-company', companyId);
    }
    setActivePage(`company-detail?source=profile-visibility&companyId=${encodeURIComponent(companyId)}`);
  };

  const pageCount = Math.max(totalPages, 1);
  const pageStart = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page project-page profile-visibility-page" id="page-profile-visibility">
      <div className="workspace-main-full">
        {/* Page Header Card */}
        <div className="workspace-page-head">
          <div>
            <h1>Profile Visibility</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage company profile visibility
            </p>
          </div>
          <div className="workspace-head-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                void fetchSummary();
                void fetchProfiles(currentPage);
              }}
              disabled={loading || summaryLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={(loading || summaryLoading) ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="admin-toast danger" style={{ marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {/* 4 KPI Focus Cards */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            <article>
              <strong>{summaryLoading ? '—' : summary?.totalProfiles ?? totalElements}</strong>
              <span>Total Profiles</span>
            </article>
            <article>
              <strong>{summaryLoading ? '—' : summary?.published ?? 0}</strong>
              <span>Published</span>
            </article>
            <article>
              <strong>{summaryLoading ? '—' : summary?.hidden ?? 0}</strong>
              <span>Hidden</span>
            </article>
            <article>
              <strong>{summaryLoading ? '—' : summary?.blockedFromPublishing ?? 0}</strong>
              <span>Blocked from Publishing</span>
            </article>
          </div>
        </div>

        {/* Main Table Container: Filters + Table + Pagination */}
        <div className="manager-project-container">
          <div role="table" aria-label="Profile Visibility" style={{ width: '100%', minWidth: 0 }}>
            {/* Filter Bar */}
            <div className="manager-project-filters">
              <input
                className="search-input"
                type="text"
                placeholder="Search company name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
              />
              <select
                className="search-input"
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value as '' | 'PUBLISHED' | 'HIDDEN');
                  setCurrentPage(0);
                }}
              >
                <option value="">All Visibility</option>
                <option value="PUBLISHED">Published</option>
                <option value="HIDDEN">Hidden</option>
              </select>
              <select
                className="search-input"
                value={eligibilityFilter}
                onChange={(e) => {
                  setEligibilityFilter(e.target.value as '' | 'ALL' | 'ELIGIBLE' | 'BLOCKED');
                  setCurrentPage(0);
                }}
              >
                <option value="">All Eligibility</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            {/* Scrollable Table */}
            <div className="manager-project-table-scroll">
              <div className="manager-project-table-inner" style={{ minWidth: '820px', width: '100%' }}>
                <table className="monitoring-table">
                  <thead>
                    <tr>
                      <th className="col-mono">#</th>
                      <th>Company</th>
                      <th>Relationship</th>
                      <th>Visibility</th>
                      <th>Publish Eligibility</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="project-table-empty">
                          <p className="project-table-empty-title">Loading company profiles...</p>
                        </td>
                      </tr>
                    ) : profiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="project-table-empty">
                          <p className="project-table-empty-title">No company profiles found.</p>
                          <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                        </td>
                      </tr>
                    ) : (
                      profiles.map((profile, index) => {
                        const targetId = profile.companyId || profile.id;
                        const isHidden = profile.isHidden === true || (profile.isHidden === undefined && profile.visibility === 'HIDDEN');
                        const relBadge = getRelationshipBadge(profile.relationshipType);
                        const isMutating = actionInProgressId === targetId;

                        // Authorization check: Admin or responsible Manager
                        const canManage = Boolean(
                          profile.canManageVisibility ||
                          currentUser?.role === ROLES.ADMIN ||
                          (currentUser?.role === ROLES.MANAGER && profile.responsibleManagerId != null && profile.responsibleManagerId === currentUser.id)
                        );

                        const canPublish = Boolean(profile.canPublish);
                        const blockReason = profile.publishBlockReason || 'Profile is currently not eligible for publishing.';

                        const displayName = profile.identity?.tradeName || profile.identity?.legalName || 'Unnamed Company';
                        const subName = profile.identity?.taxCode
                          ? `Tax: ${profile.identity.taxCode}`
                          : (profile.identity?.legalName && profile.identity?.tradeName && profile.identity.legalName !== profile.identity.tradeName
                              ? profile.identity.legalName
                              : null);

                        return (
                          <tr key={targetId || index}>
                            {/* Index */}
                            <td className="col-mono">
                              {currentPage * PAGE_SIZE + index + 1}
                            </td>

                            {/* Company */}
                            <td>
                              <div className="project-col-main" title={displayName}>
                                <span className="project-name-primary">{displayName}</span>
                                <span className="project-code-secondary">{subName || '—'}</span>
                              </div>
                            </td>

                            {/* Relationship */}
                            <td>
                              <span className={`workspace-badge ${relBadge.tone || 'neutral'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {relBadge.label}
                              </span>
                            </td>

                            {/* Visibility */}
                            <td>
                              <span
                                className={`workspace-badge ${isHidden ? 'warning' : 'success'}`}
                                style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                                {isHidden ? 'Hidden' : 'Published'}
                              </span>
                            </td>

                            {/* Publish Eligibility */}
                            <td>
                              {!isHidden ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                              ) : canPublish ? (
                                <span
                                  className="workspace-badge success"
                                  style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <CheckCircle2 size={11} />
                                  Eligible
                                </span>
                              ) : (
                                <span
                                  className="workspace-badge danger"
                                  style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}
                                  title={blockReason}
                                >
                                  <AlertCircle size={11} />
                                  Blocked
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                {isHidden ? (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{
                                      padding: '0 10px',
                                      height: '28px',
                                      fontSize: '12px',
                                      lineHeight: '26px',
                                      fontWeight: 500,
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => void handleToggleVisibility(profile)}
                                    disabled={!canManage || !canPublish || isMutating}
                                    title={!canManage ? 'You do not have permission to manage visibility' : !canPublish ? blockReason : 'Publish Profile'}
                                  >
                                    {isMutating ? 'Saving...' : 'Publish'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    style={{
                                      padding: '0 10px',
                                      height: '28px',
                                      fontSize: '12px',
                                      lineHeight: '26px',
                                      fontWeight: 500,
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => void handleToggleVisibility(profile)}
                                    disabled={!canManage || isMutating}
                                    title={!canManage ? 'You do not have permission to manage visibility' : 'Hide Profile'}
                                  >
                                    {isMutating ? 'Saving...' : 'Hide'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{
                                    padding: '0 10px',
                                    height: '28px',
                                    fontSize: '12px',
                                    lineHeight: '26px',
                                    fontWeight: 500,
                                    boxSizing: 'border-box',
                                  }}
                                  onClick={() => handleViewProfile(profile)}
                                  title="View Profile Detail"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="project-table-pagination">
              <span>Showing {pageStart}–{pageEnd} of {totalElements} profiles</span>
              <div>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage(0)}
                >
                  First
                </button>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage((c) => Math.max(c - 1, 0))}
                >
                  Prev
                </button>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                    onClick={() => setCurrentPage(index)}
                    disabled={totalElements === 0 || loading}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  className="workspace-page-btn"
                  disabled={currentPage >= pageCount - 1 || loading}
                  onClick={() => setCurrentPage((c) => Math.min(c + 1, pageCount - 1))}
                >
                  Next
                </button>
                <button
                  className="workspace-page-btn"
                  disabled={currentPage >= pageCount - 1 || loading}
                  onClick={() => setCurrentPage(pageCount - 1)}
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
