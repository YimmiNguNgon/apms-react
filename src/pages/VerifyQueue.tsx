import React from 'react';

// For Manager: Review & approve data submitted by staff or AI Crawl
export const VerifyQueue: React.FC = () => {
  return (
    <section className="page active manager-page role-dashboard role-dashboard-manager verify-page" id="page-verify">
      <div className="page-header">
        <h1>Hàng đợi Xét duyệt Dữ liệu</h1>
        <span className="badge badge-red">5 đang chờ</span>
      </div>
      <div className="tabs">
        <button className="tab active">Tất cả <span className="tab-count">5</span></button>
        <button className="tab">Nhân viên nhập <span className="tab-count">3</span></button>
        <button className="tab">AI Crawl <span className="tab-count">2</span></button>
      </div>
      <div className="dashboard-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Pending review', value: 5, note: 'Records waiting for manager sign-off' },
          { label: 'Staff entries', value: 3, note: 'Human-submitted records' },
          { label: 'AI crawl', value: 2, note: 'Machine-generated records' },
          { label: 'High mismatch', value: 2, note: 'Records needing a closer look' },
        ].map(item => (
          <div key={item.label} className="kpi-card blue">
            <div className="kpi-value">{item.value}</div>
            <div className="kpi-label">{item.label}</div>
            <p>{item.note}</p>
          </div>
        ))}
      </div>
      <div className="verify-split">
        <div className="verify-queue">
          {[
            { name: 'Công ty ABC Technology',    badge: 'Nhân viên',  by: 'Nguyễn Văn A · 2 giờ trước', ai: 76,  conf: 'medium' },
            { name: 'VNG Corporation (cập nhật)',badge: 'AI Crawl', by: 'Bot crawl · 3 giờ trước',    ai: 91,  conf: 'high' },
            { name: 'Key Member — FPT',          badge: 'Nhân viên',  by: 'Lê Thị B · 5 giờ trước',     ai: 68,  conf: 'low' },
            { name: 'CMC Technology (tài chính)',badge: 'AI Crawl', by: 'Bot crawl · 6 giờ trước',    ai: 88,  conf: 'high' },
            { name: 'Viettel Solutions (mới)',   badge: 'Nhân viên',  by: 'Trần C · 1 ngày trước',       ai: 79,  conf: 'medium' },
          ].map((item, i) => (
            <div key={i} className={`queue-item ${i === 0 ? 'active' : ''}`}>
              <div className="queue-company">{item.name}</div>
              <div className="queue-meta">
                <span className={`badge ${item.badge.includes('AI') ? 'badge-purple-sm' : 'badge-blue-sm'}`}>{item.badge}</span>
                <span>{item.by}</span>
              </div>
              <div className="queue-confidence">
                <span className={`confidence ${item.conf}`}>AI: {item.ai}% {item.conf === 'high' ? 'Khuyến nghị duyệt' : 'Cần xem xét'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="verify-detail">
          <h3>So sánh 3 nguồn dữ liệu — Công ty ABC Technology</h3>
          <div className="compare-table">
            <div className="compare-header">
              <div className="compare-col label">Thuộc tính</div>
              <div className="compare-col source1">Nhân viên nhập</div>
              <div className="compare-col source2">AI Crawl</div>
              <div className="compare-col source3">Nguồn ngoài</div>
            </div>
            {[
              { attr:'Tên DN',   s1:'ABC Tech',      s2:'ABC Technology JSC', s3:'ABC Technology', c1:'diff',  c2:'diff',  c3:'' },
              { attr:'Website',  s1:'abctech.vn',    s2:'abctech.vn',         s3:'abctech.vn',  c1:'match', c2:'match', c3:'match' },
              { attr:'Doanh thu',s1:'50 tỷ VNĐ',    s2:'48.5 tỷ VNĐ',       s3:'—',              c1:'',      c2:'diff',  c3:'missing' },
              { attr:'Số NV',    s1:'200',           s2:'180-220',            s3:'~200',         c1:'match', c2:'match', c3:'match' },
            ].map((row, i) => (
              <div key={i} className="compare-row">
                <div className="compare-col label">{row.attr}</div>
                <div className={`compare-col source1 ${row.c1}`}>{row.s1}</div>
                <div className={`compare-col source2 ${row.c2}`}>{row.s2}</div>
                <div className={`compare-col source3 ${row.c3}`}>{row.s3 || 'Không có dữ liệu'}</div>
              </div>
            ))}
          </div>
          <div className="ai-analysis-box">
            <div className="ai-analysis-icon" style={{ fontSize: '14px', fontWeight: 'bold' }}>AI</div>
            <div className="ai-analysis-content">
              <h4>Phân tích AI</h4>
              <p>Dữ liệu có <strong>2 điểm khác biệt nhỏ</strong>. Sai lệch doanh thu nằm trong biên độ chấp nhận (3%). Khuyến nghị: <strong>Chấp nhận và hợp nhất dữ liệu.</strong></p>
              <div className="ai-confidence-display">
                <span>Độ tin cậy tổng hợp:</span>
                <div className="progress-bar lg"><div className="progress-fill orange" style={{width:'76%'}}></div></div>
                <span className="orange-text"><strong>76%</strong></span>
              </div>
            </div>
          </div>
          <div className="verify-actions">
            <button className="btn btn-danger">Từ chối</button>
            <button className="btn btn-outline">Yêu cầu bổ sung</button>
            <button className="btn btn-success">Chấp nhận</button>
          </div>
        </div>
      </div>
    </section>
  );
};
