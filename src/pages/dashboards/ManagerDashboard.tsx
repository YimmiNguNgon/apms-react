import React from 'react';
import { useUser } from '../../context/UserContext';
import { AreaChart, BarChart, DonutChart, SparkLine } from '../../components/charts/Charts';

const kpiTrend = [
  { label: 'T3', value: 72 }, { label: 'T4', value: 78 }, { label: 'T5', value: 80 },
  { label: 'T6', value: 85 }, { label: 'T7', value: 87 }, { label: 'T8', value: 88 },
];

const partnerPerf = [
  { label: 'FPT',     value: 92, color: '#10B981' },
  { label: 'Viettel', value: 78, color: '#2563EB' },
  { label: 'VNPT',    value: 65, color: '#F59E0B' },
  { label: 'CMC',     value: 55, color: '#F59E0B' },
  { label: 'Misa',    value: 48, color: '#EF4444' },
];

const riskDist = [
  { label: 'Thấp',      value: 24, color: '#10B981' },
  { label: 'Trung bình',value: 15, color: '#F59E0B' },
  { label: 'Cao',       value: 8,  color: '#EF4444' },
];

const pendingItems = [
  { company: 'Misa JSC', type: 'Đánh giá đối tác', assigned: 'Hà Đức Huy', due: '18/06', urgency: 'badge-red' },
  { company: 'CMC Corp', type: 'Phân tích đối thủ', assigned: 'Lê Thị Hồng Vân', due: '20/06', urgency: 'badge-amber' },
  { company: 'VCCorp',   type: 'Cập nhật hồ sơ',   assigned: 'Hà Đức Huy', due: '22/06', urgency: 'badge-amber' },
  { company: 'Tima JSC', type: 'Xác nhận hợp tác',  assigned: 'Nguyễn Anh', due: '25/06', urgency: 'badge-blue' },
];

export const ManagerDashboard: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <section>
      <div className="role-banner manager">
        <span className="role-banner-text">
          Chào <strong>{currentUser?.name}</strong> — BD Manager.
          Bạn có <strong>5 yêu cầu chờ duyệt</strong> và <strong>4 rủi ro đang theo dõi</strong>.
        </span>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Manager Dashboard</div>
          <div className="page-subtitle">Giám sát team, đối tác & chuỗi phê duyệt</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">Team Report</button>
          <button className="btn btn-primary">Phê duyệt AI</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="qa-btn primary">Phân công hồ sơ</button>
        <button className="qa-btn warning">Xem xét phân tích</button>
        <button className="qa-btn success">Duyệt AI Suggestions</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { color: 'green',  value: '87%',  label: 'Team KPI',             trend: '▲ +5% so Q1', trendType: 'up',   data: [72,74,75,78,80,82,83,85,86,87,87,88] },
          { color: 'amber',  value: '5',    label: 'Pending Reviews',       trend: 'Cần xử lý',   trendType: 'down', data: [12,10,8,9,7,6,7,5,6,5,5,5] },
          { color: 'red',    value: 'Medium',label: 'Competitor Threat',    trend: '↗ Đang tăng', trendType: 'down', data: [30,35,40,38,42,45,48,50,50,52,55,55] },
          { color: 'blue',   value: '78%',  label: 'Partner Performance',   trend: '▲ +3% tháng', trendType: 'up',   data: [65,67,70,72,73,75,76,77,78,78,78,79] },
          { color: 'purple', value: '4',    label: 'Risk Cases Active',     trend: '1 mới hôm nay',trendType:'down', data: [8,7,6,5,5,4,4,4,5,4,4,4] },
          { color: 'cyan',   value: '3',    label: 'Approval Requests',     trend: 'Chờ bạn duyệt',trendType:'down', data: [10,8,7,6,5,5,4,3,3,3,3,3] },
        ].map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpi.color}`} style={{ paddingTop: '24px' }}>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-trend ${kpi.trendType}`}>{kpi.trend}</div>
            <div className="kpi-sparkline">
              <SparkLine data={kpi.data} color={
                kpi.color === 'blue' ? '#2563EB' : kpi.color === 'green' ? '#10B981' :
                kpi.color === 'red' ? '#EF4444' : kpi.color === 'purple' ? '#8B5CF6' :
                kpi.color === 'amber' ? '#F59E0B' : '#06B6D4'
              } />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid cols-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">KPI Team theo tháng</div>
              <div className="card-subtitle">Mục tiêu: 90%</div></div>
          </div>
          <div className="card-body">
            <AreaChart data={kpiTrend} color="#10B981" height={150} />
            <div className="progress-wrap" style={{ marginTop: 12 }}>
              <div className="progress-header">
                <span className="progress-label">Team KPI hiện tại</span>
                <span className="progress-value">87%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill green" style={{ width: '87%' }} /></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Hiệu suất Đối tác</div>
              <div className="card-subtitle">Top 5 partners</div></div>
          </div>
          <div className="card-body">
            <BarChart data={partnerPerf} height={150} />
          </div>
        </div>
      </div>

      {/* Pending + Risk */}
      <div className="dashboard-grid cols-main-side">
        {/* Pending Reviews table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Đang Chờ Xử Lý</div>
            <button className="btn btn-sm btn-outline">Xem tất cả</button>
          </div>
          <div className="card-body" style={{ padding: '0 0 8px' }}>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doanh nghiệp</th>
                    <th>Loại</th>
                    <th>Phụ trách</th>
                    <th>Deadline</th>
                    <th>Ưu tiên</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.company}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.type}</td>
                      <td>{r.assigned}</td>
                      <td>{r.due}</td>
                      <td>
                        <span className={`stat-list-badge ${r.urgency}`}>
                          {r.urgency.includes('red') ? 'Cao' : r.urgency.includes('amber') ? 'TB' : 'Thấp'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Phân bổ Rủi ro</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <DonutChart data={riskDist} size={120} centerValue="47" centerLabel="Đối tác" />
              </div>
              <div className="chart-legend">
                {riskDist.map((d, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ background: d.color }} />
                    {d.label}: <strong>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Team Performance</div></div>
            <div className="card-body">
              {[
                { name: 'Hà Đức Huy', score: 92, badge: 'badge-green' },
                { name: 'Lê Thị Hồng Vân', score: 88, badge: 'badge-green' },
                { name: 'Nguyễn Anh', score: 74, badge: 'badge-amber' },
                { name: 'Trần Phúc', score: 65, badge: 'badge-red' },
              ].map((m, i) => (
                <div key={i} className="progress-wrap">
                  <div className="progress-header">
                    <span className="progress-label">{m.name}</span>
                    <span className={`stat-list-badge ${m.badge}`}>{m.score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${m.score >= 80 ? 'green' : m.score >= 70 ? 'amber' : 'red'}`}
                      style={{ width: `${m.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
