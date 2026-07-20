import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { AreaChart, BarChart, DonutChart } from '../../components/charts/Charts';

const EmptyPanel: React.FC<{ message: string }> = ({ message }) => (
  <div className="workspace-empty">{message}</div>
);

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const DirectorDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<any>('/dashboard/summary'),
      api.get<any>('/dashboard/recent-scores'),
      api.get<any>('/dashboard/partners'),
      api.get<any>('/dashboard/competitors'),
      api.get<any>('/dashboard/recommendations'),
    ]).then((results) => {
      const [summaryRes, scoreRes, partnerRes, competitorRes, recommendationRes] = results;

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
        setSummary(summaryRes.value.data);
      }

      if (scoreRes.status === 'fulfilled' && scoreRes.value?.success) {
        const rows = Array.isArray(scoreRes.value.data) ? scoreRes.value.data : scoreRes.value.data?.content ?? [];
        setRecentScores(rows);
      }

      if (partnerRes.status === 'fulfilled' && partnerRes.value?.success) {
        const rows = Array.isArray(partnerRes.value.data) ? partnerRes.value.data : partnerRes.value.data?.content ?? [];
        setPartners(rows);
      }

      if (competitorRes.status === 'fulfilled' && competitorRes.value?.success) {
        const rows = Array.isArray(competitorRes.value.data) ? competitorRes.value.data : competitorRes.value.data?.content ?? [];
        setCompetitors(rows);
      }

      if (recommendationRes.status === 'fulfilled' && recommendationRes.value?.success) {
        const rows = Array.isArray(recommendationRes.value.data) ? recommendationRes.value.data : recommendationRes.value.data?.content ?? [];
        setRecommendations(rows);
      }
    }).finally(() => setLoading(false));
  }, []);

  const scoreTrendData = useMemo(
    () =>
      recentScores
        .map((item: any, index: number) => ({
          label: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : `#${index + 1}`,
          value: toNumber(item.totalScore) ?? 0,
        }))
        .filter((item) => item.value > 0),
    [recentScores],
  );

  const competitorThreatData = useMemo(
    () =>
      competitors
        .map((item: any, index: number) => {
          const threat =
            toNumber(item.threatScore) ??
            toNumber(item.competitionLevel) ??
            toNumber(item.riskLevel) ??
            (/high/i.test(String(item.threatLevel || item.threat || '')) ? 90 : /medium/i.test(String(item.threatLevel || item.threat || '')) ? 60 : /low/i.test(String(item.threatLevel || item.threat || '')) ? 30 : null);

          return {
            label: String(item.name || item.tradeName || item.legalName || `Competitor ${index + 1}`),
            value: threat ?? 0,
            color: threat !== null && threat >= 80 ? '#EF4444' : threat !== null && threat >= 50 ? '#F59E0B' : '#10B981',
          };
        })
        .filter((item) => item.value > 0)
        .slice(0, 5),
    [competitors],
  );

  const recommendationCategoryData = useMemo(() => {
    const counts = new Map<string, number>();
    recommendations.forEach((item: any) => {
      const key = String(item.category || item.type || 'Uncategorized');
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const palette = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4'];
    return Array.from(counts.entries()).map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length],
    }));
  }, [recommendations]);

  const topStats = [
    { label: 'Strategic partners', value: summary?.partnerCount ?? partners.length, note: 'Partner count returned by the backend summary' },
    { label: 'Competitors tracked', value: summary?.competitorCount ?? competitors.length, note: 'Competitor records currently available from the backend' },
    { label: 'Potential partners', value: summary?.potentialPartnerCount ?? 0, note: 'Potential partner count from the summary endpoint' },
    { label: 'AI suggestions', value: recommendations.length, note: 'Recommendation rows returned by the backend' },
  ];

  return (
    <section className="workspace-page role-dashboard role-dashboard-director director-page" id="page-director-dashboard">
      <div className="workspace-page-head director-hero">
        <div>
          <span className="workspace-side-eyebrow">Strategic posture</span>
          <h1>Director workspace</h1>
          <p>
            Welcome back, {currentUser?.name}. Use this view to read ecosystem momentum, competitor posture, and AI-backed opportunity signals without dropping into operational noise.
          </p>
        </div>
        <div className="director-hero-side">
          <div className="director-mini-metrics">
            <article>
              <strong>{loading ? '...' : recommendations.length}</strong>
              <span>AI suggestions</span>
            </article>
            <article>
              <strong>{loading ? '...' : recentScores.length}</strong>
              <span>score events</span>
            </article>
            <article>
              <strong>{loading ? '...' : 'Live'}</strong>
              <span>board status</span>
            </article>
          </div>
        </div>
      </div>

      <div className="director-dashboard-kpi-grid">
        {topStats.map((item) => (
          <article key={item.label} className="director-dashboard-kpi-card">
            <span className="workspace-stat-label">{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </div>

      <div className="dashboard-grid cols-2 director-dashboard-grid">
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Recent score trend</h3>
              <p>Trend generated only from score snapshots returned by the backend.</p>
            </div>
          </div>
          {scoreTrendData.length > 0 ? <AreaChart data={scoreTrendData} color="#10B981" height={180} /> : <EmptyPanel message="No score history is available for charting." />}
        </div>

        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Competitor threat chart</h3>
              <p>Threat bars render only when the backend includes numeric threat or competition values.</p>
            </div>
          </div>
          {competitorThreatData.length > 0 ? <BarChart data={competitorThreatData} height={180} /> : <EmptyPanel message="No competitor threat metrics were returned for charting." />}
        </div>
      </div>

      <div className="director-dashboard-main director-dashboard-single">
        <div className="director-sidebar-stack">
          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Ecosystem updates</h3>
                <p>Latest backend records from recent scores and partner feeds.</p>
              </div>
            </div>
            <div className="director-feed-list">
              {recentScores.length > 0 ? (
                recentScores.slice(0, 3).map((score: any, index: number) => (
                  <article key={index} className="director-feed-card">
                    <div className="director-feed-score" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                      {toNumber(score.totalScore) ?? 'N/A'}
                    </div>
                    <div>
                      <strong>Score snapshot updated</strong>
                      <p>{score.createdAt ? new Date(score.createdAt).toLocaleDateString('vi-VN') : 'Not available'}</p>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyPanel message="No recent score rows were returned." />
              )}
            </div>

            <div className="director-mini-section">
              <strong>Latest partner records</strong>
              <div className="director-feed-list">
                {partners.length > 0 ? (
                  partners.slice(0, 3).map((partner: any, index: number) => (
                    <article key={index} className="director-feed-card compact">
                      <div className="director-feed-dot" />
                      <div>
                        <strong>{partner.name || partner.tradeName || partner.legalName || 'Unnamed partner'}</strong>
                        <p>{partner.industry || partner.segment || 'Not available'}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyPanel message="No partner records were returned." />
                )}
              </div>
            </div>
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Recommendation category mix</h3>
                <p>Category mix based only on backend recommendation rows.</p>
              </div>
            </div>
            {recommendationCategoryData.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <DonutChart data={recommendationCategoryData} size={120} centerValue={String(recommendations.length)} centerLabel="total" />
                </div>
                <div className="chart-legend">
                  {recommendationCategoryData.map((item) => (
                    <div key={item.label} className="legend-item">
                      <div className="legend-dot" style={{ background: item.color }} />
                      {item.label}: <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyPanel message="No recommendation categories are available." />
            )}
          </div>

          <div className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <h3>Top AI suggestions</h3>
                <p>Highest-priority records shown exactly as returned by the backend.</p>
              </div>
            </div>
            {recommendations.length > 0 ? (
              <ul className="stat-list">
                {recommendations.slice(0, 4).map((item: any, index: number) => (
                  <li key={index} className="stat-list-item">
                    <span className="stat-list-label" style={{ fontSize: 12 }}>{item.title || item.name || item.recommendation || 'Untitled recommendation'}</span>
                    <span className="stat-list-badge badge-blue">{item.category || item.type || 'N/A'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel message="No AI suggestions were returned." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
