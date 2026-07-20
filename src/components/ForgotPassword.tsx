import React, { useState } from 'react';
import { api } from '../services/api';

export const ForgotPassword: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }, { skipAuthRedirect: true });
      if (res?.success) {
        setMessage('Nếu email này tồn tại trong hệ thống, chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.');
      }
    } catch (err: any) {
      setError('Lỗi: ' + (err.message || 'Không thể kết nối đến máy chủ.'));
    } finally {
      setLoading(false);
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
          <div className="login-card-logo">
            <div className="login-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="3.5" fill="white" />
              </svg>
            </div>
            <div>
              <div className="login-logo-title">APMS</div>
            </div>
          </div>

          <div className="login-form-title">Quên mật khẩu</div>
          <div className="login-form-sub">Nhập email của bạn để nhận liên kết đặt lại mật khẩu</div>

          {message ? (
            <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 8, marginBottom: 16 }}>
              {message}
            </div>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="example@apms.com"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && <div className="form-error">⚠️ {error}</div>}

              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 8, padding: '11px 16px' }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '⏳ Đang gửi yêu cầu...' : 'Gửi liên kết'}
              </button>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button 
              className="btn" 
              style={{ background: 'transparent', color: '#94A3B8' }}
              onClick={onBackToLogin}
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
