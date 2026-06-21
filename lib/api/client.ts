import { ApiError, ApiResponse, AuthTokens } from './types';

const BASE_URL = 'https://api.localdropshipping.gh.com/v1';

const TOKEN_KEY = 'ld_access_token';
const REFRESH_KEY = 'ld_refresh_token';

// ── Token helpers ──────────────────────────────────────────────────────────
export const tokenStore = {
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set: (tokens: AuthTokens): void => {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Token refresh (single in-flight guard) ─────────────────────────────────
let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshAccessToken(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) throw new ApiError(401, 'No refresh token available');

    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const json: ApiResponse<AuthTokens> = await res.json();
    if (!res.ok || !json.success) {
      tokenStore.clear();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    tokenStore.set(json.data);
    return json.data;
  })().finally(() => { refreshPromise = null; });

  return refreshPromise;
}

// ── Core request ───────────────────────────────────────────────────────────
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  /** Retry once after refreshing the access token on 401 */
  _retried?: boolean;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, skipAuth = false, _retried = false, ...rest } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (!skipAuth) {
    const token = tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: { ...headers, ...(rest.headers as Record<string, string> | undefined) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 → attempt token refresh once
  if (res.status === 401 && !skipAuth && !_retried) {
    try {
      await refreshAccessToken();
      return request<T>(path, { ...options, _retried: true });
    } catch {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  // Parse response
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`);
  }

  if (!res.ok || !json.success) {
    const raw = json as unknown as Record<string, unknown>;
    const msg = typeof raw['message'] === 'string' ? raw['message'] : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, json);
  }

  return json.data;
}

// Convenience methods
export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...opts }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body, ...opts }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body, ...opts }),

  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};
