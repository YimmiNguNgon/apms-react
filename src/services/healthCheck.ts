import { API_BASE_URL } from './api';

const DEFAULT_HEALTH_TIMEOUT_MS = 3500;

/**
 * Checks whether the APMS backend server is reachable and responsive.
 * Uses the lightweight public /health endpoint.
 */
export async function checkBackendAvailability(timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS): Promise<boolean> {
  const apiHealthUrl = `${API_BASE_URL}/health`;
  const rootHealthUrl = `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`;

  const probe = async (url: string): Promise<boolean> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });
      window.clearTimeout(timer);
      return res.ok;
    } catch {
      window.clearTimeout(timer);
      return false;
    }
  };

  // Try the primary API health endpoint first
  const apiAvailable = await probe(apiHealthUrl);
  if (apiAvailable) {
    return true;
  }

  // Fallback to root /health endpoint if different
  if (rootHealthUrl !== apiHealthUrl) {
    const rootAvailable = await probe(rootHealthUrl);
    if (rootAvailable) {
      return true;
    }
  }

  return false;
}
