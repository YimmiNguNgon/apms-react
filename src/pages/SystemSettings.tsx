import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import {
  Clock,
  Cpu,
  Globe,
  HardDrive,
  Info,
  Lock,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import styles from './ActivityAudit.module.css';

type Tab = 'system' | 'security' | 'access-control';

interface SystemState {
  ai_threshold: string;
  crawl_freq: string;
  approval_ttl: string;
  max_upload: string;
  lang: string;
  timezone: string;
}

interface IpEntry {
  id?: number;
  ipAddress: string;
  description?: string;
  enabled: boolean;
  createdAt?: string;
}

const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

const Toggle: React.FC<{ enabled: boolean; onChange: (value: boolean) => void; disabled?: boolean }> = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    className={`admin-toggle ${enabled ? 'on' : ''}`}
    onClick={() => !disabled && onChange(!enabled)}
    aria-pressed={enabled}
    disabled={disabled}
    style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
  >
    <span />
  </button>
);

const DEFAULT_SYSTEM: SystemState = {
  ai_threshold: '75',
  crawl_freq: 'Every 6 hours',
  approval_ttl: '48',
  max_upload: '50',
  lang: 'Vietnamese',
  timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
};

export const SystemSettingsPage: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'system' }) => {
  const { t } = useTranslation('system-settings');
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Settings state — loaded from API, no localStorage
  const [system, setSystem] = useState<SystemState>(DEFAULT_SYSTEM);

  // Security toggles — actual backend state
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [auditLoggingEnabled] = useState(true); // Always ON — cannot disable

  // IP Whitelist entries from DB
  const [ipEntries, setIpEntries] = useState<IpEntry[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');
  const [editingIp, setEditingIp] = useState<IpEntry | null>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ipLoading, setIpLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<IpEntry | null>(null);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 6000); };

  // ─── Load settings from backend ────────────────────────────
  const fetchSettings = useCallback(() => {
    setLoading(true);
    setError('');
    api.get<{ settings?: Partial<SystemState>; ipWhitelistEnabled?: boolean }>('/admin/settings')
      .then((res) => {
        if (res?.success && res.data) {
          if (res.data.settings) setSystem((prev) => ({ ...prev, ...res.data.settings }));
          if (typeof res.data.ipWhitelistEnabled === 'boolean') {
            setIpWhitelistEnabled(res.data.ipWhitelistEnabled);
          }
        }
      })
      .catch(() => {
        // Settings not yet saved to backend — use defaults (already set)
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Load IP Whitelist from backend ────────────────────────
  const fetchIpWhitelist = useCallback(() => {
    setIpLoading(true);
    api.get<{ entries: IpEntry[]; enabled: boolean }>('/admin/security/ip-whitelist')
      .then((res) => {
        if (res?.success && res.data) {
          setIpEntries(res.data.entries || []);
          if (typeof res.data.enabled === 'boolean') {
            setIpWhitelistEnabled(res.data.enabled);
          }
        }
      })
      .catch(() => {
        setIpEntries([]);
      })
      .finally(() => setIpLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchIpWhitelist();
  }, [fetchSettings, fetchIpWhitelist]);

  // ─── Save system settings ────────────────────────────────────
  const handleSaveSettings = async () => {
    setError('');
    const threshold = Number(system.ai_threshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      showError('AI threshold must be between 0 and 100.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/settings', system);
      showSuccess('System settings saved successfully.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ─── IP Whitelist toggle ────────────────────────────────────
  const handleToggleWhitelist = async (enabled: boolean) => {
    try {
      await api.patch('/admin/security/ip-whitelist/status', { enabled });
      setIpWhitelistEnabled(enabled);
      showSuccess(enabled
        ? '⚠ IP Whitelist ENABLED. Requests from non-whitelisted IPs will now be blocked.'
        : 'IP Whitelist disabled. All IPs are now allowed.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to update whitelist status.');
    }
  };

  // ─── Add IP ────────────────────────────────────────────────
  const handleAddIp = async () => {
    setError('');
    const ip = newIp.trim();
    if (!ip) return;
    if (!IP_REGEX.test(ip)) {
      showError(`Invalid IP/CIDR format: "${ip}". Example: 192.168.1.1 or 10.0.0.0/24`);
      return;
    }
    if (ipEntries.some((e) => e.ipAddress === ip)) {
      showError('IP address already exists in whitelist.');
      return;
    }
    setIpLoading(true);
    try {
      const res = await api.post<IpEntry>('/admin/security/ip-whitelist', {
        ipAddress: ip,
        description: newIpDesc.trim() || undefined,
        enabled: true,
      });
      if (res?.success && res.data) {
        setIpEntries((prev) => [...prev, res.data]);
        setNewIp('');
        setNewIpDesc('');
        showSuccess(`IP ${ip} added to whitelist.`);
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to add IP.');
    } finally {
      setIpLoading(false);
    }
  };

  // ─── Update IP entry ───────────────────────────────────────
  const handleUpdateIp = async () => {
    if (!editingIp?.id) return;
    setIpLoading(true);
    try {
      const res = await api.put<IpEntry>(`/admin/security/ip-whitelist/${editingIp.id}`, {
        ipAddress: editingIp.ipAddress,
        description: editingIp.description,
        enabled: editingIp.enabled,
      });
      if (res?.success) {
        setIpEntries((prev) => prev.map((e) => e.id === editingIp.id ? (res.data || editingIp) : e));
        setEditingIp(null);
        showSuccess('IP entry updated.');
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to update IP.');
    } finally {
      setIpLoading(false);
    }
  };

  // ─── Delete IP entry ───────────────────────────────────────
  const handleDeleteIp = async (entry: IpEntry) => {
    if (!entry.id) return;
    setIpLoading(true);
    try {
      await api.delete(`/admin/security/ip-whitelist/${entry.id}`);
      setIpEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setShowDeleteConfirm(null);
      showSuccess(`IP ${entry.ipAddress} removed from whitelist.`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to delete IP.');
    } finally {
      setIpLoading(false);
    }
  };

  const enabledControls = useMemo(() => {
    let count = 1; // audit always on
    if (ipWhitelistEnabled) count++;
    return count;
  }, [ipWhitelistEnabled]);

  const pageMeta = useMemo(() => ({
    system: {
      eyebrow: t('header.systemEyebrow'),
      title: t('header.systemTitle'),
      desc: t('header.systemDesc'),
      meter: 6,
      meterLabel: 'rules',
      stats: [
        { label: t('stats.confidenceThreshold'), value: `${system.ai_threshold}%`, icon: Cpu, color: styles.statIconBlue },
        { label: t('stats.crawlFrequency'), value: system.crawl_freq, icon: Clock, color: styles.statIconAmber },
        { label: t('stats.storageRule'), value: `${system.max_upload} MB`, icon: HardDrive, color: styles.statIconPurple },
        { label: t('stats.engineState'), value: t('stats.active'), icon: ShieldCheck, color: styles.statIconGreen },
      ],
    },
    security: {
      eyebrow: t('header.securityEyebrow'),
      title: t('header.securityTitle'),
      desc: t('header.securityDesc'),
      meter: `${enabledControls}/2`,
      meterLabel: 'controls',
      stats: [
        { label: 'IP Whitelist', value: ipWhitelistEnabled ? 'ENABLED' : 'Disabled', icon: Lock, color: ipWhitelistEnabled ? styles.statIconGreen : styles.statIconBlue },
        { label: t('stats.auditTrail'), value: 'Always ON', icon: ShieldAlert, color: styles.statIconAmber },
        { label: 'MFA', value: 'Not configured', icon: ShieldCheck, color: styles.statIconPurple },
        { label: 'Session Timeout', value: 'JWT-based', icon: Clock, color: styles.statIconBlue },
      ],
    },
    'access-control': {
      eyebrow: t('header.accessEyebrow'),
      title: t('header.accessTitle'),
      desc: t('header.accessDesc'),
      meter: ipEntries.length,
      meterLabel: 'IP rules',
      stats: [
        { label: t('stats.activeIpRange'), value: ipEntries.filter((e) => e.enabled).length, icon: Globe, color: styles.statIconBlue },
        { label: 'Enforcement', value: ipWhitelistEnabled ? 'ACTIVE' : 'Inactive', icon: ShieldCheck, color: ipWhitelistEnabled ? styles.statIconGreen : styles.statIconBlue },
        { label: 'Localhost', value: 'Always allowed', icon: Lock, color: styles.statIconGreen },
        { label: 'SLA Window', value: `${system.approval_ttl}h`, icon: Clock, color: styles.statIconAmber },
      ],
    },
  }[tab]), [enabledControls, ipWhitelistEnabled, ipEntries, system, tab, t]);

  return (
    <section className={`page active admin-console-page admin-system-page ${tab} role-dashboard role-dashboard-admin`} id="page-system-settings">
      {/* Header */}
      <div className={`workspace-page-head admin-console-hero admin-system-hero compact-hero ${tab}`}>
        <div>
          <span className="workspace-side-eyebrow">{pageMeta.eyebrow}</span>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.desc}</p>
        </div>
        {tab === 'system' && (
          <div className="workspace-head-actions">
            <button className="btn btn-primary" disabled={saving || loading} onClick={handleSaveSettings} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} />
              <span>{saving ? t('header.saving') : t('header.save')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statGrid} style={{ marginBottom: '0.75rem' }}>
        {pageMeta.stats.map((item) => {
          const IconComp = item.icon;
          return (
            <article key={item.label} className={styles.statCard} style={{ padding: '0.85rem 1rem' }}>
              <div className={`${styles.statIcon} ${item.color}`} style={{ width: '38px', height: '38px' }}>
                <IconComp size={18} />
              </div>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ fontSize: '0.725rem' }}>{item.label}</span>
                <strong className={styles.statValue} style={{ fontSize: '1.25rem' }}>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '0.65rem', padding: '4px' }}>
        {([
          ['system', t('tabs.system')],
          ['security', t('tabs.security')],
          ['access-control', t('tabs.accessControl')],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Notices */}
      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(34,197,94,0.15)', color: '#166534', border: '1px solid rgba(34,197,94,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="admin-skeleton">Loading system settings...</div>
      ) : (
        <div className={`admin-system-content ${tab}`}>
          {/* ── SYSTEM TAB ── */}
          {tab === 'system' && (
            <div className="admin-system-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div><h3>{t('systemTab.generalBehavior')}</h3><p>{t('systemTab.generalBehaviorDesc')}</p></div>
                </div>
                <div className="admin-setting-list">
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.aiThreshold')}</strong>
                      <p>{t('systemTab.aiThresholdDesc')}</p>
                    </div>
                    <input type="number" className="admin-input" style={{ width: '120px' }} value={system.ai_threshold}
                      onChange={(e) => setSystem({ ...system, ai_threshold: e.target.value })} />
                  </article>
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.crawlFreq')}</strong>
                      <p>{t('systemTab.crawlFreqDesc')}</p>
                    </div>
                    <select className="admin-select" value={system.crawl_freq} onChange={(e) => setSystem({ ...system, crawl_freq: e.target.value })}>
                      {['Hourly', 'Every 3 hours', 'Every 6 hours', 'Every 12 hours', 'Daily'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </article>
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.approvalSla')}</strong>
                      <p>{t('systemTab.approvalSlaDesc')}</p>
                    </div>
                    <input type="number" className="admin-input" style={{ width: '120px' }} value={system.approval_ttl}
                      onChange={(e) => setSystem({ ...system, approval_ttl: e.target.value })} />
                  </article>
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.maxUpload')}</strong>
                      <p>{t('systemTab.maxUploadDesc')}</p>
                    </div>
                    <input type="number" className="admin-input" style={{ width: '120px' }} value={system.max_upload}
                      onChange={(e) => setSystem({ ...system, max_upload: e.target.value })} />
                  </article>
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.defaultLang')}</strong>
                      <p>{t('systemTab.defaultLangDesc')}</p>
                    </div>
                    <select className="admin-select" value={system.lang} onChange={(e) => setSystem({ ...system, lang: e.target.value })}>
                      <option value="Vietnamese">Vietnamese</option>
                      <option value="English">English</option>
                    </select>
                  </article>
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.timezone')}</strong>
                      <p>{t('systemTab.timezoneDesc')}</p>
                    </div>
                    <select className="admin-select" value={system.timezone} onChange={(e) => setSystem({ ...system, timezone: e.target.value })}>
                      <option value="Asia/Ho_Chi_Minh (UTC+7)">Asia/Ho_Chi_Minh (UTC+7)</option>
                      <option value="Asia/Singapore (UTC+8)">Asia/Singapore (UTC+8)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </article>
                </div>
              </div>
              <aside className="workspace-side-card admin-system-aside">
                <span className="workspace-side-eyebrow">{t('systemTab.runtimeNotes')}</span>
                <h3>{t('systemTab.currentDefaults')}</h3>
                <div className="admin-system-note-list">
                  <article><strong>{t('stats.confidenceThreshold')}</strong><p>{system.ai_threshold}%</p></article>
                  <article><strong>{t('stats.crawlFrequency')}</strong><p>{system.crawl_freq}</p></article>
                  <article><strong>SLA Window</strong><p>{system.approval_ttl} hours</p></article>
                </div>
              </aside>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {tab === 'security' && (
            <div className="admin-security-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div><h3>{t('securityTab.protectionControls')}</h3><p>{t('securityTab.protectionControlsDesc')}</p></div>
                </div>
                <div className="admin-setting-list">

                  {/* IP Whitelist — REAL backend enforcement */}
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>IP Whitelist Enforcement</strong>
                      <p>When enabled, only whitelisted IP addresses can access the API. Localhost is always allowed.</p>
                      {ipWhitelistEnabled && (
                        <div style={{ marginTop: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#EF4444' }}>
                          ⚠ <strong>ACTIVE:</strong> Requests from non-whitelisted IPs are being blocked.
                        </div>
                      )}
                    </div>
                    <Toggle enabled={ipWhitelistEnabled} onChange={handleToggleWhitelist} />
                  </article>

                  {/* Audit Logging — always ON */}
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.auditLogging')}</strong>
                      <p>{t('securityTab.auditLoggingDesc')}</p>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#059669' }}>
                        ✓ Audit logging is always active and cannot be disabled.
                      </div>
                    </div>
                    <Toggle enabled={auditLoggingEnabled} onChange={() => {}} disabled={true} />
                  </article>

                  {/* MFA — not yet implemented */}
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.mfa')}</strong>
                      <p>{t('securityTab.mfaDesc')}</p>
                      <div style={{ marginTop: '6px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: '6px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                        <Info size={13} /> Not configured — MFA backend is planned for a future release.
                      </div>
                    </div>
                    <Toggle enabled={false} onChange={() => {}} disabled={true} />
                  </article>

                  {/* Session Timeout — JWT-based */}
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.sessionTimeout')}</strong>
                      <p>Session duration is controlled by JWT token expiration configured in server environment variables.</p>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                        ℹ Adjust via <code>JWT_EXPIRATION_MS</code> in server config.
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>JWT-based</span>
                  </article>

                  {/* Password Policy — enforced at validation layer */}
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.passwordPolicy')}</strong>
                      <p>Minimum password length and BCrypt hashing are enforced at API validation level.</p>
                      <div style={{ marginTop: '6px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#059669' }}>
                        ✓ Min 8 chars · Max 72 chars (BCrypt limit) · BCrypt hashed
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Enforced</span>
                  </article>
                </div>
              </div>
              <aside className="workspace-side-card admin-system-aside">
                <span className="workspace-side-eyebrow">Security posture</span>
                <h3>Protection summary</h3>
                <div className="admin-system-note-list">
                  <article>
                    <strong>IP Whitelist</strong>
                    <p style={{ color: ipWhitelistEnabled ? '#059669' : '#6B7280' }}>{ipWhitelistEnabled ? '● ENABLED' : '○ Disabled'}</p>
                  </article>
                  <article><strong>Audit Logging</strong><p style={{ color: '#059669' }}>● Always ON</p></article>
                  <article><strong>Password Policy</strong><p style={{ color: '#059669' }}>● Min 8 chars enforced</p></article>
                  <article><strong>MFA</strong><p style={{ color: '#6B7280' }}>○ Not configured</p></article>
                </div>
              </aside>
            </div>
          )}

          {/* ── ACCESS CONTROL / IP WHITELIST TAB ── */}
          {tab === 'access-control' && (
            <div className="admin-access-grid">
              <div className="admin-access-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                {/* Whitelist status banner */}
                {ipWhitelistEnabled && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#EF4444', fontSize: '13px' }}>IP Whitelist is ENABLED</strong>
                      <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Requests from non-whitelisted IP addresses will be blocked with HTTP 403.</span>
                    </div>
                  </div>
                )}

                <div className="workspace-section-head">
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{t('accessTab.whitelistTitle')}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{t('accessTab.whitelistDesc')}</p>
                  </div>
                  <Toggle enabled={ipWhitelistEnabled} onChange={handleToggleWhitelist} />
                </div>

                {/* IP entries list */}
                <div className="admin-ip-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '1rem 0' }}>
                  {ipLoading && <div className="admin-skeleton">Loading IP whitelist...</div>}
                  {!ipLoading && ipEntries.length === 0 && (
                    <div className="workspace-empty">{t('accessTab.noIps')}</div>
                  )}
                  {!ipLoading && ipEntries.map((entry) => (
                    <div key={entry.id || entry.ipAddress} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${entry.enabled ? '#e2e8f0' : 'rgba(107,114,128,0.2)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {entry.enabled
                          ? <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                          : <XCircle size={14} style={{ color: '#6B7280', flexShrink: 0 }} />
                        }
                        <div>
                          <code style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{entry.ipAddress}</code>
                          {entry.description && <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px' }}>{entry.description}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditingIp({ ...entry })} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Edit2 size={12} /><span>Edit</span>
                        </button>
                        <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setShowDeleteConfirm(entry)}>
                          <Trash2 size={12} /><span>{t('accessTab.remove')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit IP inline */}
                {editingIp && (
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Edit IP entry</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input className="admin-input" style={{ flex: '1 1 160px' }} value={editingIp.ipAddress}
                        onChange={(e) => setEditingIp({ ...editingIp, ipAddress: e.target.value })} placeholder="IP or CIDR" />
                      <input className="admin-input" style={{ flex: '2 1 200px' }} value={editingIp.description || ''}
                        onChange={(e) => setEditingIp({ ...editingIp, description: e.target.value })} placeholder="Description (optional)" />
                      <button className="btn btn-sm btn-primary" onClick={handleUpdateIp} disabled={ipLoading}>Save</button>
                      <button className="btn btn-sm btn-outline" onClick={() => setEditingIp(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Add new IP */}
                <div className="admin-toolbar compact" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    className="admin-input"
                    style={{ flex: '1 1 160px' }}
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIp()}
                    placeholder={t('accessTab.placeholder')}
                  />
                  <input
                    className="admin-input"
                    style={{ flex: '2 1 200px' }}
                    value={newIpDesc}
                    onChange={(e) => setNewIpDesc(e.target.value)}
                    placeholder="Description (optional)"
                  />
                  <button className="btn btn-outline" onClick={handleAddIp} disabled={ipLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={15} /><span>{t('accessTab.addSubnet')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete IP Confirmation */}
      {showDeleteConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="workspace-section-head">
              <div><h3>Remove IP from Whitelist</h3></div>
            </div>
            <p style={{ marginBottom: '16px', color: '#374151' }}>
              Remove <code style={{ fontWeight: 700 }}>{showDeleteConfirm.ipAddress}</code> from the IP whitelist?
              {ipWhitelistEnabled && (
                <span style={{ display: 'block', marginTop: '6px', color: '#EF4444', fontSize: '13px' }}>
                  ⚠ Whitelist is currently ENABLED. This change takes effect immediately.
                </span>
              )}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444' }}
                disabled={ipLoading} onClick={() => handleDeleteIp(showDeleteConfirm)}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
