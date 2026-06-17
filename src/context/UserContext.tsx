import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

// ─────────────────────────────────────────────────────────────
// ROLE CONSTANTS
// ─────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:      'ROLE_ADMIN',
  DIRECTOR:   'ROLE_DIRECTOR',
  MANAGER:    'ROLE_MANAGER',
  KEY_MEMBER: 'ROLE_KEY_MEMBER',
  STAFF:      'ROLE_STAFF',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ─────────────────────────────────────────────────────────────
// PAGE PERMISSIONS per role
// ─────────────────────────────────────────────────────────────
export const ROLE_PAGES: Record<Role, string[]> = {
  [ROLES.ADMIN]: [
    'admin-dashboard', 'users', 'roles', 'permissions', 'access-control',
    'activity-history', 'audit-logs', 'system-settings', 'security-settings', 'profile',
  ],
  [ROLES.DIRECTOR]: [
    'director-dashboard', 'partner-ecosystem', 'competitor-intelligence',
    'relationship-map', 'market-opportunities', 'ai-recommendations',
    'strategic-reports', 'companies', 'company-detail', 'news', 'profile',
  ],
  [ROLES.MANAGER]: [
    'manager-dashboard', 'partner-evaluation', 'competitor-intelligence',
    'company-assignment', 'analysis-history', 'risk-monitoring',
    'partner-status', 'suggested-actions-approval', 'team-kpi', 'reports',
    'companies', 'company-detail', 'verify', 'news', 'profile',
  ],
  [ROLES.KEY_MEMBER]: [
    'keymember-dashboard', 'review-extracted-data', 'company-validation',
    'partner-classification', 'competitor-classification', 'ai-suggestion-review',
    'relationship-updates', 'onboarding-support',
    'companies', 'company-detail', 'validate', 'profile',
  ],
  [ROLES.STAFF]: [
    'staff-dashboard', 'upload-documents', 'company-profiles',
    'partner-management', 'competitor-management', 'ai-extracted-data',
    'search-companies', 'personal-ai-agent', 'ai-training-mode', 'learning-center',
    'companies', 'company-detail', 'add-company', 'ai-agent', 'news', 'profile',
  ],
};

// Default (first) page per role
export const ROLE_DEFAULT_PAGE: Record<Role, string> = {
  [ROLES.ADMIN]:      'admin-dashboard',
  [ROLES.DIRECTOR]:   'director-dashboard',
  [ROLES.MANAGER]:    'manager-dashboard',
  [ROLES.KEY_MEMBER]: 'keymember-dashboard',
  [ROLES.STAFF]:      'staff-dashboard',
};

// ─────────────────────────────────────────────────────────────
// USER MODEL
// ─────────────────────────────────────────────────────────────
export interface User {
  username:     string;
  email:        string;
  name:         string;
  role:         Role;
  roleName:     string;
  avatar:       string;
  avatarColor:  string;
  allowedPages: string[];
}

// Avatar gradient per role
const ROLE_COLORS: Record<Role, string> = {
  [ROLES.ADMIN]:      'linear-gradient(135deg, #64748b, #475569)',
  [ROLES.DIRECTOR]:   'linear-gradient(135deg, #10B981, #059669)',
  [ROLES.MANAGER]:    'linear-gradient(135deg, #F59E0B, #D97706)',
  [ROLES.KEY_MEMBER]: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  [ROLES.STAFF]:      'linear-gradient(135deg, #3B82F6, #2563EB)',
};

// ─────────────────────────────────────────────────────────────
// DEMO USER PROFILES (for quick login)
// ─────────────────────────────────────────────────────────────
export const DEMO_USERS: Record<string, User> = {
  // owner@apms.com → BUSINESS_OWNER role → show as Admin
  admin: {
    username: 'admin', email: 'owner@apms.com', name: 'Đỗ Minh Trí',
    role: ROLES.ADMIN, roleName: 'System Administrator', avatar: 'MT',
    avatarColor: ROLE_COLORS[ROLES.ADMIN],
    allowedPages: ROLE_PAGES[ROLES.ADMIN],
  },
  // owner@apms.com → BUSINESS_OWNER role → show as Director
  director: {
    username: 'director', email: 'owner@apms.com', name: 'Nguyễn Thế Trung',
    role: ROLES.DIRECTOR, roleName: 'Business Director', avatar: 'TT',
    avatarColor: ROLE_COLORS[ROLES.DIRECTOR],
    allowedPages: ROLE_PAGES[ROLES.DIRECTOR],
  },
  // manager@apms.com → BUSINESS_DEVELOPMENT_MANAGER role
  manager: {
    username: 'manager', email: 'manager@apms.com', name: 'Trần Quốc Bảo',
    role: ROLES.MANAGER, roleName: 'BD Manager', avatar: 'QB',
    avatarColor: ROLE_COLORS[ROLES.MANAGER],
    allowedPages: ROLE_PAGES[ROLES.MANAGER],
  },
  // staff@apms.com → RESEARCH_STAFF role → show as Key Member
  keymember: {
    username: 'keymember', email: 'staff@apms.com', name: 'Lê Thị Hồng Vân',
    role: ROLES.KEY_MEMBER, roleName: 'Key Member / Senior BD Staff', avatar: 'HV',
    avatarColor: ROLE_COLORS[ROLES.KEY_MEMBER],
    allowedPages: ROLE_PAGES[ROLES.KEY_MEMBER],
  },
  // staff@apms.com → RESEARCH_STAFF role → show as Staff
  staff: {
    username: 'staff', email: 'staff@apms.com', name: 'Hà Đức Huy',
    role: ROLES.STAFF, roleName: 'BD Staff', avatar: 'HH',
    avatarColor: ROLE_COLORS[ROLES.STAFF],
    allowedPages: ROLE_PAGES[ROLES.STAFF],
  },
};

