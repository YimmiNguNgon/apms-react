import React, { useState } from 'react';
import { useUser, ROLES } from '../context/UserContext';
import { useChatNotifications } from '../context/ChatNotificationContext';
import { LogoutModal } from './LogoutModal';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  badge?: number;
  badgeType?: 'danger' | 'warning' | 'success';
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const ROLE_CONTEXT: Record<string, { label: string; description: string; accent: string }> = {
  [ROLES.ADMIN]: {
    label: 'System control',
    description: 'Users, roles, audit, and platform health.',
    accent: 'admin',
  },
  [ROLES.OWNER]: {
    label: 'Business Owner',
    description: 'Executive oversight, strategic posture, and enterprise audit.',
    accent: 'director',
  },
  [ROLES.DIRECTOR]: {
    label: 'Executive view',
    description: 'Market posture, ecosystem movement, and strategic signals.',
    accent: 'director',
  },
  [ROLES.MANAGER]: {
    label: 'Operations desk',
    description: 'Assignments, approvals, delivery risk, and team throughput.',
    accent: 'manager',
  },
  [ROLES.KEY_MEMBER]: {
    label: 'Validation desk',
    description: 'Review extracted data, resolve ambiguity, and prepare handoff.',
    accent: 'keymember',
  },
  [ROLES.STAFF]: {
    label: 'Research flow',
    description: 'Daily tasks, evidence collection, and profile completion.',
    accent: 'staff',
  },
};

