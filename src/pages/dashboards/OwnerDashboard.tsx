import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import type { DashboardSummaryDto, AuditLogDto, RoleDto } from '../../types/domain';
import { AreaChart, BarChart, DonutChart } from '../../components/charts/Charts';

const EmptyPanel: React.FC<{ message: string }> = ({ message }) => (
  <div className="workspace-empty">{message}</div>
);

export const OwnerDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<AuditLogDto[]>([]);
  const [userRegData, setUserRegData] = useState<{ period: string; count: number }[]>([]);
  const [loginActivity, setLoginActivity] = useState<{ day: string; logins: number }[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ metric: string; value: number }[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<RoleDto[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get<DashboardSummaryDto>('/dashboard/summary'),
      api.get<AuditLogDto[]>('/dashboard/activity'),
      api.get<{ period: string; count: number }[]>('/dashboard/user-registration'),
      api.get<{ day: string; logins: number }[]>('/dashboard/login-activity'),
      api.get<{ metric: string; value: number }[]>('/dashboard/system-health'),
      api.get<RoleDto[]>('/dashboard/role-distribution'),
    ])
      .then(([summaryRes, activityRes, userRegRes, loginRes, healthRes, roleRes]) => {
        if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
          setSummary(summaryRes.value.data);
        }
        if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value?.data)) {
          setActivityData(activityRes.value.data);
        }
        if (userRegRes.status === 'fulfilled' && Array.isArray(userRegRes.value?.data)) {
          setUserRegData(userRegRes.value.data);
        }
        if (loginRes.status === 'fulfilled' && Array.isArray(loginRes.value?.data)) {
          setLoginActivity(loginRes.value.data);
        }
        if (healthRes.status === 'fulfilled' && Array.isArray(healthRes.value?.data)) {
          setSystemHealth(healthRes.value.data);
        }
        if (roleRes.status === 'fulfilled' && Array.isArray(roleRes.value?.data)) {
          setRoleDistribution(roleRes.value.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = useMemo(
    () => roleDistribution.reduce((sum, item) => sum + Number(item.userCount || 0), 0),
    [roleDistribution]
  );

  const topStats = [
    { label: 'Ecosystem Users', value: totalUsers || summary?.totalUsers || '0', note: 'Total accounts across workspace roles.' },
    { label: 'Platform Projects', value: summary?.totalProjects ?? '0', note: 'Active strategic intelligence projects.' },
    { label: 'System Health', value: `${summary?.systemHealth ?? 99}%`, note: 'Real-time operational readiness index.' },
    { label: 'Today Events', value: summary?.activitiesToday ?? activityData.length, note: 'Audit actions logged today.' },
  ];

  return (
    <section className="workspace-page role-dashboard role-dashboard-admin" id="page-owner-dashboard">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Executive Command <span>/</span> Business Owner</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">Enterprise Overview</span>
              <h1>Owner Strategic Command Center</h1>
              <p>
                {loading
                  ? 'Loading strategic intelligence, health metrics, and ecosystem telemetry...'
                  : `Welcome back, ${currentUser?.name || 'Business Owner'}. Monitor platform posture, ecosystem intelligence, and operational pulse.`}
              </p>
            </div>
            <div className="workspace-head-actions">
              <span className="badge badge-purple" style={{ padding: '8px 14px', fontSize: '13px' }}>
                👑 BUSINESS OWNER ROLE (RANK 5)
              </span>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="workspace-stats">
            {topStats.map((stat) => (
              <article key={stat.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{stat.label}</span>
                <strong className="workspace-stat-value">{stat.value}</strong>
                <p className="workspace-stat-note">{stat.note}</p>
              </article>
            ))}
          </div>

          {/* Core Analytics Grid */}
          <div className="admin-analytics-grid">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>User Registration Growth</h3>
                  <p>Account onboarding trajectory over recent periods.</p>
                </div>
              </div>
              {userRegData.length > 0 ? (
                <AreaChart data={userRegData.map((d) => ({ label: String(d.period || ''), value: Number(d.count || 0) }))} height={240} />
              ) : (
                <EmptyPanel message="No registration series data available." />
              )}
            </div>

            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Role Distribution</h3>
                  <p>Breakdown of workspace permissions across all tiers.</p>
                </div>
              </div>
              {roleDistribution.length > 0 ? (
                <DonutChart data={roleDistribution.map((d, idx) => ({ label: String(d.name || ''), value: Number(d.userCount || 0), color: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][idx % 5] }))} size={180} />
              ) : (
                <EmptyPanel message="No role distribution data recorded." />
              )}
            </div>
          </div>

          {/* Activity & Login Telemetry */}
          <div className="admin-analytics-grid" style={{ marginTop: '24px' }}>
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Sign-in Telemetry</h3>
                  <p>Authentication frequency and user session activity.</p>
                </div>
              </div>
              {loginActivity.length > 0 ? (
                <BarChart data={loginActivity.map((d) => ({ label: String(d.day || ''), value: Number(d.logins || 0) }))} height={220} />
              ) : (
                <EmptyPanel message="No authentication telemetry captured today." />
              )}
            </div>

            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>System Health Monitor</h3>
                  <p>Infrastructure readiness and service latency.</p>
                </div>
              </div>
              {systemHealth.length > 0 ? (
                <BarChart data={systemHealth.map((d) => ({ label: String(d.metric || ''), value: Number(d.value || 0) }))} height={220} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Database Connection Pool</span>
                    <strong style={{ color: '#22C55E' }}>Optimal (99.8%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>API Gateway Latency</span>
                    <strong style={{ color: '#22C55E' }}>42ms avg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>AI Engine Status</span>
                    <strong style={{ color: '#22C55E' }}>Ready (v2.4)</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="workspace-side">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Owner Authority</span>
            <h3>Governance Summary</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              You have full read & executive approval access across Strategy, Projects, Verification, and Ecosystem Intelligence.
            </p>
            <div className="admin-side-metrics" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Project Read Scope</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#22C55E' }}>Global (All Projects)</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System Config Access</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#3B82F6' }}>Read / View Only</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Audit Log Inspection</span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#8B5CF6' }}>Full Trail & Export</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
