import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, SendHorizonal } from 'lucide-react';
import { companyNewsResearchApi } from '../API/companyNewsResearchApi';
import { taskApi } from '../API/taskApi';
import type { CompanyNewsResearchDraft, CreateNewsResearchDraftRequest, ProjectTaskSubmissionResponse } from '../types/domain';
import { NewsDraftList } from './CompanyNewsResearch/Staff/NewsDraftList';
import { NewsDraftEditor } from './CompanyNewsResearch/Staff/NewsDraftEditor';
import { NewsArticlePreview } from './CompanyNewsResearch/Staff/NewsArticlePreview';
import { NewsArticleDetail } from './CompanyNewsResearch/Shared/NewsArticleDetail';
import { ConfirmModal } from './CompanyNewsResearch/Shared/ConfirmModal';
import { WorkspaceToast, type ToastState } from './CompanyNewsResearch/Shared/WorkspaceToast';

interface CompanyNewsResearchWorkspaceProps {
  projectId: number;
  taskId: number;
  targetCompanyName?: string | null;
  canEdit: boolean;
  onDraftCountChange?: (count: number) => void;
  onSubmitSuccess?: () => void;
  onClose: () => void;
}

type StaffViewState = 'LIST' | 'CREATE' | 'EDIT' | 'DETAIL' | 'REVIEW_SELECTED';

const toDraftForm = (draft: CompanyNewsResearchDraft): CreateNewsResearchDraftRequest => ({
  title: draft.title,
  sourceUrl: draft.sourceUrl,
  publishedAt: draft.publishedAt || '',
  summary: draft.summary || '',
  content: draft.content || '',
  imageStorageKey: draft.imageStorageKey || '',
  externalImageUrl: draft.externalImageUrl || '',
  sourceName: draft.sourceName || '',
  author: draft.author || '',
  tags: draft.tags || [],
  staffNotes: draft.staffNotes || '',
});

