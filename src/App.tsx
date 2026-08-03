import React, { useCallback, useState, useEffect } from 'react';
import { UserProvider, useUser, ROLES, ROLE_DEFAULT_PAGE } from './context/UserContext';
import { ChatNotificationProvider } from './context/ChatNotificationContext';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { setupFirebaseNotifications, unregisterFirebaseNotifications } from './services/firebaseNotifications';

// ── Role dashboards ──
import { AdminDashboard }     from './pages/dashboards/AdminDashboard';
import { OwnerDashboard }     from './pages/dashboards/OwnerDashboard';
import { DirectorDashboard }  from './pages/dashboards/DirectorDashboard';
import { ManagerDashboard }   from './pages/dashboards/ManagerDashboard';
import { KeyMemberDashboard } from './pages/dashboards/KeyMemberDashboard';
import { StaffDashboard }     from './pages/dashboards/StaffDashboard';

const ACTIVE_PAGE_STORAGE_KEY = 'apms-active-page';

const readActivePageFromLocation = () => {
  if (typeof window === 'undefined') return '';
  const hashPage = window.location.hash.replace(/^#\/?/, '').trim();
  if (hashPage) return hashPage;
  const queryPage = new URLSearchParams(window.location.search).get('page');
  return queryPage || '';
};

const writeActivePageToLocation = (page: string) => {
  if (typeof window === 'undefined' || !page) return;
  const nextHash = `#${page}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  }
};

// ── Existing pages ──
import { CompanyList }     from './pages/CompanyList';
import { CompanyDetail }   from './pages/CompanyDetail';
import { VerifyQueue }     from './pages/VerifyQueue';
import { ValidationQueue } from './pages/ValidationQueue';
import { AddCompany }      from './pages/AddCompany';
import { AdminPanel }      from './pages/AdminPanel';
import { AIAgent }         from './pages/AIAgent';
import { News }            from './pages/News';
import { SystemChat }      from './pages/SystemChat';

// ── Admin pages ──
import { UserManagement }    from './pages/UserManagement';
import { ActivityAudit }     from './pages/ActivityAudit';
import { SystemSettingsPage }from './pages/SystemSettings';

// ── Owner pages ──
import { EcosystemOverview } from './pages/EcosystemOverview';
import { ProjectsOverview }  from './pages/ProjectsOverview';

// ── Director pages ──
import {
  PartnerEcosystem,
  CompetitorIntelligence,
  MarketOpportunities,
  AIRecommendations,
  StrategicReports,
} from './pages/DirectorPages';
import { DirectorRiskMonitoring } from './pages/DirectorRiskMonitoring';
import { StrategicReportsView } from './pages/StrategicReportsView';
import { ScoreRulesViewer } from './pages/ScoreRulesViewer';
import { RelationshipMap } from './pages/RelationshipMap';

// ─── Manager pages ──
import {
  PartnerEvaluation,
  CompanyAssignment,
  AnalysisHistory,
  RiskMonitoring,
  PartnerStatus,
  ApprovalsPage,
  TeamKPI,
  ManagerReports,
} from './pages/ManagerPages';
import { ProjectManagement } from './pages/ProjectManagement';
import { ProjectDetailPage } from './pages/ProjectDetailPage';

// ── Key Member pages ──
import {
  ReviewExtractedData,
  CompanyValidation,
  PartnerClassification,
  CompetitorClassification,
  AISuggestionReview,
  RelationshipUpdates,
  OnboardingSupport,
} from './pages/KeyMemberPages';

// ── Staff pages ──
import {
  UploadDocuments,
  PartnerManagement,
  AIExtractedData,
  SearchCompanies,
  AITrainingMode,
  LearningCenter,
} from './pages/StaffPages';
import { CompetitorWatchlist } from './pages/CompetitorWatchlist';
import { MyTasksWorkspace } from './pages/MyTasksWorkspace';

// ── Shared pages ──
import { ProfilePage } from './pages/ProfilePage';

// ─────────────────────────────────────────────────────────────
// INNER APP
// ─────────────────────────────────────────────────────────────
const MainApp: React.FC = () => {
  const { currentUser, loading } = useUser();
  useTheme();

  const [activePage, setActivePage] = useState<string>(() =>
    readActivePageFromLocation() || localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) || ''
  );
  const [notificationToast, setNotificationToast] = useState<{ title: string; body: string } | null>(null);

  const navigateToPage = useCallback((page: string) => {
    setActivePage(page);
    if (page) {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, page);
      writeActivePageToLocation(page);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
      setActivePage('');
      return;
    }

    if (!activePage || !currentUser.allowedPages.includes(activePage)) {
      const defaultPage = ROLE_DEFAULT_PAGE[currentUser.role];
      navigateToPage(defaultPage);
    }
  }, [activePage, currentUser, loading, navigateToPage]);

  useEffect(() => {
    if (!currentUser || !activePage) return;
    if (!currentUser.allowedPages.includes(activePage)) return;
    localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
    writeActivePageToLocation(activePage);
  }, [activePage, currentUser]);

  useEffect(() => {
    const syncFromHash = () => {
      const page = readActivePageFromLocation();
      if (page) setActivePage(page);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setupFirebaseNotifications().catch((error) => {
      console.warn('Firebase notification setup skipped:', error);
    });

    const handleMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; body?: string }>).detail;
      setNotificationToast({
        title: detail?.title || 'APMS notification',
        body: detail?.body || '',
      });
    };

    window.addEventListener('apms-fcm-message', handleMessage);

    return () => {
      window.removeEventListener('apms-fcm-message', handleMessage);
      unregisterFirebaseNotifications().catch(() => undefined);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!notificationToast) return;
    const timer = window.setTimeout(() => setNotificationToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notificationToast]);

  // Loading splash
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0F172A', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(37,99,235,0.5)',
          animation: 'pulse 1.5s ease infinite',
        }}>
          <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3.5" fill="white" />
            <line x1="12" y1="3" x2="12" y2="8.5" stroke="white" strokeWidth="1.5" />
            <line x1="12" y1="15.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" />
            <line x1="3" y1="12" x2="8.5" y2="12" stroke="white" strokeWidth="1.5" />
            <line x1="15.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <div style={{ color: '#94A3B8', fontSize: 14 }}>Đang tải APMS Platform…</div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }`}</style>
      </div>
    );
  }

  if (!currentUser) {
    const path = window.location.pathname;
    if (path === '/forgot-password') return <ForgotPassword onBackToLogin={() => window.location.href = '/'} />;
    if (path === '/reset-password') return <ResetPassword onBackToLogin={() => window.location.href = '/'} />;
    return <Login />;
  }
  // ── Role dashboard ──
  const renderDashboard = () => {
    switch (currentUser.role) {
      case ROLES.ADMIN:      return <AdminDashboard />;
      case ROLES.OWNER:      return <OwnerDashboard />;
      case ROLES.DIRECTOR:   return <DirectorDashboard />;
      case ROLES.MANAGER:    return <ManagerDashboard setActivePage={navigateToPage} />;
      case ROLES.KEY_MEMBER: return <KeyMemberDashboard setActivePage={navigateToPage} />;
      case ROLES.STAFF:      return <StaffDashboard setActivePage={navigateToPage} />;
      default:               return <DirectorDashboard />;
    }
  };

  const canView = (page: string) => currentUser.allowedPages.includes(page);

  // ── Page renderer ──
  const renderPage = () => {
    // Dashboard pages
    const dashPages = ['admin-dashboard','owner-dashboard','director-dashboard','manager-dashboard','keymember-dashboard','staff-dashboard'];
    if (dashPages.includes(activePage)) return renderDashboard();

    if (!canView(activePage)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)' }}>Không có quyền truy cập</h2>
          <p style={{ color: 'var(--text-muted)' }}>Bạn không có quyền xem trang này.</p>
          <button className="btn btn-primary" onClick={() => navigateToPage(ROLE_DEFAULT_PAGE[currentUser.role])}>
            ← Về Dashboard
          </button>
        </div>
      );
    }

    switch (activePage) {
      // ── Existing pages ──
      case 'companies':        return <CompanyList setActivePage={navigateToPage} />;
      case 'company-detail':   return <CompanyDetail setActivePage={navigateToPage} />;
      case 'company-profiles': return <CompanyList setActivePage={navigateToPage} />;
      case 'verify':           return <VerifyQueue />;
      case 'validate':         return <ValidationQueue />;
      case 'add-company':      return <AddCompany />;
      case 'admin-panel':      return <AdminPanel />;
      case 'ai-agent':
      case 'personal-ai-agent':return renderDashboard();
      case 'news':             return <News />;
      case 'system-chat':      return <SystemChat />;

      // ── Profile (shared) ──
      case 'profile':          return <ProfilePage />;

      // ── Admin pages ──
      case 'users':            return <UserManagement defaultTab="users" />;
      case 'roles':            return <UserManagement defaultTab="roles" />;
      case 'permissions':      return <UserManagement defaultTab="permissions" />;
      case 'activity-history': return <ActivityAudit defaultTab="activity" />;
      case 'audit-logs':       return <ActivityAudit defaultTab="audit" />;
      case 'system-settings':  return <SystemSettingsPage defaultTab="system" />;
      case 'security-settings':return <SystemSettingsPage defaultTab="security" />;
      case 'access-control':   return <SystemSettingsPage defaultTab="access-control" />;

      // ── Director & Owner pages ──
      case 'partner-ecosystem':        return (currentUser.role === ROLES.OWNER || currentUser.role === ROLES.DIRECTOR) ? <EcosystemOverview setActivePage={navigateToPage} /> : <PartnerEcosystem />;
      case 'competitor-intelligence':  return <CompetitorIntelligence />;
      case 'relationship-map':         return <RelationshipMap setActivePage={navigateToPage} />;
      case 'market-opportunities':     return <MarketOpportunities />;
      case 'ai-recommendations':       return <AIRecommendations />;
      case 'strategic-reports':        return currentUser.role === ROLES.DIRECTOR ? <StrategicReportsView /> : <StrategicReports />;
      case 'score-rules':              return <ScoreRulesViewer />;

      // ── Manager pages ──
      case 'partner-evaluation':         return <PartnerEvaluation />;
      case 'company-assignment':         return <CompanyAssignment setActivePage={navigateToPage} />;
      case 'analysis-history':           return <AnalysisHistory />;
      case 'risk-monitoring':            return currentUser.role === ROLES.DIRECTOR ? <DirectorRiskMonitoring setActivePage={navigateToPage} /> : <RiskMonitoring />;
      case 'partner-status':             return <PartnerStatus />;
      case 'suggested-actions-approval': return <ApprovalsPage />;
      case 'team-kpi':                   return <TeamKPI />;
      case 'reports':                    return <ManagerReports />;
      case 'project-management':         return (currentUser.role === ROLES.OWNER || currentUser.role === ROLES.DIRECTOR) ? <ProjectsOverview /> : <ProjectManagement setActivePage={navigateToPage} />;
      case 'project-detail':             return <ProjectDetailPage setActivePage={navigateToPage} />;

      // ── Key Member pages ──
      case 'review-extracted-data':    return <ReviewExtractedData />;
      case 'company-validation':       return <CompanyValidation />;
      case 'partner-classification':   return <PartnerClassification />;
      case 'competitor-classification':return <CompetitorClassification />;
      case 'ai-suggestion-review':     return <AISuggestionReview />;
      case 'relationship-updates':     return <RelationshipUpdates />;
      case 'onboarding-support':       return <OnboardingSupport />;

      // ── Staff pages ──
      case 'my-tasks':            return <MyTasksWorkspace setActivePage={navigateToPage} />;
      case 'upload-documents':    return <UploadDocuments setActivePage={navigateToPage} />;
      case 'partner-management':  return <PartnerManagement />;
      case 'competitor-management':return <CompetitorWatchlist />;
      case 'ai-extracted-data':   return <AIExtractedData />;
      case 'candidate-review':    return <CompanyValidation staffMode />;
      case 'search-companies':    return <SearchCompanies setActivePage={navigateToPage} />;
      case 'ai-training-mode':    return <AITrainingMode />;
      case 'learning-center':     return <LearningCenter />;

      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>🚧</div>
            <h2 style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {activePage.replace(/-/g, ' ')}
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
              Trang này đang trong quá trình phát triển. Các tính năng sẽ sớm được ra mắt.
            </p>
            <button className="btn btn-primary" onClick={() => navigateToPage(ROLE_DEFAULT_PAGE[currentUser.role])}>
              ← Về Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <ChatNotificationProvider activePage={activePage} navigateToPage={navigateToPage}>
        <Sidebar activePage={activePage} setActivePage={navigateToPage} />
        <div className="main-content">
          <Topbar activePage={activePage} setActivePage={navigateToPage} />
          <div className="page-container">
            {renderPage()}
          </div>
        </div>
        {activePage !== 'system-chat' && <AIAgent />}
        {notificationToast && (
          <div className="apms-toast success">
            <strong>{notificationToast.title}</strong>
            {notificationToast.body && <span>{notificationToast.body}</span>}
          </div>
        )}
      </ChatNotificationProvider>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <UserProvider>
      <MainApp />
    </UserProvider>
  );
}
