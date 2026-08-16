import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { companyNewsResearchApi } from '../../API/companyNewsResearchApi';
import { taskApi } from '../../API/taskApi';
import type { CompanyNewsResearchDraft, ProjectTaskSubmissionResponse, TaskStatus } from '../../types/domain';
import { ManagerNewsSubmissionList } from './Manager/ManagerNewsSubmissionList';
import { ManagerReviewPanel } from './Manager/ManagerReviewPanel';
import { NewsArticleDetail } from './Shared/NewsArticleDetail';
import { WorkspaceToast, type ToastState } from './Shared/WorkspaceToast';
import styles from './ManagerNewsReviewWorkspace.module.css';

interface ManagerNewsReviewWorkspaceProps {
  projectId: number;
  taskId: number;
  taskTitle?: string | null;
  taskDescription?: string | null;
  taskStatus?: TaskStatus | string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  assignedToName?: string | null;
  onClose: () => void;
  onReviewed?: (message: string, isSuccess: boolean) => void;
  workbenchSubmissions?: ProjectTaskSubmissionResponse[];
}

export const ManagerNewsReviewWorkspace: React.FC<ManagerNewsReviewWorkspaceProps> = ({
  projectId,
  taskId,
  taskTitle,
  taskDescription,
  targetCompanyName,
  assignedToName,
  onClose,
  onReviewed,
  workbenchSubmissions
}) => {
  const [drafts, setDrafts] = useState<CompanyNewsResearchDraft[]>([]);
  const [submission, setSubmission] = useState<ProjectTaskSubmissionResponse | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<ProjectTaskSubmissionResponse[]>(workbenchSubmissions || []);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [draftsRes, submissionsRes] = await Promise.all([
        companyNewsResearchApi.getDrafts(projectId, taskId),
        taskApi.getSubmissions(projectId, taskId, { size: 50, page: 0 })
      ]);
      setDrafts(draftsRes.data || []);

      const fetchedSubmissions = submissionsRes.data?.content || [];
      const subs = fetchedSubmissions.length > 0 ? fetchedSubmissions : workbenchSubmissions || [];
      const sorted = [...subs].sort((a, b) => b.id - a.id);
      setSubmissionHistory(sorted);
      setSubmission(sorted[0] || null);
    } catch (err) {
      console.error('Failed to load manager review data', err);
      setToast({ kind: 'error', message: 'Unable to load submitted news articles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId]);

  const handleApprove = async (comment: string) => {
    if (!submission) return false;
    try {
      setProcessing(true);
      await taskApi.reviewSubmission(projectId, taskId, submission.id, {
        decision: 'APPROVE',
        comment: comment || 'Approved by manager.'
      });
      if (onReviewed) {
        onReviewed('Submission approved. Approved news articles were published to confidential Internal News.', true);
      } else {
        setToast({ kind: 'success', message: 'Submission approved. Approved news articles were published to confidential Internal News.' });
      }
      await fetchData();
      return true;
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = apiError.response?.data?.message || apiError.message || 'Unable to approve this submission.';
      setToast({ kind: 'error', message: errMsg });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (comment: string) => {
    if (!submission) return false;
    try {
      setProcessing(true);
      await taskApi.reviewSubmission(projectId, taskId, submission.id, {
        decision: 'REJECT',
        comment
      });
      if (onReviewed) {
        onReviewed('Returned for changes. Staff can edit the drafts and submit again.', true);
      } else {
        setToast({ kind: 'success', message: 'Returned for changes. Staff can edit the drafts and submit again.' });
      }
      await fetchData();
      return true;
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      setToast({ kind: 'error', message: apiError.response?.data?.message || apiError.message || 'Unable to return this submission to Staff.' });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const reviewDrafts = useMemo(() => {
    if (submission?.status === 'APPROVED') {
      return drafts.filter((draft) => draft.reviewStatus === 'APPROVED');
    }
    if (submission?.status === 'REJECTED') {
      const nonDraft = drafts.filter((draft) => draft.reviewStatus !== 'DRAFT');
      return nonDraft.length > 0 ? nonDraft : drafts;
    }
    return drafts.filter((draft) => draft.reviewStatus === 'SUBMITTED');
  }, [drafts, submission?.status]);

  const submittedByLabel = assignedToName || (submission?.submittedByUserId ? `User ID ${submission.submittedByUserId}` : 'Unknown');
  const selectedDraft = selectedDraftId ? reviewDrafts.find((draft) => draft.id === selectedDraftId) || null : null;
  const draftCount = drafts.filter((draft) => draft.reviewStatus === 'DRAFT').length;
  const submittedCount = drafts.filter((draft) => draft.reviewStatus === 'SUBMITTED').length;
  const approvedCount = drafts.filter((draft) => draft.reviewStatus === 'APPROVED').length;
  const subtitle = taskDescription?.trim() || `Research recent news about ${targetCompanyName || 'the target company'}`;

  return (
    <div className={styles.newsReviewShell}>
      <WorkspaceToast toast={toast} onClose={() => setToast(null)} />

      <div className={styles.flowStepper}>
        {['Start Work', 'Research News', 'Review Drafts', 'Submit Review'].map((step, index) => (
          <div className={styles.flowStep} key={step}>
            <span className={styles.flowStepNumber}>{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={32} className="animate-spin" />
          <span>Loading manager review...</span>
        </div>
      ) : (
        <div className={styles.reviewBoard}>
          <main className={styles.mainCard}>
            <div className={styles.mainCardHeader}>
              <div>
                <p className={styles.eyebrow}>Company News Research</p>
                <h2 id="manager-task-review-title">{subtitle}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className={styles.draftCount}>{reviewDrafts.length} draft(s)</span>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close manager review">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.mainCardBody}>
              {!selectedDraft && (
                <section className={styles.targetBox}>
                  <div>
                    <p className={styles.targetBoxLabel}>Research Target</p>
                    <h3>{targetCompanyName || taskTitle || 'Target company'}</h3>
                    <p>Research recent company news, review submitted articles, then approve or return for changes.</p>
                  </div>
                  <div className={styles.stats}>
                    <div className={styles.statBox}>
                      <strong>{draftCount}</strong>
                      <span>Drafts</span>
                    </div>
                    <div className={styles.statBox}>
                      <strong>{submittedCount}</strong>
                      <span>Submitted</span>
                    </div>
                    <div className={styles.statBox}>
                      <strong>{approvedCount}</strong>
                      <span>Approved</span>
                    </div>
                  </div>
                </section>
              )}

            {selectedDraft ? (
              <>
                <div className={styles.detailToolbar}>
                  <button type="button" className={styles.viewDetailButton} onClick={() => setSelectedDraftId(null)}>
                    <ArrowLeft size={15} /> Back to Submitted Articles
                  </button>
                  <h3>Article Detail</h3>
                </div>
                <div className={styles.detailShell}>
                  <NewsArticleDetail
                    article={{
                      title: selectedDraft.title,
                      sourceUrl: selectedDraft.sourceUrl,
                      publishedAt: selectedDraft.publishedAt,
                      summary: selectedDraft.summary,
                      content: selectedDraft.content,
                      imageStorageKey: selectedDraft.imageStorageKey,
                      externalImageUrl: selectedDraft.externalImageUrl,
                      sourceName: selectedDraft.sourceName,
                      author: selectedDraft.author,
                      tags: selectedDraft.tags,
                      staffNotes: selectedDraft.staffNotes,
                      status: selectedDraft.reviewStatus,
                    }}
                  />
                </div>
              </>
            ) : (
              <ManagerNewsSubmissionList
                drafts={reviewDrafts}
                loading={loading}
                onRefresh={fetchData}
                onViewDetail={(draft) => setSelectedDraftId(draft.id)}
              />
            )}
            </div>
          </main>

          <aside className={styles.reviewSidebar}>
            <ManagerReviewPanel
              submission={submission}
              submissionHistory={submissionHistory}
              articleCount={reviewDrafts.length}
              targetCompanyName={targetCompanyName}
              submittedByLabel={submittedByLabel}
              processing={processing}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </aside>
        </div>
      )}
    </div>
  );
};
