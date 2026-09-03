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
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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
      return 'info';
    case 'UPDATE_PROPOSED':
      return 'warning';
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'primary';
    default:
      return 'neutral';
  }
};

const getStatusBadge = (assignment: CompanyMonitoringAssignment) => {
  const status = assignment.displayStatus;
  let badgeClass = 'neutral';
  let label = 'On Schedule';
  if (status === 'OVERDUE') {
    badgeClass = 'danger';
    label = 'Overdue';
  } else if (status === 'DUE') {
    badgeClass = 'warning';
    label = 'Due';
  } else if (status === 'ON_SCHEDULE' || status === 'UP_TO_DATE') {
    badgeClass = 'success';
    label = 'On Schedule';
  } else if (status === 'PAUSED') {
    badgeClass = 'neutral';
    label = 'Paused';
  }
  return (
    <span className={`workspace-badge ${badgeClass}`} style={{ fontSize: 10 }}>
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

  const totalPages = Math.max(1, Math.ceil(currentTabData.length / PAGE_SIZE));
  
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, frequencyFilter, activeTab]);

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

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
    localStorage.setItem('apms-back-page', 'staff-monitoring');
    if (assignmentId) {
      localStorage.setItem('apms-staff-assignment-id', assignmentId.toString());
    } else {
      localStorage.removeItem('apms-staff-assignment-id');
    }
    if (setActivePage) {
      setActivePage('company-detail', { id: profileId });
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
    <div className="workspace-page-container">
      <div className="workspace-page-head">
        <div>
          <div className="workspace-breadcrumbs">Monitoring <span>/</span> My Assignments</div>
          <h1>Staff Monitoring</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage your company monitoring assignments and submit updates
          </p>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <article className="workspace-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Assignments</span>
          <strong style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>{totalCount}</strong>
        </article>
        <article className="workspace-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Soon</span>
          <strong style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)', marginTop: '8px' }}>{dueCount}</strong>
        </article>
        <article className="workspace-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</span>
          <strong style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)', marginTop: '8px' }}>{overdueCount}</strong>
        </article>
        <article className="workspace-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reviewed</span>
          <strong style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>{reviewedCount}</strong>
        </article>
      </section>

      <main className="workspace-panel">
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button 
            type="button"
            className={`tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => handleTabChange('monitoring')}
          >
            Monitoring
            <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'monitoring' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'monitoring' ? '#fff' : 'var(--text-secondary)' }}>
              {allAssignments.length}
            </span>
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'proposals' ? 'active' : ''}`}
            onClick={() => handleTabChange('proposals')}
          >
            My Proposals
            <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'proposals' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'proposals' ? '#fff' : 'var(--text-secondary)' }}>
              {myProposals.length}
            </span>
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            Monitoring History
            <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'history' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)' }}>
              {staffHistory.length}
            </span>
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: activeTab === 'monitoring' ? 'minmax(0, 1fr) 160px 180px' : 'minmax(0, 1fr) 200px', 
          gap: '12px', 
          marginBottom: '16px' 
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="admin-input"
              style={{ width: '100%', paddingLeft: 36, margin: 0 }}
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {activeTab === 'monitoring' && (
              <>
                <option value="ALL">All Statuses</option>
                <option value="ON_SCHEDULE">On Schedule</option>
                <option value="DUE">Due</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PAUSED">Paused</option>
              </>
            )}
            {activeTab === 'proposals' && (
              <>
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </>
            )}
            {activeTab === 'history' && (
              <>
                <option value="ALL">All Results</option>
                <option value="NO_CHANGE">No Change</option>
                <option value="UPDATE_PROPOSED">Update Proposed</option>
                <option value="RELATIONSHIP_CHANGE_PROPOSED">Relationship Change Proposed</option>
              </>
            )}
          </select>
          
          {activeTab === 'monitoring' && (
            <select 
              className="admin-select"
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
            >
              <option value="ALL">All Frequencies</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="SEMI_ANNUALLY">Semi-annually</option>
            </select>
          )}
        </div>

        <div>
          {isLoading ? (
            <div className="workspace-empty" style={{ minHeight: 200 }}>
              Loading data...
            </div>
          ) : (
            <>
              {activeTab === 'monitoring' && (
                visibleRows.length === 0 ? (
                  <div className="workspace-empty" style={{ minHeight: 200 }}>
                    You have no monitoring assignments.
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>STT</th>
                          <th>Company</th>
                          <th>Status</th>
                          <th>Review Cycle</th>
                          <th>Last Reviewed</th>
                          <th>Next Review</th>
                          <th style={{ width: 180 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringAssignment[]).map((assignment, idx) => (
                          <tr key={assignment.id}>
                            <td className="admin-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td><strong>{assignment.companyName}</strong></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {getStatusBadge(assignment)}
                              </div>
                            </td>
                            <td>{formatEnum(assignment.frequency)}</td>
                            <td><span style={{ color: 'var(--text-muted)' }}>{formatDate(assignment.lastReviewedAt)}</span></td>
                            <td><strong>{formatDate(assignment.nextReviewAt)}</strong></td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-sm btn-outline"
                                  onClick={() => navigateToCompany(assignment.companyProfileId, assignment.id)}
                                >
                                  View Profile
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary"
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
                  <div className="workspace-empty" style={{ minHeight: 200 }}>
                    No proposals submitted yet.
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>STT</th>
                          <th>Company</th>
                          <th>Submitted At</th>
                          <th>Proposal Type</th>
                          <th>Proposal Status</th>
                          <th style={{ width: 220 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringReviewResponse[]).map((proposal, idx) => (
                          <tr key={proposal.id}>
                            <td className="admin-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td><strong>{proposal.companyName}</strong></td>
                            <td><span style={{ color: 'var(--text-muted)' }}>{formatDate(proposal.reviewedAt)}</span></td>
                            <td>{formatEnum(proposal.result)}</td>
                            <td>
                              <span className={`workspace-badge ${proposalStatusTone(proposal.proposalStatus)}`}>
                                {formatEnum(proposal.proposalStatus)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-sm btn-outline"
                                  onClick={() => openProposalDetails(proposal)}
                                >
                                  <Eye size={14} /> View Details
                                </button>
                                {proposal.proposalStatus === 'SUBMITTED' && (
                                  <button
                                    className="btn btn-sm btn-danger"
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
                  <div className="workspace-empty" style={{ minHeight: 200 }}>
                    No monitoring history yet.
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>STT</th>
                          <th>Company</th>
                          <th>Reviewed At</th>
                          <th>Review Result</th>
                          <th>Proposal Decision</th>
                          <th>Note</th>
                          <th style={{ width: 140 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visibleRows as CompanyMonitoringReviewResponse[]).map((history, idx) => (
                          <tr key={history.id}>
                            <td className="admin-mono">{currentPage * PAGE_SIZE + idx + 1}</td>
                            <td><strong>{history.companyName}</strong></td>
                            <td><span style={{ color: 'var(--text-muted)' }}>{formatDate(history.reviewedAt)}</span></td>
                            <td>
                              <span className={`workspace-badge ${reviewResultTone(history.result)}`}>
                                {formatEnum(history.result)}
                              </span>
                            </td>
                            <td>
                              {history.updateProposalId && history.proposalStatus ? (
                                <span className={`workspace-badge ${proposalStatusTone(history.proposalStatus)}`}>
                                  {formatEnum(history.proposalStatus)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={history.note || undefined}>
                              {history.note || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline"
                                onClick={() => openProposalDetails(history)}
                              >
                                <Eye size={14} /> View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 0', gap: '8px' }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

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
    </div>
  );
};
