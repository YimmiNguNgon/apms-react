import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

const QUICK_LOGIN_CARDS = [
  { id: 'admin',     initials: 'MT', name: 'Đỗ Minh Trí',       role: 'System Administrator',       color: 'linear-gradient(135deg, #64748b, #475569)' },
  { id: 'director',  initials: 'TT', name: 'Nguyễn Thế Trung',  role: 'Business Director',           color: 'linear-gradient(135deg, #10B981, #059669)' },
  { id: 'manager',   initials: 'QB', name: 'Trần Quốc Bảo',     role: 'BD Manager',                 color: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  { id: 'keymember', initials: 'HV', name: 'Lê Thị Hồng Vân',   role: 'Key Member / Senior Staff',  color: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  { id: 'staff',     initials: 'HH', name: 'Hà Đức Huy',         role: 'BD Staff',                   color: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
];

export const Login: React.FC = () => {
  const { login } = useUser();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim())    { setError('Vui lòng nhập email.'); return; }
    if (!password.trim()) { setError('Vui lòng nhập mật khẩu.'); return; }
    setLoading(true);
    try {
      const ok = await login(email.trim(), password);
      if (!ok) setError('Đăng nhập thất bại. Kiểm tra lại thông tin.');
    } catch (err: any) {
      setError('Lỗi kết nối: ' + (err.message || 'Không thể kết nối server.'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (id: string) => {
    setError('');
    setLoadingId(id);
    try {
      await login(id);
    } catch (err: any) {
      setError('Lỗi: ' + (err.message || 'Không thể kết nối server.'));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Left Hero */}
        <div className="login-left">
          <div className="login-hero-badge">
            <span>✦</span>
            Business Ecosystem Intelligence
          </div>
          <h1 className="login-hero-title">
            Alliance<br />
            <span>Partner</span><br />
            Management
          </h1>
          <p className="login-hero-sub">
            Nền tảng thông minh quản lý hệ sinh thái đối tác, đối thủ cạnh tranh
            và cơ hội thị trường. Được trang bị AI để đưa ra các gợi ý chiến lược.
          </p>
          <div className="login-hero-features">
            {[
              'Bản đồ quan hệ đối tác trực quan',
              'Phân tích đối thủ cạnh tranh AI',
              'Cơ hội thị trường thời gian thực',
              'RBAC với 5 cấp độ phân quyền',
            ].map((f, i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right Card */}
        <div className="login-card">
          {/* Logo */}
          <div className="login-card-logo">
            <div className="login-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="3.5" fill="white" />
                <line x1="12" y1="3" x2="12" y2="8.5" stroke="white" strokeWidth="1.5" />
                <line x1="12" y1="15.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" />
                <line x1="3" y1="12" x2="8.5" y2="12" stroke="white" strokeWidth="1.5" />
                <line x1="15.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div className="login-logo-title">APMS</div>
              <div className="login-logo-sub">Business Intelligence Platform</div>
            </div>
          </div>

          <div className="login-form-title">Đăng nhập hệ thống</div>
          <div className="login-form-sub">Nhập thông tin đăng nhập của bạn</div>

          {/* Form */}
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="example@apms.com"
              value={email}
              disabled={loading || !!loadingId}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Mật khẩu</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              disabled={loading || !!loadingId}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div className="form-error">⚠️ {error}</div>}

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 4, padding: '11px 16px' }}
            onClick={handleSubmit}
            disabled={loading || !!loadingId}
          >
            {loading ? '⏳ Đang xác thực...' : '→ Đăng nhập'}
          </button>

          {/* Quick Login */}
          <div className="quick-login-section">
            <div className="quick-login-title">⚡ Đăng nhập nhanh để kiểm thử</div>
            <div className="quick-login-grid">
              {QUICK_LOGIN_CARDS.map(card => (
                <div
                  key={card.id}
                  className={`quick-login-card ${loadingId || loading ? 'disabled' : ''}`}
                  onClick={() => !loadingId && !loading && handleQuickLogin(card.id)}
                >
                  <div className="ql-avatar" style={{ background: card.color }}>
                    {loadingId === card.id ? '⏳' : card.initials}
                  </div>
                  <div className="ql-info">
                    <div className="ql-name">{card.name}</div>
                    <div className="ql-role">{card.role}</div>
                  </div>
                  <span className="ql-arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
