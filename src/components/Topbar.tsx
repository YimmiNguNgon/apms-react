import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useUser } from '../context/UserContext';
import { useTheme } from '../hooks/useTheme';
import { LanguageSwitcher } from './LanguageSwitcher';
import { api, type PageResponse } from '../services/api';

interface TopbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

type NotificationItem = {
  id: number;
  title: string;
  message?: string | null;
  type: 'SYSTEM' | 'TASK' | 'DOCUMENT' | 'AI' | 'REPORT' | 'RISK';
  projectId?: number | null;
  taskId?: number | null;
  submissionId?: number | null;
  actionType?: string | null;
  documentId?: string | null;
  rejectReason?: string | null;
  isRead: boolean;
  createdAt?: string | null;
};

const notificationColor: Record<NotificationItem['type'], string> = {
  SYSTEM: '#2563EB',
  TASK: '#10B981',
  DOCUMENT: '#7C3AED',
  AI: '#0EA5E9',
  REPORT: '#F59E0B',
  RISK: '#EF4444',
};

function formatNotificationTime(value?: string | null): string {
  if (!value) return i18n.t('topbar.time.justNow');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return i18n.t('topbar.time.justNow');
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return i18n.t('topbar.time.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18n.t('topbar.time.minAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('topbar.time.hrAgo', { count: hours });
  return date.toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'vi-VN');
}

const PAGE_LABEL_KEYS: Record<string, string> = {
  'admin-dashboard': 'page.adminDashboard',
  'director-dashboard': 'page.directorDashboard',
  'manager-dashboard': 'page.managerDashboard',
  'staff-dashboard': 'page.staffDashboard',
  users: 'page.users',
  permissions: 'page.permissions',
  'audit-logs': 'page.auditLogs',
  'owner-company-profile': 'page.ownerCompanyProfile',
  'admin-company-profiles': 'page.adminCompanyProfiles',
  'admin-company-profile-detail': 'page.adminCompanyProfileDetail',
  'partner-ecosystem': 'page.partnerEcosystem',
  'competitor-intelligence': 'page.competitorIntelligence',
  'relationship-map': 'page.relationshipMap',
  'market-opportunities': 'page.marketOpportunities',
  'ai-recommendations': 'page.aiRecommendations',
  'strategic-reports': 'page.strategicReports',
  'partner-evaluation': 'page.partnerEvaluation',
  'company-assignment': 'page.companyAssignment',
  'analysis-history': 'page.analysisHistory',
  'risk-monitoring': 'page.riskMonitoring',
  'partner-status': 'page.partnerStatus',
  'suggested-actions-approval': 'page.suggestedActionsApproval',
  'team-kpi': 'page.teamKpi',
  reports: 'page.reports',
  'review-extracted-data': 'page.reviewExtractedData',
  'company-validation': 'page.companyValidation',
  'partner-classification': 'page.partnerClassification',
  'competitor-classification': 'page.competitorClassification',
  'ai-suggestion-review': 'page.aiSuggestionReview',
  'relationship-updates': 'page.relationshipUpdates',
  'onboarding-support': 'page.onboardingSupport',
  'upload-documents': 'page.uploadDocuments',
  'company-profiles': 'page.companyProfiles',
  'partner-management': 'page.partnerManagement',
  'competitor-management': 'page.competitorManagement',
  'ai-extracted-data': 'page.aiExtractedData',
  'search-companies': 'page.searchCompanies',
  'personal-ai-agent': 'page.personalAiAgent',
  'ai-training-mode': 'page.aiTrainingMode',
  'learning-center': 'page.learningCenter',
  companies: 'page.companies',
  'company-detail': 'page.companyDetail',
  verify: 'page.verify',
  validate: 'page.validate',
  'add-company': 'page.addCompany',
  'ai-agent': 'page.aiAgent',
  news: 'page.news',
  'system-chat': 'page.systemChat',
  profile: 'page.profile',
};

