import { API_BASE_URL, clearAuthSession, storeAuthSession } from '../services/api';
import { resetUrlToCleanLogin } from '../utils/authNavigation';

const BASE_URL = `${API_BASE_URL}/auth`;

export type LoginPayload = {
  accessToken: string;
  refreshToken: string;
  id: number;
  email: string;
  roles: string[];
};

export type MfaChallengePayload = {
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
  challengeId: string;
  method?: string;
  qrCodeDataUrl?: string | null;
  manualEntryKey?: string | null;
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
  data?: LoginPayload | VerificationPayload | MfaChallengePayload;
} | LoginPayload;

const getToken = () => localStorage.getItem('apms-token') || localStorage.getItem('accessToken');

const unwrapAuthPayload = (payload: AuthResponse | null): LoginPayload | VerificationPayload | MfaChallengePayload | null => {
  if (!payload) return null;
  if ('data' in payload && payload.data) return payload.data;
  if ('accessToken' in payload) return payload;
  return null;
};

const parseAuthPayload = async (response: Response): Promise<LoginPayload | VerificationPayload | MfaChallengePayload> => {
  const payload = await response.json().catch(() => null) as AuthResponse | null;

  if (response.status === 403 && payload && 'data' in payload && payload.data && 'requiresEmailVerification' in payload.data) {
    return payload.data as unknown as VerificationPayload;
  }
  if (!response.ok) {
    const message = payload && 'message' in payload ? payload.message : null;
    throw new Error(message || 'Failed to login');
  }

  const data = unwrapAuthPayload(payload);
  if (data && 'mfaRequired' in data && (data as MfaChallengePayload).mfaRequired) {
    return data as MfaChallengePayload;
  }

  const loginData = data as LoginPayload | null;
  if (!loginData?.accessToken) {
    throw new Error('Login response did not include an access token.');
  }

  storeAuthSession({
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
  });

  return loginData;
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
  verifyMfa: async (challengeId: string, totpCode: string): Promise<LoginPayload> => {
    const response = await fetch(`${BASE_URL}/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ challengeId, totpCode }),
    });

    const payload = await response.json().catch(() => null) as { success?: boolean; message?: string; data?: LoginPayload } | null;
    if (!response.ok) {
      throw new Error(payload?.message || 'Invalid or expired verification code.');
    }

    const data = payload?.data || (payload as unknown as LoginPayload);
    if (!data?.accessToken) {
      throw new Error('Verification response did not include an access token.');
    }

    storeAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    return data;
  },
  cancelMfa: async (challengeId: string): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/mfa/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId }),
      });
    } catch {
      // Safe pre-auth cancellation
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('apms-active-page');
        localStorage.removeItem('apms-active-project');
      }
      resetUrlToCleanLogin();
      return payload;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },
};
