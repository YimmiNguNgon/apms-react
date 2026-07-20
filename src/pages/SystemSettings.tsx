import React, { useEffect, useMemo, useState } from 'react';

type Tab = 'system' | 'security' | 'access-control';

interface Setting {
  id: string;
  label: string;
  desc: string;
  value: string;
  type: 'text' | 'select';
  options?: string[];
}

const SYSTEM_SETTINGS: Setting[] = [
  { id: 'ai_threshold', label: 'AI confidence threshold', desc: 'Records below this confidence enter manual validation.', value: '75', type: 'select', options: ['60', '70', '75', '80', '85', '90'] },
  { id: 'crawl_freq', label: 'Automated crawl frequency', desc: 'How often APMS collects public intelligence from external sources.', value: 'Every 6 hours', type: 'select', options: ['Hourly', 'Every 3 hours', 'Every 6 hours', 'Every 12 hours', 'Daily'] },
  { id: 'approval_ttl', label: 'Approval SLA', desc: 'Pending records trigger a manager reminder after this window.', value: '48', type: 'select', options: ['12', '24', '48', '72'] },
  { id: 'max_upload', label: 'Maximum upload size', desc: 'Maximum document upload size in MB.', value: '50', type: 'select', options: ['10', '25', '50', '100'] },
  { id: 'lang', label: 'Default language', desc: 'Default interface language for the workspace.', value: 'Vietnamese', type: 'select', options: ['Vietnamese', 'English'] },
  { id: 'timezone', label: 'Timezone', desc: 'Timezone used for all audit and workflow timestamps.', value: 'Asia/Ho_Chi_Minh (UTC+7)', type: 'select', options: ['Asia/Ho_Chi_Minh (UTC+7)', 'Asia/Singapore (UTC+8)', 'UTC'] },
];

const SECURITY_SETTINGS = [
  { id: 'mfa', label: 'Two-factor authentication', desc: 'Require OTP verification on new sign-ins.', enabled: true },
  { id: 'session', label: 'Idle session timeout', desc: 'Sign users out after 30 minutes without activity.', enabled: true },
  { id: 'ip_lock', label: 'Suspicious IP lockout', desc: 'Block IPs after repeated failed authentication attempts.', enabled: true },
  { id: 'pass_policy', label: 'Strong password policy', desc: 'Require mixed case, numbers, and special characters.', enabled: false },
  { id: 'audit', label: 'Full audit capture', desc: 'Write every sensitive operation to the audit log.', enabled: true },
];

const Toggle: React.FC<{ enabled: boolean; onChange: (value: boolean) => void }> = ({ enabled, onChange }) => (
  <button className={`admin-toggle ${enabled ? 'on' : ''}`} onClick={() => onChange(!enabled)} aria-pressed={enabled}>
    <span />
  </button>
);

