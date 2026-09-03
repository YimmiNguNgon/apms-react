import type { StepUpVerifyResponse } from '../API/totpApi';

const STORAGE_KEY_PREFIX = 'apms-secure-session';

export interface OwnerSecureAccessSession {
  token: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  accountId?: number | string;
}

const getStorageKey = (accountId?: number | string | null) => {
  return accountId ? `${STORAGE_KEY_PREFIX}_${accountId}` : STORAGE_KEY_PREFIX;
};

export const ownerSecureAccess = {
  get(accountId?: number | string | null): OwnerSecureAccessSession | null {
    try {
      const key = getStorageKey(accountId);
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as OwnerSecureAccessSession;
      if (!parsed.token) return null;
      if (accountId && parsed.accountId && String(parsed.accountId) !== String(accountId)) {
        this.clear(accountId);
        return null;
      }
      if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
        this.clear(accountId);
        return null;
      }
      return parsed;
    } catch {
      this.clear(accountId);
      return null;
    }
  },

  save(response: StepUpVerifyResponse, accountId?: number | string | null): OwnerSecureAccessSession {
    const session: OwnerSecureAccessSession = {
      token: response.stepUpToken,
      expiresAt: response.expiresAt,
      expiresInSeconds: response.expiresInSeconds,
      accountId: accountId ?? undefined,
    };
    const key = getStorageKey(accountId);
    sessionStorage.setItem(key, JSON.stringify(session));
    window.dispatchEvent(new Event('owner-secure-access-changed'));
    return session;
  },

  clear(accountId?: number | string | null) {
    sessionStorage.removeItem(getStorageKey(accountId));
    sessionStorage.removeItem('apms-owner-secure-session');
    sessionStorage.removeItem(STORAGE_KEY_PREFIX);
    window.dispatchEvent(new Event('owner-secure-access-changed'));
  },

  clearAll() {
    sessionStorage.removeItem('apms-owner-secure-session');
    sessionStorage.removeItem(STORAGE_KEY_PREFIX);
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith(STORAGE_KEY_PREFIX) || key === 'apms-owner-secure-session')) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
    window.dispatchEvent(new Event('owner-secure-access-changed'));
  },
};
