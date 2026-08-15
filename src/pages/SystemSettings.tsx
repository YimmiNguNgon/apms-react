import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import styles from './ActivityAudit.module.css';

type Tab = 'security';

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

export const SystemSettingsPage: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'security' }) => {
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
  const [ipLoading, setIpLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<IpEntry | null>(null);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 6000); };
  const showWarning = (msg: string) => { setWarning(msg); setTimeout(() => setWarning(''), 8000); };

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

  // ─── IP Whitelist toggle ────────────────────────────────────
  const handleToggleWhitelist = async (enabled: boolean) => {
    if (enabled && !ipEntries.some((entry) => entry.enabled)) {
      showWarning('No IP addresses are enabled yet. Enforcement is turning ON — only localhost can access the API until you add or enable at least one IP rule.');
    }
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
    const ipAddress = editingIp.ipAddress.trim();
    if (!IP_REGEX.test(ipAddress)) {
      showError(`Invalid IP/CIDR format: "${ipAddress}". Example: 192.168.1.1 or 10.0.0.0/24`);
      return;
    }
    if (ipEntries.some((entry) => entry.id !== editingIp.id && entry.ipAddress === ipAddress)) {
      showError('IP address already exists in whitelist.');
      return;
    }
    setIpLoading(true);
    try {
      const res = await api.put<IpEntry>(`/admin/security/ip-whitelist/${editingIp.id}`, {
        ipAddress,
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

  // ─── Toggle a single IP entry enabled/disabled ──────────────
  const handleToggleIp = async (entry: IpEntry) => {
    if (!entry.id) return;
    setIpLoading(true);
    try {
      const nextEnabled = !entry.enabled;
      const res = await api.put<IpEntry>(`/admin/security/ip-whitelist/${entry.id}`, {
        ipAddress: entry.ipAddress,
        description: entry.description,
        enabled: nextEnabled,
      });
      if (res?.success) {
        setIpEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, enabled: nextEnabled } : e));
        showSuccess(`${entry.ipAddress} ${nextEnabled ? 'enabled' : 'disabled'}.`);
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
    security: {
      eyebrow: t('header.securityEyebrow'),
      title: t('header.securityTitle'),
      desc: t('header.securityDesc'),
      meter: `${enabledControls}/2`,
      meterLabel: 'controls',
      stats: [
        { label: t('stats.auditTrail'), value: 'Always ON', color: styles.statIconAmber },
        { label: 'Session Timeout', value: 'JWT-based', color: styles.statIconBlue },
      ],
    },
  }[tab]), [enabledControls, ipWhitelistEnabled, ipEntries, system, tab, t]);

  return (
    <section className={`page active admin-console-page admin-system-page ${tab} role-dashboard role-dashboard-admin`} id="page-system-settings">
      {/* Header */}
      <div className={`workspace-page-head admin-console-hero admin-system-hero compact-hero ${tab}`}>
        <div>
          <h1>{pageMeta.title}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statGrid} style={{ marginBottom: '0.75rem' }}>
        {pageMeta.stats.map((item) => {
          return (
            <article key={item.label} className={styles.statCard} style={{ padding: '0.85rem 1rem' }}>
              <div className={styles.statMeta}>
                <span className={styles.statLabel} style={{ fontSize: '0.725rem' }}>{item.label}</span>
                <strong className={styles.statValue} style={{ fontSize: '1.25rem' }}>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </div>


      {/* Notices */}
      {error && (
        <div className="workspace-inline-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          ❌ {error}
        </div>
      )}
      {warning && (
        <div style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309', border: '1px solid rgba(245,158,11,0.35)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          ⚠ {warning}
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
        <div className={`admin-system-content ${tab}`}>          {/* ── SECURITY TAB ── */}
          {tab === 'security' && (
            <div className="admin-security-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div><h3>{t('securityTab.protectionControls')}</h3><p>{t('securityTab.protectionControlsDesc')}</p></div>
                </div>
                <div className="admin-setting-list">

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
                  <article><strong>Audit Logging</strong><p style={{ color: '#059669' }}>● Always ON</p></article>
                  <article><strong>Password Policy</strong><p style={{ color: '#059669' }}>● Min 8 chars enforced</p></article>
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
