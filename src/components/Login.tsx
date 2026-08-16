import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { loginApi, type VerificationPayload } from '../API/loginApi';
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

export const Login: React.FC = () => {
  const { t } = useTranslation('login');
  const { login, applyLoginPayload } = useUser();
  const [verification, setVerification] = useState<VerificationPayload | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      if ('requiresEmailVerification' in result) { setVerification(result); return; }
      const ok = await applyLoginPayload(result);
      if (!ok) {
        setError(t('errorSignInFailed'));
      }
    } catch (err: unknown) {
      setError(t('errorConnection', { message: err instanceof Error ? err.message : t('errorCannotReach') }));
    } finally {
      setLoading(false);
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

        <form className="login-card" onSubmit={handleSubmit}>
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
              {/* <div className="login-logo-sub">Business Intelligence Platform</div> */}
            </div>
          </div>

          <div className="login-form-title">{t('signIn')}</div>
          {/* <div className="login-form-sub">Use your backend account credentials.</div> */}

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
      </div>
    </div>
  );
};
