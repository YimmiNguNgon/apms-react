import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { AreaChart, BarChart, DonutChart, SparkLine } from '../../components/charts/Charts';

const activityData = [
  { icon: '', title: 'Người dùng mới đăng ký', desc: 'staff.nguyen@fpt.com', time: '2 phút trước', color: '#2563EB' },
  { icon: '', title: 'Đăng nhập thất bại nhiều lần', desc: 'IP: 192.168.1.105 — bị khóa 15 phút', time: '8 phút trước', color: '#EF4444' },
  { icon: '', title: 'Phân quyền thay đổi', desc: 'Manager → Key Member: Lê Thị Hồng Vân', time: '32 phút trước', color: '#F59E0B' },
  { icon: '', title: 'Audit log được xem', desc: 'Admin Đỗ Minh Trí xem log ngày 14/06', time: '1 giờ trước', color: '#10B981' },
  { icon: '', title: 'Chính sách bảo mật cập nhật', desc: 'Password policy: min 8 chars + special', time: '2 giờ trước', color: '#8B5CF6' },
];

const userRegData = [
  { label: 'T1', value: 12 }, { label: 'T2', value: 18 }, { label: 'T3', value: 15 },
  { label: 'T4', value: 22 }, { label: 'T5', value: 28 }, { label: 'T6', value: 35 },
];

const loginActivity = [
  { label: 'T2', value: 145, color: '#2563EB' },
  { label: 'T3', value: 188, color: '#2563EB' },
  { label: 'T4', value: 162, color: '#2563EB' },
  { label: 'T5', value: 201, color: '#2563EB' },
  { label: 'T6', value: 175, color: '#EF4444' },
  { label: 'T7', value: 95, color: '#2563EB' },
  { label: 'CN', value: 80, color: '#2563EB' },
];

const systemHealth = [
  { label: 'API Server', value: 98.7, color: '#10B981' },
  { label: 'Database',   value: 1,    color: '#2563EB' },
  { label: 'Cache',      value: 0.3,  color: '#F59E0B' },
];

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

  return (
    <section>
      {/* Role Banner */}
      <div className="role-banner admin">
        <span className="role-banner-text">
          Chào <strong>{currentUser?.name}</strong> — System Administrator.
          Có <strong>3 cảnh báo bảo mật</strong> và <strong>12 người dùng mới</strong> cần xem xét hôm nay.
        </span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">System Dashboard</div>
          <div className="page-subtitle">Tổng quan hệ thống & quản lý người dùng</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">Xuất Audit Log</button>
          <button className="btn btn-primary">Thêm người dùng</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { color: 'blue',   value: '247',  label: 'Tổng Users',          trend: '▲ +12 tháng này', trendType: 'up', data: [20,25,22,30,35,28,38,42,38,45,52,60] },
          { color: 'green',  value: '189',  label: 'Users Đang Hoạt Động', trend: '76.5% online',    trendType: 'up', data: [150,165,170,175,185,180,190,188,192,185,189,195] },
          { color: 'red',    value: '12',   label: 'Đăng Nhập Thất Bại',  trend: '▼ -3 so hôm qua', trendType: 'down', data: [20,15,18,12,16,14,10,8,12,15,12,10] },
          { color: 'cyan',   value: '98.7%',label: 'System Health',        trend: '✓ Ổn định',       trendType: 'up', data: [95,97,98,96,99,98.5,98.7,99,98.8,99,98.7,99.1] },
          { color: 'amber',  value: '3',    label: 'Security Alerts',      trend: 'Cần xem xét',     trendType: 'down', data: [8,6,5,7,4,6,5,3,4,3,3,3] },
          { color: 'purple', value: '1,248',label: 'Activities Today',     trend: '▲ +18%',          trendType: 'up', data: [800,900,950,1100,1050,1200,1180,1248,1200,1250,1248,1300] },
        ].map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpi.color}`} style={{ paddingTop: '24px' }}>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-trend ${kpi.trendType}`}>{kpi.trend}</div>
            <div className="kpi-sparkline">
              <SparkLine data={kpi.data} color={
                kpi.color === 'blue' ? '#2563EB' : kpi.color === 'green' ? '#10B981' :
                kpi.color === 'red' ? '#EF4444' : kpi.color === 'cyan' ? '#06B6D4' :
                kpi.color === 'amber' ? '#F59E0B' : '#8B5CF6'
              } />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid cols-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Người dùng đăng ký theo tháng</div>
              <div className="card-subtitle">Năm 2025</div>
            </div>
          </div>
          <div className="card-body">
            <AreaChart data={userRegData} color="#2563EB" height={160} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Hoạt động đăng nhập tuần này</div>
              <div className="card-subtitle">Thành công vs Thất bại</div>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={loginActivity} height={160} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-grid cols-main-side">
        {/* Activity Timeline */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Hoạt động gần đây</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['users', 'logs'] as const).map(t => (
                <button key={t} className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab(t)}>
                  {t === 'users' ? 'Users' : 'Logs'}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            <div className="timeline">
              {activityData.map((a, i) => (
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

        {/* System Health + User Roles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">System Health</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <DonutChart data={systemHealth} size={120} centerValue="98.7%" centerLabel="Uptime" />
              </div>
              <div className="health-grid">
                {[
                  { label: 'CPU', value: '42%', status: 'ok' },
                  { label: 'Memory', value: '68%', status: 'warn' },
                  { label: 'Disk', value: '31%', status: 'ok' },
                  { label: 'Network', value: '12ms', status: 'ok' },
                ].map((h, i) => (
                  <div key={i} className="health-item">
                    <div className="health-label">{h.label}</div>
                    <div className="health-value">{h.value}</div>
                    <div className={`health-status ${h.status}`}>
                      {h.status === 'ok' ? 'Normal' : 'Warning'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Phân bổ Roles</div></div>
            <div className="card-body">
              <ul className="stat-list">
                {[
                  { role: 'System Admin', count: 3,   badge: 'badge-red' },
                  { role: 'BD Director',  count: 5,   badge: 'badge-green' },
                  { role: 'BD Manager',   count: 12,  badge: 'badge-amber' },
                  { role: 'Key Member',   count: 45,  badge: 'badge-purple' },
                  { role: 'BD Staff',     count: 182, badge: 'badge-blue' },
                ].map((r, i) => (
                  <li key={i} className="stat-list-item">
                    <span className="stat-list-label">{r.role}</span>
                    <span className={`stat-list-badge ${r.badge}`}>{r.count}</span>
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
