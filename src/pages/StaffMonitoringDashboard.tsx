import React, { useState, useEffect, useMemo } from 'react';
import { useUser, ROLES } from '../context/UserContext';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import { api } from '../services/api';
import type { CompanyMonitoringAssignmentResponse, CompanyMonitoringReviewResponse, CompanyProfileUpdateProposalResponse, ProfileResponse } from '../types/domain';
import { Search, Eye, X } from 'lucide-react';
import { MonitoringReviewDetailsModal } from '../components/Monitoring/MonitoringReviewDetailsModal';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import type { ProposalBundle } from './CompanyMonitoringPage';
import { StaffMonitoringReviewPage } from './StaffMonitoringReviewPage';

type CompanyMonitoringAssignment = CompanyMonitoringAssignmentResponse;
type Tab = 'monitoring' | 'proposals' | 'history';

interface StaffMonitoringDashboardProps {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
}

const PAGE_SIZE = 10;

const formatEnum = (value?: string | null) => {
  if (!value) return '-';
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const proposalStatusTone = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
    case 'APPLIED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'WITHDRAWN':
      return 'neutral';
    case 'DRAFT':
    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
};

const reviewResultTone = (result?: string | null) => {
  switch ((result || '').toUpperCase()) {
    case 'NO_CHANGE':
      return 'success';
    case 'UPDATE_PROPOSED':
      return 'info';
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'primary';
    default:
      return 'neutral';
  }
};

const getStatusBadge = (assignment: CompanyMonitoringAssignment) => {
  const status = assignment.displayStatus;
  let tone = 'neutral';
  let label = 'On Schedule';
  if (status === 'OVERDUE') {
    tone = 'danger';
    label = 'Overdue';
  } else if (status === 'DUE') {
    tone = 'warning';
    label = 'Due';
  } else if (status === 'ON_SCHEDULE' || status === 'UP_TO_DATE') {
    tone = 'success';
    label = 'On Schedule';
  } else if (status === 'PAUSED') {
    tone = 'neutral';
    label = 'Paused';
  }
  return (
    <span className={`project-status-badge ${tone}`}>
      {label}
    </span>
  );
};

