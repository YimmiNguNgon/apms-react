export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:18085/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'apms-token',
  refreshToken: 'apms-refresh-token',
  user: 'apms-user',
  legacyAccessToken: 'accessToken',
  legacyUser: 'currentUser',
} as const;

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRedirect?: boolean;
  retryOn401?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

const isJsonResponse = (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json');
};

const readJson = async <T>(response: Response): Promise<T | null> => {
  if (!isJsonResponse(response)) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const getToken = () =>
  localStorage.getItem(STORAGE_KEYS.accessToken) ||
  localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

const getRefreshToken = () => localStorage.getItem(STORAGE_KEYS.refreshToken);

export const clearAuthSession = () => {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken);
  localStorage.removeItem(STORAGE_KEYS.legacyUser);
};

export const storeAuthSession = (session: {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
}) => {
  localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
  localStorage.setItem(STORAGE_KEYS.legacyAccessToken, session.accessToken);

  if (session.refreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
  }

  if (session.user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
    localStorage.setItem(STORAGE_KEYS.legacyUser, JSON.stringify(session.user));
  }
};

const refreshSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const payload = await readJson<ApiResponse<{
      accessToken: string;
      refreshToken: string;
      id: number;
      email: string;
      roles: string[];
    }>>(response);

    if (!response.ok || !payload?.success || !payload.data?.accessToken) {
      return false;
    }

    storeAuthSession({
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
    });

    return true;
  } catch {
    return false;
  }
};

const buildUrl = (endpoint: string, params?: FetchOptions['params']) => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${normalizedEndpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const parseErrorMessage = (payload: any, fallback: string) => {
  if (!payload) return fallback;
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (typeof payload.title === 'string' && payload.title.trim()) return payload.title;
  return fallback;
};

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const {
    params,
    skipAuthRedirect,
    retryOn401,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: inputHeaders,
    body,
    signal: inputSignal,
    ...fetchOptions
  } = options;
  const url = buildUrl(endpoint, params);
  const headers = new Headers(inputHeaders);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (inputSignal) {
    if (inputSignal.aborted) {
      controller.abort();
    } else {
      inputSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  if (!headers.has('Content-Type') && !(body instanceof FormData) && body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`, 408);
    }
    throw error;
  }

  clearTimeout(timeoutId);

  if (response.status === 401 && !skipAuthRedirect && !retryOn401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(endpoint, { ...options, retryOn401: true });
    }

    clearAuthSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  const payload = await readJson<ApiResponse<T> | { message?: string; success?: boolean; data?: T }>(response);

  if (!response.ok) {
    const message = parseErrorMessage(payload, 'An unexpected error occurred.');
    throw new ApiError(message, response.status, payload);
  }

  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload as ApiResponse<T>;
  }

  return {
    success: true,
    data: payload as T,
  };
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
