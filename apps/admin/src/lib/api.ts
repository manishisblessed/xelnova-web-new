const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json.data;
}

// ─── Auth ───

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ user: any; accessToken: string; refreshToken: string }>(res);
}

// ─── Dashboard ───

export async function apiDashboard() {
  const res = await fetch(`${API_URL}/admin/dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Logs ───

export async function apiLogs(type: string, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${API_URL}/logs/${type}${q}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  // Some log routes return `{ success, data }`; others spread `{ logs, pagination }` etc.
  if (json.data !== undefined && json.data !== null) return json.data;
  const { success: _s, message: _m, ...rest } = json;
  return rest;
}

// ─── Generic admin CRUD ───

export async function apiGet<T = unknown>(section: string, params?: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetch(`${API_URL}/admin/${section}?${query}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiCreate<T = unknown>(section: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}/admin/${section}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiUpdate<T = unknown>(section: string, id: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}/admin/${section}/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(section: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/${section}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ─── Revenue ───

export async function apiRevenue(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${API_URL}/admin/revenue${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Activity ───

export async function apiActivity(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${API_URL}/admin/activity${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiPatchSiteSettings(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/admin/settings`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}
