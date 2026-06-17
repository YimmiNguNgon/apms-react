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
      { id: 'partner-ecosystem',       label: 'Partner Ecosystem',       badge: 47, badgeType: 'success' },
      { id: 'competitor-intelligence', label: 'Competitor Intelligence', badge: 8,  badgeType: 'danger' },
      { id: 'relationship-map',        label: 'Relationship Map' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'market-opportunities', label: 'Market Opportunities', badge: 23, badgeType: 'success' },
      { id: 'ai-recommendations',   label: 'AI Recommendations',   badge: 15, badgeType: 'warning' },
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
      { id: 'review-extracted-data',    label: 'Review Extracted Data',  badge: 8, badgeType: 'warning' },
      { id: 'company-validation',       label: 'Company Validation' },
      { id: 'partner-classification',   label: 'Partner Classification' },
      { id: 'competitor-classification',label: 'Competitor Class.' },
    ],
  },
  {
    title: 'AI & Relationships',
    items: [
      { id: 'ai-suggestion-review', label: 'AI Suggestion Review', badge: 6, badgeType: 'danger' },
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
      { id: 'staff-dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Data Entry',
    items: [
      { id: 'upload-documents',    label: 'Upload Documents' },
      { id: 'add-company',         label: 'Add Company' },
      { id: 'company-profiles',    label: 'Company Profiles' },
      { id: 'partner-management',  label: 'Partner Management' },
      { id: 'competitor-management',label: 'Competitor Mgmt' },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { id: 'ai-extracted-data', label: 'AI Extracted Data',  badge: 7, badgeType: 'warning' },
      { id: 'search-companies',  label: 'Search Companies' },
      { id: 'personal-ai-agent', label: 'Personal AI Agent' },
      { id: 'news',              label: 'News & Intel' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { id: 'ai-training-mode', label: 'AI Training Mode' },
      { id: 'learning-center',  label: 'Learning Center' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'Profile' }],
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

  const handleLogout = () => {
    logout();
    setShowLogout(false);
  };

  return (
    <>
      <aside className="sidebar" id="sidebar">
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

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuSections.map((section, si) => (
            <div key={si}>
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
