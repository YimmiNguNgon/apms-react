import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import type { ProjectTaskSubmissionResponse } from '../../../types/domain';
import { ConfirmModal } from '../Shared/ConfirmModal';
import styles from '../ManagerNewsReviewWorkspace.module.css';

interface ManagerReviewPanelProps {
  submission: ProjectTaskSubmissionResponse | null;
  submissionHistory: ProjectTaskSubmissionResponse[];
  articleCount: number;
  targetCompanyName?: string | null;
  submittedByLabel?: string | null;
  processing: boolean;
  onApprove: (comment: string) => Promise<boolean>;
  onReject: (comment: string) => Promise<boolean>;
}

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return 'Unknown';
  try {
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
};

const humanStatus = (status?: string | null) => {
  if (!status) return 'UNKNOWN';
  if (status === 'REJECTED') return 'RETURNED';
  if (status === 'IN_REVIEW' || status === 'SUBMITTED') return 'IN_REVIEW';
  return status;
};

export const ManagerReviewPanel: React.FC<ManagerReviewPanelProps> = ({
  submission,
  submissionHistory,
  articleCount,
  targetCompanyName,
  submittedByLabel,
  processing,
  onApprove,
  onReject
}) => {
  const [approvalComment, setApprovalComment] = useState('');
  const [returnFeedback, setReturnFeedback] = useState('');
  const [dialog, setDialog] = useState<'APPROVE' | 'RETURN' | null>(null);
  const [feedbackTouched, setFeedbackTouched] = useState(false);

  const isPending = submission?.status === 'SUBMITTED' || submission?.status === 'IN_REVIEW';
  const isApproved = submission?.status === 'APPROVED';
  const returnFeedbackMissing = feedbackTouched && !returnFeedback.trim();

  const closeDialog = () => {
    if (processing) return;
    setDialog(null);
    setFeedbackTouched(false);
  };

  const confirmApprove = async () => {
    const ok = await onApprove(approvalComment.trim());
    if (ok) setDialog(null);
  };

  const confirmReturn = async () => {
    setFeedbackTouched(true);
    if (!returnFeedback.trim()) return;
    const ok = await onReject(returnFeedback.trim());
    if (ok) setDialog(null);
  };

  return (
    <>
      <section className={styles.historyCard}>
        <h3>Review history</h3>
        <div className={styles.historyList}>
          {submissionHistory.length === 0 && <div className={styles.emptyState} style={{ padding: '18px 10px' }}>No submission yet.</div>}
          {submissionHistory.map((item) => (
            <article className={styles.historyItem} key={item.id}>
              <strong>{humanStatus(item.status)}</strong>
              <span>{item.note || 'Submitting company news research drafts for review'}</span>
              <small>{formatDateTime(item.submittedAt || item.createdAt)}</small>
              {item.reviewComment && <small>Feedback: {item.reviewComment}</small>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.decisionCard}>
        <h3>Manager decision</h3>

        {!submission ? (
          <div className={styles.emptyState} style={{ padding: '20px 10px' }}>No active submission found.</div>
        ) : (
          <>
            <div className={styles.sideMeta}>
              <div className={styles.sideMetaItem}>
                <span>Status</span>
                <strong>{humanStatus(submission.status)}</strong>
              </div>
              <div className={styles.sideMetaItem}>
                <span>Submitted by</span>
                <strong>{submittedByLabel || (submission.submittedByUserId ? `User ID ${submission.submittedByUserId}` : 'Unknown')}</strong>
              </div>
              <div className={styles.sideMetaItem}>
                <span>Articles</span>
                <strong>{articleCount}</strong>
              </div>
            </div>

            <div className={styles.reviewDivider} />

            {isPending ? (
              <>
                <label className={styles.dialogField}>
                  <span>Approval note optional</span>
                  <textarea
                    value={approvalComment}
                    onChange={(event) => setApprovalComment(event.target.value)}
                    placeholder="Optional note for the approval history..."
                    disabled={processing}
                    style={{ minHeight: 78 }}
                  />
                </label>
                <button
                  type="button"
                  className={styles.approveButton}
                  onClick={() => setDialog('APPROVE')}
                  disabled={processing || articleCount === 0}
                >
                  <CheckCircle2 size={17} /> {processing ? 'Approving...' : 'Approve Submission'}
                </button>
                <button
                  type="button"
                  className={styles.returnButton}
                  onClick={() => {
                    setReturnFeedback('');
                    setFeedbackTouched(false);
                    setDialog('RETURN');
                  }}
                  disabled={processing}
                >
                  <RotateCcw size={17} /> Return for Changes
                </button>
              </>
            ) : (
              <div className={styles.processedBox}>
                {isApproved ? (
                  <>
                    <strong><ShieldCheck size={15} /> APPROVED</strong>
                    <br />
                    {articleCount} article(s) approved.
                    <br />
                    Published to: {targetCompanyName || 'Target Company'} Internal News
                    <br />
                    Confidentiality: CONFIDENTIAL
                  </>
                ) : (
                  <>
                    <strong>RETURNED</strong>
                    <br />
                    This submission is readonly. Staff can update drafts and submit again.
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmModal
        isOpen={dialog === 'APPROVE'}
        title="Approve news research?"
        message={
          <div>
            <p style={{ marginTop: 0 }}>
              You are approving {articleCount} news article(s) for <strong>{targetCompanyName || 'the target company'}</strong>.
            </p>
            <p style={{ marginBottom: 0 }}>
              Approved articles will be published to the company's confidential internal intelligence.
            </p>
          </div>
        }
        confirmText={processing ? 'Approving...' : 'Approve Submission'}
        confirmDisabled={processing}
        onConfirm={() => void confirmApprove()}
        onCancel={closeDialog}
      />

      <ConfirmModal
        isOpen={dialog === 'RETURN'}
        title="Return News Research"
        message={
          <div>
            <p style={{ marginTop: 0 }}>Please explain what needs to be corrected.</p>
            <label className={styles.dialogField}>
              <span>Manager Feedback *</span>
              <textarea
                value={returnFeedback}
                onChange={(event) => {
                  setReturnFeedback(event.target.value);
                  setFeedbackTouched(true);
                }}
                placeholder="Verify the source, correct the summary, or explain what information needs to be updated."
                autoFocus
              />
            </label>
            {(returnFeedbackMissing || !returnFeedback.trim()) && (
              <p className={styles.helperText}>Tell the Staff what needs to be corrected.</p>
            )}
          </div>
        }
        confirmText={processing ? 'Returning...' : 'Return to Staff'}
        cancelText="Cancel"
        isDestructive
        confirmDisabled={processing || !returnFeedback.trim()}
        onConfirm={() => void confirmReturn()}
        onCancel={closeDialog}
      />
    </>
  );
};
