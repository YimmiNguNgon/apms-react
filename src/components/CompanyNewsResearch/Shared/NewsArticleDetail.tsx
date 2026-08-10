import React from 'react';
import { ExternalLink, Calendar, User, Newspaper, Image as ImageIcon, StickyNote } from 'lucide-react';
import type { CombinedStatus } from './NewsStatusBadge';
import { NewsStatusBadge } from './NewsStatusBadge';

export interface NewsArticleDetailData {
  title: string;
  sourceUrl: string;
  publishedAt?: string | null;
  summary?: string | null;
  content?: string | null;
  imageStorageKey?: string | null;
  externalImageUrl?: string | null;
  sourceName?: string | null;
  author?: string | null;
  tags?: string[] | null;
  status?: CombinedStatus;
  staffNotes?: string | null;
}

interface NewsArticleDetailProps {
  article: NewsArticleDetailData;
}

const formatOptionalDate = (dateString?: string | null) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  } catch {
    return '';
  }
};

export const NewsArticleDetail: React.FC<NewsArticleDetailProps> = ({ article }) => {
  // Logic for image resolution
  const imageUrl = article.externalImageUrl || null;
  const hasStoredImage = Boolean(article.imageStorageKey);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', backgroundColor: '#fff', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        {article.status && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <NewsStatusBadge status={article.status} />
            {article.status === 'DRAFT' && (
              <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Saved. Not yet submitted to Manager.</span>
            )}
            {article.status === 'SUBMITTED' && (
              <span style={{ color: '#1d4ed8', fontSize: '0.9rem', fontWeight: 600 }}>Waiting for Manager Review.</span>
            )}
            {article.status === 'APPROVED' && (
              <span style={{ color: '#047857', fontSize: '0.9rem', fontWeight: 600 }}>Approved and published to Internal News.</span>
            )}
          </div>
        )}
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, margin: '0 0 16px 0' }}>
          {article.title}
        </h1>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#64748b', fontSize: '0.9rem' }}>
          {article.sourceName && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Newspaper size={16} /> {article.sourceName}
            </span>
          )}
          {article.author && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> {article.author}
            </span>
          )}
          {article.publishedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> {formatOptionalDate(article.publishedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Hero Image */}
      <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={article.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.innerHTML = '<div style="color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Image failed to load</span></div>';
              }
            }}
          />
        ) : hasStoredImage ? (
          <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', textAlign: 'center' }}>
            <ImageIcon size={48} />
            <strong>Uploaded image attached</strong>
            <span style={{ fontSize: '0.85rem' }}>Storage key: {article.imageStorageKey}</span>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={48} />
            <span>No image available</span>
          </div>
        )}
      </div>

      {/* Summary */}
      {article.summary && (
        <div style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '16px 20px', borderRadius: '0 8px 8px 0', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>Article Summary</h3>
          <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
            {article.summary}
          </p>
        </div>
      )}

      {/* Content */}
      {article.content ? (
        <div style={{ fontSize: '1.125rem', color: '#1e293b', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: '48px' }}>
          {article.content}
        </div>
      ) : (
        <div style={{ fontSize: '1.125rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '48px', textAlign: 'center' }}>
          No content available.
        </div>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
          {article.tags.map(tag => (
            <span key={tag} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '999px', fontSize: '0.875rem' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {article.staffNotes && (
        <div style={{ border: '1px solid #fed7aa', borderRadius: '12px', padding: '18px 20px', backgroundColor: '#fff7ed', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#9a3412', fontWeight: 700 }}>
            <StickyNote size={16} /> Staff Notes
          </div>
          <p style={{ margin: 0, color: '#7c2d12', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{article.staffNotes}</p>
        </div>
      )}

      {/* Source Card */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Source</div>
          <div style={{ fontSize: '1.125rem', color: '#0f172a', fontWeight: 500 }}>{article.sourceName || 'Original Article'}</div>
          <a 
            href={article.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ fontSize: '0.9rem', color: '#3b82f6', textDecoration: 'none', display: 'block', marginTop: '4px', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={article.sourceUrl}
          >
            {article.sourceUrl}
          </a>
        </div>
        <a 
          href={article.sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', textDecoration: 'none', fontWeight: 500, transition: 'all 0.2s' }}
        >
          Open Article <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};
