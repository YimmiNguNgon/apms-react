import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Tab = 'system' | 'security' | 'access-control';

interface SystemState {
  ai_threshold: string;
  crawl_freq: string;
  approval_ttl: string;
  max_upload: string;
  lang: string;
  timezone: string;
}

interface SecurityState {
  mfa: boolean;
  session: boolean;
  ip_lock: boolean;
  pass_policy: boolean;
  audit: boolean;
}

const DEFAULT_SYSTEM: SystemState = {
  ai_threshold: '75',
  crawl_freq: 'Every 6 hours',
  approval_ttl: '48',
  max_upload: '50',
  lang: 'Vietnamese',
  timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
};

const DEFAULT_SECURITY: SecurityState = {
  mfa: true,
  session: true,
  ip_lock: true,
  pass_policy: false,
  audit: true,
};

interface SystemSettingsResponse {
  system?: Partial<SystemState>;
  security?: Partial<SecurityState>;
  trustedIps?: string[];
}

const DEFAULT_IPS = ['192.168.1.0/24', '10.0.0.0/8', '103.72.96.0/21'];

const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

const Toggle: React.FC<{ enabled: boolean; onChange: (value: boolean) => void }> = ({ enabled, onChange }) => (
  <button
    type="button"
    className={`admin-toggle ${enabled ? 'on' : ''}`}
    onClick={() => onChange(!enabled)}
    aria-pressed={enabled}
  >
    <span />
  </button>
);

