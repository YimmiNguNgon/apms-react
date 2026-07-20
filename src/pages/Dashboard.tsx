import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api.get<any>('/dashboard/summary')
      .then((res) => {
        if (res?.success) setSummary(res.data);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) return null;

  const stats = summary ? [
    { label: 'Total company profiles', value: summary.totalCompanyProfiles ?? '—' },
    { label: 'Partners', value: summary.partnerCount ?? '—' },
    { label: 'Potential partners', value: summary.potentialPartnerCount ?? '—' },
    { label: 'Competitors', value: summary.competitorCount ?? '—' },
  ] : [];

  return (
    <section className="workspace-page" id="page-dashboard">
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <h1>Workspace dashboard</h1>
            <p>This page renders only the backend summary endpoint and no longer falls back to mock dashboard values.</p>
          </div>
        </div>

        {loading ? (
          <div className="workspace-panel"><div className="workspace-empty">Loading dashboard summary...</div></div>
        ) : !summary ? (
          <div className="workspace-panel"><div className="workspace-empty">No dashboard summary data was returned by the backend.</div></div>
        ) : (
          <div className="workspace-stats workspace-stats-compact">
            {stats.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
