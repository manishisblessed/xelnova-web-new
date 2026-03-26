const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** Session JWT from httpOnly-style dashboard cookie (set by `/api/session`). */
export function getDashboardToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getToken(): string | null {
  return getDashboardToken();
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login?error=' + encodeURIComponent('Session expired. Please sign in again.');
      throw new Error('Session expired');
    }
    throw new Error(json.message || 'Request failed');
  }
  return json.data;
}

// ─── Auth ───

export interface LoginResponse {
  user: { id: string; name: string; email: string; phone?: string | null; avatar?: string | null; role: string };
  accessToken: string;
  refreshToken: string;
  /** Present when backend supports it; false means user must complete seller registration/onboarding. */
  hasSellerProfile?: boolean;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function apiSellerRegistrationStatus() {
  const res = await fetch(`${API_URL}/seller/registration-status`, { headers: authHeaders() });
  return handleResponse<{
    hasSellerProfile: boolean;
    onboardingStatus?: string | null;
    onboardingStep?: number | null;
    onboardingComplete?: boolean;
  }>(res);
}

// ─── Dashboard ───

export async function apiDashboard() {
  const res = await fetch(`${API_URL}/seller/dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Products ───

export async function apiGetProducts(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetch(`${API_URL}/seller/products?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetProduct(id: string) {
  const res = await fetch(`${API_URL}/seller/products/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreateProduct(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/seller/products`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateProduct(id: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/seller/products/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteProduct(id: string) {
  const res = await fetch(`${API_URL}/seller/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Orders ───

export async function apiGetOrders(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetch(`${API_URL}/seller/orders?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiUpdateOrderStatus(orderId: string, status: string) {
  const res = await fetch(`${API_URL}/seller/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

// ─── Revenue & Analytics ───

export async function apiGetRevenue(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${API_URL}/seller/revenue${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetAnalytics() {
  const res = await fetch(`${API_URL}/seller/analytics`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Upload ───

export async function apiUploadImage(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/upload/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<{ url: string; publicId: string }>(res);
}

export async function apiDeleteImage(publicId: string): Promise<void> {
  const res = await fetch(`${API_URL}/upload/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ─── Profile ───

export async function apiGetProfile() {
  const res = await fetch(`${API_URL}/seller/profile`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiUpdateProfile(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/seller/profile`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}
