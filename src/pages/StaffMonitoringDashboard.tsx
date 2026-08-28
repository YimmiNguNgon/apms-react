import React, { useState, useEffect, useMemo } from 'react';
import { useUser, ROLES } from '../context/UserContext';
import { StaffMonitoringReviewPage } from './StaffMonitoringReviewPage';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import type { CompanyMonitoringAssignmentResponse } from '../types/domain';

type CompanyMonitoringAssignment = CompanyMonitoringAssignmentResponse;

const PAGE_SIZE = 10;

const getAssignmentTimestamp = (assignment: CompanyMonitoringAssignment) => (
  new Date(assignment.updatedAt || assignment.createdAt || 0).getTime()
);

export const StaffMonitoringDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [assignments, setAssignments] = useState<CompanyMonitoringAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAssignment, setSelectedAssignment] = useState<CompanyMonitoringAssignment | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const isManagerOrAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.MANAGER;

  const sortedAssignments = useMemo(
    () => [...assignments].sort((left, right) => getAssignmentTimestamp(right) - getAssignmentTimestamp(left)),
    [assignments]
  );

  const totalCount = totalElements;
  const overdueCount = assignments.filter(a => a.displayStatus === 'OVERDUE').length;
  const dueCount = assignments.filter(a => a.displayStatus === 'DUE').length;
  
  const fetchAssignments = async (page = currentPage) => {
    try {
      setIsLoading(true);
      const params = { page, size: PAGE_SIZE, sort: 'updatedAt,desc' };
      const pageData = isManagerOrAdmin 
        ? await companyMonitoringApi.getAllAssignments(params)
        : await companyMonitoringApi.getMyAssignments(params);
      
      const nextAssignments = pageData.content || [];
      const nextTotalPages = Math.max(1, pageData.totalPages || 1);

      setAssignments(nextAssignments);
      setTotalElements(pageData.totalElements || nextAssignments.length);
      setTotalPages(nextTotalPages);

      if (page >= nextTotalPages && nextTotalPages > 0) {
        setCurrentPage(nextTotalPages - 1);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments(currentPage);
  }, [currentPage, isManagerOrAdmin]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (assignment: CompanyMonitoringAssignment) => {
    const status = assignment.displayStatus;
    let badgeClass = 'neutral';
    if (status === 'OVERDUE') badgeClass = 'danger';
    if (status === 'DUE') badgeClass = 'warning';
    if (status === 'UP_TO_DATE') badgeClass = 'success';
    
    return (
      <span className={`workspace-badge ${badgeClass}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <section className="workspace-page" id="page-monitoring">
      {!selectedAssignment ? (
        <div className="workspace-shell" style={{ gridTemplateColumns: '1fr' }}>
          <div className="workspace-main-full">
            <div className="workspace-breadcrumbs">Work Queue <span>/</span> Monitoring Assignments</div>
            <div className="workspace-page-head">
              <div>
                <h1>My Monitoring Assignments</h1>
                <p>Monitor and review your assigned companies.</p>
              </div>
              <div className="workspace-head-actions">
                <button className="btn btn-outline" onClick={() => fetchAssignments(currentPage)} disabled={isLoading}>Refresh</button>
              </div>
            </div>

            <div className="workspace-stats workspace-stats-compact">
              <article className="workspace-stat-card">
                <span className="workspace-stat-label">Total Assignments</span>
                <strong>{totalCount}</strong>
              </article>
              <article className="workspace-stat-card">
                <span className="workspace-stat-label">Overdue</span>
                <strong style={{ color: overdueCount > 0 ? 'var(--danger)' : 'inherit' }}>{overdueCount}</strong>
              </article>
              <article className="workspace-stat-card">
                <span className="workspace-stat-label">Due Soon</span>
                <strong style={{ color: dueCount > 0 ? 'var(--warning)' : 'inherit' }}>{dueCount}</strong>
              </article>
            </div>

            <div className="workspace-panel">
              {isLoading ? (
                <div className="workspace-empty" style={{ minHeight: 300 }}>Loading assignments...</div>
              ) : sortedAssignments.length === 0 ? (
                <div className="workspace-empty" style={{ minHeight: 300 }}>
                  <strong>Hiện tại không có việc nào được giao</strong>
                  <p>Khi quản lý giao việc giám sát công ty cho bạn, nó sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                <>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          {isManagerOrAdmin && <th>Assigned Staff</th>}
                          <th>Status</th>
                          <th>Review Cycle</th>
                          <th>Last Reviewed</th>
                          <th>Last Review Result</th>
                          <th>Next Review</th>
                          <th style={{ width: 100 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAssignments.map(assignment => {
                          let reviewResultLabel = '';
                          let reviewResultColor = '';
                          let reviewResultBg = '';
                          
                          if (assignment.latestReviewResult === 'NO_CHANGE') {
                            reviewResultLabel = 'No Change';
                            reviewResultColor = '#15803d';
                            reviewResultBg = '#dcfce7';
                          } else if (assignment.latestReviewResult === 'UPDATE_PROPOSED') {
                            reviewResultLabel = 'Update Proposed';
                            reviewResultColor = '#1d4ed8';
                            reviewResultBg = '#dbeafe';
                          } else if (assignment.latestReviewResult === 'RELATIONSHIP_CHANGE_PROPOSED') {
                            reviewResultLabel = 'Relationship Change Proposed';
                            reviewResultColor = '#7e22ce';
                            reviewResultBg = '#f3e8ff';
                          }

                          let proposalBadge = null;
                          if (assignment.latestReviewResult === 'UPDATE_PROPOSED' && assignment.latestProposalStatus) {
                            let label = assignment.latestProposalStatus;
                            let color = '#475569';
                            let bg = '#f1f5f9';
                            if (['SUBMITTED', 'IN_REVIEW', 'PENDING'].includes(assignment.latestProposalStatus)) {
                              label = 'Pending';
                              color = '#b45309';
                              bg = '#fef3c7';
                            } else if (assignment.latestProposalStatus === 'APPROVED') {
                              label = 'Approved';
                              color = '#15803d';
                              bg = '#dcfce7';
                            } else if (assignment.latestProposalStatus === 'REJECTED') {
                              label = 'Rejected';
                              color = '#b91c1c';
                              bg = '#fee2e2';
                            }
                            proposalBadge = (
                              <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color, background: bg }}>
                                {label}
                              </span>
                            );
                          }

                          return (
                            <tr key={assignment.id}>
                              <td><strong>{assignment.companyName}</strong></td>
                              {isManagerOrAdmin && <td>{assignment.assignedStaffEmail || assignment.assignedStaffName || 'N/A'}</td>}
                              <td>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  {getStatusBadge(assignment)}
                                </div>
                              </td>
                              <td>{assignment.frequency}</td>
                              <td><span style={{ color: 'var(--text-muted)' }}>{assignment.lastReviewedAt ? formatDate(assignment.lastReviewedAt) : '—'}</span></td>
                              <td>
                                {assignment.latestReviewResult ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: reviewResultColor, background: reviewResultBg }}>
                                      {reviewResultLabel}
                                    </span>
                                    {proposalBadge}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td><strong>{formatDate(assignment.nextReviewAt)}</strong></td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-primary"
                                  disabled={assignment.displayStatus === 'PAUSED' || (assignment.latestReviewResult === 'UPDATE_PROPOSED' && ['SUBMITTED', 'IN_REVIEW', 'PENDING'].includes(assignment.latestProposalStatus || ''))}
                                  onClick={() => setSelectedAssignment(assignment)}
                                >
                                  {(assignment.latestReviewResult === 'UPDATE_PROPOSED' && assignment.latestProposalStatus === 'REJECTED') ? 'Review Again' : 'Review'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Trang {currentPage + 1} / {totalPages} (Tổng cộng {totalElements} dòng)
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentPage === 0 || isLoading}
                        onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                      >
                        Trước
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={currentPage >= totalPages - 1 || isLoading}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
                      >
                        Tiếp
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <StaffMonitoringReviewPage
          assignmentId={selectedAssignment.id}
          companyProfileId={selectedAssignment.companyProfileId}
          onClose={() => {
            setSelectedAssignment(null);
          }}
          onSuccess={() => {
            setSelectedAssignment(null);
            fetchAssignments();
          }}
        />
      )}
    </section>
  );
};
