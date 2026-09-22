import React, { useEffect, useState, useCallback } from 'react';
import { companyProfileApi } from '../API/companyProfileApi';
import type {
  ProfileResponse,
  ProfileVisibilitySummaryDto,
  EligibleManagerDto,
  CompanyProfileManagerHistoryDto,
} from '../types/domain';
import { getRelationshipBadge } from './CompanyList';
import { Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert, ArrowRightLeft, History } from 'lucide-react';
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

  // Transfer Responsibility Modal State
  const [transferProfile, setTransferProfile] = useState<ProfileResponse | null>(null);
  const [eligibleManagers, setEligibleManagers] = useState<EligibleManagerDto[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<number | ''>('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Management History Modal State
  const [historyProfile, setHistoryProfile] = useState<ProfileResponse | null>(null);
  const [historyList, setHistoryList] = useState<CompanyProfileManagerHistoryDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const handleOpenTransferModal = async (profile: ProfileResponse) => {
    setTransferProfile(profile);
    setSelectedManagerId('');
    setTransferReason('');
    setTransferError(null);
    setEligibleLoading(true);
    try {
      const managers = await companyProfileApi.getEligibleManagers(profile.id);
      setEligibleManagers(managers || []);
    } catch (err: any) {
      console.error('Failed to load eligible managers:', err);
      setTransferError(err?.response?.data?.message || err?.message || 'Failed to load eligible managers.');
      setEligibleManagers([]);
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferProfile) return;
    if (!selectedManagerId) {
      setTransferError('Please select a new responsible manager.');
      return;
    }
    if (!transferReason.trim()) {
      setTransferError('Please provide a reason for the transfer.');
      return;
    }

    setTransferSubmitting(true);
    setTransferError(null);
    try {
      await companyProfileApi.transferResponsibility(transferProfile.id, {
        newManagerAccountId: Number(selectedManagerId),
        reason: transferReason.trim(),
        expectedCurrentManagerAccountId: transferProfile.responsibleManagerId,
      });

      setTransferProfile(null);
      void fetchProfiles(currentPage);
      void fetchSummary();
    } catch (err: any) {
      console.error('Transfer failed:', err);
      const serverMsg = err?.response?.data?.message || err?.message;
      if (serverMsg) {
        setTransferError(serverMsg);
      } else if (err?.response?.status === 409 || err?.status === 409) {
        setTransferError('Conflict: The responsible manager for this company profile was concurrently updated. Please refresh and try again.');
      } else {
        setTransferError('Failed to transfer management responsibility.');
      }
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (profile: ProfileResponse) => {
    setHistoryProfile(profile);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const list = await companyProfileApi.getManagementHistory(profile.id);
      setHistoryList(list || []);
    } catch (err: any) {
      console.error('Failed to load management history:', err);
      setHistoryError(err?.response?.data?.message || err?.message || 'Failed to load management history.');
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
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
            <h1>Profile Management</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage company ownership, visibility, and publishing access
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
          <div role="table" aria-label="Profile Management" style={{ width: '100%', minWidth: 0 }}>
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
              <div className="manager-project-table-inner" style={{ minWidth: '920px', width: '100%' }}>
                <table className="monitoring-table">
                  <thead>
                    <tr>
                      <th className="col-mono">#</th>
                      <th>Company</th>
                      <th>Responsible Manager</th>
                      <th>Relationship</th>
                      <th>Visibility</th>
                      <th>Publish Eligibility</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="project-table-empty">
                          <p className="project-table-empty-title">Loading company profiles...</p>
                        </td>
                      </tr>
                    ) : profiles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="project-table-empty">
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

                        // Authoritative capability fields computed by server
                        const canManageVisibility = Boolean(profile.canManageVisibility);
                        const canTransfer = Boolean(profile.canTransferManagement);
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

                            {/* Responsible Manager */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {profile.responsibleManagerName ? (
                                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {profile.responsibleManagerName}
                                  </span>
                                ) : profile.responsibleManagerId ? (
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    Manager #{profile.responsibleManagerId}
                                  </span>
                                ) : (
                                  <span
                                    className="workspace-badge neutral"
                                    style={{ fontSize: '11px', padding: '2px 8px', fontStyle: 'italic', color: '#64748B' }}
                                  >
                                    Unassigned
                                  </span>
                                )}
                                {currentUser?.role === ROLES.MANAGER && profile.isCurrentResponsibleManager === false && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-muted, #94a3b8)',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    Formerly managed by you
                                  </span>
                                )}
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{
                                    padding: '0 8px',
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

                                {canTransfer && (
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{
                                      padding: '0 8px',
                                      height: '28px',
                                      fontSize: '12px',
                                      lineHeight: '26px',
                                      fontWeight: 500,
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => void handleOpenTransferModal(profile)}
                                    title={profile.responsibleManagerId ? 'Transfer company management responsibility' : 'Assign responsible manager'}
                                  >
                                    {profile.responsibleManagerId ? 'Transfer' : 'Assign'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{
                                    padding: '0 8px',
                                    height: '28px',
                                    fontSize: '12px',
                                    lineHeight: '26px',
                                    fontWeight: 500,
                                    boxSizing: 'border-box',
                                  }}
                                  onClick={() => void handleOpenHistoryModal(profile)}
                                  title="View Management Transfer History"
                                >
                                  History
                                </button>

                                {canManageVisibility && (
                                  isHidden ? (
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{
                                        padding: '0 8px',
                                        height: '28px',
                                        fontSize: '12px',
                                        lineHeight: '26px',
                                        fontWeight: 500,
                                        boxSizing: 'border-box',
                                      }}
                                      onClick={() => void handleToggleVisibility(profile)}
                                      disabled={!canPublish || isMutating}
                                      title={!canPublish ? blockReason : 'Publish Profile'}
                                    >
                                      {isMutating ? 'Saving...' : 'Publish'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      style={{
                                        padding: '0 8px',
                                        height: '28px',
                                        fontSize: '12px',
                                        lineHeight: '26px',
                                        fontWeight: 500,
                                        boxSizing: 'border-box',
                                      }}
                                      onClick={() => void handleToggleVisibility(profile)}
                                      disabled={isMutating}
                                      title="Hide Profile"
                                    >
                                      {isMutating ? 'Saving...' : 'Hide'}
                                    </button>
                                  )
                                )}
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

        {/* Transfer Management Modal */}
        {transferProfile && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
            <div className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '520px', maxWidth: '90vw', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowRightLeft size={18} />
                  {transferProfile.responsibleManagerId ? 'Transfer Management Responsibility' : 'Assign Responsible Manager'}
                </h2>
                <button
                  type="button"
                  onClick={() => setTransferProfile(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={18} />
                </button>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '14px' }}>
                Company: <strong>{transferProfile.identity?.tradeName || transferProfile.identity?.legalName || 'Company Profile'}</strong>
              </p>

              {/* Clarification banner */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px', fontSize: '0.82rem', color: '#1e40af', marginBottom: '16px' }}>
                Existing projects are not reassigned. This transfer applies to company responsibility and future project creation.
              </div>

              {transferError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', fontSize: '0.82rem', color: '#991b1b', marginBottom: '16px' }}>
                  {transferError}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  Current Responsible Manager
                </label>
                <input
                  className="search-input"
                  value={transferProfile.responsibleManagerName || (transferProfile.responsibleManagerId ? `Manager #${transferProfile.responsibleManagerId}` : 'Unassigned')}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'default', width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  New Responsible Manager <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {eligibleLoading ? (
                  <div style={{ fontSize: '0.85rem', color: '#64748B', padding: '8px 0' }}>Loading eligible managers...</div>
                ) : eligibleManagers.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#ef4444', padding: '8px 0' }}>No eligible managers available for transfer.</div>
                ) : (
                  <select
                    className="search-input"
                    style={{ width: '100%' }}
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value ? Number(e.target.value) : '')}
                    disabled={transferSubmitting}
                  >
                    <option value="">-- Select Manager --</option>
                    {eligibleManagers.map((m) => (
                      <option key={m.accountId} value={m.accountId}>
                        {m.displayName} ({m.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  Reason for Transfer <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe why responsibility is being transferred..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  disabled={transferSubmitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setTransferProfile(null)}
                  disabled={transferSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleExecuteTransfer()}
                  disabled={transferSubmitting || !selectedManagerId || !transferReason.trim()}
                >
                  {transferSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Management History Modal */}
        {historyProfile && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
            <div className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '750px', maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} />
                  Management Transfer History
                </h2>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '2px 10px', height: '28px', fontSize: '12px' }}
                  onClick={() => setHistoryProfile(null)}
                >
                  ✕ Close
                </button>
              </div>

              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '16px' }}>
                Company: <strong>{historyProfile.identity?.tradeName || historyProfile.identity?.legalName || 'Company Profile'}</strong>
              </p>

              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748B' }}>Loading history...</div>
              ) : historyError ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', fontSize: '0.85rem', color: '#991b1b' }}>
                  {historyError}
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748B' }}>
                  No management transfers recorded for this company profile.
                </div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table className="monitoring-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Transferred By</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((item) => (
                        <tr key={item.id}>
                          <td style={{ whiteSpace: 'nowrap', color: '#64748B' }}>
                            {item.transferredAt ? new Date(item.transferredAt).toLocaleString() : '—'}
                          </td>
                          <td>{item.previousManagerDisplayName || (item.previousManagerAccountId ? `Manager #${item.previousManagerAccountId}` : 'Unassigned')}</td>
                          <td style={{ fontWeight: 500 }}>{item.newManagerDisplayName || (item.newManagerAccountId ? `Manager #${item.newManagerAccountId}` : '—')}</td>
                          <td>{item.transferredByDisplayName || (item.transferredByAccountId ? `User #${item.transferredByAccountId}` : '—')}</td>
                          <td style={{ maxWidth: '220px', wordBreak: 'break-word' }}>{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
