import React from 'react';
import { useUser } from '../../context/UserContext';
import { AreaChart, BarChart, DonutChart, SparkLine } from '../../components/charts/Charts';
import { NetworkGraph } from '../../components/NetworkGraph';

const partnerGrowth = [
  { label: 'T1', value: 32 }, { label: 'T2', value: 35 }, { label: 'T3', value: 38 },
  { label: 'T4', value: 40 }, { label: 'T5', value: 44 }, { label: 'T6', value: 47 },
];

const threatData = [
  { label: 'Viettel', value: 82, color: '#EF4444' },
  { label: 'VNPT',    value: 65, color: '#F59E0B' },
  { label: 'FPT',     value: 55, color: '#F59E0B' },
  { label: 'Mobifone',value: 48, color: '#10B981' },
  { label: 'CMC',     value: 35, color: '#10B981' },
];

const pipelineData = [
  { label: 'Tiềm năng', value: 23, color: '#2563EB' },
  { label: 'Đang đàm phán', value: 12, color: '#F59E0B' },
  { label: 'Ký kết', value: 8, color: '#10B981' },
];

export const DirectorDashboard: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <section>
      {/* Banner */}
      <div className="role-banner director">
        <span className="role-banner-text">
          Chào <strong>{currentUser?.name}</strong> — Executive Dashboard.
          AI đã cập nhật <strong>15 gợi ý chiến lược mới</strong> và phát hiện <strong>23 cơ hội thị trường</strong>.
        </span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Executive Dashboard</div>
          <div className="page-subtitle">Tổng quan chiến lược hệ sinh thái đối tác & thị trường</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">Báo cáo chiến lược</button>
          <button className="btn btn-primary">Xem AI Insights</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="qa-btn primary">Relationship Map</button>
        <button className="qa-btn success">AI Recommendations</button>
        <button className="qa-btn outline">Strategic Reports</button>
        <button className="qa-btn warning">Market Opportunities</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { color: 'blue',   value: '47',    label: 'Đối Tác Chiến Lược',    trend: '▲ +5 tháng này',   trendType: 'up',    data: [32,35,36,38,40,42,43,44,45,45,46,47] },
          { color: 'red',    value: '8',     label: 'Đối Thủ Rủi Ro Cao',    trend: '▲ +2 đáng chú ý', trendType: 'down',  data: [5,6,6,7,7,7,8,8,8,8,8,8] },
          { color: 'green',  value: '23',    label: 'Cơ Hội Thị Trường',      trend: '▲ +8 tuần này',   trendType: 'up',    data: [12,14,15,16,18,19,20,21,22,22,23,23] },
          { color: 'purple', value: '15',    label: 'AI Strategic Suggestions',trend: '✦ Mới hôm nay',  trendType: 'up',    data: [5,6,8,9,10,11,12,13,14,15,15,15] },
          { color: 'amber',  value: '+12%',  label: 'Partnership Growth',      trend: '▲ Q2 vs Q1',      trendType: 'up',    data: [2,3,5,6,7,8,9,10,11,11,12,12] },
          { color: 'cyan',   value: '8.4',   label: 'Ecosystem Health Score',  trend: '▲ +0.3 tháng này',trendType: 'up',    data: [7.5,7.6,7.8,7.9,8.0,8.1,8.2,8.2,8.3,8.3,8.4,8.4] },
        ].map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpi.color}`} style={{ paddingTop: '24px' }}>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-trend ${kpi.trendType}`}>{kpi.trend}</div>
            <div className="kpi-sparkline">
              <SparkLine data={kpi.data} color={
                kpi.color === 'blue' ? '#2563EB' : kpi.color === 'red' ? '#EF4444' :
                kpi.color === 'green' ? '#10B981' : kpi.color === 'purple' ? '#8B5CF6' :
                kpi.color === 'amber' ? '#F59E0B' : '#06B6D4'
              } />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="dashboard-grid cols-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Tăng trưởng đối tác chiến lược</div>
              <div className="card-subtitle">6 tháng gần nhất</div></div>
          </div>
          <div className="card-body">
            <AreaChart data={partnerGrowth} color="#10B981" height={160} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Mức độ đe doạ đối thủ</div>
              <div className="card-subtitle">Top 5 competitors</div></div>
          </div>
          <div className="card-body">
            <BarChart data={threatData} height={160} />
          </div>
        </div>
      </div>

      {/* Relationship Map + Sidebar */}
      <div className="dashboard-grid cols-main-side">
        <div className="graph-container">
          <div className="graph-header">
            <h2>Bản đồ Quan hệ Hệ sinh thái</h2>
            <div className="graph-controls">
              <button className="btn-icon">+</button>
              <button className="btn-icon">-</button>
              <button className="btn-icon">[ ]</button>
            </div>
          </div>
          <NetworkGraph onNodeClick={() => {}} />
          <div className="graph-legend">
            <span className="legend-item"><span className="legend-dot green" /> Chiến lược</span>
            <span className="legend-item"><span className="legend-dot blue" /> Hoạt động</span>
            <span className="legend-item"><span className="legend-dot yellow" /> Tiềm năng</span>
            <span className="legend-item"><span className="legend-dot red" /> Đối thủ</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline */}
          <div className="card">
            <div className="card-header"><div className="card-title">Opportunity Pipeline</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <DonutChart data={pipelineData} size={120} centerValue="43" centerLabel="Tổng" />
              </div>
              <div className="chart-legend">
                {pipelineData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ background: d.color }} />
                    {d.label}: <strong>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Recommendations preview */}
          <div className="card">
            <div className="card-header"><div className="card-title">Top AI Suggestions</div></div>
            <div className="card-body">
              <ul className="stat-list">
                {[
                  { text: 'Tiếp cận Misa JSC cho hợp tác ERP', badge: 'badge-green', label: 'Cao' },
                  { text: 'Theo dõi CMC Corp — đang mở rộng cloud', badge: 'badge-amber', label: 'Trung bình' },
                  { text: 'Liên kết FPT Telecom cho 5G deal', badge: 'badge-green', label: 'Cao' },
                  { text: 'Rủi ro Viettel ra mắt APMS-like platform', badge: 'badge-red', label: 'Cao' },
                ].map((s, i) => (
                  <li key={i} className="stat-list-item">
                    <span className="stat-list-label" style={{ fontSize: 12 }}>{s.text}</span>
                    <span className={`stat-list-badge ${s.badge}`}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
