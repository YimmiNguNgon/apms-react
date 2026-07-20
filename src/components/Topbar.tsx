import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../hooks/useTheme';
import { LogoutModal } from './LogoutModal';

interface TopbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const NOTIFICATIONS = [
  { id: 1, title: 'AI surfaced 3 new potential partners', time: '5 minutes ago', color: '#2563EB' },
  { id: 2, title: 'FPT Software profile needs manager review', time: '20 minutes ago', color: '#F59E0B' },
  { id: 3, title: 'June strategic report is ready', time: '1 hour ago', color: '#10B981' },
  { id: 4, title: 'Risk alert: new competitor activity detected', time: '2 hours ago', color: '#EF4444' },
  { id: 5, title: 'Approval request from Ha Duc Huy', time: '3 hours ago', color: '#8B5CF6' },
];

const PAGE_LABELS: Record<string, string> = {
  'admin-dashboard': 'Platform Command Center',
  'director-dashboard': 'Director Workspace',
  'manager-dashboard': 'Approval and Delivery Board',
  'keymember-dashboard': 'Key Member Dashboard',
  'staff-dashboard': 'Research Staff Dashboard',
  users: 'User Management',
  roles: 'Role Management',
  permissions: 'Permissions',
  'access-control': 'Access Control',
  'activity-history': 'Activity History',
  'audit-logs': 'Audit Logs',
  'system-settings': 'System Settings',
  'security-settings': 'Security Settings',
  'partner-ecosystem': 'Partner Ecosystem',
  'competitor-intelligence': 'Competitor Intelligence',
  'relationship-map': 'Relationship Map',
  'market-opportunities': 'Market Opportunities',
  'ai-recommendations': 'AI Recommendations',
  'strategic-reports': 'Strategic Reports',
  'partner-evaluation': 'Partner Evaluation',
  'company-assignment': 'Company Assignment',
  'analysis-history': 'Analysis History',
  'risk-monitoring': 'Risk Monitoring',
  'partner-status': 'Partner Status',
  'suggested-actions-approval': 'Approvals',
  'team-kpi': 'Team KPI',
  reports: 'Reports',
  'review-extracted-data': 'Review Extracted Data',
  'company-validation': 'Company Validation',
  'partner-classification': 'Partner Classification',
  'competitor-classification': 'Competitor Classification',
  'ai-suggestion-review': 'AI Suggestion Review',
  'relationship-updates': 'Relationship Updates',
  'onboarding-support': 'Onboarding Support',
  'upload-documents': 'My Tasks',
  'company-profiles': 'Company Profiles',
  'partner-management': 'Partner Directory',
  'competitor-management': 'Competitor Watchlist',
  'ai-extracted-data': 'AI Extraction Queue',
  'search-companies': 'Search Companies',
  'personal-ai-agent': 'Research AI Assistant',
  'ai-training-mode': 'Training Mode',
  'learning-center': 'Learning Center',
  companies: 'Company Profiles',
  'company-detail': 'Company Detail',
  verify: 'Approval Queue',
  validate: 'Validation Queue',
  'add-company': 'Create Company Profile',
  'ai-agent': 'AI Agent',
  news: 'News & Intelligence',
  profile: 'My Profile',
};

export const Topbar: React.FC<TopbarProps> = ({ activePage, setActivePage }) => {
  const { currentUser, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const pageLabel = PAGE_LABELS[activePage] || 'Dashboard';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            <span>APMS</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{pageLabel}</span>
          </div>

          <div className="topbar-search">
            <input
              type="text"
              placeholder="Search workspace..."
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
            />
          </div>
        </div>

        <div className="topbar-right">
          <button className="topbar-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              className="topbar-btn topbar-icon-btn"
              onClick={() => { setShowNotif((value) => !value); setShowProfile(false); }}
              title="Notifications"
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={showNotif}
            >
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
                <path
                  d="M15 17H5.5c1-1 1.5-2.1 1.5-4.5V10a5 5 0 1 1 10 0v2.5c0 2.4 0.5 3.5 1.5 4.5H15Zm-3 3a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="notif-badge" />
            </button>

            {showNotif && (
              <div className="notif-panel">
                <div className="notif-header">
                  <div>
                    <div className="notif-title-line">Notifications</div>
                    <div className="notif-subtitle">Recent workspace updates</div>
                  </div>
                  <span className="notif-count">{NOTIFICATIONS.length}</span>
                </div>
                <div className="notif-list">
                  {NOTIFICATIONS.map((item) => (
                    <div key={item.id} className="notif-item">
                      <div className="notif-dot" style={{ background: item.color }} />
                      <div className="notif-content">
                        <div className="notif-title">{item.title}</div>
                        <div className="notif-time">{item.time}</div>
                      </div>
                      <span className="notif-chevron">›</span>
                    </div>
                  ))}
                </div>
                <div className="notif-footer">
                  <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <div className="topbar-profile" onClick={() => { setShowProfile((value) => !value); setShowNotif(false); }}>
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
                <div className="dropdown-item" onClick={() => { setActivePage('profile'); setShowProfile(false); }}>Profile</div>
                <div className="dropdown-item" onClick={() => { setActivePage('system-settings'); setShowProfile(false); }}>Settings</div>
                <div className="dropdown-item" onClick={toggleTheme}>Use {theme === 'dark' ? 'light' : 'dark'} mode</div>
                <div className="dropdown-divider" />
                <div className="dropdown-item danger" onClick={() => { setShowProfile(false); setShowLogout(true); }}>Sign out</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showLogout && (
        <LogoutModal onConfirm={() => { logout(); setShowLogout(false); }} onCancel={() => setShowLogout(false)} />
      )}
    </>
  );
};
