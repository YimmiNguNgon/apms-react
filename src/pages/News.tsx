import React, { useState } from 'react';

const newsList = [
  {
    id: 1,
    company: 'FPT Software',
    abbr: 'FPT',
    color: 'blue',
    tag: 'Chiến lược',
    tagClass: 'badge-green',
    time: '2 giờ trước',
    title: 'FPT Software ký kết hợp đồng 50 triệu USD với tập đoàn bảo hiểm Nhật Bản',
    summary: 'FPT Software vừa ký kết hợp đồng trị giá 50 triệu USD với Dai-ichi Life Insurance, mở rộng sự hiện diện tại thị trường Nhật Bản. Thỏa thuận bao gồm phát triển hệ thống core insurance và chuyển đổi số toàn diện cho tập đoàn bảo hiểm hàng đầu Nhật Bản.',
    source: 'cafef.vn',
    sentiment: '🟢 Tích cực',
    sentimentClass: 'badge-green',
    ai: '💡 Cơ hội hợp tác: FPT đang mở rộng sang Nhật — phù hợp với chiến lược APAC của chúng ta.',
  },
  {
    id: 2,
    company: 'VNG Corporation',
    abbr: 'VNG',
    color: 'orange',
    tag: 'Đối thủ',
    tagClass: 'badge-red',
    time: '5 giờ trước',
    title: 'VNG hợp tác với Microsoft triển khai Azure Cloud cho toàn bộ hệ thống Zalo',
    summary: 'VNG Corporation vừa công bố quan hệ đối tác chiến lược với Microsoft để chuyển đổi hạ tầng đám mây, đưa toàn bộ nền tảng Zalo lên Azure. Điều này tăng cường năng lực cạnh tranh của VNG trong thị trường cloud và AI tại Đông Nam Á.',
    source: 'vnexpress.net',
    sentiment: '🔴 Cần theo dõi',
    sentimentClass: 'badge-red',
    ai: '⚠️ Cảnh báo: Đối thủ VNG đang tăng cường hạ tầng — cần theo dõi chiến lược cạnh tranh.',
  },
  {
    id: 3,
    company: 'Viettel Solutions',
    abbr: 'VT',
    color: 'red',
    tag: 'Tiềm năng',
    tagClass: 'badge-yellow',
    time: '1 ngày trước',
    title: 'Viettel Solutions triển khai hệ thống 5G cho 10 khu công nghiệp tại miền Bắc',
    summary: 'Viettel Solutions công bố kế hoạch triển khai hạ tầng mạng 5G phục vụ sản xuất thông minh tại 10 khu công nghiệp trọng điểm miền Bắc trong Q3/2026, với tổng vốn đầu tư 500 tỷ đồng.',
    source: 'dantri.com.vn',
    sentiment: '🟡 Trung tính',
    sentimentClass: 'badge-yellow',
    ai: '🔍 Cơ hội: Viettel đang đầu tư mạnh vào 5G — tiềm năng hợp tác tích hợp phần mềm.',
  },
  {
    id: 4,
    company: 'CMC Technology',
    abbr: 'CMC',
    color: 'purple',
    tag: 'Đối tác',
    tagClass: 'badge-green',
    time: '2 ngày trước',
    title: 'CMC Technology được vinh danh Top 10 Doanh nghiệp CNTT Việt Nam 2026',
    summary: 'CMC Technology Group vừa được Hiệp hội Phần mềm và Dịch vụ CNTT Việt Nam (VINASA) vinh danh trong danh sách Top 10 Doanh nghiệp CNTT xuất sắc năm 2026, nhờ những đóng góp cho chuyển đổi số quốc gia.',
    source: 'ictnews.vn',
    sentiment: '🟢 Tích cực',
    sentimentClass: 'badge-green',
    ai: '💡 Uy tín CMC đang tăng — củng cố quan hệ đối tác hiện tại là chiến lược phù hợp.',
  },
];

export const News: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all'
    ? newsList
    : newsList.filter(n => {
        if (activeTab === 'positive') return n.sentiment.includes('Tích cực');
        if (activeTab === 'risk') return n.sentiment.includes('Cần theo dõi') || n.sentiment.includes('Trung tính');
        return true;
      });

  return (
    <section className="page active" id="page-news">
      <div className="page-header">
        <h1>📰 Tin tức & Thị trường</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline">⚙ Cài đặt nguồn tin</button>
          <button className="btn btn-primary">🔄 Cập nhật ngay</button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Tin hôm nay', value: '24', color: 'var(--primary)', bg: 'var(--primary-light)', icon: '📰' },
          { label: 'Cần theo dõi', value: '3', color: 'var(--danger)', bg: 'var(--danger-light)', icon: '⚠️' },
          { label: 'Tích cực', value: '18', color: 'var(--success)', bg: 'var(--success-light)', icon: '🟢' },
          { label: 'Nguồn theo dõi', value: '12', color: 'var(--warning)', bg: 'var(--warning-light)', icon: '📡' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: s.bg, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'positive', label: '🟢 Tích cực' },
          { id: 'risk', label: '⚠️ Theo dõi' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* News List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(news => (
          <div key={news.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div className={`company-logo-sm ${news.color}`} style={{ flexShrink: 0 }}>{news.abbr}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{news.company}</span>
                  <span className={`badge ${news.tagClass}`}>{news.tag}</span>
                  <span className={`badge ${news.sentimentClass}`}>{news.sentiment}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{news.time} · {news.source}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', lineHeight: 1.4 }}>{news.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>{news.summary}</p>
                <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--primary)', fontSize: 12, color: 'var(--primary-dark)' }}>
                  {news.ai}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
