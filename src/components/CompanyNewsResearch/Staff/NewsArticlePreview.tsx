import React from 'react';
import type { CompanyNewsResearchDraft } from '../../../types/domain';
import { NewsArticleDetail } from '../Shared/NewsArticleDetail';
import { ArrowLeft, CheckCircle2, Edit3 } from 'lucide-react';

interface NewsArticlePreviewProps {
  draft: CompanyNewsResearchDraft;
  canEdit: boolean;
  selected: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleSelect: () => void;
}

const isReadyForSubmission = (draft: CompanyNewsResearchDraft) =>
  Boolean(
    draft.reviewStatus === 'DRAFT' &&
    draft.title?.trim() &&
    /^https?:\/\//i.test(draft.sourceUrl || '') &&
    draft.publishedAt &&
    ((draft.summary || '').trim() || (draft.content || '').trim())
  );

export const NewsArticlePreview: React.FC<NewsArticlePreviewProps> = ({
  draft,
  canEdit,
  selected,
  onClose,
  onEdit,
  onToggleSelect,
}) => {
  const ready = isReadyForSubmission(draft);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 24px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#334155',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Back to Drafts
        </button>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canEdit && draft.reviewStatus === 'DRAFT' && (
            <>
              <button
                onClick={onEdit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#0f172a',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={16} /> Edit Draft
              </button>
              <button
                onClick={onToggleSelect}
                disabled={!ready}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  border: '1px solid #2563eb',
                  borderRadius: '8px',
                  backgroundColor: selected ? '#eff6ff' : '#2563eb',
                  color: selected ? '#1d4ed8' : '#fff',
                  fontWeight: 800,
                  cursor: ready ? 'pointer' : 'not-allowed',
                  opacity: ready ? 1 : 0.55,
                }}
              >
                <CheckCircle2 size={16} /> {selected ? 'Selected for Review' : 'Select for Submission'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
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
      </div>
    </div>
  );
};
