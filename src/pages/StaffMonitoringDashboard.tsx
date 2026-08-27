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
                          <th>Frequency</th>
                          <th>Assigned</th>
                          <th>Last Reviewed</th>
                          <th>Next Review</th>
                          <th style={{ width: 100 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAssignments.map(assignment => (
                          <tr key={assignment.id}>
                            <td><strong>{assignment.companyName}</strong></td>
                            {isManagerOrAdmin && <td>{assignment.assignedStaffEmail || assignment.assignedStaffName || 'N/A'}</td>}
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {getStatusBadge(assignment)}
                                {(assignment.latestProposalStatus === 'SUBMITTED' || assignment.latestProposalStatus === 'IN_REVIEW') && (
                                  <span className="workspace-badge warning" style={{ fontSize: 10 }}>Pending Approval</span>
                                )}
                                {assignment.latestProposalStatus === 'REJECTED' && (
                                  <span className="workspace-badge danger" style={{ fontSize: 10 }}>Rejected</span>
                                )}
                              </div>
                            </td>
                            <td>{assignment.frequency}</td>
                            <td><span style={{ color: 'var(--text-muted)' }}>{formatDate(assignment.createdAt)}</span></td>
                            <td><span style={{ color: 'var(--text-muted)' }}>{formatDate(assignment.lastReviewedAt)}</span></td>
                            <td><strong>{formatDate(assignment.nextReviewAt)}</strong></td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary"
                                disabled={assignment.displayStatus === 'PAUSED' || assignment.latestProposalStatus === 'SUBMITTED' || assignment.latestProposalStatus === 'IN_REVIEW'}
                                onClick={() => setSelectedAssignment(assignment)}
                              >
                                {assignment.latestProposalStatus === 'REJECTED' ? 'Review Again' : 'Review'}
                              </button>
                            </td>
                          </tr>
                        ))}
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
