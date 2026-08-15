import { API_BASE_URL, clearAuthSession, storeAuthSession } from '../services/api';

const BASE_URL = `${API_BASE_URL}/auth`;

type LoginPayload = {
  accessToken: string;
  refreshToken: string;
  id: number;
  email: string;
  roles: string[];
};

export type VerificationPayload = {
  requiresEmailVerification: true;
  verificationTicket: string;
  email?: string;
  emailDelivered?: boolean;
  emailDeliveryMessage?: string;
};

type AuthResponse = {
  success?: boolean;
  message?: string | null;
  data?: LoginPayload | VerificationPayload;
} | LoginPayload;

const getToken = () => localStorage.getItem('apms-token') || localStorage.getItem('accessToken');

const unwrapAuthPayload = (payload: AuthResponse | null): LoginPayload | VerificationPayload | null => {
  if (!payload) return null;
  if ('data' in payload && payload.data) return payload.data;
  if ('accessToken' in payload) return payload;
  return null;
};

const parseAuthPayload = async (response: Response): Promise<LoginPayload | VerificationPayload> => {
  const payload = await response.json().catch(() => null) as AuthResponse | null;

  if (response.status === 403 && payload && 'data' in payload && payload.data && 'requiresEmailVerification' in payload.data) {
    return payload.data as unknown as VerificationPayload;
  }
  if (!response.ok) {
    const message = payload && 'message' in payload ? payload.message : null;
    throw new Error(message || 'Failed to login');
  }

  const data = unwrapAuthPayload(payload) as LoginPayload | null;
  if (!data?.accessToken) {
    throw new Error('Login response did not include an access token.');
  }

  storeAuthSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data;
};

export const loginApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      return await parseAuthPayload(response);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },
  verifyEmailOtp: async (verificationTicket: string, otp: string) => {
    const response = await fetch(`${BASE_URL}/verify-email-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationTicket, otp }) });
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) throw new Error(payload?.message || 'Could not verify email.');
    return payload;
  },
  resendEmailOtp: async (verificationTicket: string) => {
    const response = await fetch(`${BASE_URL}/resend-email-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationTicket }) });
    const payload = await response.json().catch(() => null) as { data?: VerificationPayload; message?: string } | null;
    if (!response.ok || !payload?.data?.verificationTicket) throw new Error(payload?.message || 'Could not resend verification code.');
    return payload.data;
  },
};

export const logoutApi = {
  logout: async () => {
    try {
      const token = getToken();
      const response = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      const payload = await response.json();
      clearAuthSession();
      return payload;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },
};
