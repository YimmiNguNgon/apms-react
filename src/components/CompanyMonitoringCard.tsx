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
import { PendingProposalsList } from './CompanyMonitoring/PendingProposalsList';
import { PendingProfileUpdatesList } from './CompanyMonitoring/PendingProfileUpdatesList';
import { CompanyRelationshipHistoryList } from './CompanyMonitoring/CompanyRelationshipHistoryList';
import { StaffMonitoringReviewPage } from '../pages/StaffMonitoringReviewPage';
import styles from './CompanyMonitoringCard.module.css';

interface CompanyMonitoringCardProps {
  companyProfileId: string;
  responsibleManagerId?: number;
}

export const CompanyMonitoringCard: React.FC<CompanyMonitoringCardProps> = ({ companyProfileId, responsibleManagerId }) => {
  const { t } = useTranslation('company-monitoring');
  const { currentUser } = useUser();
  const [assignment, setAssignment] = useState<CompanyMonitoringAssignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editFrequency, setEditFrequency] = useState<MonitoringFrequency>('MONTHLY');
  const [editStaffEmail, setEditStaffEmail] = useState<string>('');

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<MonitoringReviewResult>('NO_CHANGE');
  const [reviewNote, setReviewNote] = useState('');

  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyMonitoringApi.getAssignmentByCompany(companyProfileId);
      setAssignment(data);
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

  useEffect(() => {
    if (!isEditing) return;

    const timeoutId = setTimeout(async () => {
        setIsSearchingStaff(true);
        try {
          const res = await accountApi.searchAccountsByEmail(editStaffEmail);
          setStaffUsers(res.data || []);
        } catch (err) {
        console.error('Failed to load staff users', err);
      } finally {
        setIsSearchingStaff(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [editStaffEmail, isEditing]);

  const canManage = currentUser?.role === ROLES.ADMIN || (currentUser?.role === ROLES.MANAGER && currentUser?.id === responsibleManagerId);
  const canReview = currentUser?.role === ROLES.ADMIN || 
                   (currentUser?.role === ROLES.STAFF && assignment?.assignedStaffId === currentUser.id);

  const handleAssignOrUpdate = async () => {
    if (!editStaffEmail) return;
    try {
      // The user might have typed a full email or picked from datalist.
      // We can search locally in staffUsers if we loaded them all.
      let targetUser = staffUsers.find(u => u.email.toLowerCase() === editStaffEmail.trim().toLowerCase());
      
      // If not found locally, try to query backend just in case
      if (!targetUser) {
        const res = await accountApi.searchAccountsByEmail(editStaffEmail);
        targetUser = (res.data || []).find(u => u.email.toLowerCase() === editStaffEmail.trim().toLowerCase());
      }

      if (!targetUser) {
        setError(t('error_staff_not_found', 'No STAFF found with this email.'));
        return;
      }
      
      const finalStaffId = targetUser.id;

      if (assignment) {
        await companyMonitoringApi.updateAssignment(assignment.id, {
          assignedStaffId: finalStaffId,
          frequency: editFrequency
        });
      } else {
        await companyMonitoringApi.assignMonitor({
          companyProfileId,
          assignedStaffId: finalStaffId,
          frequency: editFrequency
        });
      }
      setIsEditing(false);
      fetchAssignment();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || 'Failed to save assignment.';
      setError(t('error_saving_assignment', { defaultValue: errorMessage }) as string);
    }
  };

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
      case 'UP_TO_DATE': return 'var(--color-success-dark, #059669)';
      case 'DUE': return 'var(--color-warning-dark, #D97706)';
      case 'OVERDUE': return 'var(--color-error-dark, #DC2626)';
      case 'PAUSED': return 'var(--color-text-muted, #94A3B8)';
      default: return 'var(--color-text-main, #334155)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
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
        {assignment && canManage && !isEditing && (
          <div className={styles.actions}>
            <button onClick={handleToggleStatus} className={styles.iconButton} title={assignment.assignmentStatus === 'ACTIVE' ? 'Pause' : 'Resume'}>
              {assignment.assignmentStatus === 'ACTIVE' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
            </button>
            <button onClick={() => {
              setIsEditing(true);
              setEditFrequency(assignment.frequency);
              setEditStaffEmail(assignment.assignedStaffEmail || '');
            }} className={styles.iconButton} title="Edit">
              <Edit2 size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {!assignment && !isEditing && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{t('no_assignment', 'This company is not currently being monitored.')}</p>
          {canManage && (
            <button onClick={() => setIsEditing(true)} className={styles.primaryButton}>
              {t('assign_monitor', 'Assign Monitor')}
            </button>
          )}
        </div>
      )}

      {isEditing && (
        <div className={styles.editForm}>
          <div className={styles.formGroup} style={{ position: 'relative' }}>
            <label>{t('staff_email', 'Staff Email')}</label>
            <input 
              type="email"
              value={editStaffEmail} 
              onChange={e => setEditStaffEmail(e.target.value)}
              onFocus={() => {
                if (staffUsers.length > 0) {
                  // Only show if there's something to suggest
                  // We'll manage visibility via css
                }
              }}
              placeholder="e.g. staff@apms.com"
              className={styles.input}
            />
            {isEditing && editStaffEmail.trim().length > 0 && staffUsers.filter(u => u.email.toLowerCase() === editStaffEmail.trim().toLowerCase()).length === 0 && (
              <div className={styles.suggestionPanel}>
                <div className={styles.suggestionHead}>
                  <span>Suggestions</span>
                  {isSearchingStaff && <small>Loading...</small>}
                </div>
                {!isSearchingStaff && staffUsers.filter(u => u.email.toLowerCase().includes(editStaffEmail.toLowerCase()) || (u.fullName && u.fullName.toLowerCase().includes(editStaffEmail.toLowerCase()))).length === 0 && (
                  <div className={styles.suggestionEmpty}>No account found for this email.</div>
                )}
                {staffUsers
                  .filter(u => u.email.toLowerCase().includes(editStaffEmail.toLowerCase()) || (u.fullName && u.fullName.toLowerCase().includes(editStaffEmail.toLowerCase())))
                  .map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      className={styles.suggestionItem}
                      onMouseDown={() => setEditStaffEmail(account.email)}
                    >
                      <span className={styles.suggestionAvatar}>{(account.fullName || 'No').slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{account.fullName || 'No Name'}</strong>
                        <small>{account.email} - {account.roles?.[0] || 'BUSINESS_DEVELOPMENT_STAFF'}</small>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className={styles.formGroup}>
            <label>{t('frequency', 'Frequency')}</label>
            <select 
              value={editFrequency} 
              onChange={e => setEditFrequency(e.target.value as MonitoringFrequency)}
              className={styles.input}
            >
              <option value="MONTHLY">{t('monthly', 'Monthly')}</option>
              <option value="QUARTERLY">{t('quarterly', 'Quarterly')}</option>
              <option value="SEMI_ANNUALLY">{t('semi_annually', 'Semi-Annually')}</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <button onClick={handleAssignOrUpdate} className={styles.primaryButton} disabled={!editStaffEmail}>
              <Save size={14} /> {t('save', 'Save')}
            </button>
            <button onClick={() => setIsEditing(false)} className={styles.secondaryButton}>
              <X size={14} /> {t('cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {assignment && !isEditing && (
        <div className={styles.assignmentDetails}>
          <div className={styles.statusBadge} style={{ 
            color: getStatusColor(assignment.displayStatus), 
            backgroundColor: getStatusBg(assignment.displayStatus) 
          }}>
            {assignment.displayStatus === 'UP_TO_DATE' && <CheckCircle size={14} />}
            {assignment.displayStatus === 'DUE' && <AlertCircle size={14} />}
            {assignment.displayStatus === 'OVERDUE' && <AlertCircle size={14} />}
            {assignment.displayStatus === 'PAUSED' && <PauseCircle size={14} />}
            <span>{assignment.displayStatus.replace(/_/g, ' ')}</span>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <User size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('assignee', 'Assignee')}</span>
                <span className={styles.infoValue}>{assignment.assignedStaffName}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Clock size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('frequency', 'Frequency')}</span>
                <span className={styles.infoValue}>{assignment.frequency}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Calendar size={14} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{t('next_review', 'Next Review')}</span>
                <span className={styles.infoValue}>
                  {new Date(assignment.nextReviewAt).toLocaleDateString()}
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
