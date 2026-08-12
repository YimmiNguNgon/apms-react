import React, { useEffect, useState } from 'react';
import { externalDataApi, type ExternalDataItem } from '../API/externalDataApi';
import styles from './ArticleDetail.module.css';
import { SecondaryButton } from '../components/ui';

interface ArticleDetailProps {
  setActivePage?: (page: string) => void;
}

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  const diffMs = Date.now() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);

  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFullDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800';

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ setActivePage }) => {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [article, setArticle] = useState<ExternalDataItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('apms-selected-article');
    if (storedId) {
      setArticleId(storedId);
    } else {
      setLoading(false);
      setError('No article selected.');
    }
  }, []);

  useEffect(() => {
    if (!articleId) return;
    
    let isMounted = true;
    setLoading(true);
    
    externalDataApi.getItemById(articleId)
      .then(data => {
        if (!isMounted) return;
        if (data) {
          setArticle(data);
          setError(null);
        } else {
          setError('Article not found.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Unable to load this article.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [articleId]);

  const handleBack = () => {
    if (setActivePage) {
      setActivePage('news');
    } else {
      window.history.back();
    }
  };

  const handleCompanyClick = (companyName: string, companyId?: string | null) => {
    if (companyId && setActivePage) {
      localStorage.setItem('apms-selected-company', companyId);
      setActivePage('company-detail');
    }
  };

  if (loading) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.container}>
          <div style={{ color: 'var(--cds-text-secondary)', textAlign: 'center', padding: '60px 0' }}>
            Loading article details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.container} style={{ textAlign: 'center', paddingTop: '10vh' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{error || 'Article not found.'}</h2>
          <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '24px' }}>
            This article may have been removed or is no longer available.
          </p>
          <SecondaryButton onClick={handleBack}>← Back to News</SecondaryButton>
        </div>
      </div>
    );
  }

  // Derived variables
  const isRecentlyCrawled = article.crawledAt 
    ? (Date.now() - new Date(article.crawledAt).getTime()) < 12 * 60 * 60 * 1000
    : false;
  
  const isHot = article.riskLevel === 'HIGH' && article.publishedAt
    ? (Date.now() - new Date(article.publishedAt).getTime()) < 48 * 60 * 60 * 1000
    : false;
    
  const sourceName = article.source || article.sourceDomain || 'Unknown Source';
  const companyName = article.relatedCompanyName;
  const mainSummary = article.aiSummary || article.summary;
  const fullContent = article.content;

  return (
    <div className={styles.detailPage}>
      <div className={styles.container}>
        
        {/* Navigation */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={handleBack}>
            ← Back to News
          </button>
          <div className={styles.breadcrumb}>
            Business Intelligence / {sourceName} / Article
          </div>
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.metaRow}>
            <div className={styles.badgeGroup}>
              {isRecentlyCrawled && <span className={`${styles.badge} ${styles.badgeNew}`}>NEW</span>}
              {isHot && <span className={`${styles.badge} ${styles.badgeHot}`}>🔥 HOT</span>}
            </div>
            
            <span className={styles.source}>{sourceName}</span>
            <span>•</span>
            <span>{formatRelativeTime(article.publishedAt)}</span>
          </div>
          
          <h1 className={styles.title}>{article.title}</h1>
          
          {mainSummary && (
            <p className={styles.summary}>{mainSummary}</p>
          )}
          
          {companyName && (
            <div className={styles.metaRow} style={{ marginTop: '16px' }}>
              <span 
                className={styles.companyPill} 
                onClick={() => handleCompanyClick(companyName, article.relatedCompanyId)}
              >
                {companyName}
              </span>
            </div>
          )}
        </header>

        {/* Hero Cover Image */}
        <img 
          src={article.imageUrl || FALLBACK_IMAGE} 
          alt={article.title || 'Hero image'} 
          className={styles.heroImage} 
        />

        {/* Content Layout */}
        <div className={styles.contentGrid}>
          
          {/* Main Article Reading Body */}
          <main>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--cds-text-primary)' }}>
              Article Content
            </h2>

            {fullContent ? (
              <div className={styles.articleBody}>
                {fullContent}
              </div>
            ) : (
              <div className={styles.articleBody} style={{ color: 'var(--cds-text-secondary)', fontStyle: 'italic' }}>
                Full article text was not extracted during collection. The summary above contains the collected snippet from the source.
              </div>
            )}

            {/* Original Source Section - AT THE VERY BOTTOM OF THE MAIN READING COLUMN */}
            <section className={styles.originalSourceSection}>
              <h3 className={styles.originalSourceTitle}>Original Source</h3>
              <p className={styles.originalSourceText}>
                This article was collected from {sourceName} (published {formatFullDate(article.publishedAt)}).
              </p>
              {article.url ? (
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.originalSourceBtn}
                >
                  View Original Article ↗
                </a>
              ) : (
                <div className={styles.originalSourceUnavailable}>
                  Original source URL is unavailable.
                </div>
              )}
            </section>
          </main>

          {/* Right Sidebar - Intelligence Panels */}
          <aside className={styles.sidebar}>
            
            {/* AI Executive Briefing */}
            {article.aiSummary && (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>✨ AI Executive Briefing</h3>
                <p className={styles.aiBriefText}>{article.aiSummary}</p>
              </div>
            )}

            {/* Intelligence Signals */}


            {/* Topics */}
            {article.topics && article.topics.length > 0 && (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Topics</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {article.topics.map((t, i) => (
                    <span key={i} className={styles.companyPill} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Source Metadata */}
            <div className={styles.sourcePanel}>
              <h3 className={styles.panelTitle}>Source Information</h3>
              <div className={styles.sourceInfoRow}>
                <span className={styles.signalLabel}>Publisher</span>
                <span className={styles.signalValue}>{sourceName}</span>
              </div>
              <div className={styles.sourceInfoRow}>
                <span className={styles.signalLabel}>Published Time</span>
                <span className={styles.signalValue}>{formatFullDate(article.publishedAt)}</span>
              </div>
              <div className={styles.sourceInfoRow}>
                <span className={styles.signalLabel}>Collected by APMS</span>
                <span className={styles.signalValue}>{formatFullDate(article.crawledAt || article.createdAt)}</span>
              </div>
            </div>

          </aside>
        </div>

      </div>
    </div>
  );
};
