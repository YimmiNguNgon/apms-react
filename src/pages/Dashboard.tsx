import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { NetworkGraph } from '../components/NetworkGraph';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [showPopup, setShowPopup] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const canViewSummary = currentUser.username === 'director' || currentUser.username === 'manager' || currentUser.username === 'admin';
    if (canViewSummary) {
      setLoading(true);
      api.get<any>('/dashboard/summary')
        .then(res => {
          if (res && res.success && res.data) {
            setSummary(res.data);
          }
        })
        .catch(err => {
          console.warn('Could not load real dashboard summary from API (using mockup fallback):', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const getBanner = () => {
    switch (currentUser.username) {
      case 'director':
        return (
          <div style={{ margin:'16px 0', padding:'14px 20px', borderRadius:'var(--radius-lg)', fontSize:'14px', fontWeight:500, display:'flex', alignItems:'center', gap:12, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#065f46' }}>
            <span>💡</span>
            <span>Chào Giám đốc <strong>{currentUser.name}</strong>. Bản đồ quan hệ và AI recommendations đã được cập nhật theo định hướng chiến lược doanh nghiệp.</span>
          </div>
        );
      case 'manager':
        return (
          <div style={{ margin:'16px 0', padding:'14px 20px', borderRadius:'var(--radius-lg)', fontSize:'14px', fontWeight:500, display:'flex', alignItems:'center', gap:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#92400e' }}>
            <span>🔔</span>
            <span>Chào Quản lý <strong>{currentUser.name}</strong>. Bạn có <strong>5 yêu cầu xét duyệt mới</strong> từ nhân viên và AI đang chờ xử lý.</span>
          </div>
        );
      case 'keymember':
        return (
          <div style={{ margin:'16px 0', padding:'14px 20px', borderRadius:'var(--radius-lg)', fontSize:'14px', fontWeight:500, display:'flex', alignItems:'center', gap:12, background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', color:'#4c1d95' }}>
            <span>🔍</span>
            <span>Chào <strong>{currentUser.name}</strong>. Có <strong>3 hồ sơ DN</strong> cần xác thực dữ liệu AI trích xuất trước khi gửi Manager duyệt.</span>
          </div>
        );
      case 'staff':
        return (
          <div style={{ margin:'16px 0', padding:'14px 20px', borderRadius:'var(--radius-lg)', fontSize:'14px', fontWeight:500, display:'flex', alignItems:'center', gap:12, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', color:'#1e3a8a' }}>
            <span>📝</span>
            <span>Chào <strong>{currentUser.name}</strong>. Hãy hoàn tất nhập liệu hồ sơ đối tác mới hoặc kiểm tra các bài báo do AI crawl về để gửi phê duyệt.</span>
          </div>
        );
      default: return null;
    }
  };

  // Resolve values with mockup fallbacks
  const displayTotal = summary ? summary.partnerCount + summary.potentialPartnerCount + summary.competitorCount + summary.supplierCount : 47;
  const displayPartners = summary ? summary.partnerCount : 12;
  const displayPotential = summary ? summary.potentialPartnerCount : 8;
  const displayCompetitors = summary ? summary.competitorCount : 3;

  return (
    <section className="page active" id="page-dashboard">
      <div className="page-header">
        <h1>Dashboard Tổng quan {loading && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 'normal' }}>(Đang tải...)</span>}</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline">Xuất báo cáo</button>
          <button className="btn btn-primary">+ Thêm đối tác</button>
        </div>
      </div>

      {getBanner()}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">🤝</div>
          <div className="kpi-content">
            <span className="kpi-number">{displayTotal}</span>
            <span className="kpi-label">Tổng Đối tác</span>
            <span className="kpi-trend up">▲ 5 tháng này</span>
          </div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-icon">⭐</div>
          <div className="kpi-content">
            <span className="kpi-number">{displayPartners}</span>
            <span className="kpi-label">Đang Hợp tác</span>
            <span className="kpi-trend up">▲ {summary ? 'hoạt động' : '2 mới'}</span>
          </div>
        </div>
        <div className="kpi-card kpi-yellow">
          <div className="kpi-icon">🔍</div>
          <div className="kpi-content">
            <span className="kpi-number">{displayPotential}</span>
            <span className="kpi-label">Tiềm năng</span>
            <span className="kpi-trend neutral">— ổn định</span>
          </div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <span className="kpi-number">{displayCompetitors}</span>
            <span className="kpi-label">Đối thủ cạnh tranh</span>
            <span className="kpi-trend down">{summary ? 'trong hệ thống' : '▼ 1 giảm'}</span>
          </div>
        </div>
      </div>

      {/* Graph + Filter */}
      <div className="dashboard-body">
        <div className="graph-container">
          <div className="graph-header">
            <h2>Bản đồ Quan hệ</h2>
            <div className="graph-controls">
              <button className="btn-icon" title="Phóng to">➕</button>
              <button className="btn-icon" title="Thu nhỏ">➖</button>
              <button className="btn-icon" title="Toàn màn hình">⛶</button>
            </div>
          </div>
          <NetworkGraph onNodeClick={() => setShowPopup(true)} />
          <div className="graph-legend">
            <span className="legend-item"><span className="legend-dot green"></span> Chiến lược</span>
            <span className="legend-item"><span className="legend-dot blue"></span> Đang hoạt động</span>
            <span className="legend-item"><span className="legend-dot yellow"></span> Tiềm năng</span>
            <span className="legend-item"><span className="legend-dot red"></span> Đối thủ</span>
            <span className="legend-item"><span className="legend-dot gray-dash"></span> Gián tiếp</span>
          </div>
        </div>

        <div className="graph-filter-panel">
          <h3>Bộ lọc</h3>
          <div className="filter-group">
            <label className="filter-label">Loại quan hệ</label>
            <label className="checkbox-item"><input type="checkbox" defaultChecked /> Đối tác chiến lược <span className="count">(12)</span></label>
            <label className="checkbox-item"><input type="checkbox" defaultChecked /> Đối tác hoạt động <span className="count">(24)</span></label>
            <label className="checkbox-item"><input type="checkbox" defaultChecked /> Tiềm năng <span className="count">(8)</span></label>
            <label className="checkbox-item"><input type="checkbox" defaultChecked /> Đối thủ <span className="count">(5)</span></label>
            <label className="checkbox-item"><input type="checkbox" /> Đã chấm dứt <span className="count">(3)</span></label>
          </div>
          <div className="filter-group">
            <label className="filter-label">Ngành nghề</label>
            <select className="filter-select">
              <option>Tất cả ngành</option>
              <option>Công nghệ thông tin</option>
              <option>Viễn thông</option>
              <option>Tài chính</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Mức độ rủi ro</label>
            <label className="radio-item"><input type="radio" name="risk" defaultChecked /> Tất cả</label>
            <label className="radio-item"><input type="radio" name="risk" /> Thấp</label>
            <label className="radio-item"><input type="radio" name="risk" /> Trung bình</label>
            <label className="radio-item"><input type="radio" name="risk" /> Cao</label>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary btn-block">Áp dụng</button>
            <button className="btn btn-ghost btn-block">Đặt lại</button>
          </div>
        </div>
      </div>

      {/* Node Popup */}
      {showPopup && (
        <div className="node-popup show" id="nodePopup">
          <div className="popup-header">
            <div className="popup-company">
              <div className="company-logo-sm blue">FPT</div>
              <div>
                <h4>FPT Software</h4>
                <span className="badge badge-green">Đối tác Chiến lược</span>
                <span className="badge badge-active">🟢 Đang hoạt động</span>
              </div>
            </div>
            <button className="popup-close" onClick={() => setShowPopup(false)}>✕</button>
          </div>
          <div className="popup-metrics">
            <div className="metric-row"><span>KPI Score</span><div className="progress-bar"><div className="progress-fill blue" style={{width:'85%'}}></div></div><span className="metric-value">8.5/10</span></div>
            <div className="metric-row"><span>Thân thiết</span><div className="progress-bar"><div className="progress-fill green" style={{width:'78%'}}></div></div><span className="metric-value">7.8/10</span></div>
            <div className="metric-row"><span>Rủi ro CT</span><div className="progress-bar"><div className="progress-fill orange" style={{width:'42%'}}></div></div><span className="metric-value orange-text">4.2/10</span></div>
          </div>
          <div className="popup-info">
            <div className="info-row"><span className="info-label">Key Contact:</span> Nguyễn Thị Bích Vân (PM)</div>
            <div className="info-row"><span className="info-label">Phụ trách:</span> Hà Đức Huy</div>
            <div className="info-row"><span className="info-label">Dự án chung:</span> 7 dự án</div>
          </div>
          <div className="popup-actions">
            <button className="btn btn-primary">Xem Hồ sơ →</button>
            <button className="btn btn-outline">Liên hệ</button>
            <button className="btn btn-outline">Ghi chú</button>
          </div>
        </div>
      )}
    </section>
  );
};
