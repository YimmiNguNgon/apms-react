import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearAuthSession, STORAGE_KEYS, storeAuthSession } from '../services/api';
import { loginApi } from '../API/loginApi';

export const ROLES = {
  ADMIN: 'ROLE_ADMIN',
  DIRECTOR: 'ROLE_DIRECTOR',
  MANAGER: 'ROLE_MANAGER',
  KEY_MEMBER: 'ROLE_KEY_MEMBER',
  STAFF: 'ROLE_STAFF',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_PAGES: Record<Role, string[]> = {
  [ROLES.ADMIN]: ['admin-dashboard', 'users', 'roles', 'permissions', 'access-control', 'activity-history', 'audit-logs', 'system-settings', 'security-settings', 'profile', 'project-management', 'project-detail'],
  [ROLES.DIRECTOR]: ['director-dashboard', 'partner-ecosystem', 'competitor-intelligence', 'relationship-map', 'market-opportunities', 'ai-recommendations', 'strategic-reports', 'companies', 'company-profiles', 'company-detail', 'news', 'profile', 'project-management', 'project-detail'],
  [ROLES.MANAGER]: ['manager-dashboard', 'partner-evaluation', 'competitor-intelligence', 'company-assignment', 'analysis-history', 'risk-monitoring', 'partner-status', 'suggested-actions-approval', 'team-kpi', 'reports', 'companies', 'company-profiles', 'company-detail', 'verify', 'news', 'profile', 'project-management', 'project-detail'],
  [ROLES.KEY_MEMBER]: ['keymember-dashboard', 'review-extracted-data', 'company-validation', 'partner-classification', 'competitor-classification', 'ai-suggestion-review', 'relationship-updates', 'onboarding-support', 'companies', 'company-profiles', 'company-detail', 'validate', 'profile'],
  [ROLES.STAFF]: ['staff-dashboard', 'my-tasks', 'project-management', 'project-detail', 'upload-documents', 'candidate-review', 'company-profiles', 'partner-management', 'competitor-management', 'ai-extracted-data', 'search-companies', 'personal-ai-agent', 'ai-training-mode', 'learning-center', 'companies', 'company-detail', 'add-company', 'ai-agent', 'news', 'profile'],
};

export const ROLE_DEFAULT_PAGE: Record<Role, string> = {
  [ROLES.ADMIN]: 'admin-dashboard',
  [ROLES.DIRECTOR]: 'director-dashboard',
  [ROLES.MANAGER]: 'manager-dashboard',
  [ROLES.KEY_MEMBER]: 'keymember-dashboard',
  [ROLES.STAFF]: 'staff-dashboard',
};

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: Role;
  roleName: string;
  avatar: string;
  avatarColor: string;
  allowedPages: string[];
}

const ROLE_COLORS: Record<Role, string> = {
  [ROLES.ADMIN]: 'linear-gradient(135deg, #64748b, #475569)',
  [ROLES.DIRECTOR]: 'linear-gradient(135deg, #10B981, #059669)',
  [ROLES.MANAGER]: 'linear-gradient(135deg, #F59E0B, #D97706)',
  [ROLES.KEY_MEMBER]: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  [ROLES.STAFF]: 'linear-gradient(135deg, #3B82F6, #2563EB)',
};

const toDisplayName = (email: string) => {
  const local = email.split('@')[0] || 'user';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'User';
};

const toAvatar = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

const mapBackendRoles = (id: number, email: string, backendRoles: string[]): User => {
  const roles = backendRoles.join(',').toUpperCase();
  const role = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN') || roles.includes('OWNER')
    ? ROLES.ADMIN
    : roles.includes('DIRECTOR')
      ? ROLES.DIRECTOR
      : roles.includes('MANAGER')
        ? ROLES.MANAGER
        : roles.includes('KEY_MEMBER')
          ? ROLES.KEY_MEMBER
          : roles.includes('RESEARCH_STAFF') || roles.includes('BUSINESS_DEVELOPMENT_STAFF')
            ? ROLES.STAFF
            : ROLES.STAFF;

  const roleName =
    role === ROLES.ADMIN ? 'System Administrator' :
    role === ROLES.DIRECTOR ? 'Business Director' :
    role === ROLES.MANAGER ? 'BD Manager' :
    role === ROLES.KEY_MEMBER ? 'Key Member' :
    'Research Staff';

  const name = toDisplayName(email);

  return {
    id,
    username: email.split('@')[0] || email,
    email,
    name,
    role,
    roleName,
    avatar: toAvatar(name),
    avatarColor: ROLE_COLORS[role],
    allowedPages: ROLE_PAGES[role],
  };
};

interface UserContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  id: number;
  email: string;
  roles: string[];
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);
    const stored = localStorage.getItem('apms-user');

    if (!token) {
      clearAuthSession();
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as User;
        const normalized = {
          ...parsed,
          id: Number((parsed as any).id ?? 0),
          allowedPages: ROLE_PAGES[parsed.role] ?? parsed.allowedPages,
        };
        setCurrentUser(normalized);
        localStorage.setItem('apms-user', JSON.stringify(normalized));
      } catch {
        clearAuthSession();
        setCurrentUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const payload: LoginPayload | null = await loginApi.login(email, password || '');

      if (!payload || !payload.accessToken) return false;

      storeAuthSession({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });

      try {
        const projRes = await api.get<any>('/projects', { params: { page: 0, size: 1 } });
        if (projRes?.success && projRes.data?.content?.length > 0) {
          localStorage.setItem('apms-active-project', String(projRes.data.content[0].id));
        }
      } catch {}

      const user = mapBackendRoles(payload.id, payload.email || email, Array.isArray((payload as any).roles) ? (payload as any).roles : []);
      setCurrentUser(user);
      localStorage.setItem('apms-user', JSON.stringify(user));
      return true;
    } catch (err: any) {
      throw new Error(err?.message || 'Cannot connect to the server.');
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setCurrentUser(null);
    clearAuthSession();
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

export function canAccess(user: User | null, page: string): boolean {
  if (!user) return false;
  return user.allowedPages.includes(page);
}
