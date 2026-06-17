import React from 'react';
import { useUser } from '../../context/UserContext';
import { AreaChart, SparkLine } from '../../components/charts/Charts';

const accuracyTrend = [
  { label: 'T1', value: 88 }, { label: 'T2', value: 90 }, { label: 'T3', value: 91 },
  { label: 'T4', value: 93 }, { label: 'T5', value: 92 }, { label: 'T6', value: 94.2 },
];

const reviewQueue = [
  { company: 'Misa JSC',     type: 'Đối tác',   extractedBy: 'AI GPT-4', status: 'Chờ xem xét', badge: 'badge-amber' },
  { company: 'CMC Corp',     type: 'Đối thủ',   extractedBy: 'AI GPT-4', status: 'Cần xác minh', badge: 'badge-red' },
  { company: 'VCCorp',       type: 'Đối tác',   extractedBy: 'Hà Đức Huy', status: 'Đang xét',  badge: 'badge-blue' },
  { company: 'Tima JSC',     type: 'Tiềm năng', extractedBy: 'AI GPT-4', status: 'Chờ xem xét', badge: 'badge-amber' },
  { company: 'KiotViet',     type: 'Đối tác',   extractedBy: 'Hà Đức Huy', status: 'Đã xác nhận',badge: 'badge-green' },
];

export const KeyMemberDashboard: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <section>
      <div className="role-banner keymember">
        <span className="role-banner-text">
          Chào <strong>{currentUser?.name}</strong> — Key Member.
          Có <strong>8 hồ sơ chờ xem xét</strong> và <strong>6 gợi ý AI</strong> cần phê duyệt.
        </span>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Key Member Dashboard</div>
          <div className="page-subtitle">Xác thực dữ liệu AI & phân loại đối tác/đối thủ</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">Xuất danh sách</button>
          <button className="btn btn-primary">Bắt đầu xác thực</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="qa-btn primary">Xác thực Doanh nghiệp</button>
        <button className="qa-btn warning">Review AI Result</button>
        <button className="qa-btn outline">Cập nhật Quan hệ</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { color: 'amber',  value: '8',     label: 'Pending Reviews',         trend: '3 cần gấp',        trendType: 'down', data: [15,14,12,10,9,8,8,8,9,8,8,8] },
          { color: 'green',  value: '94.2%', label: 'Validation Accuracy',      trend: '▲ +1.2% tháng này',trendType: 'up',   data: [88,89,90,91,91,92,93,92,94,93,94,94.2] },
          { color: 'blue',   value: '31',    label: 'Profiles Updated',         trend: '▲ +7 tuần này',    trendType: 'up',   data: [18,20,22,24,25,27,28,29,30,30,31,31] },
          { color: 'purple', value: '6',     label: 'AI Suggestions Waiting',   trend: 'Cần review',       trendType: 'down', data: [12,10,9,8,7,7,6,6,7,6,6,6] },
        ].map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpi.color}`} style={{ paddingTop: '24px' }}>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-trend ${kpi.trendType}`}>{kpi.trend}</div>
            <div className="kpi-sparkline">
              <SparkLine data={kpi.data} color={
                kpi.color === 'blue' ? '#2563EB' : kpi.color === 'green' ? '#10B981' :
                kpi.color === 'purple' ? '#8B5CF6' : '#F59E0B'
              } />
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Queue */}
      <div className="dashboard-grid cols-main-side" style={{ marginBottom: 20 }}>
        {/* Review queue table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Hàng chờ Xem xét</div>
            <span className="stat-list-badge badge-amber">8 đang chờ</span>
          </div>
          <div className="card-body" style={{ padding: '0 0 8px' }}>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doanh nghiệp</th>
                    <th>Loại</th>
                    <th>Nguồn</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.company}</td>
                      <td><span className="badge badge-active" style={{ fontSize: 11 }}>{r.type}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.extractedBy}</td>
                      <td><span className={`stat-list-badge ${r.badge}`}>{r.status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary">Xem xét</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Độ chính xác xác thực</div></div>
            <div className="card-body">
              <AreaChart data={accuracyTrend} color="#10B981" height={130} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Thống kê tuần này</div></div>
            <div className="card-body">
              <ul className="stat-list">
                {[
                  { label: 'Đã xác thực', value: '31', badge: 'badge-green' },
                  { label: 'Từ chối', value: '4', badge: 'badge-red' },
                  { label: 'Đang xem xét', value: '8', badge: 'badge-amber' },
                  { label: 'AI accepted', value: '21', badge: 'badge-blue' },
                  { label: 'Chỉnh sửa', value: '6', badge: 'badge-purple' },
                ].map((s, i) => (
                  <li key={i} className="stat-list-item">
                    <span className="stat-list-label">{s.label}</span>
                    <span className={`stat-list-badge ${s.badge}`}>{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Gợi ý AI chờ phê duyệt</div>
            <div className="card-subtitle">6 gợi ý cần review trước khi gửi Manager</div></div>
          <button className="btn btn-sm btn-primary">Duyệt tất cả</button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[
              { company: 'Misa JSC', action: 'Phân loại: Đối tác Chiến lược', confidence: 92, color: '#10B981' },
              { company: 'CMC Corp', action: 'Phân loại: Đối thủ Cạnh tranh', confidence: 87, color: '#EF4444' },
              { company: 'VCCorp',   action: 'Quan hệ: Hợp tác gián tiếp',   confidence: 78, color: '#2563EB' },
              { company: 'Tima JSC', action: 'Phân loại: Tiềm năng hợp tác',  confidence: 65, color: '#F59E0B' },
              { company: 'KiotViet', action: 'Cập nhật KPI: 8.2/10 → 8.5/10', confidence: 95, color: '#10B981' },
              { company: 'Zalo Pay', action: 'Phân loại: Đối thủ tiềm năng',  confidence: 71, color: '#EF4444' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{s.action}</div>
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div style={{ width: `${s.confidence}%`, background: s.color, height: '100%', borderRadius: 'var(--radius-full)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence: {s.confidence}%</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-primary" style={{ padding: '3px 10px', fontSize: 11 }}>Duyệt</button>
                    <button className="btn btn-sm btn-outline" style={{ padding: '3px 10px', fontSize: 11 }}>Bỏ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