const friendlyError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const CompanyNewsResearchWorkspace: React.FC<CompanyNewsResearchWorkspaceProps> = ({
  projectId,
  taskId,
  targetCompanyName,
  canEdit,
  onDraftCountChange,
  onSubmitSuccess,
  onClose,
}) => {
  const [viewState, setViewState] = useState<StaffViewState>('LIST');
  const [drafts, setDrafts] = useState<CompanyNewsResearchDraft[]>([]);
  const [submissions, setSubmissions] = useState<ProjectTaskSubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const selectedDraft = selectedDraftId ? drafts.find((draft) => draft.id === selectedDraftId) || null : null;
  const editingDraft = editingId ? drafts.find((draft) => draft.id === editingId) || null : null;
  const selectedDrafts = useMemo(
    () => selectedDraftIds.map((id) => drafts.find((draft) => draft.id === id)).filter((draft): draft is CompanyNewsResearchDraft => Boolean(draft)),
    [drafts, selectedDraftIds],
  );
  const latestSubmission = submissions[0] || null;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [draftsRes, submissionsRes] = await Promise.all([
        companyNewsResearchApi.getDrafts(projectId, taskId),
        taskApi.getSubmissions(projectId, taskId, { size: 50, page: 0 }),
      ]);
      const rows = draftsRes.data || [];
      const submissionRows = [...(submissionsRes.data?.content || [])].sort((a, b) => b.id - a.id);
      setDrafts(rows);
      setSubmissions(submissionRows);
      onDraftCountChange?.(rows.length);
      setSelectedDraftIds((current) => current.filter((id) => rows.some((draft) => draft.id === id && draft.reviewStatus === 'DRAFT')));
    } catch (error) {
      setToast({ kind: 'error', message: friendlyError(error, 'Failed to load news drafts.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [projectId, taskId]);

  const closeConfirm = () => setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

  const handleCancelEditor = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Discard changes?',
      message: 'Unsaved edits will be lost. The saved draft data in backend will not be changed.',
      isDestructive: true,
      confirmText: 'Discard',
      cancelText: 'Keep Editing',
      onConfirm: () => {
        closeConfirm();
        setEditingId(null);
        setViewState(editingId ? 'DETAIL' : 'LIST');
      },
    });
  };

  const handleSave = async (data: CreateNewsResearchDraftRequest) => {
    try {
      setSaving(true);
      if (editingId) {
        await companyNewsResearchApi.updateDraft(projectId, taskId, editingId, data);
        setToast({ kind: 'success', message: 'News draft updated.' });
      } else {
        await companyNewsResearchApi.createDraft(projectId, taskId, data);
        setToast({ kind: 'success', message: 'News article saved as draft.' });
      }
      await fetchData();
      setEditingId(null);
      setSelectedDraftId(null);
      setViewState('LIST');
    } catch (error) {
      setToast({ kind: 'error', message: friendlyError(error, 'Failed to save news draft.') });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    const response = await companyNewsResearchApi.uploadImage(projectId, taskId, file);
    if (!response.data?.storageKey) {
      throw new Error('Image upload did not return a storage key.');
    }
    return response.data.storageKey;
  };

  const handleDelete = (draft: CompanyNewsResearchDraft) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete news draft?',
      message: (
        <div>
          <strong style={{ display: 'block', color: '#0f172a', marginBottom: 6 }}>{draft.title}</strong>
          <span>This draft will be permanently deleted.</span>
        </div>
      ),
      isDestructive: true,
      confirmText: 'Delete Draft',
      cancelText: 'Keep Draft',
      onConfirm: async () => {
        closeConfirm();
        try {
          setSaving(true);
          await companyNewsResearchApi.deleteDraft(projectId, taskId, draft.id);
          setToast({ kind: 'success', message: 'News draft deleted.' });
          setSelectedDraftIds((current) => current.filter((id) => id !== draft.id));
          await fetchData();
        } catch (error) {
          setToast({ kind: 'error', message: friendlyError(error, 'Failed to delete news draft.') });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const toggleDraftSelection = (id: string) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || draft.reviewStatus !== 'DRAFT') return;
    setSelectedDraftIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const selectAllDrafts = () => {
    setSelectedDraftIds(drafts.filter((draft) => draft.reviewStatus === 'DRAFT').map((draft) => draft.id));
  };

  const submitSelected = () => {
    if (selectedDrafts.length === 0) {
      setToast({ kind: 'error', message: 'Select at least one draft before submitting.' });
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Submit news articles for review?',
      message: `${selectedDrafts.length} draft(s) will be sent to the Manager. After submission, these articles cannot be edited until the Manager returns them for changes.`,
      confirmText: 'Submit for Review',
      cancelText: 'Back',
      onConfirm: async () => {
        closeConfirm();
        try {
          setSubmitting(true);
          await companyNewsResearchApi.submitResearch(projectId, taskId, selectedDrafts.map((draft) => draft.id));
          setToast({ kind: 'success', message: `Submitted ${selectedDrafts.length} news article(s) for Manager review.` });
          setSelectedDraftIds([]);
          setViewState('LIST');
          await fetchData();
          onSubmitSuccess?.();
        } catch (error) {
          setToast({ kind: 'error', message: friendlyError(error, 'Failed to submit news articles.') });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <section style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '620px', position: 'relative' }}>
      <WorkspaceToast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />

      <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
        <div>
          <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Company News Research</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>Research recent news about target company</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b', fontSize: 13 }}>
          <span>{drafts.length} draft(s)</span>
          <button type="button" onClick={onClose} style={{ display: 'none' }}>Close</button>
        </div>
      </div>

      {latestSubmission?.status === 'CHANGES_REQUESTED' || latestSubmission?.status === 'REJECTED' ? (
        <div style={{ margin: '14px 22px 0', border: '1px solid #fbbf24', borderRadius: 10, background: '#fffbeb', padding: 14, display: 'flex', gap: 10 }}>
          <AlertTriangle size={18} color="#d97706" />
          <div>
            <strong style={{ display: 'block', color: '#92400e' }}>Returned for Changes</strong>
            <span style={{ color: '#92400e', fontSize: 13 }}>{latestSubmission.reviewComment || 'Manager returned this submission for updates.'}</span>
          </div>
        </div>
      ) : latestSubmission?.status === 'APPROVED' ? (
        <div style={{ margin: '14px 22px 0', border: '1px solid #bbf7d0', borderRadius: 10, background: '#f0fdf4', padding: 14, display: 'flex', gap: 10 }}>
          <CheckCircle2 size={18} color="#16a34a" />
          <div>
            <strong style={{ display: 'block', color: '#166534' }}>News Research Approved</strong>
            <span style={{ color: '#166534', fontSize: 13 }}>Approved articles have been added to confidential Internal News.</span>
          </div>
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {viewState === 'LIST' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <NewsDraftList
              drafts={drafts}
              canEdit={canEdit}
              loading={loading}
              submitting={submitting}
              selectedIds={selectedDraftIds}
              targetCompanyName={targetCompanyName}
              onRefresh={() => void fetchData()}
              onCreateNew={() => { setEditingId(null); setSelectedDraftId(null); setViewState('CREATE'); }}
              onReviewSelected={() => setViewState('REVIEW_SELECTED')}
              onSubmitSelected={submitSelected}
              onToggleSelect={toggleDraftSelection}
              onSelectAllDrafts={selectAllDrafts}
              onClearSelection={() => setSelectedDraftIds([])}
              onEdit={(draft) => { setEditingId(draft.id); setSelectedDraftId(draft.id); setViewState('EDIT'); }}
              onPreview={(draft) => { setSelectedDraftId(draft.id); setViewState('DETAIL'); }}
              onDelete={(id) => {
                const draft = drafts.find((item) => item.id === id);
                if (draft) handleDelete(draft);
              }}
            />
          </div>
        )}

        {(viewState === 'CREATE' || viewState === 'EDIT') && (
          <NewsDraftEditor
            initialData={editingDraft ? toDraftForm(editingDraft) : null}
            onSave={handleSave}
            onCancel={handleCancelEditor}
            onUploadImage={handleUploadImage}
            saving={saving}
            canEdit={canEdit}
          />
        )}

        {viewState === 'DETAIL' && selectedDraft && (
          <NewsArticlePreview
            draft={selectedDraft}
            canEdit={canEdit}
            selected={selectedDraftIds.includes(selectedDraft.id)}
            onClose={() => setViewState('LIST')}
            onEdit={() => { setEditingId(selectedDraft.id); setViewState('EDIT'); }}
            onToggleSelect={() => toggleDraftSelection(selectedDraft.id)}
          />
        )}

        {viewState === 'REVIEW_SELECTED' && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
            <div style={{ padding: '18px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button type="button" onClick={() => setViewState('LIST')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}>
                <ArrowLeft size={16} /> Back to Drafts
              </button>
              <button type="button" onClick={submitSelected} disabled={selectedDrafts.length === 0 || submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #2563eb', borderRadius: 8, background: '#2563eb', color: '#fff', padding: '9px 14px', fontWeight: 900, cursor: 'pointer' }}>
                <SendHorizonal size={16} /> Submit {selectedDrafts.length} Article(s) for Review
              </button>
            </div>
            <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px', display: 'grid', gap: '16px' }}>
              <section style={{ border: '1px solid #dbeafe', borderRadius: 10, background: '#eff6ff', padding: 16 }}>
                <span style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Ready to submit</span>
                <h3 style={{ margin: '4px 0', color: '#0f172a' }}>{selectedDrafts.length} News Article(s)</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>Review the selected drafts below before sending them to Manager.</p>
              </section>
              {selectedDrafts.length === 0 ? (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: 10, background: '#fff', padding: 40, textAlign: 'center', color: '#64748b' }}>No draft selected.</div>
              ) : (
                selectedDrafts.map((draft, index) => (
                  <section key={draft.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center', color: '#0f172a', fontWeight: 900 }}>
                      <FileText size={16} /> Article {index + 1}
                    </div>
                    <NewsArticleDetail
                      article={{
                        title: draft.title,
                        sourceUrl: draft.sourceUrl,
                        publishedAt: draft.publishedAt,
                        summary: draft.summary,
                        content: draft.content,
                        imageStorageKey: draft.imageStorageKey,
                        externalImageUrl: draft.externalImageUrl,
                        sourceName: draft.sourceName,
                        author: draft.author,
                        tags: draft.tags,
                        staffNotes: draft.staffNotes,
                        status: draft.reviewStatus,
                      }}
                    />
                  </section>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