export const SystemSettingsPage: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'system' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Form states
  const [system, setSystem] = useState<SystemState>(DEFAULT_SYSTEM);
  const [security, setSecurity] = useState<SecurityState>(DEFAULT_SECURITY);
  const [initialSecurity, setInitialSecurity] = useState<SecurityState>(DEFAULT_SECURITY);
  const [trustedIps, setTrustedIps] = useState<string[]>(DEFAULT_IPS);
  const [newIp, setNewIp] = useState('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const fetchSettings = () => {
    setLoading(true);
    setError('');
    api.get<SystemSettingsResponse>('/admin/settings')
      .then((res) => {
        if (res?.success && res.data) {
          setBackendAvailable(true);
          if (res.data.system) setSystem((prev) => ({ ...prev, ...res.data.system }));
          if (res.data.security) {
            setSecurity((prev) => ({ ...prev, ...res.data.security }));
            setInitialSecurity((prev) => ({ ...prev, ...res.data.security }));
          }
          if (Array.isArray(res.data.trustedIps)) setTrustedIps(res.data.trustedIps);
        }
      })
      .catch(() => {
        setBackendAvailable(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const validateForm = (): boolean => {
    setError('');
    // Validate AI Threshold
    const thresholdNum = Number(system.ai_threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      setError('AI threshold must be a number between 0 and 100%.');
      return false;
    }
    // Validate Approval TTL
    const ttlNum = Number(system.approval_ttl);
    if (isNaN(ttlNum) || ttlNum <= 0) {
      setError('Approval SLA must be a positive integer greater than 0.');
      return false;
    }
    // Validate Max Upload
    const uploadNum = Number(system.max_upload);
    if (isNaN(uploadNum) || uploadNum <= 0) {
      setError('Maximum upload size must be a positive integer greater than 0.');
      return false;
    }
    // Validate Trusted IPs
    for (const ip of trustedIps) {
      if (!IP_REGEX.test(ip.trim())) {
        setError(`Invalid IP or CIDR range: ${ip}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveClick = () => {
    if (!validateForm()) return;

    // Check if critical security controls are being turned OFF
    const mfaDisabled = initialSecurity.mfa && !security.mfa;
    const sessionDisabled = initialSecurity.session && !security.session;
    const auditDisabled = initialSecurity.audit && !security.audit;

    if (mfaDisabled || sessionDisabled || auditDisabled) {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = () => {
    setShowConfirmModal(false);
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      system,
      security,
      trustedIps,
    };

    api.put<SystemSettingsResponse>('/admin/settings', payload)
      .then((res) => {
        if (res?.success) {
          setSuccess('System settings updated successfully!');
          if (res.data) {
            if (res.data.system) setSystem((prev) => ({ ...prev, ...res.data.system }));
            if (res.data.security) {
              setSecurity((prev) => ({ ...prev, ...res.data.security }));
              setInitialSecurity((prev) => ({ ...prev, ...res.data.security }));
            }
            if (Array.isArray(res.data.trustedIps)) setTrustedIps(res.data.trustedIps);
          }
          setTimeout(() => setSuccess(''), 4000);
        } else {
          setError(res?.message || 'Failed to update system settings.');
        }
      })
      .catch((err) => {
        setError(err?.message || 'Failed to update system settings.');
      })
      .finally(() => setSaving(false));
  };

  const handleAddIp = () => {
    setError('');
    const ipToTest = newIp.trim();
    if (!ipToTest) return;
    if (!IP_REGEX.test(ipToTest)) {
      setError(`Invalid IP/CIDR format: "${ipToTest}". Must be e.g. 192.168.1.1 or 10.0.0.0/24.`);
      return;
    }
    if (trustedIps.includes(ipToTest)) {
      setError('IP address or range already exists in trusted list.');
      return;
    }
    setTrustedIps((prev) => [...prev, ipToTest]);
    setNewIp('');
  };

  const enabledControls = useMemo(() => {
    return Object.values(security).filter(Boolean).length;
  }, [security]);

  const pageMeta = useMemo(() => ({
    system: {
      eyebrow: 'Platform configuration',
      title: 'System Settings',
      desc: 'Workspace defaults, AI threshold, SLA, and upload limits.',
      meter: 6,
      meterLabel: 'system rules',
      stats: [
        { label: 'AI Threshold', value: `${system.ai_threshold}%` },
        { label: 'Language', value: system.lang },
        { label: 'Timezone', value: system.timezone.split(' ')[0] },
        { label: 'Upload Limit', value: `${system.max_upload} MB` },
      ],
    },
    security: {
      eyebrow: 'Security posture',
      title: 'Security Settings',
      desc: 'MFA, session timeouts, and audit policies.',
      meter: `${enabledControls}/5`,
      meterLabel: 'controls on',
      stats: [
        { label: 'Controls Enabled', value: `${enabledControls}/5` },
        { label: 'MFA Status', value: security.mfa ? 'Active' : 'Disabled' },
        { label: 'Session Lockout', value: security.session ? 'Enabled' : 'Off' },
        { label: 'Audit Trail', value: security.audit ? 'Full' : 'Off' },
      ],
    },
    'access-control': {
      eyebrow: 'Access boundary',
      title: 'Access Control',
      desc: 'Trusted IP subnets and network access policy.',
      meter: trustedIps.length,
      meterLabel: 'trusted subnets',
      stats: [
        { label: 'Trusted IP Ranges', value: trustedIps.length },
        { label: 'IP Lockout', value: security.ip_lock ? 'Active' : 'Off' },
        { label: 'Pass Policy', value: security.pass_policy ? 'Strict' : 'Standard' },
        { label: 'SLA Window', value: `${system.approval_ttl}h` },
      ],
    },
  }[tab]), [enabledControls, security, system, tab, trustedIps.length]);

  return (
    <section className={`page active admin-console-page admin-system-page ${tab} role-dashboard role-dashboard-admin`}>
      <div className={`workspace-page-head admin-console-hero admin-system-hero compact-hero ${tab}`}>
        <div>
          <span className="workspace-side-eyebrow">{pageMeta.eyebrow}</span>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.desc}</p>
        </div>
        <div className="workspace-head-actions">
          <button className="btn btn-primary" disabled={saving || loading} onClick={handleSaveClick}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <div className={`workspace-stats workspace-stats-compact admin-system-stats compact-stats ${tab}`}>
        {pageMeta.stats.map((item) => (
          <article key={item.label} className="workspace-stat-card">
            <span className="workspace-stat-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-tabs">
        {([
          ['system', 'System'],
          ['security', 'Security'],
          ['access-control', 'Access control'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', margin: '16px 0' }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', padding: '10px 14px', borderRadius: '8px', margin: '16px 0' }}>
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="admin-skeleton">Loading system settings...</div>
      ) : !backendAvailable ? (
        <div className="workspace-panel" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
            System Settings not available
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            The system settings backend is being developed. Default configuration is being used for the current session.
          </p>
        </div>
      ) : (
        <div className={`admin-system-content ${tab}`}>
          {tab === 'system' && (
            <div className="admin-system-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>General behavior</h3>
                    <p>Configure thresholds, SLAs, and content upload limits.</p>
                  </div>
                </div>
                <div className="admin-setting-list">
                  <article className="admin-setting-row">
                    <div>
                      <strong>AI confidence threshold (%)</strong>
                      <p>Records below this confidence score enter manual validation queue (0 - 100%).</p>
                    </div>
                    <input
                      type="number"
                      className="admin-input"
                      style={{ width: '120px' }}
                      value={system.ai_threshold}
                      onChange={(e) => setSystem({ ...system, ai_threshold: e.target.value })}
                    />
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>Automated crawl frequency</strong>
                      <p>Cadence for automated public intelligence gathering.</p>
                    </div>
                    <select
                      className="admin-select"
                      value={system.crawl_freq}
                      onChange={(e) => setSystem({ ...system, crawl_freq: e.target.value })}
                    >
                      {['Hourly', 'Every 3 hours', 'Every 6 hours', 'Every 12 hours', 'Daily'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>Approval SLA (hours)</strong>
                      <p>Pending profile submissions trigger escalation after this window.</p>
                    </div>
                    <input
                      type="number"
                      className="admin-input"
                      style={{ width: '120px' }}
                      value={system.approval_ttl}
                      onChange={(e) => setSystem({ ...system, approval_ttl: e.target.value })}
                    />
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>Maximum upload size (MB)</strong>
                      <p>File size limit for evidence upload attachments.</p>
                    </div>
                    <input
                      type="number"
                      className="admin-input"
                      style={{ width: '120px' }}
                      value={system.max_upload}
                      onChange={(e) => setSystem({ ...system, max_upload: e.target.value })}
                    />
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>Default language</strong>
                      <p>Primary workspace language.</p>
                    </div>
                    <select
                      className="admin-select"
                      value={system.lang}
                      onChange={(e) => setSystem({ ...system, lang: e.target.value })}
                    >
                      <option value="Vietnamese">Vietnamese</option>
                      <option value="English">English</option>
                    </select>
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>Timezone</strong>
                      <p>Global timezone for timestamps and scheduling.</p>
                    </div>
                    <select
                      className="admin-select"
                      value={system.timezone}
                      onChange={(e) => setSystem({ ...system, timezone: e.target.value })}
                    >
                      <option value="Asia/Ho_Chi_Minh (UTC+7)">Asia/Ho_Chi_Minh (UTC+7)</option>
                      <option value="Asia/Singapore (UTC+8)">Asia/Singapore (UTC+8)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </article>
                </div>
              </div>

              <aside className="workspace-side-card admin-system-aside">
                <span className="workspace-side-eyebrow">Runtime notes</span>
                <h3>Current defaults</h3>
                <div className="admin-system-note-list">
                  <article>
                    <strong>AI Threshold</strong>
                    <p>{system.ai_threshold}% confidence requirement</p>
                  </article>
                  <article>
                    <strong>Crawl Cadence</strong>
                    <p>{system.crawl_freq}</p>
                  </article>
                  <article>
                    <strong>Review Window</strong>
                    <p>{system.approval_ttl} hour SLA</p>
                  </article>
                </div>
              </aside>
            </div>
          )}

          {tab === 'security' && (
            <div className="admin-security-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>Protection controls</h3>
                    <p>Toggle system security policies and enforcement switches.</p>
                  </div>
                </div>
                <div className="admin-setting-list">
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>Two-factor authentication (MFA)</strong>
                      <p>Require secondary OTP verification for sign-ins.</p>
                    </div>
                    <Toggle enabled={security.mfa} onChange={(val) => setSecurity({ ...security, mfa: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>Idle session timeout</strong>
                      <p>Automatically sign out inactive users after 30 minutes.</p>
                    </div>
                    <Toggle enabled={security.session} onChange={(val) => setSecurity({ ...security, session: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>Suspicious IP lockout</strong>
                      <p>Lock IP addresses after repeated authentication failures.</p>
                    </div>
                    <Toggle enabled={security.ip_lock} onChange={(val) => setSecurity({ ...security, ip_lock: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>Strict password policy</strong>
                      <p>Enforce passwords with uppercase, digits, and symbols.</p>
                    </div>
                    <Toggle enabled={security.pass_policy} onChange={(val) => setSecurity({ ...security, pass_policy: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>Full audit logging</strong>
                      <p>Record all system operations to the audit trail.</p>
                    </div>
                    <Toggle enabled={security.audit} onChange={(val) => setSecurity({ ...security, audit: val })} />
                  </article>
                </div>
              </div>

              <aside className="workspace-side-card admin-system-aside">
                <span className="workspace-side-eyebrow">Posture snapshot</span>
                <h3>Protection summary</h3>
                <div className="admin-system-note-list">
                  <article>
                    <strong>Enabled Controls</strong>
                    <p>{enabledControls} active, {5 - enabledControls} disabled</p>
                  </article>
                  <article>
                    <strong>MFA Policy</strong>
                    <p>{security.mfa ? 'Enforced' : 'Off (Risky)'}</p>
                  </article>
                  <article>
                    <strong>Audit Trail</strong>
                    <p>{security.audit ? 'Full Capture' : 'Disabled'}</p>
                  </article>
                </div>
              </aside>
            </div>
          )}

          {tab === 'access-control' && (
            <div className="admin-access-grid">
              <div className="admin-access-card">
                <div className="workspace-section-head">
                  <div>
                    <h3>Trusted IP whitelist</h3>
                    <p>Allow network entry only from whitelisted IP subnets.</p>
                  </div>
                </div>
                <div className="admin-ip-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {trustedIps.map((ip, index) => (
                    <div key={ip || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <code>{ip}</code>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444' }} onClick={() => setTrustedIps((prev) => prev.filter((_, i) => i !== index))}>
                        Remove
                      </button>
                    </div>
                  ))}
                  {trustedIps.length === 0 && <div className="workspace-empty">No trusted IP ranges defined.</div>}
                </div>
                <div className="admin-toolbar compact" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="admin-input"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="192.168.1.0/24 or 10.0.0.1"
                  />
                  <button className="btn btn-outline" onClick={handleAddIp}>Add Subnet</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Sensitive Security Changes */}
      {showConfirmModal && (
        <div className="workspace-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="workspace-modal" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid rgba(239,68,68,0.5)', padding: '24px', borderRadius: '12px', maxWidth: '450px', width: '90%' }}>
            <h3 style={{ color: '#EF4444', marginTop: 0 }}>⚠️ Confirm Security Policy Change</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-color)' }}>
              You are turning off critical security controls (e.g. MFA, Idle Session Timeout, or Audit Logging). This action affects platform-wide security posture.
            </p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Are you sure you want to save these sensitive security changes?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444' }} onClick={executeSave}>
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
