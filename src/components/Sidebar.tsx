import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    label: 'role.admin.label',
    description: 'role.admin.description',
    accent: 'admin',
  },
  [ROLES.OWNER]: {
    label: 'role.owner.label',
    description: 'role.owner.description',
    accent: 'director',
  },
  [ROLES.MANAGER]: {
    label: 'role.manager.label',
    description: 'role.manager.description',
    accent: 'manager',
  },
  [ROLES.STAFF]: {
    label: 'role.staff.label',
    description: 'role.staff.description',
    accent: 'staff',
  },
};

// ─────────────────────────────────────────────────────────────
// ROLE MENU CONFIGS (no emoji icons)
// ─────────────────────────────────────────────────────────────
const ADMIN_MENU: MenuSection[] = [
  {
    items: [
      { id: 'admin-dashboard', label: 'menu.dashboard' },
    ],
  },
  {
    title: 'menu.userManagement',
    items: [
      { id: 'users',       label: 'menu.users',       badge: 12, badgeType: 'danger' },
      { id: 'roles',       label: 'menu.roles' },
      { id: 'permissions', label: 'menu.permissions' },
    ],
  },
  {
    title: 'menu.security',
    items: [
      { id: 'access-control',   label: 'menu.accessControl' },
      { id: 'activity-history', label: 'menu.activityHistory' },
      { id: 'audit-logs',       label: 'menu.auditLogs', badge: 3, badgeType: 'warning' },
    ],
  },
  {
    title: 'menu.system',
    items: [
      { id: 'system-chat', label: 'menu.chat' },
      { id: 'system-settings',   label: 'menu.systemSettings' },
      { id: 'security-settings', label: 'menu.securitySettings' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'menu.profile' }],
  },
];

const DIRECTOR_MENU: MenuSection[] = [
  {
    title: 'menu.executiveCommandSection',
    items: [
      { id: 'director-dashboard', label: 'menu.executiveDashboard' },
      { id: 'risk-monitoring',    label: 'menu.riskMonitoring' },
    ],
  },
  {
    title: 'menu.ecosystemIntelligence',
    items: [
      { id: 'partner-ecosystem',       label: 'menu.partnerEcosystem' },
      { id: 'competitor-intelligence', label: 'menu.competitorIntelligence' },
      { id: 'system-chat',             label: 'menu.chat' },
    ],
  },
  {
    title: 'menu.strategicGovernance',
    items: [
      { id: 'strategic-reports', label: 'menu.strategicReports' },
    ],
  },
  {
    title: 'menu.projects',
    items: [
      { id: 'companies',    label: 'menu.companies' },
      { id: 'news',         label: 'menu.newsIntelligence' },
      { id: 'project-management', label: 'menu.projectsOverview' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'menu.profile' }],
  },
];