// ─────────────────────────────────────────────────────────────
// Backend role mapper
// ─────────────────────────────────────────────────────────────
/**
 * Map backend SystemRole enum values to frontend User profiles.
 * Backend roles: BUSINESS_OWNER, BUSINESS_DEVELOPMENT_MANAGER, RESEARCH_STAFF
 * They are returned as: "BUSINESS_OWNER", "BUSINESS_DEVELOPMENT_MANAGER", "RESEARCH_STAFF"
 */
function mapBackendRoles(email: string, backendRoles: string[], preferredDemoKey?: string): User {
  const rolesStr = backendRoles.join(',').toUpperCase();
  const isOwner   = rolesStr.includes('OWNER');
  const isManager = rolesStr.includes('MANAGER');
  const isDirector = rolesStr.includes('DIRECTOR');

  if (isOwner || isDirector) {
    // If the caller explicitly wants admin profile (via quick-login 'admin'), use admin
    if (preferredDemoKey === 'admin') return { ...DEMO_USERS.admin, email };
    return { ...DEMO_USERS.director, email };
  } else if (isManager) {
    return { ...DEMO_USERS.manager, email };
  } else {
    // RESEARCH_STAFF → key member or staff depending on preferredDemoKey
    if (preferredDemoKey === 'keymember') return { ...DEMO_USERS.keymember, email };
    return { ...DEMO_USERS.staff, email };
  }
}

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────
interface UserContextType {
  currentUser: User | null;
  login: (emailOrKey: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface BackendResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    id: number;
    email: string;
    roles: string[];
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('apms-user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); }
      catch { localStorage.removeItem('apms-user'); localStorage.removeItem('apms-token'); }
    }
    setLoading(false);
  }, []);

  const login = async (emailOrKey: string, password?: string): Promise<boolean> => {
    const key = emailOrKey.toLowerCase().trim();

    // ── Quick-login by role key ──
    if (DEMO_USERS[key]) {
      const demoUser = DEMO_USERS[key];
      // Try real API first; fall back to demo user on any error
      const apiEmail = demoUser.email;
      const apiPwd   = password || '123456'; // DataSeeder seeds all users with '123456'
      try {
        const res = await api.post<BackendResponse>('/auth/login',
          { email: apiEmail, password: apiPwd },
          { skipAuthRedirect: true }
        );
        if (res?.success && res.data) {
          localStorage.setItem('apms-token', res.data.accessToken);
          // Pass the requested demo key so mapBackendRoles preserves intended role
          // (e.g. owner@apms.com can be shown as admin OR director)
          const user: User = { ...demoUser, email: res.data.email };
          setCurrentUser(user);
          localStorage.setItem('apms-user', JSON.stringify(user));
          return true;
        }
      } catch (err) {
        // API unavailable or credentials wrong — use demo user directly (offline mode)
        console.warn('API login failed, using offline demo mode for:', key, err);
      }
      // Offline/demo mode: use static demo user without JWT
      setCurrentUser(demoUser);
      localStorage.setItem('apms-user', JSON.stringify(demoUser));
      return true;
    }

    // ── Real email/password login ──
    try {
      const res = await api.post<BackendResponse>('/auth/login',
        { email: emailOrKey, password: password || '' },
        { skipAuthRedirect: true } // don't auto-reload on wrong password
      );
      if (res?.success && res.data) {
        localStorage.setItem('apms-token', res.data.accessToken);
        const user = mapBackendRoles(res.data.email, res.data.roles);
        setCurrentUser(user);
        localStorage.setItem('apms-user', JSON.stringify(user));
        return true;
      }
      // Backend returned success=false with a message
      return false;
    } catch (err: any) {
      // Rethrow with a user-friendly message from the API if available
      const msg = err?.message || 'Không thể kết nối đến máy chủ.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('apms-user');
    localStorage.removeItem('apms-token');
    // Legacy cleanup
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    sessionStorage.clear();
  };

  return (
    <UserContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────────
// PERMISSION HELPER
// ─────────────────────────────────────────────────────────────
export function canAccess(user: User | null, page: string): boolean {
  if (!user) return false;
  return user.allowedPages.includes(page);
}
