const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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
  const token = getToken();
  const res = await fetch(`${API_URL}/api/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch');
  return json.data;
}
