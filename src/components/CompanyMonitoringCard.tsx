import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import { accountApi } from '../API/accountApi';
import type {
  CompanyMonitoringAssignmentResponse,
  MonitoringFrequency,
  MonitoringStatus,
  MonitoringReviewResult
} from '../types/domain';
import { useUser, ROLES } from '../context/UserContext';
import { CompanyRelationshipChangeModal } from './CompanyMonitoring/CompanyRelationshipChangeModal';
import { AssignMonitorModal } from './CompanyMonitoring/AssignMonitorModal';
import { PendingProposalsList } from './CompanyMonitoring/PendingProposalsList';
import { PendingProfileUpdatesList } from './CompanyMonitoring/PendingProfileUpdatesList';
import { CompanyRelationshipHistoryList } from './CompanyMonitoring/CompanyRelationshipHistoryList';
import { StaffMonitoringReviewPage } from '../pages/StaffMonitoringReviewPage';
import styles from './CompanyMonitoringCard.module.css';

interface CompanyMonitoringCardProps {
  companyProfileId: string;
  responsibleManagerId?: number;
  setActivePage?: (page: string, params?: Record<string, string>) => void;
}

export const CompanyMonitoringCard: React.FC<CompanyMonitoringCardProps> = ({ companyProfileId, responsibleManagerId }) => {
  const { t } = useTranslation('company-monitoring');
  const { currentUser } = useUser();
  const [assignment, setAssignment] = useState<CompanyMonitoringAssignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<MonitoringReviewResult>('NO_CHANGE');
  const [reviewNote, setReviewNote] = useState('');

  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyMonitoringApi.getAssignmentByCompany(companyProfileId);
      setAssignment(data ?? null);
    } catch (err: any) {
      if (err.status === 404 || err.status === 400) {
        setAssignment(null);
      } else {
        setError(t('error_fetching_assignment', 'Failed to load monitoring assignment.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyProfileId) {
      fetchAssignment();
    }
  }, [companyProfileId]);

  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);

  const canManage = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.MANAGER;
  const canReview = currentUser?.role === ROLES.ADMIN || 
                   (currentUser?.role === ROLES.STAFF && assignment?.assignedStaffId === currentUser.id);



  const handleToggleStatus = async () => {
    if (!assignment) return;
    try {
      if (assignment.assignmentStatus === 'ACTIVE') {
        await companyMonitoringApi.pauseAssignment(assignment.id);
      } else {
        await companyMonitoringApi.resumeAssignment(assignment.id);
      }
      fetchAssignment();
    } catch (err) {
      setError(t('error_toggling_status', 'Failed to toggle status.'));
    }
  };

  const handleSubmitReview = async () => {
    if (!assignment) return;

    try {
      let finalProposalId = undefined;
      
      if (reviewResult === 'UPDATE_PROPOSED') {
        if (!reviewNote.trim()) {
          setError(t('error_missing_note', 'Please provide a summary of the proposed changes.'));
          return;
        }
        const proposal = await companyMonitoringApi.createMonitoringProposal(assignment.companyProfileId, reviewNote);
        finalProposalId = proposal.id;
      }

      await companyMonitoringApi.submitReview(assignment.id, {
        result: reviewResult,
        updateProposalId: finalProposalId,
        note: reviewNote
      });
      setIsReviewing(false);
      setReviewNote('');
      fetchAssignment();
    } catch (err) {
      setError(t('error_submitting_review', 'Failed to submit review.'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_SCHEDULE':
      case 'UP_TO_DATE': return 'var(--color-success-dark, #059669)';
      case 'DUE': return 'var(--color-warning-dark, #D97706)';
      case 'OVERDUE': return 'var(--color-error-dark, #DC2626)';
      case 'PAUSED': return 'var(--color-text-muted, #94A3B8)';
      default: return 'var(--color-text-main, #334155)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ON_SCHEDULE':
      case 'UP_TO_DATE': return 'var(--color-success-light, #ECFDF5)';
      case 'DUE': return 'var(--color-warning-light, #FFFBEB)';
      case 'OVERDUE': return 'var(--color-error-light, #FEF2F2)';
      case 'PAUSED': return 'var(--color-surface-hover, #F1F5F9)';
      default: return '#F1F5F9';
    }
  };

  if (loading) {
    return <div className={styles.loadingPulse}></div>;
  }

  return (
    <div className={styles.cardContainer}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Bell className={styles.titleIcon} size={18} />
          <h3 className={styles.title}>{t('monitoring_title', 'Continuous Monitoring')}</h3>
        </div>
        {assignment && canManage && (
          <div className={styles.actions}>
            <button onClick={handleToggleStatus} className={styles.iconButton} title={assignment.assignmentStatus === 'ACTIVE' ? 'Pause' : 'Resume'}>
              {assignment.assignmentStatus === 'ACTIVE' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
            </button>
            <button onClick={() => setIsAssignModalOpen(true)} className={styles.iconButton} title="Edit">
              <Edit2 size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {!assignment && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{t('no_assignment', 'This company is not currently being monitored.')}</p>
          {canManage && (
            <button onClick={() => setIsAssignModalOpen(true)} className={styles.primaryButton}>
              {t('assign_monitor', 'Assign Monitor')}
            </button>
          )}
        </div>
      )}

      {isAssignModalOpen && (
        <AssignMonitorModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={fetchAssignment}
          selectedCompany={{ id: companyProfileId } as any}
          selectedAssignment={assignment}
        />
      )}

      {assignment && (
        <div className={styles.assignmentDetails}>
          <div className={styles.statusBadge} style={{ 
            color: getStatusColor(assignment.displayStatus), 
            backgroundColor: getStatusBg(assignment.displayStatus) 
          }}>
            {(assignment.displayStatus === 'ON_SCHEDULE' || assignment.displayStatus === 'UP_TO_DATE') && <CheckCircle size={14} />}
            {assignment.displayStatus === 'DUE' && <AlertCircle size={14} />}
            {assignment.displayStatus === 'OVERDUE' && <AlertCircle size={14} />}
            {assignment.displayStatus === 'PAUSED' && <PauseCircle size={14} />}
            <span>{assignment.displayStatus === 'ON_SCHEDULE' || assignment.displayStatus === 'UP_TO_DATE' ? 'On Schedule' : assignment.displayStatus === 'DUE' ? 'Due' : assignment.displayStatus === 'OVERDUE' ? 'Overdue' : assignment.displayStatus === 'PAUSED' ? 'Paused' : assignment.displayStatus.replace(/_/g, ' ')}</span>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <User size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('assigned_staff', 'Assigned Staff')}</span>
                <span className={styles.infoValue}>{assignment.assignedStaffName}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Clock size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('review_cycle', 'Review Cycle')}</span>
                <span className={styles.infoValue}>{assignment.frequency === 'SEMI_ANNUALLY' ? 'Semi-annually' : assignment.frequency.charAt(0) + assignment.frequency.slice(1).toLowerCase()}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Calendar size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('next_review', 'Next Review')}</span>
                <span className={styles.infoValue}>
                  {assignment.nextReviewAt ? new Date(assignment.nextReviewAt).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <AlertCircle size={14} className={styles.infoIcon} style={{ color: getStatusColor(assignment.displayStatus) }} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('status', 'Status')}</span>
                <span className={styles.infoValue} style={{ color: getStatusColor(assignment.displayStatus) }}>
                  {assignment.assignmentStatus === 'PAUSED' ? 'Paused' : assignment.displayStatus === 'OVERDUE' ? 'Overdue' : 'Active'}
                </span>
              </div>
            </div>
            {assignment.lastReviewedAt && (
              <div className={styles.infoItem}>
                <CheckCircle size={14} className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>{t('last_review', 'Last Review')}</span>
                  <span className={styles.infoValue}>
                    {new Date(assignment.lastReviewedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {canReview && assignment.assignmentStatus === 'ACTIVE' && !isReviewing && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setIsReviewing(true)} className={styles.reviewButton}>
                {t('submit_review', 'Submit Review')}
              </button>
              <button onClick={() => setIsRelationshipModalOpen(true)} className={styles.secondaryButton}>
                Propose Relationship Change
              </button>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: '32px' }}>
          <PendingProposalsList companyProfileId={companyProfileId} />
          <PendingProfileUpdatesList companyProfileId={companyProfileId} />
        </div>
      )}

      <CompanyRelationshipHistoryList companyProfileId={companyProfileId} />

      {assignment && (
        <CompanyRelationshipChangeModal
          open={isRelationshipModalOpen}
          onClose={() => setIsRelationshipModalOpen(false)}
          assignmentId={assignment.id}
          onSuccess={fetchAssignment}
        />
      )}

      {isReviewing && assignment && (
        <StaffMonitoringReviewPage
          assignmentId={assignment.id}
          companyProfileId={assignment.companyProfileId}
          onClose={() => setIsReviewing(false)}
          onSuccess={() => {
            setIsReviewing(false);
            fetchAssignment();
          }}
        />
      )}
    </div>
  );
};
