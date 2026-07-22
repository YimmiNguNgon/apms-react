import React, { useState } from 'react';
import { useUser, ROLES, ROLE_DEFAULT_PAGE } from '../context/UserContext';
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
    items: [
      { id: 'director-dashboard', label: 'Executive Dashboard' },
    ],
  },
  {
    title: 'Ecosystem',
    items: [
      { id: 'partner-ecosystem',       label: 'Partner Ecosystem' },
      { id: 'competitor-intelligence', label: 'Competitor Intelligence' },
      { id: 'relationship-map',        label: 'Relationship Map' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'market-opportunities', label: 'Market Opportunities' },
      { id: 'ai-recommendations',   label: 'AI Recommendations' },
      { id: 'strategic-reports',    label: 'Strategic Reports' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'companies',    label: 'Companies' },
      { id: 'news',         label: 'News & Intelligence' },
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
      { id: 'partner-evaluation',      label: 'Partner Evaluation' },
      { id: 'competitor-intelligence', label: 'Competitor Intel' },
      { id: 'company-assignment',      label: 'Company Assignment' },
      { id: 'analysis-history',        label: 'Analysis History' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { id: 'risk-monitoring',             label: 'Risk Monitoring', badge: 4, badgeType: 'danger' },
      { id: 'partner-status',              label: 'Partner Status' },
      { id: 'suggested-actions-approval',  label: 'Approvals',      badge: 5, badgeType: 'warning' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { id: 'team-kpi', label: 'Team KPI' },
      { id: 'reports',  label: 'Reports' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'companies', label: 'Companies' },
      { id: 'verify',    label: 'Verify Queue' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
  },
];

const KEY_MEMBER_MENU: MenuSection[] = [
  {
    items: [
      { id: 'keymember-dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Validation',
    items: [
      { id: 'review-extracted-data',    label: 'Review Extracted Data' },
      { id: 'company-validation',       label: 'Company Validation' },
      { id: 'partner-classification',   label: 'Partner Classification' },
      { id: 'competitor-classification',label: 'Competitor Classification' },
    ],
  },
  {
    title: 'AI & Relationships',
    items: [
      { id: 'ai-suggestion-review', label: 'AI Suggestion Review' },
      { id: 'relationship-updates', label: 'Relationship Updates' },
      { id: 'onboarding-support',   label: 'Onboarding Support' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'companies',        label: 'Companies' },
      { id: 'validate',         label: 'Validation Queue' },
      { id: 'company-detail',   label: 'Company Detail' },
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
      { id: 'my-tasks',            label: 'My Tasks' },
      { id: 'ai-extracted-data',   label: 'AI Extraction Queue', badge: 7, badgeType: 'warning' },
      { id: 'candidate-review',    label: 'Candidate Review' },
      { id: 'company-profiles',    label: 'Company Profiles' },
    ],
  },
  {
    title: 'Research Input',
    items: [
      { id: 'partner-management',    label: 'Partner Directory' },
      { id: 'competitor-management', label: 'Competitor Watchlist' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'search-companies',  label: 'Search Companies' },
      { id: 'personal-ai-agent', label: 'Research AI Assistant' },
      { id: 'news',              label: 'News & Intel' },
    ],
  },
  {
    title: 'Development',
    items: [
      { id: 'ai-training-mode', label: 'Training Mode' },
      { id: 'learning-center',  label: 'Learning Center' },
    ],
  },
];

const MENU_BY_ROLE = {
  [ROLES.ADMIN]:      ADMIN_MENU,
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
  const [showLogout, setShowLogout] = useState(false);

  if (!currentUser) return null;

  const menuSections = MENU_BY_ROLE[currentUser.role] || [];
  const roleContext = ROLE_CONTEXT[currentUser.role];

  const handleLogout = () => {
    logout();
    setShowLogout(false);
  };

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
                <a
                  key={item.id}
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                  title={item.label}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`nav-badge ${item.badgeType || ''}`}>
                      {item.badge}
                    </span>
                  )}
                </a>
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
