import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

const DEV_ACCOUNT_ALIASES: Record<string, string> = {
  owner: 'owner@apms.com',
  director: 'director@apms.com',
  manager: 'manager@apms.com',
  keymember: 'keymember@apms.com',
  staff: 'staff@apms.com',
};

export const Login: React.FC = () => {
  const { login } = useUser();
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
      setError('Please enter your email or username.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const ok = await login(normalizeIdentity(email), password);
      if (!ok) {
        setError('Sign-in failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(`Connection error: ${err?.message || 'Cannot reach the server.'}`);
    } finally {
      setLoading(false);
    }
  };

  const fillDevAccount = (identity: string) => {
    setEmail(identity);
    setPassword('123456');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-left">
          <div className="login-hero-badge">
            <span>*</span>
            Business Ecosystem Intelligence
          </div>
          <h1 className="login-hero-title">
            Alliance<br />
            <span>Partner</span><br />
            Management
          </h1>
          <p className="login-hero-sub">
            APMS connects partner, competitor, and market intelligence into one operational workspace backed by your live backend data.
          </p>
          <div className="login-hero-features">
            {[
              'Relationship map and company profiles',
              'Competitive and partnership intelligence',
              'Role-based workspaces for review and approvals',
              'Backend-connected research and scoring flows',
            ].map((feature) => (
              <div key={feature} className="hero-feature">
                <div className="hero-feature-dot" />
                {feature}
              </div>
            ))}
          </div>
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
              <div className="login-logo-sub">Business Intelligence Platform</div>
            </div>
          </div>

          <div className="login-form-title">Sign in</div>
          <div className="login-form-sub">Use your backend account credentials.</div>

          <div className="form-field">
            <label className="form-label">Email or username</label>
            <input
              className="form-input"
              type="text"
              autoComplete="username"
              placeholder="owner@apms.com or manager"
              value={email}
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
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
              style={{ fontSize: '12px', color: '#60A5FA', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => { window.location.href = '/forgot-password'; }}
            >
              Forgot password?
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: -4, marginBottom: 4 }}>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => fillDevAccount('owner')}
              disabled={loading}
            >
              Owner demo
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => fillDevAccount('director')}
              disabled={loading}
            >
              Director demo
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => fillDevAccount('manager')}
              disabled={loading}
            >
              Manager demo
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => fillDevAccount('keymember')}
              disabled={loading}
            >
              Key member
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => fillDevAccount('staff')}
              disabled={loading}
            >
              Staff demo
            </button>
          </div>

          {error && <div className="form-error">Warning: {error}</div>}

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 4, padding: '11px 16px' }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
