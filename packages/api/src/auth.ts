import { api, setAccessToken } from './client';
import { AUTH_STORAGE_KEYS } from './auth-storage';
import { getTokenPersistence } from './token-persistence';
import type { ApiResponse, LoginResponse, AuthUser, BusinessRegisterResponse } from './types';

async function storeSession(result: LoginResponse) {
  setAccessToken(result.accessToken);
  const tp = getTokenPersistence();
  if (tp) {
    await tp.setTokens(result.accessToken, result.refreshToken, result.user);
  } else if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken(), result.refreshToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.user(), JSON.stringify(result.user));
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
  const result = data.data;
  await storeSession(result);
  return result;
}

export async function register(name: string, email: string, password: string, phone?: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', { name, email, password, phone });
  const result = data.data;
  await storeSession(result);
  return result;
}

export async function loginBusiness(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/business/login', { email, password });
  const result = data.data;
  await storeSession(result);
  return result;
}

export async function registerBusiness(payload: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  legalName?: string;
  gstin?: string;
}): Promise<BusinessRegisterResponse> {
  const { data } = await api.post<ApiResponse<BusinessRegisterResponse>>('/business/register', payload);
  const result = data.data;
  await storeSession(result);
  if (typeof window !== 'undefined') {
    localStorage.setItem('xelnova-business-org-id', result.organization.id);
  }
  return result;
}

export async function sendOtp(phone: string) {
  const { data } = await api.post<ApiResponse<{ message: string; otp?: string }>>('/auth/send-otp', { phone });
  return data.data;
}

export interface VerifyOtpResponse {
  isNewUser: boolean;
  phone?: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  hasSellerProfile?: boolean;
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', { phone, otp });
  const result = data.data;
  if (result.accessToken) {
    if (result.refreshToken && result.user) {
      await storeSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } else {
      setAccessToken(result.accessToken);
      const tp = getTokenPersistence();
      if (tp && result.refreshToken && result.user) {
        await tp.setTokens(result.accessToken, result.refreshToken, result.user);
      } else if (typeof window !== 'undefined') {
        if (result.refreshToken) localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken(), result.refreshToken);
        if (result.user) localStorage.setItem(AUTH_STORAGE_KEYS.user(), JSON.stringify(result.user));
      }
    }
  }
  return result;
}

export async function completePhoneRegistration(phone: string, name: string, email: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/complete-phone-registration', { phone, name, email });
  const result = data.data;
  await storeSession(result);
  return result;
}

export async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const tp = getTokenPersistence();
  const refreshToken = tp
    ? await tp.getRefreshToken()
    : typeof window !== 'undefined'
      ? localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken())
      : null;
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
  const result = data.data;
  setAccessToken(result.accessToken);
  if (tp) {
    const userJson = await tp.getUserJson();
    const user = userJson
      ? (JSON.parse(userJson) as AuthUser)
      : ({ email: '' } as AuthUser);
    await tp.setTokens(result.accessToken, result.refreshToken, user);
  } else if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken(), result.refreshToken);
  }
  return result;
}

export async function logout() {
  const tp = getTokenPersistence();
  const refreshToken = tp
    ? await tp.getRefreshToken()
    : typeof window !== 'undefined'
      ? localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken())
      : null;
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {}
  }
  setAccessToken(null);
  if (tp) {
    await tp.clear().catch(() => {});
  } else if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken());
    localStorage.removeItem(AUTH_STORAGE_KEYS.user());
    localStorage.removeItem('xelnova-business-org-id');
  }
}

export function getStoredUser(): AuthUser | null {
  if (getTokenPersistence()) return null;
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.user());
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/** Call on native app launch after `configureTokenPersistence` to restore user + access token. */
export async function hydrateAuthFromPersistence(): Promise<AuthUser | null> {
  const tp = getTokenPersistence();
  if (!tp) return getStoredUser();
  const [access, json] = await Promise.all([tp.getAccessToken(), tp.getUserJson()]);
  if (access) setAccessToken(access);
  if (!json) return null;
  try {
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
  return data.data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, newPassword });
  return data.data;
}
