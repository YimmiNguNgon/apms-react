import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearAuthSession, STORAGE_KEYS, storeAuthSession } from '../services/api';
import type { PageResponse } from '../services/api';
import { loginApi, type VerificationPayload } from '../API/loginApi';
import { queryClient } from '../main';
import { ownerSecureAccess } from '../utils/ownerSecureAccess';
import { resetUrlToCleanLogin, AUTH_EXPIRED_EVENT } from '../utils/authNavigation';

// eslint-disable-next-line react-refresh/only-export-components
export const ROLES = {
  ADMIN: 'ROLE_ADMIN',
  OWNER: 'ROLE_BUSINESS_OWNER',
  MANAGER: 'ROLE_MANAGER',
  STAFF: 'ROLE_STAFF',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_PAGES: Record<Role, string[]> = {
  [ROLES.ADMIN]: ['admin-dashboard', 'users', 'roles', 'permissions', 'access-control', 'activity-history', 'audit-logs', 'system-settings', 'security-settings', 'crawler-control', 'profile', 'system-chat', 'ai-assistant', 'news', 'article-detail', 'company-profiles', 'companies', 'profile-visibility', 'company-detail', 'relationship-assessment-detail', 'partner-ecosystem', 'owner-profile', 'company-monitoring', 'owner-company-profile', 'admin-my-enterprise'],
  [ROLES.OWNER]: ['owner-dashboard', 'partner-ecosystem', 'competitor-intelligence', 'relationship-map', 'project-detail', 'company-profiles', 'companies', 'my-companies', 'company-detail', 'relationship-assessment-detail', 'news', 'article-detail', 'profile', 'system-chat', 'ai-assistant', 'owner-profile', 'owner-internal-news'],
  [ROLES.MANAGER]: ['manager-dashboard', 'partner-evaluation', 'competitor-intelligence', 'company-assignment', 'analysis-history', 'risk-monitoring', 'partner-status', 'suggested-actions-approval', 'team-kpi', 'reports', 'companies', 'my-companies', 'profile-visibility', 'company-profiles', 'company-detail', 'relationship-assessment-detail', 'partner-ecosystem', 'verify', 'news', 'article-detail', 'profile', 'project-management', 'project-detail', 'system-chat', 'ai-assistant', 'owner-profile', 'company-monitoring'],
  [ROLES.STAFF]: ['staff-dashboard', 'my-tasks', 'project-management', 'project-detail', 'upload-documents', 'candidate-review', 'partner-management', 'competitor-management', 'ai-extracted-data', 'search-companies', 'personal-ai-agent', 'ai-training-mode', 'learning-center', 'company-detail', 'relationship-assessment-detail', 'partner-ecosystem', 'add-company', 'ai-agent', 'ai-assistant', 'news', 'article-detail', 'profile', 'system-chat', 'owner-profile', 'staff-monitoring'],
};

// eslint-disable-next-line react-refresh/only-export-components
export const ROLE_DEFAULT_PAGE: Record<Role, string> = {
  [ROLES.ADMIN]: 'admin-dashboard',
  [ROLES.OWNER]: 'relationship-map',
  [ROLES.MANAGER]: 'manager-dashboard',
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
  phone?: string | null;
  department?: string | null;
  bio?: string | null;
  address?: string | null;
}

const ROLE_COLORS: Record<Role, string> = {
  [ROLES.ADMIN]: 'linear-gradient(135deg, #64748b, #475569)',
  [ROLES.OWNER]: 'linear-gradient(135deg, #A855F7, #7E22CE)',
  [ROLES.MANAGER]: 'linear-gradient(135deg, #F59E0B, #D97706)',
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

  if (roles === '' || backendRoles.length === 0) {
    console.error('[UserContext] No roles provided for user:', email, '— defaulting to STAFF. Contact admin if this is unexpected.');
  }

  const role = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN')
    ? ROLES.ADMIN
    : roles.includes('BUSINESS_OWNER') || roles.includes('OWNER') || roles.includes('DIRECTOR')
      ? ROLES.OWNER
      : roles.includes('MANAGER')
        ? ROLES.MANAGER
        : ROLES.STAFF;

  if (!roles.includes('SYSTEM_ADMIN') && !roles.includes('ADMIN') && !roles.includes('BUSINESS_OWNER') && !roles.includes('OWNER') &&
      !roles.includes('DIRECTOR') && !roles.includes('MANAGER') && !roles.includes('KEY_MEMBER') && !roles.includes('STAFF')) {
    console.error('[UserContext] Unrecognized role(s) for user:', email, '— received:', backendRoles, '— defaulting to STAFF. Contact admin.');
  }

  const roleName =
    role === ROLES.ADMIN ? 'System Administrator' :
    role === ROLES.OWNER ? 'Business Owner' :
    role === ROLES.MANAGER ? 'BD Manager' :
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
    allowedPages: [...ROLE_PAGES[role]],
  };
};

