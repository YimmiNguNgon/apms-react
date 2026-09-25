/**
 * Utility for managing authentication routing and clean URL resets in APMS.
 */

export const AUTH_EXPIRED_EVENT = 'apms-auth-expired';

/**
 * Checks if the current window location corresponds to a public auth route
 * such as /forgot-password or /reset-password (which carries ?token=...).
 */
export const isPublicAuthRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/forgot-password' || path === '/reset-password';
};

/**
 * Resets the browser URL to a clean '/' without any protected hash or query parameters.
 * Preserves public auth pages like /forgot-password and /reset-password.
 * Uses window.history.replaceState to avoid adding duplicate history entries or reloading.
 */
export const resetUrlToCleanLogin = (): void => {
  if (typeof window === 'undefined') return;
  if (isPublicAuthRoute()) return;

  const { pathname, hash, search } = window.location;

  // Only replace if we are not already at clean '/'
  if (pathname !== '/' || hash !== '' || search !== '') {
    window.history.replaceState(null, '', '/');
  }
};

/**
 * Dispatches a global event notifying all app modules (UserContext, etc.)
 * that the current session has expired and authentication state should be reset.
 */
export const dispatchAuthExpired = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
};
