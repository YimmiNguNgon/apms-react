import React, { useState } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
  recommendations?: Array<{ rank: string; name: string; desc: string }>;
}

const initialMessages: Message[] = [
  {
    role: 'ai',
    content: 'Xin chào! Tôi là APMS AI Agent. Tôi có thể giúp bạn phân tích dữ liệu đối tác, tìm kiếm đối tác phù hợp, và cảnh báo rủi ro. Hãy hỏi tôi bất cứ điều gì!'
  },
  {
    role: 'user',
    content: 'Đối tác nào phù hợp nhất nếu tôi muốn mở rộng sang thị trường Nhật Bản?'
  },
  {
    role: 'ai',
    content: 'Dựa trên dữ liệu hồ sơ và lịch sử hợp tác, tôi gợi ý 3 đối tác phù hợp nhất cho thị trường Nhật:',
    recommendations: [
      { rank: 'Top 1', name: 'FPT Software',     desc: 'Fit Score: 88/100 — Đã có văn phòng tại Nhật, 40% doanh thu từ thị trường Nhật' },
      { rank: 'Top 2', name: 'Viettel Solutions', desc: 'Fit Score: 72/100 — Có kinh nghiệm telecoms với NTT Docomo' },
      { rank: 'Top 3', name: 'VNPT Technology',  desc: 'Fit Score: 65/100 — Đang mở rộng khu vực APAC' },
    ]
  }
];

const suggestions = ['Đối tác rủi ro cao nhất?', 'Tin tức mới nhất?', 'Gợi ý hợp tác?', 'So sánh 2 đối tác'];
const quickQuestions = ['Phân tích SWOT đối thủ VNG?', 'Key Member nào sắp nghỉ việc?', 'Đối tác nào chưa liên hệ 30 ngày?', 'Xu hướng ngành CNTT tháng này?'];

export const AIAgent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');

  const sendMessage = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: 'Cảm ơn câu hỏi của bạn! Tôi đang phân tích dữ liệu từ 47 hồ sơ doanh nghiệp và 128 key members để tìm câu trả lời phù hợp nhất... Đây là bản demo prototype — trong thực tế, AI Agent sẽ dùng mô hình RAG với MongoDB + Neo4j Graph Database.'
      }]);
    }, 800);
  };

  return (
    <section className="page active" id="page-ai-agent">
      <div className="ai-agent-layout">
        {/* Chat Panel */}
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-icon" style={{ fontSize: '14px', fontWeight: 'bold' }}>AI</div>
            <div>
              <h2>APMS AI Agent</h2>
              <p>Hỏi bất kỳ điều gì về đối tác, đối thủ và mối quan hệ của bạn</p>
            </div>
          </div>

          <div className="chat-messages" id="chatMessages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.role === 'ai' && <div className="message-avatar ai-avatar" style={{ fontSize: '10px', fontWeight: 'bold' }}>AI</div>}
                <div className={`message-bubble ${m.role}-bubble`}>
                  <p>{m.content}</p>
                  {m.recommendations && (
                    <div className="ai-recommendation">
                      {m.recommendations.map((r, j) => (
                        <div key={j} className={`rec-item ${j === 0 ? 'gold' : j === 1 ? 'silver' : 'bronze'}`}>
                          <span className="rec-rank" style={{ fontSize: '11px', fontWeight: 'bold' }}>{r.rank}</span>
                          <div className="rec-info"><strong>{r.name}</strong><p>{r.desc}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-suggestions">
            {suggestions.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary chat-send" onClick={() => sendMessage()}>Gửi</button>
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="ai-sidebar">
          <div className="ai-sidebar-section">
            <h3>Nguồn dữ liệu</h3>
            <div className="source-list">
              <div className="source-item">47 hồ sơ doanh nghiệp</div>
              <div className="source-item">128 key members</div>
              <div className="source-item">1,240 bài tin tức</div>
              <div className="source-item">89 báo cáo tài chính</div>
            </div>
          </div>
          <div className="ai-sidebar-section">
            <h3>Gợi ý câu hỏi</h3>
            <div className="quick-questions">
              {quickQuestions.map(q => (
                <button key={q} className="quick-q" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          </div>
          <div className="ai-sidebar-section">
            <h3>Cảnh báo mới</h3>
            <div className="alert-list">
              <div className="alert-item danger">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 5 }} />
                <div><p><strong>Key Member FPT</strong> cập nhật LinkedIn</p><span className="alert-time">2 giờ trước</span></div>
              </div>
              <div className="alert-item warning">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 5 }} />
                <div><p><strong>VNG</strong> hợp tác với đối tác mới</p><span className="alert-time">5 giờ trước</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