const MANAGER_MENU: MenuSection[] = [
  {
    items: [
      { id: 'manager-dashboard', label: 'menu.dashboard' },
    ],
  },
  {
    title: 'menu.operations',
    items: [
      { id: 'project-management',      label: 'menu.projectManagement' },
      { id: 'system-chat',             label: 'menu.chat' },
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
    title: 'menu.data',
    items: [
      { id: 'companies', label: 'menu.companies' },
      { id: 'news',      label: 'menu.crawlerArticles' },
      // { id: 'verify',    label: 'Verify Queue' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'menu.profile' }],
  },
];

const KEY_MEMBER_MENU: MenuSection[] = [
  {
    title: 'menu.workstation',
    items: [
      { id: 'keymember-dashboard', label: 'menu.workstationDashboard' },
      { id: 'project-management',  label: 'menu.myProjects' },
    ],
  },
  {
    title: 'menu.validationReview',
    items: [
      { id: 'company-validation',     label: 'menu.validationQueue' },
      { id: 'review-extracted-data',  label: 'menu.reviewExtractedData' },
      { id: 'partner-classification', label: 'menu.scoreClassify' },
    ],
  },
  {
    title: 'menu.directory',
    items: [
      { id: 'ai-suggestion-review', label: 'menu.aiSuggestionReview' },
      { id: 'relationship-updates', label: 'menu.relationshipUpdates' },
      { id: 'system-chat',          label: 'menu.chat' },
      { id: 'onboarding-support',   label: 'menu.onboardingSupport' },
    ],
  },
  {
    title: 'menu.data',
    items: [
      { id: 'companies',        label: 'menu.companies' },
      { id: 'validate',         label: 'menu.validationQueue' },
      { id: 'company-detail',   label: 'menu.companyDetail' },
      { id: 'companies', label: 'menu.companiesDirectory' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'menu.profile' }],
  },
];

const STAFF_MENU: MenuSection[] = [
  {
    items: [
      { id: 'staff-dashboard', label: 'menu.myDashboard' },
    ],
  },
  {
    title: 'menu.workQueue',
    items: [
      // { id: 'my-tasks',            label: 'My Tasks' },
      { id: 'project-management',  label: 'menu.projectManagement' },
      { id: 'system-chat',         label: 'menu.chat' },
      // { id: 'ai-extracted-data',   label: 'AI Extraction Queue', badge: 7, badgeType: 'warning' },
      // { id: 'candidate-review',    label: 'Candidate Review' },
      { id: 'company-profiles',    label: 'menu.companyProfiles' },
      { id: 'news',                label: 'menu.crawlerArticles' },
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
      { id: 'owner-dashboard', label: 'menu.executiveCommand' },
    ],
  },
  {
    title: 'menu.ecosystemProjects',
    items: [
      { id: 'partner-ecosystem',       label: 'menu.partnerEcosystem' },
      { id: 'competitor-intelligence', label: 'menu.competitorIntel' },
      { id: 'relationship-map',        label: 'menu.relationshipMap' },
      { id: 'crawler-control',         label: 'menu.crawlerControl' },
      { id: 'project-management',      label: 'menu.projectsOverview' },
      { id: 'news',                    label: 'menu.newsIntelligence' },
      { id: 'system-chat',             label: 'menu.chat' },
    ],
  },
  {
    title: 'menu.governanceSettings',
    items: [
      { id: 'company-profiles', label: 'menu.companyProfiles' },
    ],
  },
  {
    items: [{ id: 'profile', label: 'menu.profile' }],
  },
];

const MENU_BY_ROLE = {
  [ROLES.ADMIN]:   ADMIN_MENU,
  [ROLES.OWNER]:   OWNER_MENU,
  [ROLES.MANAGER]: MANAGER_MENU,
  [ROLES.STAFF]:   STAFF_MENU,
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { t } = useTranslation('common');
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
            <div className="logo-sub">{t('app.businessIntelligence')}</div>
          </div>
        </div>

        <div className={`sidebar-role-card ${roleContext?.accent || ''}`}>
          <span className="sidebar-role-chip">{roleContext ? t(roleContext.label) : ''}</span>
          <strong>{currentUser.roleName}</strong>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuSections.map((section, si) => (
            <div className="nav-section" key={si}>
              {section.title && (
                <div className="nav-section-title">{t(section.title)}</div>
              )}
              {section.items.map(item => (
                (() => {
                  const badgeValue = getBadgeValue(item);
                  return (
                    <a
                      key={item.id}
                      className={`nav-item ${activePage === item.id ? 'active' : ''} ${item.id === 'system-chat' && badgeValue && badgeValue > 0 ? 'has-unread' : ''}`}
                      onClick={() => setActivePage(item.id)}
                      title={t(item.label)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="nav-label">{t(item.label)}</span>
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
              title={t('logout.button')}
              onClick={e => { e.stopPropagation(); setShowLogout(true); }}
              style={{
                fontSize: 'var(--text-caption)', width: 'auto', padding: '4px 8px',
                background: 'rgba(239,68,68,0.1)', color: '#FCA5A5',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {t('logout.button')}
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
