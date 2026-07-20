import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export const CompetitorWatchlist: React.FC = () => {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const threatColors = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

  useEffect(() => {
    setLoading(true);
    api.get<any>('/dashboard/competitors')
      .then((res) => {
        if (res?.success && Array.isArray(res?.data)) {
          const mapped = res.data.map((item: any, index: number) => ({
            id: index + 1,
            company: item.tradeName || item.legalName || item.name || 'Competitor',
            segment: item.industry || item.segment || 'Unclassified',
            threat: item.threatLevel || item.riskLevel || 'Medium',
            lastActivity: item.recentActivity || item.latestNews || 'No recent update',
            date: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
          }));
          setCompetitors(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    const name = window.prompt('Nhap ten doi thu moi:');
    if (!name) return;
    const segment = window.prompt('Linh vuc hoat dong:') || 'Unclassified';
    setCompetitors((current) => [
      {
        id: Date.now(),
        company: name,
        segment,
        threat: 'Medium',
        lastActivity: 'Newly added to watchlist',
        date: new Date().toLocaleDateString('en-GB'),
      },
      ...current,
    ]);
  };

  const summary = [
    { label: 'Tracked competitors', value: competitors.length, note: 'Entities under active monitoring' },
    { label: 'High threat', value: competitors.filter((item) => item.threat === 'High').length, note: 'Needs urgent staff follow-up' },
    { label: 'Fresh activity', value: competitors.filter((item) => item.lastActivity !== 'No recent update').length, note: 'Records with recent market movement' },
  ];

  const highThreat = competitors.filter((item) => item.threat === 'High').slice(0, 3);

  return (
    <section className="workspace-page" id="page-competitor-management">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Company Profiles <span>/</span> Competitor Watchlist</div>
          <div className="workspace-page-head">
            <div>
              <h1>Competitor watchlist</h1>
              <p>Monitor competitor moves, segment relevance, and threat level before escalating findings to review.</p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-primary" onClick={handleAdd}>Add competitor</button>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {summary.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="workspace-card-grid">
            {competitors.map((competitor) => (
              <article
                key={competitor.id}
                className="workspace-directory-card"
                style={{ borderTopColor: threatColors[competitor.threat as 'High' | 'Medium' | 'Low'] || '#64748B' }}
              >
                <div className="workspace-directory-head">
                  <div>
                    <h3>{competitor.company}</h3>
                    <p>{competitor.segment}</p>
                  </div>
                  <span className={`workspace-badge ${competitor.threat === 'High' ? 'danger' : competitor.threat === 'Medium' ? 'info' : 'success'}`}>
                    {competitor.threat} threat
                  </span>
                </div>
                <div className="workspace-directory-meta">
                  <div><strong>Latest signal</strong><span>{competitor.lastActivity}</span></div>
                  <div><strong>Updated</strong><span>{competitor.date}</span></div>
                  <div><strong>Status</strong><span>{competitor.threat === 'High' ? 'Escalate for review' : 'Track in watchlist'}</span></div>
                </div>
                <div className="workspace-directory-actions">
                  <button className="btn btn-outline">View profile</button>
                  <button className="btn btn-outline">Compare</button>
                </div>
              </article>
            ))}
            {competitors.length === 0 && !loading && (
              <div className="workspace-panel">
                <div className="workspace-empty">No competitors tracked yet.</div>
              </div>
            )}
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Staff guidance</span>
            <ul className="workspace-bullet-list">
              <li>Capture concrete market movement before raising threat level.</li>
              <li>Use compare only after the record has enough public evidence.</li>
              <li>Escalate high-threat entries with a short note for reviewers.</li>
            </ul>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Priority watchlist</span>
            <div className="workspace-activity-list">
              {highThreat.map((competitor) => (
                <article key={`priority-${competitor.id}`}>
                  <strong>{competitor.company}</strong>
                  <p>{competitor.lastActivity}</p>
                </article>
              ))}
              {highThreat.length === 0 && <div className="workspace-empty">No high-threat competitors right now.</div>}
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Status</span>
            <div className="workspace-ai-note">
              <strong>{loading ? 'Loading watchlist' : 'Watchlist ready'}</strong>
              <p>{loading ? 'Syncing competitor records from the dashboard source.' : `${competitors.length} competitor records are available for staff review.`}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