interface UserContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  applyLoginPayload: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateCurrentUser: (updates: Partial<User>) => void;
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

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const newName = updates.name !== undefined ? updates.name : prev.name;
      const newAvatar = updates.avatar || (updates.name ? toAvatar(newName) : prev.avatar);
      const updated: User = {
        ...prev,
        ...updates,
        name: newName,
        avatar: newAvatar,
      };
      localStorage.setItem('apms-user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const token =
      localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.legacyAccessToken);
    const stored = localStorage.getItem('apms-user');

    if (!token || !stored) {
      clearAuthSession();
      localStorage.removeItem('apms-active-page');
      localStorage.removeItem('apms-active-project');
      setCurrentUser(null);
      setLoading(false);
      resetUrlToCleanLogin();
      return;
    }

    try {
      const parsed = JSON.parse(stored) as User;
      const normalized = {
        ...parsed,
        id: Number(parsed.id ?? 0),
        allowedPages: [...(ROLE_PAGES[parsed.role] ?? [])],
      };
      setCurrentUser(normalized);
      localStorage.setItem('apms-user', JSON.stringify(normalized));
    } catch {
      clearAuthSession();
      localStorage.removeItem('apms-active-page');
      localStorage.removeItem('apms-active-project');
      setCurrentUser(null);
      resetUrlToCleanLogin();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      clearAuthSession();
      localStorage.removeItem('apms-active-page');
      localStorage.removeItem('apms-active-project');
      sessionStorage.clear();
      ownerSecureAccess.clearAll();
      queryClient.clear();
      resetUrlToCleanLogin();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const applyLoginPayload = async (payload: LoginPayload): Promise<boolean> => {
    if (!payload?.accessToken) return false;
    ownerSecureAccess.clearAll();
    storeAuthSession({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    try {
      const projRes = await api.get<PageResponse<{ id: number }>>('/projects', { params: { page: 0, size: 1 } });
      if (projRes?.success && projRes.data?.content?.length > 0) localStorage.setItem('apms-active-project', String(projRes.data.content[0].id));
    } catch { /* non-critical */ }
    const user = mapBackendRoles(payload.id, payload.email, Array.isArray(payload.roles) ? payload.roles : []);
    setCurrentUser(user); localStorage.setItem('apms-user', JSON.stringify(user)); queryClient.clear(); return true;
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const payload = await loginApi.login(email, password || '');
      if (!('accessToken' in payload)) return false;
      return applyLoginPayload(payload);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Cannot connect to the server.', { cause: err });
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setCurrentUser(null);
    clearAuthSession();
    localStorage.removeItem('apms-active-page');
    localStorage.removeItem('apms-active-project');
    sessionStorage.clear();
    ownerSecureAccess.clearAll();
    queryClient.clear();
    resetUrlToCleanLogin();
  };

  return (
    <UserContext.Provider value={{ currentUser, login, applyLoginPayload, logout, loading, updateCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export function canAccess(user: User | null, page: string): boolean {
  if (!user) return false;
  return user.allowedPages.includes(page);
}
