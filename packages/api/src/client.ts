import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function createApiClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
          const refreshToken = typeof window !== 'undefined'
            ? localStorage.getItem('xelnova-refresh-token')
            : null;

          if (refreshToken) {
            const response = await axios.post(
              `${client.defaults.baseURL}/auth/refresh`,
              { refreshToken },
            );

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
              response.data.data;

            setAccessToken(newAccessToken);
            if (typeof window !== 'undefined') {
              localStorage.setItem('xelnova-refresh-token', newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return client(originalRequest);
          }
        } catch {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('xelnova-refresh-token');
            localStorage.removeItem('xelnova-user');
          }
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const api = createApiClient();
