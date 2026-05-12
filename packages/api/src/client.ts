import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AUTH_STORAGE_KEYS } from './auth-storage';
import { getTokenPersistence } from './token-persistence';

let accessToken: string | null = null;

/** Override API base URL (e.g. Expo `EXPO_PUBLIC_API_URL` + `/api/v1`). */
let configuredBaseURL: string | null = null;

/**
 * Calling app's role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'BUSINESS'. Set once
 * on app init via `setAppRole()` and forwarded as `X-App-Role` on every
 * request. The backend uses this to scope per-role uniqueness on email/phone
 * — i.e. the seller portal logging into auth/login only ever resolves the
 * SELLER row, never the same person's separate CUSTOMER account.
 */
type AppRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'BUSINESS';
let appRole: AppRole | null = null;

export function setAppRole(role: AppRole | null) {
  appRole = role;
}

export function getAppRole(): AppRole | null {
  return appRole;
}

export function getApiBaseURL(): string {
  return (
    configuredBaseURL ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
    '/api/v1'
  );
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function createApiClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL:
      baseURL ||
      configuredBaseURL ||
      (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
      '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    // Avoid "Unexpected end of JSON input" when proxy/backend returns an empty body with JSON content-type.
    transformResponse: [
      (data: unknown, headers) => {
        if (data === '' || data == null) return {};
        if (typeof data !== 'string') return data;
        const trimmed = data.trim();
        if (trimmed === '') return {};
        const ct = headers && (headers['content-type'] || (headers as Record<string, string>)['Content-Type']);
        const looksJson =
          !ct ||
          String(ct).includes('application/json') ||
          (trimmed.startsWith('{') || trimmed.startsWith('['));
        if (!looksJson) return data;
        try {
          return JSON.parse(trimmed) as unknown;
        } catch {
          return data;
        }
      },
    ],
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const role = getAppRole();
    if (role && config.headers && !config.headers['X-App-Role']) {
      config.headers['X-App-Role'] = role;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const tp = getTokenPersistence();
          const refreshToken = tp
            ? await tp.getRefreshToken()
            : typeof window !== 'undefined'
              ? localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken())
              : null;

          if (refreshToken) {
            const role = getAppRole();
            const response = await axios.post(
              `${client.defaults.baseURL}/auth/refresh`,
              { refreshToken },
              role ? { headers: { 'X-App-Role': role } } : undefined,
            );

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
              response.data.data;

            setAccessToken(newAccessToken);
            if (tp) {
              const userJson = await tp.getUserJson();
              const user = userJson
                ? (JSON.parse(userJson) as import('./types').AuthUser)
                : ({ email: '' } as import('./types').AuthUser);
              await tp.setTokens(newAccessToken, newRefreshToken, user);
            } else if (typeof window !== 'undefined') {
              localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken(), newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return client(originalRequest);
          }
        } catch (refreshError: any) {
          const refreshStatus = refreshError?.response?.status;
          if (refreshStatus === 401 || refreshStatus === 403) {
            setAccessToken(null);
            const tp = getTokenPersistence();
            if (tp) {
              await tp.clear().catch(() => {});
            } else if (typeof window !== 'undefined') {
              localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken());
              localStorage.removeItem(AUTH_STORAGE_KEYS.user());
            }
          }
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const api = createApiClient();

export function setApiBaseURL(url: string | null) {
  configuredBaseURL = url?.trim() || null;
  api.defaults.baseURL =
    configuredBaseURL ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
    '/api/v1';
}
