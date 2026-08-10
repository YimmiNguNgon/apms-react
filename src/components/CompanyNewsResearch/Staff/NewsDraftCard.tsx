import React from 'react';
import { Calendar, Edit3, ExternalLink, Eye, Newspaper, Trash2 } from 'lucide-react';
import type { CompanyNewsResearchDraft } from '../../../types/domain';
import { NewsStatusBadge } from '../Shared/NewsStatusBadge';

const formatOptionalDate = (dateString?: string | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

interface NewsDraftCardProps {
  draft: CompanyNewsResearchDraft;
  canEdit: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (draft: CompanyNewsResearchDraft) => void;
  onPreview: (draft: CompanyNewsResearchDraft) => void;
  onDelete: (id: string) => void;
}

export const NewsDraftCard: React.FC<NewsDraftCardProps> = ({
  draft,
  canEdit,
  selected,
  onToggleSelect,
  onEdit,
  onPreview,
  onDelete,
}) => {
  const isDraft = draft.reviewStatus === 'DRAFT';
  const imageUrl = draft.externalImageUrl || null;

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        backgroundColor: '#fff',
        border: selected ? '1px solid #2563eb' : '1px solid #e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
        minHeight: '176px',
      }}
    >
      <button
        type="button"
        onClick={() => onPreview(draft)}
        style={{ border: 0, padding: 0, background: '#f8fafc', cursor: 'pointer', minHeight: 176 }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={draft.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Newspaper size={30} />
          </div>
        )}
      </button>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <button
            type="button"
            onClick={() => onPreview(draft)}
            style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
          >
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px', lineHeight: 1.35, fontWeight: 850, overflowWrap: 'anywhere' }}>
              {draft.title}
            </h4>
          </button>
          <NewsStatusBadge status={draft.reviewStatus} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Newspaper size={13} /> {draft.sourceName || 'Original source'}
          </span>
          {draft.publishedAt && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} /> {formatOptionalDate(draft.publishedAt)}
            </span>
          )}
        </div>

        <p style={{ margin: '10px 0', color: '#475569', lineHeight: 1.45, fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {draft.summary || draft.content || 'No summary provided.'}
        </p>

        {draft.tags && draft.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
            {draft.tags.slice(0, 4).map((tag) => (
              <span key={tag} style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '999px', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                {tag}
              </span>
            ))}
            {draft.tags.length > 4 && <span style={{ fontSize: '11px', color: '#64748b' }}>+{draft.tags.length - 4}</span>}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onPreview(draft)} style={actionButton('#334155')}>
              <Eye size={14} /> View
            </button>
            {draft.sourceUrl && (
              <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...actionButton('#1d4ed8'), textDecoration: 'none' }}>
                <ExternalLink size={14} /> Source
              </a>
            )}
            {isDraft && canEdit && (
              <>
                <button type="button" onClick={() => onEdit(draft)} style={actionButton('#1d4ed8')}>
                  <Edit3 size={14} /> Edit
                </button>
                <button type="button" onClick={() => onDelete(draft.id)} style={actionButton('#dc2626')}>
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </div>

          {canEdit && isDraft ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#0f172a', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected} onChange={() => onToggleSelect(draft.id)} />
              Select
            </label>
          ) : (
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
              {draft.reviewStatus === 'SUBMITTED' ? 'Submitted for review' : 'Readonly'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

const actionButton = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '7px 9px',
  border: '1px solid #e2e8f0',
  borderRadius: '7px',
  background: '#fff',
  color,
  fontWeight: 750,
  fontSize: '12px',
  cursor: 'pointer',
});