export const StaffMonitoringDashboard: React.FC<StaffMonitoringDashboardProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  
  const [allAssignments, setAllAssignments] = useState<CompanyMonitoringAssignment[]>([]);
  const [staffHistory, setStaffHistory] = useState<CompanyMonitoringReviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState<Tab>('monitoring');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [frequencyFilter, setFrequencyFilter] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(0);

  const [selectedHistoryReview, setSelectedHistoryReview] = useState<CompanyMonitoringReviewResponse | null>(null);
  const [historyProposalBundle, setHistoryProposalBundle] = useState<ProposalBundle | null>(null);
  const [selectedAssignmentForReview, setSelectedAssignmentForReview] = useState<CompanyMonitoringAssignment | null>(null);
  const [proposalToWithdraw, setProposalToWithdraw] = useState<CompanyMonitoringReviewResponse | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const isManagerOrAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.MANAGER;

  const fetchAllData = async () => {
    setIsLoading(true);
    const params = { page: 0, size: 500, sort: 'updatedAt,desc' };
    
    const assignmentsPromise = isManagerOrAdmin 
      ? companyMonitoringApi.getAllAssignments(params)
      : companyMonitoringApi.getMyAssignments(params);
      
    const historyPromise = companyMonitoringApi.getMonitoringHistory({ page: 0, size: 500, sort: 'reviewedAt,desc' });
    
    const [assignmentsResult, historyResult] = await Promise.allSettled([assignmentsPromise, historyPromise]);
    
    if (assignmentsResult.status === 'fulfilled') {
      const nextAssignments = assignmentsResult.value.content || [];
      setAllAssignments(nextAssignments);
      
      const autoOpenReviewId = localStorage.getItem('apms-open-review-assignment');
      if (autoOpenReviewId) {
        const assignmentToReview = nextAssignments.find(a => a.id.toString() === autoOpenReviewId);
        if (assignmentToReview) {
          setSelectedAssignmentForReview(assignmentToReview);
        }
        localStorage.removeItem('apms-open-review-assignment');
      }
    } else {
      console.error('Failed to load assignments:', assignmentsResult.reason);
      setAllAssignments([]);
    }
    
    if (historyResult.status === 'fulfilled') {
      setStaffHistory(historyResult.value.content || []);
    } else {
      console.error('Failed to load history:', historyResult.reason);
      setStaffHistory([]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [isManagerOrAdmin]);

  const totalCount = allAssignments.length;
  const overdueCount = allAssignments.filter(a => a.displayStatus === 'OVERDUE').length;
  const dueCount = allAssignments.filter(a => a.displayStatus === 'DUE').length;
  const reviewedCount = allAssignments.filter(a => a.lastReviewedAt != null).length;

  const myProposals = useMemo(() => {
    const map = new Map<string, CompanyMonitoringReviewResponse>();
    staffHistory.forEach(item => {
      if (item.updateProposalId) {
        if (!map.has(item.updateProposalId)) {
          map.set(item.updateProposalId, item);
        }
      }
    });
    return Array.from(map.values());
  }, [staffHistory]);

  const displayedProposals = useMemo(() => {
    return myProposals.filter(proposal => {
      const matchSearch = !searchQuery || 
        proposal.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || 
        proposal.proposalStatus === statusFilter ||
        (statusFilter === 'SUBMITTED' && (proposal.proposalStatus === 'SUBMITTED' || proposal.proposalStatus === 'PENDING' || proposal.proposalStatus === 'IN_REVIEW'));
        
      return matchSearch && matchStatus;
    });
  }, [myProposals, searchQuery, statusFilter]);

  const displayedHistory = useMemo(() => {
    return staffHistory.filter(item => {
      const matchSearch = !searchQuery || 
        item.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchResult = statusFilter === 'ALL' || 
        item.result === statusFilter;
      
      return matchSearch && matchResult;
    });
  }, [staffHistory, searchQuery, statusFilter]);

  const displayedAssignments = useMemo(() => {
    return allAssignments.filter(assignment => {
      const matchSearch = !searchQuery || 
        assignment.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchStatus = statusFilter === 'ALL' || 
        assignment.displayStatus === statusFilter ||
        (statusFilter === 'ON_SCHEDULE' && assignment.displayStatus === 'UP_TO_DATE');
        
      const matchFreq = frequencyFilter === 'ALL' || 
        assignment.frequency === frequencyFilter;
        
      return matchSearch && matchStatus && matchFreq;
    });
  }, [allAssignments, searchQuery, statusFilter, frequencyFilter]);

  const currentTabData = useMemo(() => {
    if (activeTab === 'monitoring') return displayedAssignments;
    if (activeTab === 'proposals') return displayedProposals;
    if (activeTab === 'history') return displayedHistory;
    return [];
  }, [activeTab, displayedAssignments, displayedProposals, displayedHistory]);

  const totalElements = currentTabData.length;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE);
  const pageCount = Math.max(totalPages, 1);
  const pageStart = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
  
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, frequencyFilter, activeTab]);

  useEffect(() => {
    if (currentPage >= pageCount && pageCount > 0) {
      setCurrentPage(pageCount - 1);
    }
  }, [pageCount, currentPage]);

  const visibleRows = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE;
    return currentTabData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentTabData, currentPage]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setStatusFilter('ALL');
    setFrequencyFilter('ALL');
    setSearchQuery('');
    setCurrentPage(0);
  };

  const navigateToCompany = (profileId: string, assignmentId?: number) => {
    localStorage.setItem('apms-selected-company', profileId);
    localStorage.setItem('apms-back-page', 'staff-monitoring');
    localStorage.removeItem('apms-context-project');
    if (assignmentId) {
      localStorage.setItem('apms-staff-assignment-id', assignmentId.toString());
    } else {
      localStorage.removeItem('apms-staff-assignment-id');
    }
    if (setActivePage) {
      setActivePage(`company-detail?source=staff-monitoring&companyId=${profileId}`);
    }
  };

  const openProposalDetails = async (review: CompanyMonitoringReviewResponse) => {
    setSelectedHistoryReview(review);
    setHistoryProposalBundle(null);
    
    const proposalId = review.updateProposalId;
    if (!proposalId) {
      const profileId = review.companyProfileId;
      if (profileId) {
        try {
          const profileResponse = await api.get<ProfileResponse>(`/company-profiles/${profileId}`);
          setHistoryProposalBundle({ proposal: null as any, profile: profileResponse.data });
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    
    try {
      const proposal = await companyMonitoringApi.getProfileUpdateProposal(proposalId);
      const profileId = proposal.companyProfileId || review.companyProfileId;
      let profile: ProfileResponse | null = null;
      if (profileId) {
         const profileResponse = await api.get<ProfileResponse>(`/company-profiles/${profileId}`);
         profile = profileResponse.data;
      }
      setHistoryProposalBundle({ proposal, profile });
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawProposalFromDashboard = async () => {
    if (!proposalToWithdraw?.updateProposalId || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await companyMonitoringApi.withdrawProfileUpdateProposal(proposalToWithdraw.updateProposalId);
      setProposalToWithdraw(null);
      await fetchAllData();
    } catch (err) {
      console.error('Failed to withdraw proposal:', err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (selectedAssignmentForReview) {
    return (
      <StaffMonitoringReviewPage
        assignmentId={selectedAssignmentForReview.id}
        companyProfileId={selectedAssignmentForReview.companyProfileId}
        onClose={() => setSelectedAssignmentForReview(null)}
        onSuccess={() => {
          setSelectedAssignmentForReview(null);
          fetchAllData();
        }}
      />
    );
  }

  return (
    <section className="workspace-page role-dashboard role-dashboard-staff staff-page project-page monitoring-page" id="page-staff-monitoring">
      <div className="workspace-main-full">
        {/* Page Header */}
        <div className="workspace-page-head">
          <div>
            <h1>Staff Monitoring</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage your assigned companies, reviews, and update proposals
            </p>
          </div>
        </div>

        {/* Compact KPI Cards */}
        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            <article>
              <strong>{totalCount}</strong>
              <span>My Assignments</span>
            </article>
            <article>
              <strong>{dueCount}</strong>
              <span>Due Soon</span>
            </article>
            <article>
              <strong>{overdueCount}</strong>
              <span>Overdue</span>
            </article>
            <article>
              <strong>{reviewedCount}</strong>
              <span>Reviewed</span>
            </article>
          </div>
        </div>

        {/* Main Data Container */}
        <div className="manager-project-container">
          {/* Tabs */}
          <div className="monitoring-tabs">
            <button 
              type="button"
              className={`monitoring-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
              onClick={() => handleTabChange('monitoring')}
            >
              Monitoring
              <span className="monitoring-tab-count">
                {allAssignments.length}
              </span>
            </button>
            <button 
              type="button"
              className={`monitoring-tab ${activeTab === 'proposals' ? 'active' : ''}`}
              onClick={() => handleTabChange('proposals')}
            >
              My Proposals
              <span className="monitoring-tab-count">
                {myProposals.length}
              </span>
            </button>
            <button 
              type="button"
              className={`monitoring-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleTabChange('history')}
            >
              Monitoring History
              <span className="monitoring-tab-count">
                {staffHistory.length}
              </span>
            </button>
          </div>

          {/* Toolbar Filters */}
          {activeTab === 'monitoring' && (
            <div className="manager-project-filters">
              <input
                type="text"
                className="search-input"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="search-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ON_SCHEDULE">On Schedule</option>
                <option value="DUE">Due</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PAUSED">Paused</option>
              </select>
              <select 
                className="search-input"
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
              >
                <option value="ALL">All Frequencies</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMI_ANNUALLY">Semi-annually</option>
              </select>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="manager-project-filters" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 220px)' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="search-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="manager-project-filters" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 220px)' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="search-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Results</option>
                <option value="NO_CHANGE">No Change</option>
                <option value="UPDATE_PROPOSED">Update Proposed</option>
                <option value="RELATIONSHIP_CHANGE_PROPOSED">Relationship Change Proposed</option>
              </select>
            </div>
          )}

          {/* Data Tables */}
          {isLoading ? (
            <div className="project-table-empty">
              <p className="project-table-empty-desc">Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'monitoring' && (
                visibleRows.length === 0 ? (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">No monitoring assignments found.</p>
                    <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="manager-project-table-scroll">
                    <table className="monitoring-table">
                      <thead>
                        <tr>
                          <th className="col-center" style={{ width: '44px' }}>#</th>
                          <th>Company</th>
                          <th style={{ width: '130px' }}>Status</th>
                          <th style={{ width: '130px' }}>Review Cycle</th>
                          <th style={{ width: '130px' }}>Last Reviewed</th>
                          <th style={{ width: '130px' }}>Next Review</th>
                          <th style={{ width: '180px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringAssignment[]).map((assignment, idx) => (
                          <tr key={assignment.id}>
                            <td className="col-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td>
                              <strong className="project-name-primary">{assignment.companyName}</strong>
                            </td>
                            <td>
                              {getStatusBadge(assignment)}
                            </td>
                            <td>{formatEnum(assignment.frequency)}</td>
                            <td><span style={{ color: 'var(--text-secondary)' }}>{formatDate(assignment.lastReviewedAt)}</span></td>
                            <td><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDate(assignment.nextReviewAt)}</strong></td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button 
                                  type="button"
                                  className="project-detail-btn"
                                  onClick={() => navigateToCompany(assignment.companyProfileId, assignment.id)}
                                >
                                  View Profile
                                </button>
                                <button 
                                  type="button"
                                  className="project-detail-btn primary"
                                  onClick={() => setSelectedAssignmentForReview(assignment)}
                                >
                                  Review
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeTab === 'proposals' && (
                visibleRows.length === 0 ? (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">No proposals found.</p>
                    <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="manager-project-table-scroll">
                    <table className="monitoring-table">
                      <thead>
                        <tr>
                          <th className="col-center" style={{ width: '44px' }}>#</th>
                          <th>Company</th>
                          <th style={{ width: '140px' }}>Submitted At</th>
                          <th style={{ width: '180px' }}>Proposal Type</th>
                          <th style={{ width: '140px' }}>Proposal Status</th>
                          <th style={{ width: '220px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringReviewResponse[]).map((proposal, idx) => (
                          <tr key={proposal.id}>
                            <td className="col-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td>
                              <strong className="project-name-primary">{proposal.companyName}</strong>
                            </td>
                            <td><span style={{ color: 'var(--text-secondary)' }}>{formatDate(proposal.reviewedAt)}</span></td>
                            <td>{formatEnum(proposal.result)}</td>
                            <td>
                              <span className={`project-status-badge ${proposalStatusTone(proposal.proposalStatus)}`}>
                                {formatEnum(proposal.proposalStatus)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button 
                                  type="button"
                                  className="project-detail-btn"
                                  onClick={() => openProposalDetails(proposal)}
                                >
                                  <Eye size={12} style={{ marginRight: '4px' }} /> View Details
                                </button>
                                {proposal.proposalStatus === 'SUBMITTED' && (
                                  <button
                                    type="button"
                                    className="project-detail-btn danger"
                                    onClick={() => setProposalToWithdraw(proposal)}
                                  >
                                    Cancel Submission
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeTab === 'history' && (
                visibleRows.length === 0 ? (
                  <div className="project-table-empty">
                    <p className="project-table-empty-title">No monitoring history found.</p>
                    <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="manager-project-table-scroll">
                    <table className="monitoring-table">
                      <thead>
                        <tr>
                          <th className="col-center" style={{ width: '44px' }}>#</th>
                          <th>Company</th>
                          <th style={{ width: '140px' }}>Reviewed At</th>
                          <th style={{ width: '180px' }}>Review Result</th>
                          <th style={{ width: '150px' }}>Proposal Decision</th>
                          <th>Note</th>
                          <th style={{ width: '130px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringReviewResponse[]).map((history, idx) => (
                          <tr key={history.id}>
                            <td className="col-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td>
                              <strong className="project-name-primary">{history.companyName}</strong>
                            </td>
                            <td><span style={{ color: 'var(--text-secondary)' }}>{formatDate(history.reviewedAt)}</span></td>
                            <td>
                              <span className={`project-status-badge ${reviewResultTone(history.result)}`}>
                                {formatEnum(history.result)}
                              </span>
                            </td>
                            <td>
                              {history.updateProposalId && history.proposalStatus ? (
                                <span className={`project-status-badge ${proposalStatusTone(history.proposalStatus)}`}>
                                  {formatEnum(history.proposalStatus)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={history.note || undefined}>
                              {history.note || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td>
                              <button 
                                type="button"
                                className="project-detail-btn"
                                onClick={() => openProposalDetails(history)}
                              >
                                <Eye size={12} style={{ marginRight: '4px' }} /> View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Pagination */}
              <div className="project-table-pagination">
                <span>Showing {pageStart}–{pageEnd} of {totalElements}</span>
                <div>
                  <button
                    className="workspace-page-btn"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(0)}
                  >
                    First
                  </button>
                  <button
                    className="workspace-page-btn"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((c) => Math.max(c - 1, 0))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index}
                      className={`workspace-page-btn ${currentPage === index ? 'active' : ''}`}
                      onClick={() => setCurrentPage(index)}
                      disabled={totalElements === 0}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="workspace-page-btn"
                    disabled={currentPage >= pageCount - 1}
                    onClick={() => setCurrentPage((c) => Math.min(c + 1, pageCount - 1))}
                  >
                    Next
                  </button>
                  <button
                    className="workspace-page-btn"
                    disabled={currentPage >= pageCount - 1}
                    onClick={() => setCurrentPage(pageCount - 1)}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedHistoryReview && (
        <MonitoringReviewDetailsModal
          review={selectedHistoryReview}
          bundle={historyProposalBundle}
          onClose={() => {
            setSelectedHistoryReview(null);
            setHistoryProposalBundle(null);
          }}
          title="Proposal Details"
        />
      )}
      <ConfirmModal
        isOpen={!!proposalToWithdraw}
        title="Cancel submitted proposal?"
        message="The Manager will no longer be able to approve or reject this proposal. You can create a new proposal afterward."
        cancelText="Keep Proposal"
        confirmText={isWithdrawing ? 'Cancelling...' : 'Cancel Submission'}
        confirmDisabled={isWithdrawing}
        onCancel={() => {
          if (!isWithdrawing) setProposalToWithdraw(null);
        }}
        onConfirm={handleWithdrawProposalFromDashboard}
      />
    </section>
  );
};