export const SystemSettingsPage: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'system' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [settings, setSettings] = useState(SYSTEM_SETTINGS);
  const [security, setSecurity] = useState(SECURITY_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [ipList, setIpList] = useState(['192.168.1.0/24', '10.0.0.0/8', '103.72.96.0/21']);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const updateSetting = (id: string, value: string) =>
    setSettings((prev) => prev.map((setting) => setting.id === id ? { ...setting, value } : setting));

  const toggleSecurity = (id: string, enabled: boolean) =>
    setSecurity((prev) => prev.map((setting) => setting.id === id ? { ...setting, enabled } : setting));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledControls = security.filter((item) => item.enabled).length;
  const pageMeta = useMemo(() => ({
    system: {
      eyebrow: 'Platform configuration',
      title: 'System settings',
      desc: 'Control workspace defaults, runtime behavior, and content limits for APMS administrators.',
      meter: settings.length,
      meterLabel: 'system rules',
      stats: [
        { label: 'System rules', value: settings.length },
        { label: 'Language', value: settings.find((item) => item.id === 'lang')?.value || 'Vietnamese' },
        { label: 'Timezone', value: 'UTC+7' },
        { label: 'Upload limit', value: `${settings.find((item) => item.id === 'max_upload')?.value || '50'} MB` },
      ],
    },
    security: {
      eyebrow: 'Security posture',
      title: 'Security settings',
      desc: 'Tune authentication, session policy, and access boundaries without leaving the admin console.',
      meter: `${enabledControls}/${security.length}`,
      meterLabel: 'controls on',
      stats: [
        { label: 'Controls enabled', value: `${enabledControls}/${security.length}` },
        { label: 'MFA', value: security.find((item) => item.id === 'mfa')?.enabled ? 'On' : 'Off' },
        { label: 'Session timeout', value: security.find((item) => item.id === 'session')?.enabled ? 'Enabled' : 'Off' },
        { label: 'Audit capture', value: security.find((item) => item.id === 'audit')?.enabled ? 'Enabled' : 'Off' },
      ],
    },
    'access-control': {
      eyebrow: 'Access boundary',
      title: 'Access control',
      desc: 'Restrict network entry points and define session boundaries for sensitive operations.',
      meter: ipList.length,
      meterLabel: 'trusted ranges',
      stats: [
        { label: 'Trusted IPs', value: ipList.length },
        { label: 'Session policy', value: 'Active' },
        { label: 'Lockout', value: security.find((item) => item.id === 'ip_lock')?.enabled ? 'On' : 'Off' },
        { label: 'Timeout', value: '30m' },
      ],
    },
  }[tab]), [enabledControls, ipList.length, security, settings, tab]);

  return (
    <section className={`page active admin-console-page admin-system-page ${tab} role-dashboard role-dashboard-admin`}>
      <div className={`workspace-page-head admin-console-hero admin-system-hero ${tab}`}>
        <div>
          <span className="workspace-side-eyebrow">{pageMeta.eyebrow}</span>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.desc}</p>
        </div>
        <div className="workspace-head-actions">
          {saved && <span className="admin-save-state">Settings saved</span>}
          <button className="btn btn-primary" onClick={handleSave}>Save settings</button>
        </div>
      </div>

      <div className={`workspace-stats workspace-stats-compact admin-system-stats ${tab}`}>
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

      <div className={`admin-system-content ${tab}`}>
        {tab === 'system' && (
          <div className="admin-system-layout">
            <div className="workspace-panel admin-console-panel">
              <div className="workspace-section-head">
                <div>
                  <h3>General behavior</h3>
                  <p>Application defaults and content limits.</p>
                </div>
              </div>
              <div className="admin-setting-list">
                {settings.map((setting) => (
                  <article key={setting.id} className="admin-setting-row">
                    <div>
                      <strong>{setting.label}</strong>
                      <p>{setting.desc}</p>
                    </div>
                    {setting.type === 'select' ? (
                      <select className="admin-select" value={setting.value} onChange={(event) => updateSetting(setting.id, event.target.value)}>
                        {setting.options?.map((option) => <option key={option} value={option}>{option}{setting.id === 'ai_threshold' ? '%' : ''}</option>)}
                      </select>
                    ) : (
                      <input className="admin-input" value={setting.value} onChange={(event) => updateSetting(setting.id, event.target.value)} />
                    )}
                  </article>
                ))}
              </div>
            </div>
            <aside className="workspace-side-card admin-system-aside">
              <span className="workspace-side-eyebrow">Runtime notes</span>
              <h3>Current defaults</h3>
              <div className="admin-system-note-list">
                <article>
                  <strong>Upload size</strong>
                  <p>{settings.find((item) => item.id === 'max_upload')?.value || '50'} MB max per file</p>
                </article>
                <article>
                  <strong>Crawl cadence</strong>
                  <p>{settings.find((item) => item.id === 'crawl_freq')?.value || 'Every 6 hours'}</p>
                </article>
                <article>
                  <strong>Review window</strong>
                  <p>{settings.find((item) => item.id === 'approval_ttl')?.value || '48'} hour SLA</p>
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
                  <p>Authentication, session, and logging switches.</p>
                </div>
              </div>
              <div className="admin-setting-list">
                {security.map((setting) => (
                  <article key={setting.id} className="admin-setting-row security-row">
                    <div>
                      <strong>{setting.label}</strong>
                      <p>{setting.desc}</p>
                    </div>
                    <Toggle enabled={setting.enabled} onChange={(enabled) => toggleSecurity(setting.id, enabled)} />
                  </article>
                ))}
              </div>
            </div>
            <aside className="workspace-side-card admin-system-aside">
              <span className="workspace-side-eyebrow">Posture snapshot</span>
              <h3>Protection summary</h3>
              <div className="admin-system-note-list">
                <article>
                  <strong>Enabled controls</strong>
                  <p>{enabledControls} active, {security.length - enabledControls} disabled</p>
                </article>
                <article>
                  <strong>Network lockout</strong>
                  <p>{security.find((item) => item.id === 'ip_lock')?.enabled ? 'Enabled' : 'Disabled'}</p>
                </article>
                <article>
                  <strong>Password policy</strong>
                  <p>{security.find((item) => item.id === 'pass_policy')?.enabled ? 'Strict' : 'Standard'}</p>
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
                  <h3>IP whitelist</h3>
                  <p>Restrict sign-in traffic to trusted network ranges.</p>
                </div>
              </div>
              <div className="admin-ip-list">
                {ipList.map((ip, index) => (
                  <div key={ip}>
                    <code>{ip}</code>
                    <button onClick={() => setIpList((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="admin-toolbar compact">
                <input className="admin-input" value={newIp} onChange={(event) => setNewIp(event.target.value)} placeholder="192.168.1.0/24" />
                <button className="btn btn-outline" onClick={() => {
                  if (!newIp.trim()) return;
                  setIpList((prev) => [...prev, newIp.trim()]);
                  setNewIp('');
                }}>Add range</button>
              </div>
            </div>

            <div className="admin-access-card">
              <div className="workspace-section-head">
                <div>
                  <h3>Session policy</h3>
                  <p>Token expiry and concurrent session controls.</p>
                </div>
              </div>
              <div className="admin-policy-grid">
                {[
                  { label: 'Access token', value: '15 minutes' },
                  { label: 'Refresh token', value: '7 days' },
                  { label: 'Concurrent sessions', value: '3 sessions' },
                  { label: 'Idle timeout', value: '30 minutes' },
                ].map((item) => (
                  <label key={item.label}>
                    <span>{item.label}</span>
                    <select className="admin-select"><option>{item.value}</option></select>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
