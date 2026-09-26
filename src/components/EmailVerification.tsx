import React, { useEffect, useState } from 'react';
import { loginApi } from '../API/loginApi';

interface EmailVerificationProps {
  ticket: string;
  email?: string;
  emailDelivered?: boolean;
  emailDeliveryMessage?: string;
  onVerified: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  ticket: initialTicket,
  email,
  emailDelivered,
  emailDeliveryMessage,
  onVerified,
}) => {
  const [ticket, setTicket] = useState(initialTicket);
  const [delivery, setDelivery] = useState({ emailDelivered, emailDeliveryMessage });
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const masked = email || 'your email address';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginApi.verifyEmailOtp(ticket, otp);
      setNotice('Email verified successfully. Please sign in again.');
      window.setTimeout(onVerified, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginApi.resendEmailOtp(ticket);
      setTicket(result.verificationTicket);
      setDelivery({ emailDelivered: result.emailDelivered, emailDeliveryMessage: result.emailDeliveryMessage });
      setSeconds(300);
      setOtp('');
      setNotice('A new verification code was sent.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmDisabled = loading || otp.length !== 6;
  const isResendDisabled = loading || seconds > 240;

  return (
    <div className="login-page">
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          padding: '24px 16px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        <form
          className="login-card"
          onSubmit={submit}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(30, 41, 59, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* APMS Logo Header */}
          <div
            className="login-card-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              className="login-logo-mark"
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(37, 99, 235, 0.5)',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="3.5" fill="white" />
                <line x1="12" y1="3" x2="8.5" y2="8.5" stroke="white" strokeWidth="1.5" />
                <line x1="12" y1="15.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" />
                <line x1="3" y1="12" x2="8.5" y2="12" stroke="white" strokeWidth="1.5" />
                <line x1="15.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div
                className="login-logo-title"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#F1F5F9',
                  letterSpacing: '0.02em',
                }}
              >
                APMS
              </div>
            </div>
          </div>

          {/* Form Title & Description */}
          <div
            className="login-form-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#F8FAFC',
              marginBottom: '6px',
            }}
          >
            Verify Email
          </div>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#94A3B8',
              marginTop: 0,
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            A verification code was sent to:{' '}
            <strong style={{ color: '#F1F5F9', fontWeight: 600, wordBreak: 'break-all' }}>
              {masked}
            </strong>
          </p>

          {/* Delivery Error */}
          {delivery.emailDelivered === false && (
            <div
              className="form-error"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                lineHeight: 1.4,
              }}
            >
              {delivery.emailDeliveryMessage || 'Could not send verification code to your email. Please try again later.'}
            </div>
          )}

          {/* Verification Code Input */}
          <div className="form-field" style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email-verification-otp"
              className="form-label"
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              VERIFICATION CODE
            </label>
            <input
              id="email-verification-otp"
              className="form-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              disabled={loading}
              autoFocus
              style={{
                width: '100%',
                height: '48px',
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: '0.35em',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#F8FAFC',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '8px',
                padding: '8px 14px',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.25)';
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          {/* Validation/API Error */}
          {error && (
            <div
              className="form-error"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          {/* Feedback/Success Notice */}
          {notice && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93C5FD',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                lineHeight: 1.4,
              }}
            >
              {notice}
            </div>
          )}

          {/* Confirm Button */}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={isConfirmDisabled}
            style={{
              width: '100%',
              height: '44px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#FFFFFF',
              background: isConfirmDisabled
                ? 'rgba(37, 99, 235, 0.35)'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: isConfirmDisabled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              boxShadow: isConfirmDisabled ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isConfirmDisabled ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {/* Countdown Display */}
          <div
            style={{
              textAlign: 'center',
              margin: '18px 0 12px',
              fontSize: '0.85rem',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>Code expires in:</span>
            <span
              style={{
                color: seconds <= 60 ? '#F87171' : '#60A5FA',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
              }}
            >
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </div>

          {/* Resend Code Button */}
          <button
            type="button"
            className="btn btn-outline btn-block"
            disabled={isResendDisabled}
            onClick={resend}
            style={{
              width: '100%',
              height: '42px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isResendDisabled ? '#64748B' : '#F1F5F9',
              background: isResendDisabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)',
              border: isResendDisabled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.2)',
              cursor: isResendDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isResendDisabled ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isResendDisabled) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResendDisabled) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            {loading ? 'Resending...' : 'Resend Code'}
          </button>

          {/* Back to Login */}
          <button
            type="button"
            style={{
              marginTop: '14px',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '6px 0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            onClick={onVerified}
            disabled={loading}
          >
            &larr; Back to login
          </button>
        </form>
      </div>
    </div>
  );
};
