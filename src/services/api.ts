const BASE_URL = 'http://localhost:8082/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  skipAuthRedirect?: boolean; // set true for login endpoint to avoid reload loop
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  let url = `${BASE_URL}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  }

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('apms-token') || localStorage.getItem('accessToken');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const { skipAuthRedirect, params, ...fetchOptions } = options;

  const response = await fetch(url, { ...fetchOptions, headers });

  // 401 on non-auth endpoints = session expired → clear & reload
  if (response.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('apms-token');
    localStorage.removeItem('apms-user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    window.location.reload();
    throw new Error('Phiên làm việc hết hạn, vui lòng đăng nhập lại.');
  }

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.message || 'Đã có lỗi xảy ra từ máy chủ.');
  }

  return resJson;
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
