import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { loginApi, type VerificationPayload, type MfaChallengePayload } from '../API/loginApi';
import { EmailVerification } from './EmailVerification';

const DEV_ACCOUNT_ALIASES: Record<string, string> = import.meta.env.DEV
  ? {
      admin: 'admin@apms.com',
      sysadmin: 'admin@apms.com',
      owner: 'owner@apms.com',
      director: 'director@apms.com',
      manager: 'manager@apms.com',
      keymember: 'keymember@apms.com',
      staff: 'staff@apms.com',
    }
  : {};

type LoginStep = 'CREDENTIALS' | 'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED';

export const Login: React.FC = () => {
  const { t } = useTranslation('login');
  const { applyLoginPayload } = useUser();
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  const [verification, setVerification] = useState<VerificationPayload | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallengePayload | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const normalizeIdentity = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('@')) return trimmed;
    return DEV_ACCOUNT_ALIASES[trimmed.toLowerCase()] || trimmed;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('errorEmptyEmail'));
      return;
    }

    if (!password.trim()) {
      setError(t('errorEmptyPassword'));
      return;
    }

    setLoading(true);
    try {
      const result = await loginApi.login(normalizeIdentity(email), password);
      if ('requiresEmailVerification' in result) {
        setVerification(result);
        return;
      }
      if ('mfaEnrollmentRequired' in result && result.mfaEnrollmentRequired) {
        setMfaChallenge(result);
        setStep('MFA_ENROLLMENT_REQUIRED');
        return;
      }
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaChallenge(result);
        setStep('MFA_REQUIRED');
        return;
      }
      if ('accessToken' in result) {
        const ok = await applyLoginPayload(result);
        if (!ok) {
          setError(t('errorSignInFailed'));
        }
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : t('errorCannotReach');
      const isDbError =
        rawMessage.includes('statement conflicted') ||
        rawMessage.includes('CHECK constraint') ||
        rawMessage.includes('DataIntegrityViolationException') ||
        rawMessage.includes('dbo.') ||
        rawMessage.includes('SQL') ||
        rawMessage.includes('DataAccessException');
      if (isDbError) {
        setError('Unable to complete sign in. Please try again.');
      } else {
        setError(t('errorConnection', { message: rawMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!mfaChallenge || totpCode.trim().length !== 6) {
      return;
    }
    setMfaError('');
    setLoading(true);
    try {
      const loginPayload = await loginApi.verifyMfa(mfaChallenge.challengeId, totpCode.trim());
      const ok = await applyLoginPayload(loginPayload);
      if (!ok) {
        setMfaError('Failed to initialize session.');
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Invalid or expired verification code.';
      const isDbError =
        rawMessage.includes('statement conflicted') ||
        rawMessage.includes('CHECK constraint') ||
        rawMessage.includes('DataIntegrityViolationException') ||
        rawMessage.includes('dbo.') ||
        rawMessage.includes('SQL') ||
        rawMessage.includes('DataAccessException');
      setMfaError(isDbError ? 'Unable to complete sign in. Please try again.' : rawMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (mfaChallenge) {
      void loginApi.cancelMfa(mfaChallenge.challengeId);
    }
    setStep('CREDENTIALS');
    setMfaChallenge(null);
    setTotpCode('');
    setMfaError('');
    setError('');
    setCopiedKey(false);
  };

  const handleCopyKey = () => {
    if (mfaChallenge?.manualEntryKey) {
      void navigator.clipboard.writeText(mfaChallenge.manualEntryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (verification) return <EmailVerification ticket={verification.verificationTicket} email={verification.email} emailDelivered={verification.emailDelivered} emailDeliveryMessage={verification.emailDeliveryMessage} onVerified={() => setVerification(null)} />;

  const features = t('features', { returnObjects: true }) as string[];

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-left">
          {/* <div className="login-hero-badge">
            <span>*</span>
            Business Ecosystem Intelligence
          </div> */}
          <h1 className="login-hero-title">
            {t('heroTitle1')}<br />
            <span>{t('heroTitle2')}</span><br />
            {t('heroTitle3')}
          </h1>
          <p className="login-hero-sub">
            {t('heroSub')}
          </p>
        </div>

        {step === 'CREDENTIALS' && (
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-card-logo">
              <div className="login-logo-mark">
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
                <div className="login-logo-title">APMS</div>
              </div>
            </div>

            <div className="login-form-title">{t('signIn')}</div>

            <div className="form-field">
              <label className="form-label">{t('emailLabel')}</label>
              <input
                className="form-input"
                type="text"
                autoComplete="username"
                placeholder={t('emailPlaceholder')}
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>{t('passwordLabel')}</label>
              </div>
              <input
                className="form-input"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />
              <span
                style={{ fontSize: 'var(--text-caption)', color: '#60A5FA', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { window.location.href = '/forgot-password'; }}
              >
                {t('forgotPassword')}
              </span>
            </div>

            {error && <div className="form-error">{t('warning')}: {error}</div>}

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 4, padding: '11px 16px' }}
              type="submit"
              disabled={loading}
            >
              {loading ? t('authenticating') : t('signIn')}
            </button>
          </form>
        )}

        {step === 'MFA_REQUIRED' && (
          <form className="login-card" onSubmit={handleMfaSubmit}>
            <div className="login-card-logo">
              <div className="login-logo-mark">
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
                <div className="login-logo-title">APMS</div>
              </div>
            </div>

            <div className="login-form-title">Verify your identity</div>
            <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: 4, marginBottom: 20 }}>
              Enter the 6-digit code from your Authenticator app.
            </p>

            <div className="form-field">
              <label className="form-label">Authenticator Code</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                disabled={loading}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 600 }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTotpCode(val);
                }}
              />
            </div>

            {mfaError && <div className="form-error">{mfaError}</div>}

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 8, padding: '11px 16px' }}
              type="submit"
              disabled={loading || totpCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              className="btn btn-block"
              style={{
                marginTop: 10,
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                padding: '9px 16px',
                cursor: 'pointer',
              }}
              onClick={handleBackToLogin}
              disabled={loading}
            >
              &larr; Back to login
            </button>
          </form>
        )}

        {step === 'MFA_ENROLLMENT_REQUIRED' && (
          <form className="login-card" onSubmit={handleMfaSubmit} style={{ maxWidth: 440 }}>
            <div className="login-card-logo">
              <div className="login-logo-mark">
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
                <div className="login-logo-title">APMS</div>
              </div>
            </div>

            <div className="login-form-title">Set up Authenticator</div>
            <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: 4, marginBottom: 16 }}>
              Scan the QR code with your Authenticator app, then enter the 6-digit code below.
            </p>

            {mfaChallenge?.qrCodeDataUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'inline-block' }}>
                  <img
                    src={mfaChallenge.qrCodeDataUrl}
                    alt="Authenticator QR Code"
                    style={{ width: 170, height: 170, display: 'block' }}
                  />
                </div>
              </div>
            )}

            {mfaChallenge?.manualEntryKey && (
              <div style={{ marginBottom: 16, background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: 6 }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 4 }}>Or enter key manually:</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <code style={{ fontSize: '0.825rem', color: '#F1F5F9', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {mfaChallenge.manualEntryKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#60A5FA',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-field">
              <label className="form-label">Verification Code</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                disabled={loading}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 600 }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTotpCode(val);
                }}
              />
            </div>

            {mfaError && <div className="form-error">{mfaError}</div>}

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 8, padding: '11px 16px' }}
              type="submit"
              disabled={loading || totpCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Confirm & Sign In'}
            </button>

            <button
              type="button"
              className="btn btn-block"
              style={{
                marginTop: 10,
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                padding: '9px 16px',
                cursor: 'pointer',
              }}
              onClick={handleBackToLogin}
              disabled={loading}
            >
              &larr; Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
