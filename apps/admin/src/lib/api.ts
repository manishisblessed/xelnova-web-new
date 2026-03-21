const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiLogin(email: string, password: string, remember?: boolean) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Login failed');
  return json.data;
}

export async function apiDashboard() {
  const res = await fetch(`${API_URL}/api/dashboard`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch');
  return json.data;
}

export async function apiLogs(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : '';
  const res = await fetch(`${API_URL}/api/logs${q ? `?${q}` : ''}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch');
  return json.data;
}

// ─── Generic admin section CRUD ───

export async function apiGet<T = unknown>(section: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/admin/${section}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch');
  return json.data;
}

export async function apiCreate<T = unknown>(section: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}/api/admin/${section}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create');
  return json.data;
}

export async function apiUpdate<T = unknown>(section: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}/api/admin/${section}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update');
  return json.data;
}

export async function apiDelete(section: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/${section}?id=${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete');
}
