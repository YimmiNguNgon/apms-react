import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { AreaChart, BarChart, DonutChart } from '../../components/charts/Charts';

const EmptyPanel: React.FC<{ message: string }> = ({ message }) => (
  <div className="workspace-empty">{message}</div>
);

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [userRegData, setUserRegData] = useState<any[]>([]);
  const [loginActivity, setLoginActivity] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);

  useEffect(() => {
    Promise.allSettled([
      api.get<any>('/dashboard/summary'),
      api.get<any>('/dashboard/activity'),
      api.get<any>('/dashboard/user-registration'),
      api.get<any>('/dashboard/login-activity'),
      api.get<any>('/dashboard/system-health'),
      api.get<any>('/dashboard/role-distribution'),
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
    () => roleDistribution.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [roleDistribution],
  );

  const healthGaugeData = useMemo(() => {
    if (systemHealth.length > 0) return systemHealth;
    const value = Number(summary?.systemHealth ?? 99);
    return [
      { label: 'Healthy', value, color: '#2563EB' },
      { label: 'Remaining', value: Math.max(0, 100 - value), color: '#E2E8F0' },
    ];
  }, [summary, systemHealth]);

  const topStats = [
    { label: 'Total users', value: totalUsers || '0', note: 'Accounts distributed across all workspace roles.' },
    { label: 'Security alerts', value: summary?.securityAlerts ?? '0', note: 'Signals requiring administrator review today.' },
    { label: 'Projects online', value: summary?.totalProjects ?? '0', note: 'Active workspaces with backend access enabled.' },
    { label: 'Activity today', value: summary?.activitiesToday ?? activityData.length, note: 'Recent system events collected from audit services.' },
  ];

  const controlQueue = [
    { label: 'Pending role changes', value: roleDistribution.length > 0 ? Math.max(1, roleDistribution.length - 1) : 2 },
    { label: 'Audit exports requested', value: summary?.securityAlerts ? Math.max(1, Math.floor(summary.securityAlerts / 2)) : 1 },
    { label: 'Policy reviews due', value: loginActivity.length > 3 ? 3 : 2 },
  ];

  return (
    <section className="workspace-page role-dashboard role-dashboard-admin" id="page-admin-dashboard">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Control center <span>/</span> Administration</div>
          <div className="workspace-page-head">
            <div>
              <span className="workspace-side-eyebrow">System governance</span>
              <h1>Platform command center</h1>
              <p>
                {loading
                  ? 'Loading live security, activity, and workspace administration metrics.'
                  : `${currentUser?.name}, the platform is online. Review user growth, login behavior, and system pressure from one governance surface.`}
              </p>
            </div>
            <div className="workspace-head-actions">
              <button className="btn btn-outline">Export audit</button>
              <button className="btn btn-primary">Create account</button>
            </div>
          </div>

          <div className="workspace-focus-card role-focus-card admin">
            <div>
              <span className="workspace-chip">Administrator mode</span>
              <h3>Run the workspace like an operating system, not a back office.</h3>
              <p>Keep permissions clean, surface anomalies early, and maintain enough context to unblock every other role without jumping between screens.</p>
            </div>
            <div className="workspace-focus-metrics">
              <article>
                <strong>{summary?.systemHealth ?? 99}%</strong>
                <span>system health</span>
              </article>
              <article>
                <strong>{summary?.securityAlerts ?? 0}</strong>
                <span>alerts to inspect</span>
              </article>
              <article>
                <strong>{totalUsers || 0}</strong>
                <span>accounts managed</span>
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
                  <h3>User registration velocity</h3>
                  <p>Recent account creation trend from the registration service.</p>
                </div>
              </div>
              {userRegData.length > 0 ? (
                <AreaChart data={userRegData} color="#2563EB" height={180} />
              ) : (
                <EmptyPanel message="No user registration trend is available yet." />
              )}
            </div>

            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Login activity</h3>
                  <p>Successful and failed authentication attempts this week.</p>
                </div>
              </div>
              {loginActivity.length > 0 ? (
                <BarChart data={loginActivity} height={180} />
              ) : (
                <EmptyPanel message="No login activity data was returned." />
              )}
            </div>
          </div>

          <div className="dashboard-grid cols-main-side role-board-grid">
            <div className="workspace-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>Activity stream</h3>
                  <p>Operational signals from user management, access control, and project activity.</p>
                </div>
              </div>
              {activityData.length > 0 ? (
                <div className="workspace-activity-list">
                  {activityData.slice(0, 6).map((item: any, index: number) => (
                    <article key={index} className="workspace-activity-item">
                      <strong>{item.title || item.action || 'System event'}</strong>
                      <p>{item.desc || item.description || item.detail || 'No additional description was provided.'}</p>
                      <span>{item.time || item.timestamp || 'Recently updated'}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No recent activity was returned." />
              )}
            </div>

            <div className="role-dashboard-stack">
              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Role distribution</h3>
                    <p>How the current workspace population is split by role.</p>
                  </div>
                </div>
                {roleDistribution.length > 0 ? (
                  <ul className="stat-list">
                    {roleDistribution.map((item: any, index: number) => (
                      <li key={index} className="stat-list-item">
                        <span className="stat-list-label">{item.role || item.name}</span>
                        <span className={`stat-list-badge ${item.badge || 'badge-blue'}`}>{item.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyPanel message="Role distribution data is not available." />
                )}
              </div>

              <div className="workspace-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Control queue</h3>
                    <p>Short list of governance tasks that should stay near zero.</p>
                  </div>
                </div>
                <div className="workspace-detail-list">
                  {controlQueue.map((item) => (
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
            <span className="workspace-side-eyebrow">System pulse</span>
            <h3>Health snapshot</h3>
            <div className="role-donut-wrap">
              <DonutChart
                data={healthGaugeData}
                size={132}
                centerValue={`${summary?.systemHealth ?? 99}%`}
                centerLabel="uptime"
              />
            </div>
            <p>Use this as the quick read before touching policy, provisioning, or access-control changes.</p>
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Immediate watch</span>
            <div className="workspace-alert-list">
              <article className="workspace-alert danger">
                <strong>Security review</strong>
                <p>{summary?.securityAlerts ?? 0} alerts are waiting for administrator triage.</p>
              </article>
              <article className="workspace-alert neutral">
                <strong>Provisioning</strong>
                <p>{totalUsers || 0} active accounts require role hygiene and periodic review.</p>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
