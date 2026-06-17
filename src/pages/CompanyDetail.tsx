import React, { useState } from 'react';

const tabs = ['overview', 'members', 'projects', 'interactions', 'news-tab', 'risk'];
const tabLabels: Record<string, string> = {
  overview: 'Tổng quan', members: 'Key Members', projects: 'Dự án',
  interactions: 'Tương tác', 'news-tab': 'Tin tức', risk: 'Rủi ro'
};

export const CompanyDetail: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <section className="page active" id="page-company-detail">
      <div className="breadcrumb"><a>Hồ sơ DN</a> / <span>FPT Software</span></div>

      <div className="detail-header">
        <div className="detail-header-left">
          <div className="company-logo-lg blue">FPT</div>
          <div className="detail-header-info">
            <div className="detail-title-row">
              <h1>FPT Software Joint Stock Company</h1>
              <span className="badge badge-green">Đối tác Chiến lược</span>
              <span className="badge badge-active">🟢 Đang hoạt động</span>
            </div>
            <p className="detail-meta">MST: 0101248141 · Thành lập: 13/09/1988 · 🏠 Dịch Vọng Hậu, Cầu Giấy, Hà Nội</p>
            <p className="detail-meta">🌐 fpt-software.com · 📞 +84 24 3768 9049</p>
          </div>
        </div>
        <div className="detail-header-scores">
          <div className="score-item"><span className="score-label">AI Partner Fit</span><div className="progress-bar"><div className="progress-fill blue" style={{width:'88%'}}></div></div><span className="score-value blue-text">88/100</span></div>
          <div className="score-item"><span className="score-label">Competitor Threat</span><div className="progress-bar"><div className="progress-fill orange" style={{width:'42%'}}></div></div><span className="score-value orange-text">42/100</span></div>
          <div className="score-item"><span className="score-label">Sentiment Score</span><div className="progress-bar"><div className="progress-fill green" style={{width:'85%'}}></div></div><span className="score-value green-text">85/100</span></div>
        </div>
        <div className="detail-header-actions">
          <button className="btn btn-primary">Chỉnh sửa</button>
          <button className="btn btn-outline">Xuất PDF</button>
          <button className="btn btn-outline">Theo dõi</button>
        </div>
      </div>

      <div className="detail-tabs">
        {tabs.map(t => (
          <button key={t} className={`detail-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="detail-tab-content active" id="tab-overview">
          <div className="detail-two-col">
            <div className="detail-col">
              <div className="card">
                <h3 className="card-title">Thông tin Doanh nghiệp</h3>
                <div className="info-grid">
                  <div className="info-field"><span className="field-label">Lĩnh vực</span><span className="field-value">Công nghệ Thông tin</span></div>
                  <div className="info-field"><span className="field-label">Quy mô</span><span className="field-value">Enterprise (&gt;40,000 NV)</span></div>
                  <div className="info-field"><span className="field-label">Doanh thu</span><span className="field-value">$2B+ (52,258 tỷ VNĐ)</span></div>
                  <div className="info-field"><span className="field-label">Xếp hạng TC</span><span className="field-value">AA</span></div>
                  <div className="info-field"><span className="field-label">ESG Score</span><span className="field-value">82/100</span></div>
                  <div className="info-field"><span className="field-label">Funding Stage</span><span className="field-value">IPO (HOSE: FPT)</span></div>
                </div>
                <div className="tech-tags">
                  {['Java','AWS','AI/ML','SAP','Digital Transformation','Cloud'].map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
              </div>
              <div className="card">
                <h3 className="card-title">Partnership KPIs</h3>
                <div className="info-grid">
                  <div className="info-field"><span className="field-label">Hợp tác từ</span><span className="field-value">15/03/2021</span></div>
                  <div className="info-field"><span className="field-label">Dự án chung</span><span className="field-value">7 dự án</span></div>
                </div>
                <div className="metric-row mt-12"><span>KPI Score</span><div className="progress-bar"><div className="progress-fill blue" style={{width:'85%'}}></div></div><span className="metric-value">8.5/10</span></div>
                <div className="metric-row"><span>Thân thiết</span><div className="progress-bar"><div className="progress-fill green" style={{width:'78%'}}></div></div><span className="metric-value">7.8/10</span></div>
              </div>
            </div>
            <div className="detail-col">
              <div className="card">
                <h3 className="card-title">SWOT Analysis</h3>
                <div className="swot-grid">
                  <div className="swot-item strengths"><h4>💪 Strengths</h4><ul><li>Thương hiệu hàng đầu VN</li><li>Mạng lưới 30+ quốc gia</li><li>R&amp;D mạnh (FPT AI Center)</li></ul></div>
                  <div className="swot-item weaknesses"><h4>⚠️ Weaknesses</h4><ul><li>Turnover cao (~15%/năm)</li><li>Ra quyết định chậm</li></ul></div>
                  <div className="swot-item opportunities"><h4>🚀 Opportunities</h4><ul><li>Bùng nổ nhu cầu AI toàn cầu</li><li>Mở rộng Trung Đông</li></ul></div>
                  <div className="swot-item threats"><h4>🔴 Threats</h4><ul><li>Cạnh tranh từ Ấn Độ</li><li>Chính sách nhập cư thay đổi</li></ul></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="detail-tab-content active" id="tab-members">
          <div className="section-header">
            <h2>Key Members của FPT Software</h2>
            <button className="btn btn-primary">+ Thêm Member</button>
          </div>
          <div className="member-list">
            {[
              { av:'VN', color:'blue',   name:'Nguyễn Thị Bích Vân',  title:'Giám đốc Quan hệ Đối tác',  closeness:92 },
              { av:'DM', color:'orange', name:'Trần Đức Mạnh',         title:'Trưởng phòng Kỹ thuật (PM)', closeness:75, alert:'⚠️ AI Alert: Nhân sự này vừa cập nhật LinkedIn profile!' },
              { av:'HT', color:'purple', name:'Hoàng Nam Tiến',        title:'Chủ tịch HĐQT FPT Software', closeness:40 },
            ].map((m, i) => (
              <div key={i} className={`member-card ${m.alert ? 'has-alert' : ''}`}>
                <div className="member-left">
                  <div className={`member-avatar ${m.color}`}>{m.av}</div>
                  <div className="member-info">
                    <h3>{m.name}</h3>
                    <p className="member-title">{m.title}</p>
                  </div>
                </div>
                <div className="member-right">
                  <div className="member-closeness">
                    <span className="closeness-label">Thân thiết:</span>
                    <div className="progress-bar"><div className="progress-fill green" style={{width:`${m.closeness}%`}}></div></div>
                    <span className="closeness-value green-text">{m.closeness/10}/10</span>
                  </div>
                  {m.alert && <div className="ai-alert warning">{m.alert}</div>}
                  <div className="member-actions">
                    <button className="btn btn-sm btn-outline">📝 Ghi chú</button>
                    <button className="btn btn-sm btn-outline">📅 Đặt lịch</button>
                    <button className="btn btn-sm btn-primary">📞 Liên hệ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="detail-tab-content active"><div className="card"><h3 className="card-title">Dự án chung</h3><p>Danh sách các dự án hợp tác chung sẽ hiển thị tại đây.</p></div></div>
      )}
      {activeTab === 'interactions' && (
        <div className="detail-tab-content active"><div className="card"><h3 className="card-title">Lịch sử Tương tác</h3><p>Timeline các cuộc gặp, email, cuộc gọi sẽ hiển thị tại đây.</p></div></div>
      )}
      {activeTab === 'news-tab' && (
        <div className="detail-tab-content active">
          <div className="section-header"><h2>Tin tức &amp; Sự kiện — FPT Software</h2><button className="btn btn-outline">🔄 Cập nhật</button></div>
          <div className="timeline">
            <div className="timeline-item"><div className="timeline-dot blue-dot"></div><div className="timeline-content"><div className="timeline-date">05/06/2026</div><span className="badge badge-blue">Báo chí</span><h4>FPT Software ký hợp đồng trị giá $50M với đối tác Mỹ</h4><span className="confidence high">Độ tin cậy: 95% ✅</span></div></div>
            <div className="timeline-item"><div className="timeline-dot green-dot"></div><div className="timeline-content"><div className="timeline-date">01/06/2026</div><span className="badge badge-green">Công bố DN</span><h4>FPT mở thêm văn phòng tại Đà Nẵng — 500 vị trí tuyển dụng mới</h4><span className="confidence high">Độ tin cậy: 99% ✅</span></div></div>
          </div>
        </div>
      )}
      {activeTab === 'risk' && (
        <div className="detail-tab-content active"><div className="card"><h3 className="card-title">Đánh giá Rủi ro</h3><p>Nội dung đánh giá rủi ro chi tiết sẽ hiển thị tại đây.</p></div></div>
      )}
    </section>
  );
};
