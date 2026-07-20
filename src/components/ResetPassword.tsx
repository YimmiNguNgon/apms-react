import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const ResetPassword: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Đường dẫn không hợp lệ hoặc đã hết hạn.');
    }
  }, []);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    
    if (!token) {
      setError('Đường dẫn không hợp lệ hoặc đã hết hạn.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/reset-password', 
        { token, newPassword: password }, 
        { skipAuthRedirect: true }
      );
      if (res?.success) {
        setMessage('Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
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

          <div className="login-form-title">Đặt lại mật khẩu</div>
          
          {message ? (
             <div style={{ textAlign: 'center' }}>
               <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 8, marginBottom: 24 }}>
                 {message}
               </div>
               <button className="btn btn-primary btn-block" onClick={onBackToLogin}>
                 Đi tới Đăng nhập
               </button>
             </div>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">Mật khẩu mới</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  disabled={loading || !token}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  disabled={loading || !token}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && <div className="form-error">⚠️ {error}</div>}

              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 8, padding: '11px 16px' }}
                onClick={handleSubmit}
                disabled={loading || !token}
              >
                {loading ? '⏳ Đang xử lý...' : 'Cập nhật mật khẩu'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button 
                  className="btn" 
                  style={{ background: 'transparent', color: '#94A3B8' }}
                  onClick={onBackToLogin}
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
