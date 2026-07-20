import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { api } from '../../services/api';
import { AreaChart, BarChart, DonutChart } from '../../components/charts/Charts';

const teamTrend = [
  { label: 'Mon', value: 62 },
  { label: 'Tue', value: 68 },
  { label: 'Wed', value: 71 },
  { label: 'Thu', value: 76 },
  { label: 'Fri', value: 82 },
  { label: 'Sat', value: 79 },
  { label: 'Sun', value: 84 },
];

const partnerPerformance = [
  { label: 'FPT', value: 92, color: '#2563EB' },
  { label: 'Viettel', value: 83, color: '#0F766E' },
  { label: 'CMC', value: 74, color: '#F59E0B' },
  { label: 'VNPT', value: 68, color: '#F97316' },
  { label: 'MoMo', value: 58, color: '#EF4444' },
];

const riskMix = [
  { label: 'Low', value: 18, color: '#10B981' },
  { label: 'Medium', value: 11, color: '#F59E0B' },
  { label: 'High', value: 4, color: '#EF4444' },
];

const approvalQueue = [
  { company: 'CMC Corp', stream: 'Competitor review', owner: 'Lan Anh', due: 'Today', status: 'High risk' },
  { company: 'VCCorp', stream: 'Partner assessment', owner: 'Minh Khoa', due: 'Tomorrow', status: 'Needs sign-off' },
  { company: 'RetailPlus', stream: 'Candidate validation', owner: 'Bao Tran', due: 'Jul 22', status: 'Ready to approve' },
  { company: 'AWS Vietnam', stream: 'Relationship scoring', owner: 'Ngoc Ha', due: 'Jul 23', status: 'Awaiting update' },
];

export const ManagerDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/dashboard/summary')
      .then((res) => {
        if (res?.success && res.data) {
          setSummary(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topStats = [
    { label: 'Active projects', value: summary?.totalProjects ?? 0, note: 'Projects currently moving through the workspace.' },
    { label: 'Pending approvals', value: summary?.pendingReviewCandidates ?? approvalQueue.length, note: 'Records waiting on manager judgement.' },
    { label: 'Approved candidates', value: summary?.approvedCandidates ?? 0, note: 'Items already cleared for the next stage.' },
    { label: 'Partners tracked', value: summary?.partnerCount ?? 0, note: 'Partner profiles under active monitoring.' },
  ];

  const operationalNotes = [
    { label: 'Approvals due in 24h', value: Math.max(1, Math.min(3, approvalQueue.length - 1)) },
    { label: 'Critical risk reviews', value: riskMix.find((item) => item.label === 'High')?.value ?? 0 },
    { label: 'Team throughput target', value: '84%' },
  ];

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page" id="page-manager-dashboard">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Operations <span>/</span> Manager workspace</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Delivery control</span>
              <h1>Approval and delivery board</h1>
              <p>
                {loading
                  ? 'Loading team flow, approval pressure, and partner monitoring signals.'
                  : `${currentUser?.name}, your queue is centered on approvals, team pacing, and risk that can block the pipeline this week.`}
              </p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline">Team report</button>
              <button className="btn btn-primary">Open approvals</button>
            </div>
          </div>

          <div className="workspace-focus-card role-focus-card manager">
            <div>
              <span className="workspace-chip">Manager mode</span>
              <h3>Keep execution moving while preventing bad records from reaching the board.</h3>
              <p>Prioritize work assignment, watch the validation bottleneck, and decide quickly on candidate records that already have enough evidence.</p>
            </div>
            <div className="workspace-focus-metrics">
              <article>
                <strong>{summary?.pendingReviewCandidates ?? approvalQueue.length}</strong>
                <span>waiting approval</span>
              </article>
              <article>
                <strong>{summary?.competitorCount ?? 0}</strong>
                <span>competitors tracked</span>
              </article>
              <article>
                <strong>{summary?.approvedCandidates ?? 0}</strong>
                <span>approved handoffs</span>
              </article>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {topStats.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="dashboard-grid cols-2 role-board-grid">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Team throughput</h3>
                  <p>Weekly output trend for the research and validation flow.</p>
                </div>
              </div>
              <AreaChart data={teamTrend} color="#2563EB" height={180} />
            </div>

            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Partner performance</h3>
                  <p>Top organizations by strategic fit and current delivery value.</p>
                </div>
              </div>
              <BarChart data={partnerPerformance} height={180} />
            </div>
          </div>

          <div className="dashboard-grid cols-main-side role-board-grid">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Approval queue</h3>
                  <p>Items closest to manager decision or escalation.</p>
                </div>
              </div>
              <div className="workspace-table role-queue-table">
                <div className="workspace-table-row workspace-table-head">
                  <span>Company</span>
                  <span>Stream</span>
                  <span>Owner</span>
                  <span>Due</span>
                  <span>Status</span>
                </div>
                {approvalQueue.map((item) => (
                  <div key={`${item.company}-${item.stream}`} className="workspace-table-row">
                    <div>
                      <strong>{item.company}</strong>
                      <small>Active pipeline record</small>
                    </div>
                    <span>{item.stream}</span>
                    <span>{item.owner}</span>
                    <span>{item.due}</span>
                    <span className="workspace-badge neutral">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="role-dashboard-stack">
              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Risk mix</h3>
                    <p>Keep the high-risk slice small and visible.</p>
                  </div>
                </div>
                <div className="role-donut-wrap">
                  <DonutChart data={riskMix} size={132} centerValue="33" centerLabel="tracked" />
                </div>
                <div className="chart-legend">
                  {riskMix.map((item) => (
                    <div key={item.label} className="legend-item">
                      <div className="legend-dot" style={{ background: item.color }} />
                      {item.label}: <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Operations notes</h3>
                    <p>Small set of numbers that should be checked before end of day.</p>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {operationalNotes.map((item) => (
                    <div key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Immediate focus</span>
            <h3>Approval pressure</h3>
            <div className="workspace-alert-list">
              <article className="workspace-alert warning">
                <strong>Queue building</strong>
                <p>{summary?.pendingReviewCandidates ?? approvalQueue.length} records are waiting on your decision.</p>
              </article>
              <article className="workspace-alert neutral">
                <strong>Team pacing</strong>
                <p>Validation flow is healthy, but competitor review needs faster sign-off.</p>
              </article>
            </div>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Decision style</span>
            <div className="workspace-activity-list">
              <article>
                <strong>Approve when evidence is complete</strong>
                <p>Do not let low-risk items sit in the queue for multiple days.</p>
              </article>
              <article>
                <strong>Escalate when market risk changes</strong>
                <p>Use the director workspace only for decisions with strategic impact.</p>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
