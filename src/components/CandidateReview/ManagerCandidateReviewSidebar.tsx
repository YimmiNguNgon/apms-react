import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { ProjectTaskSubmissionResponse } from '../../types/domain';
import { ConfirmModal } from '../Shared/ConfirmModal';
import styles from './CandidateReview.module.css';

interface ManagerCandidateReviewSidebarProps {
  submission: ProjectTaskSubmissionResponse | null;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  processing: boolean;
  canApprove?: boolean;
}

export const ManagerCandidateReviewSidebar: React.FC<ManagerCandidateReviewSidebarProps> = ({
  submission,
  onApprove,
  onReject,
  processing,
  canApprove = true,
}) => {
  const [comment, setComment] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; isDestructive?: boolean;
    confirmText?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const handleApprove = () => {
    onApprove(comment);
    closeConfirm();
  };

  const handleReject = () => {
    onReject(comment);
    closeConfirm();
  };

  if (!submission) {
    return (
      <div className={styles.sidebarPanel}>
        <h3>Task Review</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <AlertCircle size={16} />
          <span>No active submission found.</span>
        </div>
      </div>
    );
  }

  const isPending = submission.status === 'SUBMITTED' || submission.status === 'IN_REVIEW';

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarPanel}>
        <h3>Review Assessment</h3>
        <p className={styles.sidebarHelpText}>
          This decision applies to the Candidate Data Preparation task.
        </p>

        {!isPending ? (
          <div className={styles.sidebarAlert}>
            This submission has already been processed ({submission.status}).
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Review Comment
              </label>
              <textarea 
                rows={4}
                placeholder="Leave feedback for the staff member..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmConfig({
                  isOpen: true,
                  title: 'Approve Task Submission?',
                  message: 'Are you sure you want to approve this candidate draft? This will finalize the Company Profile.',
                  confirmText: 'Approve',
                  onConfirm: handleApprove
                })}
                style={{ flex: 1, display: canApprove ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}
                disabled={processing}
              >
                <CheckCircle2 size={18} /> {processing ? 'Approving...' : 'Approve'}
              </button>
              <button 
                onClick={() => {
                  if (!comment.trim()) {
                    alert('Please provide a review comment before rejecting.');
                    return;
                  }
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Reject Task Submission?',
                    message: 'Are you sure you want to reject this task? Staff will be notified and can edit the drafts to resubmit.',
                    isDestructive: true,
                    confirmText: 'Reject',
                    onConfirm: handleReject
                  });
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}
                disabled={processing}
              >
                <XCircle size={18} /> {processing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};
