import React, { useEffect, useState } from 'react';
import { loginApi } from '../API/loginApi';

export const EmailVerification: React.FC<{
  ticket: string;
  email?: string;
  emailDelivered?: boolean;
  emailDeliveryMessage?: string;
  onVerified: () => void;
}> = ({ ticket: initialTicket, email, emailDelivered, emailDeliveryMessage, onVerified }) => {
  const [ticket, setTicket] = useState(initialTicket);
  const [delivery, setDelivery] = useState({ emailDelivered, emailDeliveryMessage });
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const masked = email || 'địa chỉ email của bạn';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6 || loading) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await loginApi.verifyEmailOtp(ticket, otp);
      setNotice('Xác nhận email thành công. Đang quay lại...');
      window.setTimeout(onVerified, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xác thực thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const result = await loginApi.resendEmailOtp(ticket);
      setTicket(result.verificationTicket);
      setDelivery({
        emailDelivered: result.emailDelivered,
        emailDeliveryMessage: result.emailDeliveryMessage,
      });
      setSeconds(300);
      setOtp('');
      setNotice('Mã xác nhận mới đã được gửi đến email của bạn.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi lại mã.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setOtp(value);
    if (error) setError('');
  };

  const renderError = () => {
    // If the system failed to deliver email initially, show that error
    if (delivery.emailDelivered === false && !error) {
      return (
        <div className="verification-error-alert" aria-live="polite">
          <span className="verification-error-icon">⚠</span>
          <div>
            <div className="verification-error-title">Lỗi gửi email</div>
            <div className="verification-error-desc">
              Không thể gửi mã xác nhận đến email của bạn. Vui lòng thử lại sau.
            </div>
          </div>
        </div>
      );
    }

    if (!error) return null;
    
    // Log technical error for debugging
    console.error('Email verification error details:', error);

    let displayTitle = 'Mã xác nhận không hợp lệ';
    let displayDesc = error;

    if (error === 'Invalid verification ticket' || error.toLowerCase().includes('invalid verification ticket')) {
      displayTitle = 'Mã xác nhận không hợp lệ';
      displayDesc = 'Phiên xác nhận đã hết hạn hoặc không còn hợp lệ.';
    } else if (error.toLowerCase().includes('otp') || error.toLowerCase().includes('code')) {
      displayTitle = 'Mã xác nhận không đúng';
      displayDesc = 'Vui lòng kiểm tra lại mã OTP trong hộp thư của bạn.';
    }

    return (
      <div className="verification-error-alert" aria-live="polite">
        <span className="verification-error-icon">⚠</span>
        <div>
          <div className="verification-error-title">{displayTitle}</div>
          <div className="verification-error-desc">{displayDesc}</div>
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    if (!notice) return null;
    return (
      <div className="verification-success-alert" aria-live="polite">
        <span className="verification-success-icon">✓</span>
        <span className="verification-success-text">{notice}</span>
      </div>
    );
  };

  return (
    <div className="verification-page">
      <div className="verification-card">
        <div className="verification-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h1 className="verification-title">Xác nhận Email</h1>
        
        <p className="verification-subtitle">
          Mã xác nhận đã được gửi đến
          <strong className="verification-email-highlight">{masked}</strong>
        </p>

        <form onSubmit={submit}>
          <div className="otp-container">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="otp-real-input"
              autoFocus
              aria-label="Mã xác nhận 6 chữ số"
              disabled={loading}
            />
            <div className="otp-visual-wrapper">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = otp[index] || '';
                const isCurrent = index === otp.length;
                const isCellFocused = isFocused && isCurrent;
                return (
                  <div
                    key={index}
                    className={`otp-visual-cell ${char ? 'has-value' : ''} ${isCellFocused ? 'focused' : ''}`}
                  >
                    {char}
                    {isCellFocused && <span className="otp-cursor" />}
                  </div>
                );
              })}
            </div>
          </div>

          {renderError()}
          {renderSuccess()}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>

          <div className="verification-countdown">
            {seconds > 0 ? (
              <>
                Mã xác nhận còn hiệu lực:{' '}
                <strong>
                  {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                  {String(seconds % 60).padStart(2, '0')}
                </strong>
              </>
            ) : (
              <span className="verification-countdown-expired">Mã xác nhận đã hết hạn.</span>
            )}
          </div>

          <button
            type="button"
            className="verification-resend-btn"
            disabled={loading || seconds > 0}
            onClick={resend}
          >
            Gửi lại mã
          </button>
        </form>
      </div>
    </div>
  );
};
