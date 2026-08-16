import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { PageResponse } from '../services/api';
import styles from './StaffMonitoring.module.css';
import { useUser, ROLES } from '../context/UserContext';
import { CompanyProfileEditModal } from '../components/Monitoring/CompanyProfileEditModal';

import { companyMonitoringApi } from '../API/companyMonitoringApi';

interface CompanyMonitoringAssignment {
  id: number;
  companyProfileId: string;
  companyName: string;
  frequency: string;
  assignmentStatus: string;
  displayStatus: string;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
}

export const StaffMonitoringDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [assignments, setAssignments] = useState<CompanyMonitoringAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAssignment, setSelectedAssignment] = useState<CompanyMonitoringAssignment | null>(null);
  
  const isManagerOrAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.MANAGER;

  // Summary Stats
  const totalCount = assignments.length;
  const overdueCount = assignments.filter(a => a.displayStatus === 'OVERDUE').length;
  const dueCount = assignments.filter(a => a.displayStatus === 'DUE').length;
  
  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const params = { size: 100 };
      const pageData = isManagerOrAdmin 
        ? await companyMonitoringApi.getAllAssignments(params)
        : await companyMonitoringApi.getMyAssignments(params);
      
      // We can map it directly or set it if the types match closely enough
      // companyMonitoringApi returns CompanyMonitoringAssignmentResponse which fits our local interface
      setAssignments((pageData.content as any) || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'OVERDUE': return styles.error;
      case 'DUE': return styles.warning;
      case 'UP_TO_DATE': return styles.success;
      case 'PAUSED': return styles.paused;
      default: return '';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Monitoring Assignments</h1>
        <p className={styles.pageSubtitle}>Monitor and review your assigned companies.</p>
      </header>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Total Assignments</span>
          <span className={styles.summaryCardValue}>{totalCount}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Overdue</span>
          <span className={`${styles.summaryCardValue} ${overdueCount > 0 ? styles.error : ''}`}>
            {overdueCount}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Due Soon</span>
          <span className={`${styles.summaryCardValue} ${dueCount > 0 ? styles.warning : ''}`}>
            {dueCount}
          </span>
        </div>
      </section>

      <section className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Assignment List</h2>
        </div>
        <section className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loading}>Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className={styles.empty}>No monitoring assignments found.</div>
        ) : (
          <table className={styles.assignmentTable}>
            <thead>
              <tr>
                <th>Company</th>
                {isManagerOrAdmin && <th>Assigned Staff</th>}
                <th>Status</th>
                <th>Frequency</th>
                <th>Last Reviewed</th>
                <th>Next Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{assignment.companyName}</td>
                  {isManagerOrAdmin && <td>{assignment.assignedStaffEmail || assignment.assignedStaffName || 'N/A'}</td>}
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(assignment.displayStatus)}`}>
                      {assignment.displayStatus.replace('_', ' ')}
                    </span>
                    {(assignment.latestProposalStatus === 'SUBMITTED' || assignment.latestProposalStatus === 'IN_REVIEW') && (
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', padding: '2px 6px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: 4, fontWeight: 'bold' }}>
                        Pending Approval
                      </span>
                    )}
                    {assignment.latestProposalStatus === 'REJECTED' && (
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', padding: '2px 6px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 4, fontWeight: 'bold' }}>
                        Rejected
                      </span>
                    )}
                  </td>
                  <td>{assignment.frequency}</td>
                  <td>{formatDate(assignment.lastReviewedAt)}</td>
                  <td>{formatDate(assignment.nextReviewAt)}</td>
                  <td>
                    <button 
                      className={styles.actionButton}
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
        )}
        </section>
      </section>

      {selectedAssignment && (
        <CompanyProfileEditModal
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
    </div>
  );
};
