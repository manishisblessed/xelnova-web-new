import { api, setAccessToken } from './client';
import type { ApiResponse, LoginResponse, AuthUser } from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
  const result = data.data;
  setAccessToken(result.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('xelnova-refresh-token', result.refreshToken);
    localStorage.setItem('xelnova-user', JSON.stringify(result.user));
  }
  return result;
}

export async function register(name: string, email: string, password: string, phone?: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', { name, email, password, phone });
  const result = data.data;
  setAccessToken(result.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('xelnova-refresh-token', result.refreshToken);
    localStorage.setItem('xelnova-user', JSON.stringify(result.user));
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
  if (!result.isNewUser && result.accessToken) {
    setAccessToken(result.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xelnova-refresh-token', result.refreshToken!);
      localStorage.setItem('xelnova-user', JSON.stringify(result.user));
    }
  }
  return result;
}

export async function completePhoneRegistration(phone: string, name: string, email: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/complete-phone-registration', { phone, name, email });
  const result = data.data;
  setAccessToken(result.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('xelnova-refresh-token', result.refreshToken);
    localStorage.setItem('xelnova-user', JSON.stringify(result.user));
  }
  return result;
}

export async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('xelnova-refresh-token') : null;
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
  const result = data.data;
  setAccessToken(result.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('xelnova-refresh-token', result.refreshToken);
  }
  return result;
}

export async function logout() {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('xelnova-refresh-token') : null;
  if (refreshToken) {
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
  }
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('xelnova-refresh-token');
    localStorage.removeItem('xelnova-user');
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('xelnova-user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
