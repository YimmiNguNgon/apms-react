import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckSquare, Plus, RefreshCw, Search, SendHorizonal, Square } from 'lucide-react';
import type { CompanyNewsResearchDraft, NewsDraftStatus } from '../../../types/domain';
import { NewsDraftCard } from './NewsDraftCard';

interface NewsDraftListProps {
  drafts: CompanyNewsResearchDraft[];
  canEdit: boolean;
  loading: boolean;
  submitting: boolean;
  selectedIds: string[];
  targetCompanyName?: string | null;
  onRefresh: () => void;
  onCreateNew: () => void;
  onReviewSelected: () => void;
  onSubmitSelected: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAllDrafts: () => void;
  onClearSelection: () => void;
  onEdit: (draft: CompanyNewsResearchDraft) => void;
  onPreview: (draft: CompanyNewsResearchDraft) => void;
  onDelete: (id: string) => void;
}

type FilterKey = 'ALL' | NewsDraftStatus;

export const NewsDraftList: React.FC<NewsDraftListProps> = ({
  drafts,
  canEdit,
  loading,
  submitting,
  selectedIds,
  targetCompanyName,
  onRefresh,
  onCreateNew,
  onReviewSelected,
  onSubmitSelected,
  onToggleSelect,
  onSelectAllDrafts,
  onClearSelection,
  onEdit,
  onPreview,
  onDelete,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const selectableDrafts = drafts.filter((draft) => draft.reviewStatus === 'DRAFT');
  const submittedCount = drafts.filter((draft) => draft.reviewStatus === 'SUBMITTED').length;
  const approvedCount = drafts.filter((draft) => draft.reviewStatus === 'APPROVED').length;

  const filteredDrafts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return drafts.filter((draft) => {
      const matchesFilter = filter === 'ALL' || draft.reviewStatus === filter;
      const haystack = `${draft.title} ${draft.sourceName || ''} ${draft.summary || ''} ${(draft.tags || []).join(' ')}`.toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [drafts, filter, query]);

  const allSelected = selectableDrafts.length > 0 && selectableDrafts.every((draft) => selectedIds.includes(draft.id));

  return (
    <div style={{ padding: '22px 24px 92px', width: '100%' }}>
      <section style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: '10px', padding: '16px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '14px', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Research target</span>
          <h3 style={{ margin: '4px 0', color: '#0f172a', fontSize: '18px' }}>{targetCompanyName || 'Target company'}</h3>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>Research recent company news, save articles as drafts, then submit selected drafts for Manager review.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '10px' }}>
          <Stat label="Drafts" value={selectableDrafts.length} />
          <Stat label="Submitted" value={submittedCount} />
          <Stat label="Approved" value={approvedCount} />
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 850, color: '#0f172a', margin: 0 }}>News Drafts</h2>
          <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '13px' }}>Save first, review drafts, then submit to Manager.</p>
        </div>
        {canEdit && (
          <button onClick={onCreateNew} style={primaryGhostButton}>
            <Plus size={16} /> Add News Article
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 11, top: 11, color: '#64748b' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drafts..." style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px 9px 34px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED'] as FilterKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: filter === item ? '#0f172a' : '#fff', color: filter === item ? '#fff' : '#334155', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
              {item === 'ALL' ? 'All' : item.charAt(0) + item.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} disabled={loading} title="Refresh drafts" style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: 9, color: '#334155', cursor: 'pointer' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {canEdit && selectableDrafts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', background: '#fff', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button type="button" onClick={allSelected ? onClearSelection : onSelectAllDrafts} style={{ border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#334155', fontWeight: 800 }}>
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />} Select all draft articles
          </button>
          <span style={{ color: '#64748b', fontSize: 13 }}>{selectedIds.length} draft(s) selected</span>
        </div>
      )}

      {loading && drafts.length === 0 ? (
        <Empty icon={<RefreshCw size={32} className="animate-spin" />} title="Loading drafts..." text="Fetching saved news research drafts." />
      ) : drafts.length === 0 ? (
        <Empty icon={<AlertCircle size={38} />} title="No drafts yet" text="Create a news article and save it as draft before submitting to Manager." />
      ) : filteredDrafts.length === 0 ? (
        <Empty icon={<Search size={34} />} title="No matching drafts" text="Adjust search text or filter." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 430px), 1fr))', gap: '14px' }}>
          {filteredDrafts.map((draft) => (
            <NewsDraftCard
              key={draft.id}
              draft={draft}
              canEdit={canEdit}
              selected={selectedIds.includes(draft.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onPreview={onPreview}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div style={{ position: 'sticky', bottom: 0, margin: '18px -24px -92px', padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', zIndex: 5 }}>
          <div>
            <strong style={{ color: '#0f172a' }}>{selectedIds.length} draft(s) selected</strong>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
              {selectedIds.length === 0 ? 'Select DRAFT articles before submitting.' : 'Review selected drafts before Manager submission.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClearSelection} disabled={selectedIds.length === 0 || submitting} style={secondaryButton}>Clear</button>
            <button type="button" onClick={onReviewSelected} disabled={selectedIds.length === 0 || submitting} style={{ ...secondaryButton, opacity: selectedIds.length ? 1 : 0.55 }}>Review Selected Drafts</button>
            <button type="button" onClick={onSubmitSelected} disabled={selectedIds.length === 0 || submitting} style={{ ...primaryButton, opacity: selectedIds.length ? 1 : 0.55 }}>
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <SendHorizonal size={16} />} Submit for Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div style={{ minWidth: 82, border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
    <strong style={{ display: 'block', color: '#0f172a', fontSize: 18 }}>{value}</strong>
    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
  </div>
);

const Empty = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div style={{ padding: '54px 24px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc', color: '#64748b' }}>
    <div style={{ color: '#94a3b8', marginBottom: 14 }}>{icon}</div>
    <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>{title}</h3>
    <p style={{ margin: 0 }}>{text}</p>
  </div>
);

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  border: '1px solid #2563eb',
  borderRadius: 8,
  background: '#2563eb',
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer',
};

const primaryGhostButton: React.CSSProperties = {
  ...primaryButton,
  background: '#eff6ff',
  color: '#1d4ed8',
};

const secondaryButton: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  fontWeight: 850,
  cursor: 'pointer',
};
