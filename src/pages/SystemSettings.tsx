import React, { useState } from 'react';

// ─── System Settings ───
interface Setting {
  id: string;
  label: string;
  desc: string;
  value: string;
  type: 'text' | 'select' | 'toggle';
  options?: string[];
}

const SYSTEM_SETTINGS: Setting[] = [
  { id: 'ai_threshold', label: 'Ngưỡng tin cậy AI tối thiểu', desc: 'Dữ liệu dưới ngưỡng này sẽ vào hàng chờ xác thực thủ công.', value: '75', type: 'select', options: ['60', '70', '75', '80', '85', '90'] },
  { id: 'crawl_freq',   label: 'Tần suất crawl tự động',    desc: 'Tần suất AI thu thập tin tức và dữ liệu từ các nguồn bên ngoài.', value: 'Mỗi 6 giờ', type: 'select', options: ['Mỗi giờ', 'Mỗi 3 giờ', 'Mỗi 6 giờ', 'Mỗi 12 giờ', 'Mỗi ngày'] },
  { id: 'approval_ttl', label: 'Thời hạn phê duyệt',         desc: 'Sau thời gian này, dữ liệu chưa duyệt sẽ tự động nhắc nhở Manager.', value: '48', type: 'select', options: ['12', '24', '48', '72'] },
  { id: 'max_upload',   label: 'Dung lượng upload tối đa',   desc: 'Giới hạn dung lượng mỗi lần upload tài liệu (MB).', value: '50', type: 'select', options: ['10', '25', '50', '100'] },
  { id: 'lang',         label: 'Ngôn ngữ hệ thống',          desc: 'Ngôn ngữ mặc định của toàn bộ giao diện.', value: 'Tiếng Việt', type: 'select', options: ['Tiếng Việt', 'English'] },
  { id: 'timezone',     label: 'Múi giờ',                    desc: 'Múi giờ được dùng cho tất cả các nhãn thời gian.', value: 'Asia/Ho_Chi_Minh (UTC+7)', type: 'select', options: ['Asia/Ho_Chi_Minh (UTC+7)', 'Asia/Singapore (UTC+8)', 'UTC'] },
];

const SECURITY_SETTINGS = [
  { id: 'mfa',        label: 'Xác thực 2 yếu tố (2FA)',  desc: 'Yêu cầu OTP khi đăng nhập mới.', enabled: true },
  { id: 'session',    label: 'Tự động đăng xuất',         desc: 'Đăng xuất sau 30 phút không hoạt động.', enabled: true },
  { id: 'ip_lock',    label: 'Chặn IP đáng ngờ',          desc: 'Tự động chặn IP đăng nhập thất bại >5 lần.', enabled: true },
  { id: 'pass_policy',label: 'Chính sách mật khẩu mạnh',  desc: 'Yêu cầu ít nhất 8 ký tự, chữ hoa, số và ký tự đặc biệt.', enabled: false },
  { id: 'audit',      label: 'Ghi lại mọi thao tác',      desc: 'Lưu tất cả hành động vào audit log.', enabled: true },
];

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void }> = ({ enabled, onChange }) => (
  <div
    onClick={() => onChange(!enabled)}
    style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
      background: enabled ? '#2563EB' : 'var(--border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: enabled ? 23 : 3,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </div>
);

type Tab = 'system' | 'security' | 'access-control';

export const SystemSettingsPage: React.FC<{ defaultTab?: Tab }> = ({ defaultTab = 'system' }) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [settings, setSettings] = useState(SYSTEM_SETTINGS);
  const [security, setSecurity] = useState(SECURITY_SETTINGS);
  const [saved, setSaved] = useState(false);

  const updateSetting = (id: string, value: string) =>
    setSettings(prev => prev.map(s => s.id === id ? { ...s, value } : s));

  const toggleSecurity = (id: string, val: boolean) =>
    setSecurity(prev => prev.map(s => s.id === id ? { ...s, enabled: val } : s));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // IP whitelist state
  const [ipList, setIpList] = useState(['192.168.1.0/24', '10.0.0.0/8', '103.72.96.0/21']);
  const [newIp, setNewIp] = useState('');

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Cài đặt Hệ thống</h1>
        <div className="page-header-actions">
          {saved && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>Đã lưu cài đặt</span>}
          <button className="btn btn-primary" onClick={handleSave}>Lưu cài đặt</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {([['system', 'Hệ thống'], ['security', 'Bảo mật'], ['access-control', 'Kiểm soát Truy cập']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'system' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Cấu hình chung</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {settings.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < settings.length - 1 ? '1px solid var(--border-light)' : 'none', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                {s.type === 'select' ? (
                  <select
                    value={s.value}
                    onChange={e => updateSetting(s.id, e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, flexShrink: 0 }}
                  >
                    {s.options?.map(o => <option key={o} value={o}>{o}{s.id === 'ai_threshold' ? '%' : ''}</option>)}
                  </select>
                ) : (
                  <input value={s.value} onChange={e => updateSetting(s.id, e.target.value)}
                         style={{ padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, width: 160, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Cấu hình Bảo mật</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {security.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < security.length - 1 ? '1px solid var(--border-light)' : 'none', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <Toggle enabled={s.enabled} onChange={v => toggleSecurity(s.id, v)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'access-control' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
          {/* IP Whitelist */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>IP Whitelist</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Chỉ cho phép đăng nhập từ các địa chỉ IP trong danh sách này.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {ipList.map((ip, i) => (
                <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                  <span style={{ flex: 1, fontFamily: 'monospace' }}>{ip}</span>
                  <button onClick={() => setIpList(prev => prev.filter((_, j) => j !== i))}
                          style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Xóa
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newIp} onChange={e => setNewIp(e.target.value)}
                     placeholder="Nhập địa chỉ IP (vd: 192.168.1.0/24)"
                     style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }} />
              <button className="btn btn-outline" onClick={() => { if (newIp.trim()) { setIpList(prev => [...prev, newIp.trim()]); setNewIp(''); } }}>
                + Thêm
              </button>
            </div>
          </div>

          {/* Session Policy */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Chính sách Phiên đăng nhập</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Cấu hình thời gian hết hạn và giới hạn phiên đăng nhập đồng thời.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Hết hạn Access Token', value: '15 phút' },
                { label: 'Hết hạn Refresh Token', value: '7 ngày' },
                { label: 'Tối đa phiên đồng thời', value: '3 phiên' },
                { label: 'Tự động đăng xuất sau', value: '30 phút' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</label>
                  <select style={{ width: '100%', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13 }}>
                    <option>{f.value}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
