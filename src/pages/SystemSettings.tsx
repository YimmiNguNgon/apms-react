import React, { useEffect, useMemo, useState } from 'react';
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

interface SecurityState {
  mfa: boolean;
  session: boolean;
  ip_lock: boolean;
  pass_policy: boolean;
  audit: boolean;
}

const STORAGE_KEY = 'apms-system-settings';

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
  const { t } = useTranslation('system-settings');
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Form states initialized with localStorage fallback
  const [system, setSystem] = useState<SystemState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.system) return { ...DEFAULT_SYSTEM, ...parsed.system };
      } catch {
        // Fallback
      }
    }
    return DEFAULT_SYSTEM;
  });

  const [security, setSecurity] = useState<SecurityState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.security) return { ...DEFAULT_SECURITY, ...parsed.security };
      } catch {
        // Fallback
      }
    }
    return DEFAULT_SECURITY;
  });

  const [initialSecurity, setInitialSecurity] = useState<SecurityState>(security);

  const [trustedIps, setTrustedIps] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.trustedIps)) return parsed.trustedIps;
      } catch {
        // Fallback
      }
    }
    return DEFAULT_IPS;
  });

  const [newIp, setNewIp] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const fetchSettings = () => {
    setLoading(true);
    setError('');
    api.get<{ system?: Partial<SystemState>; security?: Partial<SecurityState>; trustedIps?: string[] }>('/admin/settings')
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
    const thresholdNum = Number(system.ai_threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      setError(t('notice.saveError') + ' (0 - 100%)');
      return false;
    }
    const ttlNum = Number(system.approval_ttl);
    if (isNaN(ttlNum) || ttlNum <= 0) {
      setError(t('notice.saveError'));
      return false;
    }
    const uploadNum = Number(system.max_upload);
    if (isNaN(uploadNum) || uploadNum <= 0) {
      setError(t('notice.saveError'));
      return false;
    }
    for (const ip of trustedIps) {
      if (!IP_REGEX.test(ip.trim())) {
        setError(`Invalid IP / CIDR range: ${ip}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveClick = () => {
    if (!validateForm()) return;

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

    // Save locally to localStorage so changes persist across refresh
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    api.put('/admin/settings', payload)
      .then(() => {
        setBackendAvailable(true);
      })
      .catch(() => {
        setBackendAvailable(false);
      })
      .finally(() => {
        setSaving(false);
        setInitialSecurity(security);
        setSuccess(t('notice.saveSuccess'));
        setTimeout(() => setSuccess(''), 4000);
      });
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
      meter: `${enabledControls}/5`,
      meterLabel: 'controls',
      stats: [
        { label: t('stats.mfaEnforcement'), value: security.mfa ? t('stats.enabled') : t('stats.disabled'), icon: Lock, color: styles.statIconBlue },
        { label: t('stats.sessionControl'), value: security.session ? t('stats.enabled') : t('stats.disabled'), icon: Clock, color: styles.statIconGreen },
        { label: t('stats.trustedIpFilter'), value: security.ip_lock ? t('stats.enabled') : t('stats.disabled'), icon: ShieldCheck, color: styles.statIconPurple },
        { label: t('stats.auditTrail'), value: security.audit ? t('stats.enabled') : t('stats.disabled'), icon: ShieldAlert, color: styles.statIconAmber },
      ],
    },
    'access-control': {
      eyebrow: t('header.accessEyebrow'),
      title: t('header.accessTitle'),
      desc: t('header.accessDesc'),
      meter: trustedIps.length,
      meterLabel: 'subnets',
      stats: [
        { label: t('stats.activeIpRange'), value: trustedIps.length, icon: Globe, color: styles.statIconBlue },
        { label: t('stats.networkRule'), value: security.ip_lock ? t('stats.strict') : t('stats.active'), icon: ShieldCheck, color: styles.statIconGreen },
        { label: t('stats.subnetState'), value: t('stats.policyEnforced'), icon: Lock, color: styles.statIconPurple },
        { label: 'SLA Window', value: `${system.approval_ttl}h`, icon: Clock, color: styles.statIconAmber },
      ],
    },
  }[tab]), [enabledControls, security, system, tab, trustedIps.length, t]);

  return (
    <section className={`page active admin-console-page admin-system-page ${tab} role-dashboard role-dashboard-admin`} id="page-system-settings">
      {/* Normalized Shared Header */}
      <div className={`workspace-page-head admin-console-hero admin-system-hero compact-hero ${tab}`}>
        <div>
          <span className="workspace-side-eyebrow">{pageMeta.eyebrow}</span>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.desc}</p>
        </div>
        <div className="workspace-head-actions">
          <button className="btn btn-primary" disabled={saving || loading} onClick={handleSaveClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} />
            <span>{saving ? t('header.saving') : t('header.save')}</span>
          </button>
        </div>
      </div>

      {/* Standardized 4 Stat Cards */}
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

      {/* Tabs Bar */}
      <div className="admin-tabs" style={{ marginBottom: '0.65rem', padding: '4px' }}>
        {([
          ['system', t('tabs.system')],
          ['security', t('tabs.security')],
          ['access-control', t('tabs.accessControl')],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Mode Banner if backend is under dev */}
      {!backendAvailable && (
        <div style={{ background: 'rgba(59,130,246,0.08)', color: '#1e40af', border: '1px solid rgba(59,130,246,0.25)', padding: '8px 12px', borderRadius: '8px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.825rem', lineHeight: 1.2 }}>{t('notice.backendDevTitle')}</strong>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'block', marginTop: '1px' }}>{t('notice.backendDevDesc')}</span>
          </div>
        </div>
      )}

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
          {tab === 'system' && (
            <div className="admin-system-layout">
              <div className="workspace-panel admin-console-panel">
                <div className="workspace-section-head">
                  <div>
                    <h3>{t('systemTab.generalBehavior')}</h3>
                    <p>{t('systemTab.generalBehaviorDesc')}</p>
                  </div>
                </div>
                <div className="admin-setting-list">
                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.aiThreshold')}</strong>
                      <p>{t('systemTab.aiThresholdDesc')}</p>
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
                      <strong>{t('systemTab.crawlFreq')}</strong>
                      <p>{t('systemTab.crawlFreqDesc')}</p>
                    </div>
                    <select
                      className="admin-select"
                      value={system.crawl_freq}
                      onChange={(e) => setSystem({ ...system, crawl_freq: e.target.value })}
                    >
                      {['Hourly', 'Every 3 hours', 'Every 6 hours', 'Every 12 hours', 'Daily'].map((opt) => (
                        <option key={opt} value={opt}>
                          {t(`systemTab.crawlOptions.${opt}`, { defaultValue: opt })}
                        </option>
                      ))}
                    </select>
                  </article>

                  <article className="admin-setting-row">
                    <div>
                      <strong>{t('systemTab.approvalSla')}</strong>
                      <p>{t('systemTab.approvalSlaDesc')}</p>
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
                      <strong>{t('systemTab.maxUpload')}</strong>
                      <p>{t('systemTab.maxUploadDesc')}</p>
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
                      <strong>{t('systemTab.defaultLang')}</strong>
                      <p>{t('systemTab.defaultLangDesc')}</p>
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
                      <strong>{t('systemTab.timezone')}</strong>
                      <p>{t('systemTab.timezoneDesc')}</p>
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
                <span className="workspace-side-eyebrow">{t('systemTab.runtimeNotes')}</span>
                <h3>{t('systemTab.currentDefaults')}</h3>
                <div className="admin-system-note-list">
                  <article>
                    <strong>{t('stats.confidenceThreshold')}</strong>
                    <p>{system.ai_threshold}%</p>
                  </article>
                  <article>
                    <strong>{t('stats.crawlFrequency')}</strong>
                    <p>{system.crawl_freq}</p>
                  </article>
                  <article>
                    <strong>SLA Window</strong>
                    <p>{system.approval_ttl} hours</p>
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
                    <h3>{t('securityTab.protectionControls')}</h3>
                    <p>{t('securityTab.protectionControlsDesc')}</p>
                  </div>
                </div>
                <div className="admin-setting-list">
                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.mfa')}</strong>
                      <p>{t('securityTab.mfaDesc')}</p>
                    </div>
                    <Toggle enabled={security.mfa} onChange={(val) => setSecurity({ ...security, mfa: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.sessionTimeout')}</strong>
                      <p>{t('securityTab.sessionTimeoutDesc')}</p>
                    </div>
                    <Toggle enabled={security.session} onChange={(val) => setSecurity({ ...security, session: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.ipLockout')}</strong>
                      <p>{t('securityTab.ipLockoutDesc')}</p>
                    </div>
                    <Toggle enabled={security.ip_lock} onChange={(val) => setSecurity({ ...security, ip_lock: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.passwordPolicy')}</strong>
                      <p>{t('securityTab.passwordPolicyDesc')}</p>
                    </div>
                    <Toggle enabled={security.pass_policy} onChange={(val) => setSecurity({ ...security, pass_policy: val })} />
                  </article>

                  <article className="admin-setting-row security-row">
                    <div>
                      <strong>{t('securityTab.auditLogging')}</strong>
                      <p>{t('securityTab.auditLoggingDesc')}</p>
                    </div>
                    <Toggle enabled={security.audit} onChange={(val) => setSecurity({ ...security, audit: val })} />
                  </article>
                </div>
              </div>

              <aside className="workspace-side-card admin-system-aside">
                <span className="workspace-side-eyebrow">{t('securityTab.postureSnapshot')}</span>
                <h3>{t('securityTab.protectionSummary')}</h3>
                <div className="admin-system-note-list">
                  <article>
                    <strong>{t('stats.mfaEnforcement')}</strong>
                    <p>{security.mfa ? t('stats.enabled') : t('stats.disabled')}</p>
                  </article>
                  <article>
                    <strong>{t('stats.sessionControl')}</strong>
                    <p>{security.session ? t('stats.enabled') : t('stats.disabled')}</p>
                  </article>
                  <article>
                    <strong>{t('stats.auditTrail')}</strong>
                    <p>{security.audit ? t('stats.enabled') : t('stats.disabled')}</p>
                  </article>
                </div>
              </aside>
            </div>
          )}

          {tab === 'access-control' && (
            <div className="admin-access-grid">
              <div className="admin-access-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div className="workspace-section-head">
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{t('accessTab.whitelistTitle')}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{t('accessTab.whitelistDesc')}</p>
                  </div>
                </div>
                <div className="admin-ip-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '1rem 0' }}>
                  {trustedIps.map((ip, index) => (
                    <div key={ip || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <code style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{ip}</code>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setTrustedIps((prev) => prev.filter((_, i) => i !== index))}>
                        <Trash2 size={13} />
                        <span>{t('accessTab.remove')}</span>
                      </button>
                    </div>
                  ))}
                  {trustedIps.length === 0 && <div className="workspace-empty">{t('accessTab.noIps')}</div>}
                </div>
                <div className="admin-toolbar compact" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="admin-input"
                    style={{ flex: 1 }}
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder={t('accessTab.placeholder')}
                  />
                  <button className="btn btn-outline" onClick={handleAddIp} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={15} />
                    <span>{t('accessTab.addSubnet')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Sensitive Security Changes */}
      {showConfirmModal && (
        <div className="workspace-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="workspace-modal" style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.3)', padding: '24px', borderRadius: '16px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: '#EF4444', marginTop: 0, fontSize: '1.15rem', fontWeight: 700 }}>{t('confirmModal.title')}</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#334155' }}>
              {t('confirmModal.desc')}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              {t('confirmModal.prompt')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmModal(false)}>{t('confirmModal.cancel')}</button>
              <button className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444' }} onClick={executeSave}>
                {t('confirmModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
