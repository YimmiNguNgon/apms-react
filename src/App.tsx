import React, { useState, useEffect } from 'react';
import { UserProvider, useUser, ROLES, ROLE_DEFAULT_PAGE } from './context/UserContext';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './components/Login';

// ── Role dashboards ──
import { AdminDashboard }     from './pages/dashboards/AdminDashboard';
import { DirectorDashboard }  from './pages/dashboards/DirectorDashboard';
import { ManagerDashboard }   from './pages/dashboards/ManagerDashboard';
import { KeyMemberDashboard } from './pages/dashboards/KeyMemberDashboard';
import { StaffDashboard }     from './pages/dashboards/StaffDashboard';

// ── Existing pages ──
import { CompanyList }     from './pages/CompanyList';
import { CompanyDetail }   from './pages/CompanyDetail';
import { VerifyQueue }     from './pages/VerifyQueue';
import { ValidationQueue } from './pages/ValidationQueue';
import { AddCompany }      from './pages/AddCompany';
import { AdminPanel }      from './pages/AdminPanel';
import { AIAgent }         from './pages/AIAgent';
import { News }            from './pages/News';

// ── Admin pages ──
import { UserManagement }    from './pages/UserManagement';
import { ActivityAudit }     from './pages/ActivityAudit';
import { SystemSettingsPage }from './pages/SystemSettings';

// ── Director pages ──
import {
  PartnerEcosystem,
  CompetitorIntelligence,
  MarketOpportunities,
  AIRecommendations,
  StrategicReports,
} from './pages/DirectorPages';
import { RelationshipMap } from './pages/RelationshipMap';

// ── Manager pages ──
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
  CompetitorManagement,
  AIExtractedData,
  SearchCompanies,
  AITrainingMode,
  LearningCenter,
} from './pages/StaffPages';

// ── Shared pages ──
import { ProfilePage } from './pages/ProfilePage';

// ─────────────────────────────────────────────────────────────
// INNER APP
// ─────────────────────────────────────────────────────────────
const MainApp: React.FC = () => {
  const { currentUser, loading } = useUser();
  useTheme();

  const [activePage, setActivePage] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      if (!currentUser.allowedPages.includes(activePage)) {
        setActivePage(ROLE_DEFAULT_PAGE[currentUser.role]);
      }
    } else {
      setActivePage('');
    }
  }, [currentUser]);

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

  if (!currentUser) return <Login />;

  // ── Role dashboard ──
  const renderDashboard = () => {
    switch (currentUser.role) {
      case ROLES.ADMIN:      return <AdminDashboard />;
      case ROLES.DIRECTOR:   return <DirectorDashboard />;
      case ROLES.MANAGER:    return <ManagerDashboard />;
      case ROLES.KEY_MEMBER: return <KeyMemberDashboard />;
      case ROLES.STAFF:      return <StaffDashboard />;
      default:               return <DirectorDashboard />;
    }
  };

  const canView = (page: string) => currentUser.allowedPages.includes(page);

  // ── Page renderer ──
  const renderPage = () => {
    // Dashboard pages
    const dashPages = ['admin-dashboard','director-dashboard','manager-dashboard','keymember-dashboard','staff-dashboard'];
    if (dashPages.includes(activePage)) return renderDashboard();

    if (!canView(activePage)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)' }}>Không có quyền truy cập</h2>
          <p style={{ color: 'var(--text-muted)' }}>Bạn không có quyền xem trang này.</p>
          <button className="btn btn-primary" onClick={() => setActivePage(ROLE_DEFAULT_PAGE[currentUser.role])}>
            ← Về Dashboard
          </button>
        </div>
      );
    }

    switch (activePage) {
      // ── Existing pages ──
      case 'companies':        return <CompanyList setActivePage={setActivePage} />;
      case 'company-detail':   return <CompanyDetail />;
      case 'company-profiles': return <CompanyList setActivePage={setActivePage} />;
      case 'verify':           return <VerifyQueue />;
      case 'validate':         return <ValidationQueue />;
      case 'add-company':      return <AddCompany />;
      case 'admin-panel':      return <AdminPanel />;
      case 'ai-agent':
      case 'personal-ai-agent':return <AIAgent />;
      case 'news':             return <News />;

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

      // ── Director pages ──
      case 'partner-ecosystem':        return <PartnerEcosystem />;
      case 'competitor-intelligence':  return <CompetitorIntelligence />;
      case 'relationship-map':         return <RelationshipMap setActivePage={setActivePage} />;
      case 'market-opportunities':     return <MarketOpportunities />;
      case 'ai-recommendations':       return <AIRecommendations />;
      case 'strategic-reports':        return <StrategicReports />;

      // ── Manager pages ──
      case 'partner-evaluation':         return <PartnerEvaluation />;
      case 'company-assignment':         return <CompanyAssignment />;
      case 'analysis-history':           return <AnalysisHistory />;
      case 'risk-monitoring':            return <RiskMonitoring />;
      case 'partner-status':             return <PartnerStatus />;
      case 'suggested-actions-approval': return <ApprovalsPage />;
      case 'team-kpi':                   return <TeamKPI />;
      case 'reports':                    return <ManagerReports />;

      // ── Key Member pages ──
      case 'review-extracted-data':    return <ReviewExtractedData />;
      case 'company-validation':       return <CompanyValidation />;
      case 'partner-classification':   return <PartnerClassification />;
      case 'competitor-classification':return <CompetitorClassification />;
      case 'ai-suggestion-review':     return <AISuggestionReview />;
      case 'relationship-updates':     return <RelationshipUpdates />;
      case 'onboarding-support':       return <OnboardingSupport />;

      // ── Staff pages ──
      case 'upload-documents':    return <UploadDocuments />;
      case 'partner-management':  return <PartnerManagement />;
      case 'competitor-management':return <CompetitorManagement />;
      case 'ai-extracted-data':   return <AIExtractedData />;
      case 'search-companies':    return <SearchCompanies />;
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
            <button className="btn btn-primary" onClick={() => setActivePage(ROLE_DEFAULT_PAGE[currentUser.role])}>
              ← Về Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <Topbar activePage={activePage} setActivePage={setActivePage} />
        <div className="page-container">
          {renderPage()}
        </div>
      </div>
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
