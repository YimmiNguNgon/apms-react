import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, CircleDashed } from 'lucide-react';
import styles from './ProjectProgressOverview.module.css';
import type { ProjectStatus } from '../../types/domain';

interface ProjectProgressOverviewProps {
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  isOverdue?: boolean;
  plannedEndDate?: string | null;
  projectStatus?: ProjectStatus;
  isOkrProject?: boolean;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'No date set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

export const ProjectProgressOverview: React.FC<ProjectProgressOverviewProps> = ({
  totalTasks = 0,
  completedTasks = 0,
  progressPercentage = 0,
  isOverdue = false,
  plannedEndDate,
  projectStatus,
  isOkrProject = false,
}) => {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercentage)));
  const safeTotal = Math.max(0, totalTasks);
  const safeCompleted = Math.max(0, completedTasks);
  const safeRemaining = Math.max(0, safeTotal - safeCompleted);

  const isCompleted = safeProgress >= 100 || projectStatus === 'COMPLETED';
  const isZeroTasks = safeTotal === 0;

  // Derive status label
  let statusLabel = 'In Progress';
  if (projectStatus === 'COMPLETED' || isCompleted) {
    statusLabel = 'Completed';
  } else if (projectStatus === 'CANCELLED') {
    statusLabel = 'Cancelled';
  } else if (isOverdue) {
    statusLabel = 'Overdue';
  } else if (projectStatus === 'DRAFT') {
    statusLabel = 'Draft';
  } else if (projectStatus === 'ARCHIVED') {
    statusLabel = 'Archived';
  } else if (safeProgress > 0) {
    statusLabel = 'On Track';
  }

  const getStatusClass = () => {
    if (projectStatus === 'CANCELLED' || projectStatus === 'ARCHIVED') return styles.statusNeutral;
    if (isCompleted) return styles.statusCompleted;
    if (isOverdue) return styles.statusOverdue;
    if (safeProgress > 0) return styles.statusOnTrack;
    return styles.statusNeutral;
  };

  return (
    <section className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <h2>Project Progress</h2>
        <span className={`${styles.statusBadge} ${getStatusClass()}`}>
          {isCompleted && <CheckCircle2 size={14} />}
          {isOverdue && !isCompleted && <AlertCircle size={14} />}
          {(!isCompleted && !isOverdue) && <CircleDashed size={14} />}
          {statusLabel}
        </span>
      </div>

      <div className={styles.mainProgressArea}>
        <div className={styles.progressTextHeader}>
          <span className={styles.percentage}>{safeProgress}%</span>
          {isOkrProject ? (
            <span className={styles.taskCount}>Overall OKR Progress</span>
          ) : isZeroTasks ? (
            <span className={styles.taskCount}>No tasks yet</span>
          ) : (
            <span className={styles.taskCount}>
              {safeCompleted} of {safeTotal} tasks completed
            </span>
          )}
        </div>

        <div
          className={styles.progressBarWrapper}
          role="progressbar"
          aria-valuenow={safeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Project progress"
        >
          <div
            className={`${styles.progressBarFill} ${isCompleted ? styles.fillCompleted : isOverdue ? styles.fillOverdue : ''}`}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {!isOkrProject && (
          <>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>
                <CheckCircle2 size={14} className={styles.metricIconCompleted} />
                Completed
              </div>
              <div className={styles.metricValue}>{safeCompleted}</div>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>
                <CircleDashed size={14} className={styles.metricIconRemaining} />
                Remaining
              </div>
              <div className={styles.metricValue}>{safeRemaining}</div>
            </div>
          </>
        )}

        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>
            <Calendar size={14} className={styles.metricIconCalendar} />
            Planned End Date
          </div>
          <div className={`${styles.metricValue} ${isOverdue ? styles.overdueValue : ''}`}>
            {formatDate(plannedEndDate)}
          </div>
        </div>
      </div>

      {isOverdue && !isCompleted && projectStatus !== 'CANCELLED' && (
        <div className={styles.overdueWarning}>
          <AlertCircle size={16} />
          <span>This project is past its planned end date and still has incomplete tasks.</span>
        </div>
      )}

      {isZeroTasks && !isOkrProject && projectStatus !== 'CANCELLED' && (
        <div className={styles.zeroStateMessage}>
          Project progress will appear after tasks are added.
        </div>
      )}
    </section>
  );
};
