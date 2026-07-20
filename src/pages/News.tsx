import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type NewsItem = {
  id: string | number;
  company: string;
  tag: string;
  source: string;
  title: string;
  summary: string;
  publishedAt: string;
  sentiment: 'positive' | 'risk' | 'neutral';
  ai: string;
};

const toSentiment = (value: unknown): 'positive' | 'risk' | 'neutral' => {
  const text = String(value || '').toLowerCase();
  if (text.includes('positive') || text.includes('good')) return 'positive';
  if (text.includes('risk') || text.includes('negative') || text.includes('watch')) return 'risk';
  return 'neutral';
};

export const News: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'risk'>('all');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/dashboard/news')
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
        setItems(rows.map((item: any, index: number) => ({
          id: item.id || index,
          company: item.company || item.companyName || item.subject || 'Unknown company',
          tag: item.tag || item.category || 'News',
          source: item.source || item.publisher || 'Unknown source',
          title: item.title || 'Untitled news item',
          summary: item.summary || item.description || 'No summary returned from the backend.',
          publishedAt: item.publishedAt || item.createdAt || item.date || 'Not available',
          sentiment: toSentiment(item.sentiment || item.signalType || item.riskLevel),
          ai: item.aiSignal || item.aiSummary || item.analysis || 'No AI signal returned from the backend.',
        })));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return items;
    if (activeTab === 'positive') return items.filter((item) => item.sentiment === 'positive');
    return items.filter((item) => item.sentiment === 'risk' || item.sentiment === 'neutral');
  }, [activeTab, items]);

  const stats = [
    { label: 'Feed items', value: items.length, note: 'Rows returned by the backend news endpoint' },
    { label: 'Needs watch', value: items.filter((item) => item.sentiment === 'risk').length, note: 'Items classified as risk/watch' },
    { label: 'Positive', value: items.filter((item) => item.sentiment === 'positive').length, note: 'Items classified as positive' },
    { label: 'Sources', value: new Set(items.map((item) => item.source)).size, note: 'Unique source labels returned by the backend' },
  ];

  return (
    <section className="workspace-page" id="page-news">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Intelligence <span>/</span> News & Intelligence</div>
          <div className="workspace-page-head">
            <div>
              <h1>News & intelligence</h1>
              <p>This feed now renders only backend news data and associated AI signals if the API provides them.</p>
            </div>
          </div>

          <div className="workspace-stats">
            {stats.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-filter-row">
            <div className="workspace-filter-chips">
              <button className={`workspace-chip ${activeTab === 'all' ? 'workspace-chip-active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
              <button className={`workspace-chip ${activeTab === 'positive' ? 'workspace-chip-active' : ''}`} onClick={() => setActiveTab('positive')}>Positive</button>
              <button className={`workspace-chip ${activeTab === 'risk' ? 'workspace-chip-active' : ''}`} onClick={() => setActiveTab('risk')}>Watchlist</button>
            </div>
          </div>

          {loading ? (
            <div className="workspace-panel"><div className="workspace-empty">Loading news feed...</div></div>
          ) : filtered.length === 0 ? (
            <div className="workspace-panel"><div className="workspace-empty">No news items were returned for the current filter.</div></div>
          ) : (
            <div className="workspace-feed-list">
              {filtered.map((news) => (
                <article key={news.id} className="workspace-feed-card">
                  <div className="company-logo-sm blue">{news.company.slice(0, 2).toUpperCase()}</div>
                  <div className="workspace-feed-content">
                    <div className="workspace-feed-meta">
                      <div className="workspace-feed-tags">
                        <strong>{news.company}</strong>
                        <span className="workspace-badge neutral">{news.tag}</span>
                        <span className={`workspace-badge ${news.sentiment === 'positive' ? 'success' : news.sentiment === 'risk' ? 'danger' : 'info'}`}>
                          {news.sentiment}
                        </span>
                      </div>
                      <span>{news.publishedAt} • {news.source}</span>
                    </div>
                    <h3>{news.title}</h3>
                    <p>{news.summary}</p>
                    <div className="workspace-ai-note workspace-feed-ai">
                      <strong>AI signal</strong>
                      <p>{news.ai}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
