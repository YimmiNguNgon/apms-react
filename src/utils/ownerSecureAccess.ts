import type { StepUpVerifyResponse } from '../API/totpApi';

const STORAGE_KEY = 'apms-owner-secure-session';

export interface OwnerSecureAccessSession {
  token: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}

export const ownerSecureAccess = {
  get(): OwnerSecureAccessSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as OwnerSecureAccessSession;
      if (!parsed.token) return null;
      if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
        this.clear();
        return null;
      }
      return parsed;
    } catch {
      this.clear();
      return null;
    }
  },

  save(response: StepUpVerifyResponse): OwnerSecureAccessSession {
    const session: OwnerSecureAccessSession = {
      token: response.stepUpToken,
      expiresAt: response.expiresAt,
      expiresInSeconds: response.expiresInSeconds,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('owner-secure-access-changed'));
    return session;
  },

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('owner-secure-access-changed'));
  },
};
