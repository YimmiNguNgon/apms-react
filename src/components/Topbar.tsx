import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../hooks/useTheme';
import { LogoutModal } from './LogoutModal';

interface TopbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

// Sample notifications per role
const NOTIFICATIONS = [
  { id: 1, title: 'AI đề xuất 3 đối tác tiềm năng mới', time: '5 phút trước', color: '#2563EB', dot: '🤖' },
  { id: 2, title: 'Hồ sơ FPT Software cần xác nhận', time: '20 phút trước', color: '#F59E0B', dot: '📋' },
  { id: 3, title: 'Báo cáo tháng 6 đã sẵn sàng', time: '1 giờ trước', color: '#10B981', dot: '📊' },
  { id: 4, title: 'Cảnh báo rủi ro: Đối thủ mới xuất hiện', time: '2 giờ trước', color: '#EF4444', dot: '⚠️' },
  { id: 5, title: 'Yêu cầu xét duyệt từ Hà Đức Huy', time: '3 giờ trước', color: '#8B5CF6', dot: '✅' },
];

// Page label map
const PAGE_LABELS: Record<string, string> = {
  'admin-dashboard':            'System Dashboard',
  'director-dashboard':         'Executive Dashboard',
  'manager-dashboard':          'Manager Dashboard',
  'keymember-dashboard':        'Key Member Dashboard',
  'staff-dashboard':            'Staff Dashboard',
  'users':                      'User Management',
  'roles':                      'Role Management',
  'permissions':                'Permissions',
  'access-control':             'Access Control',
  'activity-history':           'Activity History',
  'audit-logs':                 'Audit Logs',
  'system-settings':            'System Settings',
  'security-settings':          'Security Settings',
  'partner-ecosystem':          'Partner Ecosystem',
  'competitor-intelligence':    'Competitor Intelligence',
  'relationship-map':           'Relationship Map',
  'market-opportunities':       'Market Opportunities',
  'ai-recommendations':         'AI Recommendations',
  'strategic-reports':          'Strategic Reports',
  'partner-evaluation':         'Partner Evaluation',
  'company-assignment':         'Company Assignment',
  'analysis-history':           'Analysis History',
  'risk-monitoring':            'Risk Monitoring',
  'partner-status':             'Partner Status',
  'suggested-actions-approval': 'Approvals',
  'team-kpi':                   'Team KPI',
  'reports':                    'Reports',
  'review-extracted-data':      'Review Extracted Data',
  'company-validation':         'Company Validation',
  'partner-classification':     'Partner Classification',
  'competitor-classification':  'Competitor Classification',
  'ai-suggestion-review':       'AI Suggestion Review',
  'relationship-updates':       'Relationship Updates',
  'onboarding-support':         'Onboarding Support',
  'upload-documents':           'Upload Documents',
  'company-profiles':           'Company Profiles',
  'partner-management':         'Partner Management',
  'competitor-management':      'Competitor Management',
  'ai-extracted-data':          'AI Extracted Data',
  'search-companies':           'Search Companies',
  'personal-ai-agent':          'Personal AI Agent',
  'ai-training-mode':           'AI Training Mode',
  'learning-center':            'Learning Center',
  'companies':                  'Company Profiles',
  'company-detail':             'Company Detail',
  'verify':                     'Approval Queue',
  'validate':                   'Validation Queue',
  'add-company':                'Add Company',
  'ai-agent':                   'AI Agent',
  'news':                       'News & Intelligence',
  'profile':                    'My Profile',
};

export const Topbar: React.FC<TopbarProps> = ({ activePage, setActivePage }) => {
  const { currentUser, logout } = useUser();
  const { theme, toggleTheme } = useTheme();

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const pageLabel = PAGE_LABELS[activePage] || 'Dashboard';

  const handleLogout = () => {
    logout();
    setShowLogout(false);
  };

  return (
    <>
      <header className="topbar">
        {/* Left: Breadcrumb */}
        <div className="topbar-left">
          <div className="breadcrumb">
            <span>APMS</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{pageLabel}</span>
          </div>

          {/* Search */}
          <div className="topbar-search">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="topbar-right">
          {/* Dark/Light toggle */}
          <button className="topbar-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} style={{ width: 'auto', padding: '0 10px', fontSize: '12px' }}>
            {theme === 'dark' ? 'Sáng' : 'Tối'}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button className="topbar-btn" onClick={() => { setShowNotif(p => !p); setShowProfile(false); }} style={{ width: 'auto', padding: '0 10px', fontSize: '12px' }}>
              Thông báo
              <span className="notif-badge" style={{ top: -3, right: -4 }} />
            </button>

            {showNotif && (
              <div className="notif-panel">
                <div className="notif-header">
                  <span>Thông báo</span>
                  <span className="notif-count">{NOTIFICATIONS.length}</span>
                </div>
                <div className="notif-list">
                  {NOTIFICATIONS.map(n => (
                    <div key={n.id} className="notif-item">
                      <div className="notif-dot" style={{ background: n.color }} />
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card-footer" style={{ padding: '10px 16px' }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}>
                    Xem tất cả thông báo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <div className="topbar-profile" onClick={() => { setShowProfile(p => !p); setShowNotif(false); }}>
              <div className="topbar-avatar" style={{ background: currentUser.avatarColor }}>
                {currentUser.avatar}
              </div>
              <div className="topbar-profile-info">
                <div className="topbar-profile-name">{currentUser.name}</div>
                <div className="topbar-profile-role">{currentUser.roleName}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>▾</span>
            </div>

            {showProfile && (
              <div className="dropdown">
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{currentUser.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentUser.email}</div>
                  <span className="stat-list-badge badge-blue" style={{ marginTop: 6, display: 'inline-block', fontSize: 11 }}>
                    {currentUser.roleName}
                  </span>
                </div>
                <div className="dropdown-item" onClick={() => { setActivePage('profile'); setShowProfile(false); }}>
                  Hồ sơ cá nhân
                </div>
                <div className="dropdown-item" onClick={() => { setActivePage('system-settings'); setShowProfile(false); }}>
                  Cài đặt
                </div>
                <div className="dropdown-item" onClick={toggleTheme}>
                  Chế độ {theme === 'dark' ? 'sáng' : 'tối'}
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-item danger" onClick={() => { setShowProfile(false); setShowLogout(true); }}>
                  Đăng xuất
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
    </>
  );
};