export const Topbar: React.FC<TopbarProps> = ({ activePage, setActivePage }) => {
  const { t } = useTranslation('common');
  const { currentUser, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
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

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setNotificationsLoading(true);
    try {
      const res = await api.get<PageResponse<NotificationItem>>('/notifications', {
        params: { page: 0, size: 8 },
      });
      setNotifications(res.data?.content ?? []);
    } catch (error) {
      console.warn('Cannot load notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    setNotifications([]);
    if (!currentUser) return;

    void fetchNotifications();
    const timer = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    const handleFcmMessage = () => {
      void fetchNotifications();
    };
    window.addEventListener('apms-fcm-message', handleFcmMessage);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('apms-fcm-message', handleFcmMessage);
    };
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const pageLabelKey = PAGE_LABEL_KEYS[activePage] || 'topbar.dashboard';
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((current) => current.map((notification) => (
        notification.id === item.id ? { ...notification, isRead: true } : notification
      )));
      try {
        await api.patch(`/notifications/${item.id}/read`, {});
      } catch (error) {
        console.warn('Cannot mark notification as read:', error);
        void fetchNotifications();
      }
    }

    if (item.projectId) {
      localStorage.setItem('apms-active-project', String(item.projectId));
      setActivePage('project-detail');
    }
    setShowNotif(false);
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">

        </div>

        <div className="topbar-right">
        

          <div className="relative" ref={notifRef}>
            <button
              className="topbar-btn topbar-icon-btn"
              onClick={() => { setShowNotif((value) => !value); setShowProfile(false); }}
              title={t('topbar.notifications.aria')}
              aria-label={t('topbar.notifications.aria')}
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
              {unreadCount > 0 && <span className="notif-badge" />}
            </button>

            {showNotif && (
              <div className="notif-panel">
                <div className="notif-header">
                  <div>
                    <div className="notif-title-line">{t('topbar.notifications.title')}</div>
                    <div className="notif-subtitle">{t('topbar.notifications.subtitle')}</div>
                  </div>
                  <span className="notif-count">{unreadCount}</span>
                </div>
                <div className="notif-list">
                  {notificationsLoading && notifications.length === 0 && (
                    <div className="notif-empty">{t('topbar.notifications.loading')}</div>
                  )}
                  {!notificationsLoading && notifications.length === 0 && (
                    <div className="notif-empty">{t('topbar.notifications.empty')}</div>
                  )}
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notif-item ${item.isRead ? '' : 'unread'}`}
                      onClick={() => void handleNotificationClick(item)}
                    >
                      <div className="notif-dot" style={{ background: notificationColor[item.type] ?? '#2563EB' }} />
                      <div className="notif-content">
                        <div className="notif-title">{item.title}</div>
                        {item.message && <div className="notif-message">{item.message}</div>}
                        {item.actionType === 'DOCUMENT_REJECTED' && item.rejectReason && (
                          <div className="notif-message">Reason: {item.rejectReason}</div>
                        )}
                        <div className="notif-time">{formatNotificationTime(item.createdAt)}</div>
                      </div>
                      <span className="notif-chevron">›</span>
                    </button>
                  ))}
                </div>
                <div className="notif-footer">
                  <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--text-caption)' }} onClick={() => void fetchNotifications()}>
                    {t('topbar.notifications.refresh')}
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
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)', marginLeft: 4 }}>▾</span>
            </div>

            {showProfile && (
              <div className="dropdown">
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{currentUser.name}</div>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>{currentUser.email}</div>
                  <span className="stat-list-badge badge-blue" style={{ marginTop: 6, display: 'inline-block', fontSize: 'var(--text-caption)' }}>
                    {currentUser.roleName}
                  </span>
                </div>
                <div className="dropdown-item" onClick={() => { setActivePage('profile'); setShowProfile(false); }}>{t('topbar.profile')}</div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
