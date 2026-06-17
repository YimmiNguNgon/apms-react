import React from 'react';
import { useUser } from '../../context/UserContext';
import { DonutChart, SparkLine } from '../../components/charts/Charts';

const taskCompletionData = [
  { label: 'Hoàn thành', value: 17, color: '#10B981' },
  { label: 'Đang làm',   value: 7,  color: '#2563EB' },
  { label: 'Tồn đọng',   value: 3,  color: '#EF4444' },
];

const recentActivity = [
  { icon: '', title: 'Upload tài liệu mới', desc: 'FPT_Annual_Report_2024.pdf — 2.4MB', time: '10 phút trước', color: '#2563EB' },
  { icon: '', title: 'AI trích xuất xong', desc: 'CMC_Profile.docx → 24 trường dữ liệu', time: '45 phút trước', color: '#10B981' },
  { icon: '', title: 'Tạo hồ sơ mới', desc: 'Misa JSC — Đối tác tiềm năng', time: '2 giờ trước', color: '#F59E0B' },
  { icon: '', title: 'Cập nhật thông tin', desc: 'VCCorp — cập nhật liên hệ và doanh thu', time: '3 giờ trước', color: '#8B5CF6' },
];

export const StaffDashboard: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <section>
      <div className="role-banner staff">
        <span className="role-banner-text">
          Chào <strong>{currentUser?.name}</strong> — BD Staff.
          Bạn có <strong>7 tác vụ AI</strong> đang chạy và <strong>3 tài liệu</strong> chờ xử lý.
        </span>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Staff Dashboard</div>
          <div className="page-subtitle">Nhập liệu, quản lý hồ sơ và tương tác AI Agent</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">Upload tài liệu</button>
          <button className="btn btn-primary">Tạo hồ sơ mới</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="qa-btn primary">Upload File</button>
        <button className="qa-btn success">Tạo Company Profile</button>
        <button className="qa-btn purple">Hỏi AI Agent</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { color: 'blue',  value: '24',   label: 'Tài liệu đã Upload',    trend: '▲ +5 tuần này',   trendType: 'up',  data: [12,14,15,16,18,19,20,21,22,22,23,24] },
          { color: 'green', value: '18',   label: 'Hồ sơ DN đang quản lý', trend: '▲ +3 tháng này',  trendType: 'up',  data: [10,11,12,13,14,15,15,16,17,17,18,18] },
          { color: 'amber', value: '7',    label: 'AI Extraction Tasks',    trend: '3 đang xử lý',   trendType: 'neutral', data: [15,12,10,9,8,8,7,7,8,7,7,7] },
          { color: 'purple',value: '62%',  label: 'Training Progress',      trend: '▲ +8% tuần này', trendType: 'up',  data: [30,35,38,42,45,50,52,55,58,60,62,62] },
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

      {/* Main content row */}
      <div className="dashboard-grid cols-main-side">
        {/* Left: Upload panel + Company list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload Drop Zone */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Upload tài liệu mới</div>
            </div>
            <div className="card-body">
              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: 'var(--bg-input)',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Kéo thả file vào đây
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Hỗ trợ: PDF, DOCX, XLSX, PNG, JPG (tối đa 50MB)
                </div>
                <button className="btn btn-primary">Chọn file</button>
              </div>

              {/* Recent uploads */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Vừa upload
                </div>
                {[
                  { name: 'FPT_Annual_Report_2024.pdf', size: '2.4MB', status: 'Đã xử lý', color: 'badge-green' },
                  { name: 'CMC_Corp_Profile.docx', size: '1.1MB', status: 'AI đang xử lý', color: 'badge-blue' },
                  { name: 'VCCorp_Financial.xlsx', size: '890KB', status: 'Chờ xử lý', color: 'badge-amber' },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.size}</div>
                    </div>
                    <span className={`stat-list-badge ${f.color}`}>{f.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Companies */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Hồ sơ DN của tôi</div>
              <button className="btn btn-sm btn-outline">+ Thêm mới</button>
            </div>
            <div className="card-body" style={{ padding: '0 0 8px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doanh nghiệp</th>
                    <th>Loại</th>
                    <th>Tiến độ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Misa JSC', type: 'Đối tác', progress: 85, badge: 'badge-green' },
                    { name: 'CMC Corp', type: 'Đối thủ', progress: 60, badge: 'badge-amber' },
                    { name: 'VCCorp',   type: 'Đối tác', progress: 40, badge: 'badge-amber' },
                    { name: 'Tima JSC', type: 'Tiềm năng',progress: 20, badge: 'badge-red' },
                  ].map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td><span className="badge badge-active" style={{ fontSize: 11 }}>{c.type}</span></td>
                      <td style={{ width: 100 }}>
                        <div className="progress-bar">
                          <div className={`progress-fill ${c.progress >= 70 ? 'green' : c.progress >= 40 ? 'amber' : 'red'}`}
                            style={{ width: `${c.progress}%` }} />
                        </div>
                      </td>
                      <td><span className={`stat-list-badge ${c.badge}`}>{c.progress}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task Completion Donut */}
          <div className="card">
            <div className="card-header"><div className="card-title">Task Completion</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <DonutChart data={taskCompletionData} size={130} centerValue="27" centerLabel="Tasks" />
              </div>
              <div className="chart-legend">
                {taskCompletionData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ background: d.color }} />
                    {d.label}: <strong>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Training Progress */}
          <div className="card">
            <div className="card-header"><div className="card-title">Training Progress</div></div>
            <div className="card-body">
              {[
                { module: 'APMS Fundamentals', pct: 100, color: 'green' },
                { module: 'Partner Analysis',  pct: 80,  color: 'green' },
                { module: 'AI Tools Mastery',  pct: 62,  color: 'amber' },
                { module: 'Data Validation',   pct: 45,  color: 'amber' },
                { module: 'Advanced Reports',  pct: 10,  color: 'red' },
              ].map((m, i) => (
                <div key={i} className="progress-wrap">
                  <div className="progress-header">
                    <span className="progress-label" style={{ fontSize: 12 }}>{m.module}</span>
                    <span className="progress-value" style={{ fontSize: 12 }}>{m.pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${m.color}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="card">
            <div className="card-header"><div className="card-title">Hoạt động gần đây</div></div>
            <div className="card-body">
              <div className="timeline">
                {recentActivity.map((a, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" style={{ borderColor: a.color }}>{a.icon}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">{a.title}</div>
                      <div className="timeline-desc">{a.desc}</div>
                      <div className="timeline-time">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