// ─────────────────────────────────────────────────────────────
// ROLE MENU CONFIGS (no emoji icons)
// ─────────────────────────────────────────────────────────────
const ADMIN_MENU: MenuSection[] = [
  {
    items: [
      { id: 'admin-dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'User Management',
    items: [
      { id: 'users',       label: 'Users',       badge: 12, badgeType: 'danger' },
      { id: 'roles',       label: 'Roles' },
      { id: 'permissions', label: 'Permissions' },
    ],
  },
  {
    title: 'Security',
    items: [
      { id: 'access-control',   label: 'Access Control' },
      { id: 'activity-history', label: 'Activity History' },
      { id: 'audit-logs',       label: 'Audit Logs', badge: 3, badgeType: 'warning' },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'project-management', label: 'Project Management' },
      { id: 'system-chat', label: 'Chat' },
      { id: 'system-settings',   label: 'System Settings' },
      { id: 'security-settings', label: 'Security Settings' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const DIRECTOR_MENU: MenuSection[] = [
  {
    title: 'Executive Command',
    items: [
      { id: 'director-dashboard', label: 'Executive Dashboard' },
      { id: 'risk-monitoring',    label: 'Risk Monitoring' },
    ],
  },
  {
    title: 'Ecosystem & Intelligence',
    items: [
      { id: 'partner-ecosystem',       label: 'Partner Ecosystem' },
      { id: 'competitor-intelligence', label: 'Competitor Intelligence' },
      { id: 'relationship-map',        label: 'Relationship Map' },
      { id: 'system-chat',             label: 'Chat' },
    ],
  },
  {
    title: 'Strategic Governance',
    items: [
      { id: 'strategic-reports', label: 'Strategic Reports' },
      { id: 'score-rules',       label: 'Score Workspace' },
    ],
  },
  {
    title: 'Projects',
    items: [
      { id: 'companies',    label: 'Companies' },
      { id: 'news',         label: 'News & Intelligence' },
      { id: 'project-management', label: 'Projects Overview' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const MANAGER_MENU: MenuSection[] = [
  {
    items: [
      { id: 'manager-dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'project-management',      label: 'Project Management' },
      { id: 'score-rules',             label: 'Score Workspace' },
      { id: 'system-chat',             label: 'Chat' },
      // { id: 'competitor-intelligence', label: 'Competitor Intel' },
      // { id: 'analysis-history',        label: 'Analysis History' },
    ],
  },
  {
    // title: 'Monitoring',
    items: [
      // { id: 'risk-monitoring',             label: 'Risk Monitoring', badge: 4, badgeType: 'danger' },
      // { id: 'partner-status',              label: 'Partner Status' },
      // { id: 'suggested-actions-approval',  label: 'Approvals',      badge: 5, badgeType: 'warning' },
    ],
  },
  // {
  //   title: 'Performance',
  //   items: [
  //     { id: 'team-kpi', label: 'Team KPI' },
  //     { id: 'reports',  label: 'Reports' },
  //   ],
  // },
  {
    title: 'Data',
    items: [
      { id: 'companies', label: 'Companies' },
      { id: 'news',      label: 'Crawler Articles' },
      // { id: 'verify',    label: 'Verify Queue' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const KEY_MEMBER_MENU: MenuSection[] = [
  {
    title: 'Workstation',
    items: [
      { id: 'keymember-dashboard', label: 'Workstation Dashboard' },
      { id: 'project-management',  label: 'My Projects' },
    ],
  },
  {
    title: 'Validation & Review',
    items: [
      { id: 'company-validation',     label: 'Validation Queue' },
      { id: 'review-extracted-data',  label: 'Review Extracted Data' },
      { id: 'partner-classification', label: 'Score & Classify' },
    ],
  },
  {
    title: 'Directory',
    items: [
      { id: 'ai-suggestion-review', label: 'AI Suggestion Review' },
      { id: 'relationship-updates', label: 'Relationship Updates' },
      { id: 'system-chat',          label: 'Chat' },
      { id: 'onboarding-support',   label: 'Onboarding Support' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'companies',        label: 'Companies' },
      { id: 'validate',         label: 'Validation Queue' },
      { id: 'company-detail',   label: 'Company Detail' },
      { id: 'companies', label: 'Companies Directory' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const STAFF_MENU: MenuSection[] = [
  {
    items: [
      { id: 'staff-dashboard', label: 'My Dashboard' },
    ],
  },
  {
    title: 'Work Queue',
    items: [
      // { id: 'my-tasks',            label: 'My Tasks' },
      { id: 'project-management',  label: 'Project Management' },
      { id: 'system-chat',         label: 'Chat' },
      // { id: 'ai-extracted-data',   label: 'AI Extraction Queue', badge: 7, badgeType: 'warning' },
      // { id: 'candidate-review',    label: 'Candidate Review' },
      { id: 'company-profiles',    label: 'Company Profiles' },
      { id: 'news',                label: 'Crawler Articles' },
    ],
  },
  // {
  //   title: 'Research Input',
  //   items: [
  //     { id: 'partner-management',    label: 'Partner Directory' },
  //     { id: 'competitor-management', label: 'Competitor Watchlist' },
  //   ],
  // },
  // {
  //   title: 'Intelligence',
  //   items: [
  //     { id: 'search-companies',  label: 'Search Companies' },
  //     { id: 'personal-ai-agent', label: 'Research AI Assistant' },
  //     { id: 'news',              label: 'News & Intel' },
  //   ],
  // },
  // {
  //   title: 'Development',
  //   items: [
  //     { id: 'ai-training-mode', label: 'Training Mode' },
  //     { id: 'learning-center',  label: 'Learning Center' },
  //   ],
  // },
];

const OWNER_MENU: MenuSection[] = [
  {
    items: [
      { id: 'owner-dashboard', label: 'Executive Command' },
    ],
  },
  {
    title: 'Ecosystem & Projects',
    items: [
      { id: 'partner-ecosystem',       label: 'Partner Ecosystem' },
      { id: 'competitor-intelligence', label: 'Competitor Intel' },
      { id: 'project-management',      label: 'Projects Overview' },
      { id: 'news',                    label: 'News & Intelligence' },
      { id: 'system-chat',             label: 'Chat' },
    ],
  },
  {
    title: 'Governance & Settings',
    items: [
      { id: 'company-profiles', label: 'Company Profiles' },
      { id: 'score-rules',      label: 'Score Workspace' },
      { id: 'audit-logs',       label: 'Audit Log Viewer' },
      { id: 'system-settings',  label: 'System Settings' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const MENU_BY_ROLE = {
  [ROLES.ADMIN]:      ADMIN_MENU,
  [ROLES.OWNER]:      OWNER_MENU,
  [ROLES.DIRECTOR]:   DIRECTOR_MENU,
  [ROLES.MANAGER]:    MANAGER_MENU,
  [ROLES.KEY_MEMBER]: KEY_MEMBER_MENU,
  [ROLES.STAFF]:      STAFF_MENU,
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { currentUser, logout } = useUser();
  const { totalUnread } = useChatNotifications();
  const [showLogout, setShowLogout] = useState(false);

  if (!currentUser) return null;

  const menuSections = MENU_BY_ROLE[currentUser.role] || [];
  const roleContext = ROLE_CONTEXT[currentUser.role];

  const handleLogout = () => {
    logout();
    setShowLogout(false);
  };

  const getBadgeValue = (item: MenuItem) => {
    if (item.id === 'system-chat') return totalUnread;
    return item.badge;
  };

  const formatBadge = (value: number) => value > 99 ? '99+' : value;

  return (
    <>
      <aside className={`sidebar role-${roleContext?.accent || 'default'}`} id="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3.5" fill="white" />
              <line x1="12" y1="3" x2="12" y2="8.5" stroke="white" strokeWidth="1.5" />
              <line x1="12" y1="15.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" />
              <line x1="3" y1="12" x2="8.5" y2="12" stroke="white" strokeWidth="1.5" />
              <line x1="15.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="logo-text-block">
            <div className="logo-title">APMS</div>
            <div className="logo-sub">Business Intelligence</div>
          </div>
        </div>

        <div className={`sidebar-role-card ${roleContext?.accent || ''}`}>
          <span className="sidebar-role-chip">{roleContext?.label}</span>
          <strong>{currentUser.roleName}</strong>
          <p>{roleContext?.description}</p>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuSections.map((section, si) => (
            <div className="nav-section" key={si}>
              {section.title && (
                <div className="nav-section-title">{section.title}</div>
              )}
              {section.items.map(item => (
                (() => {
                  const badgeValue = getBadgeValue(item);
                  return (
                    <a
                      key={item.id}
                      className={`nav-item ${activePage === item.id ? 'active' : ''} ${item.id === 'system-chat' && badgeValue && badgeValue > 0 ? 'has-unread' : ''}`}
                      onClick={() => setActivePage(item.id)}
                      title={item.label}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="nav-label">{item.label}</span>
                      {badgeValue !== undefined && badgeValue > 0 && (
                        <span className={`nav-badge ${item.id === 'system-chat' ? 'chat-unread' : item.badgeType || ''}`}>
                          {formatBadge(badgeValue)}
                        </span>
                      )}
                    </a>
                  );
                })()
              ))}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => setActivePage('profile')}>
            <div className="user-avatar-sm" style={{ background: currentUser.avatarColor }}>
              {currentUser.avatar}
            </div>
            <div className="user-meta">
              <div className="user-meta-name">{currentUser.name}</div>
              <div className="user-meta-role">{currentUser.roleName}</div>
            </div>
            <button
              className="sidebar-logout-btn"
              title="Đăng xuất"
              onClick={e => { e.stopPropagation(); setShowLogout(true); }}
              style={{
                fontSize: '11px', width: 'auto', padding: '4px 8px',
                background: 'rgba(239,68,68,0.1)', color: '#FCA5A5',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Thoát
            </button>
          </div>
        </div>
      </aside>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
};
