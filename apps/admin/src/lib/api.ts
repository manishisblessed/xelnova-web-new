const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Header sent on EVERY admin request so the backend scopes auth lookups
 * (login, password reset, etc.) to the ADMIN row only — even if the same
 * email also exists as a CUSTOMER or SELLER account.
 */
const APP_ROLE_HEADER: Record<string, string> = { 'X-App-Role': 'ADMIN' };

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...APP_ROLE_HEADER }
    : { ...APP_ROLE_HEADER };
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/session/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryHeaders = { ...authHeaders() };
      const existing = init?.headers;
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        Object.assign(retryHeaders, existing, { Authorization: retryHeaders.Authorization });
      }
      return fetch(input, { ...init, headers: retryHeaders });
    }
  }
  return res;
}

/**
 * Centralized handler for an expired / invalid admin session. Called whenever
 * the backend returns 401 (or an explicit "Invalid or expired token" message)
 * so that the admin is sent back to the login screen instead of being left
 * staring at a dashboard whose API calls all silently fail.
 *
 * We use a module-level guard so a burst of parallel requests (the dashboard
 * fires many on mount) doesn't trigger a flurry of toasts/redirects.
 */
let sessionExpiredHandled = false;

function looksLikeExpiredSession(status: number, message?: string): boolean {
  if (status === 401) return true;
  if (status === 403) return false;
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('expired token') ||
    lower.includes('invalid token') ||
    lower.includes('jwt expired')
  );
}

function handleSessionExpired(message?: string) {
  if (typeof window === 'undefined') return;
  if (sessionExpiredHandled) return;
  if (window.location.pathname.startsWith('/login')) return;
  sessionExpiredHandled = true;

  try {
    localStorage.removeItem('xelnova-dashboard-user');
  } catch {
    // ignore
  }

  fetch('/api/session', { method: 'DELETE', credentials: 'include' }).catch(() => undefined);

  try {
    import('sonner').then(({ toast }) => {
      toast.error(message || 'Your session has expired. Please log in again.');
    }).catch(() => undefined);
  } catch {
    // ignore
  }

  if (!window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  let json: { message?: string; data?: T; success?: boolean };
  if (ct.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      if (looksLikeExpiredSession(res.status)) handleSessionExpired();
      throw new Error('Invalid response from server');
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      if (looksLikeExpiredSession(res.status, text)) {
        handleSessionExpired();
        throw new Error('Your session has expired. Please log in again.');
      }
      throw new Error(
        res.status === 404
          ? 'API endpoint not found. Ensure the API gateway is deployed with the latest routes.'
          : text.slice(0, 200) || `Request failed (${res.status})`,
      );
    }
    throw new Error('Unexpected response from server');
  }
  if (!res.ok) {
    if (looksLikeExpiredSession(res.status, json.message)) {
      handleSessionExpired(json.message);
      throw new Error(json.message || 'Your session has expired. Please log in again.');
    }
    throw new Error(json.message || 'Request failed');
  }
  return json.data as T;
}

// ─── Auth ───

export async function apiLogin(email: string, password: string) {
  const res = await fetchWithRefresh(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...APP_ROLE_HEADER },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ user: any; accessToken: string; refreshToken: string; mustChangePassword?: boolean }>(res);
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  const res = await fetchWithRefresh(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse<{ message: string }>(res);
}

// ─── Dashboard ───

export async function apiDashboard() {
  const res = await fetchWithRefresh(`${API_URL}/admin/dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Logs ───

export async function apiLogs(type: string, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/logs/${type}${q}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) {
    if (looksLikeExpiredSession(res.status, json?.message)) {
      handleSessionExpired(json?.message);
    }
    throw new Error(json.message || 'Request failed');
  }
  // Some log routes return `{ success, data }`; others spread `{ logs, pagination }` etc.
  if (json.data !== undefined && json.data !== null) return json.data;
  const { success: _s, message: _m, ...rest } = json;
  return rest;
}

// ─── Generic admin CRUD ───

export async function apiGet<T = unknown>(section: string, params?: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetchWithRefresh(`${API_URL}/admin/${section}?${query}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiCreate<T = unknown>(section: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetchWithRefresh(`${API_URL}/admin/${section}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiUpdate<T = unknown>(section: string, id: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetchWithRefresh(`${API_URL}/admin/${section}/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(section: string, id: string): Promise<void> {
  const res = await fetchWithRefresh(`${API_URL}/admin/${section}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

/** Full product payload (descriptions, images, variants, specs) for admin review. */
export async function apiGetAdminProduct<T = unknown>(id: string): Promise<T> {
  const res = await fetchWithRefresh(`${API_URL}/admin/products/${id}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

/**
 * 360° view of a single customer/seller account — orders, return requests,
 * support tickets and wallet (with recent transactions). Backed by
 * GET /admin/customers/:id.
 */
export async function apiGetAdminCustomerDetail<T = unknown>(id: string): Promise<T> {
  const res = await fetchWithRefresh(`${API_URL}/admin/customers/${id}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetchWithRefresh(`${API_URL}/admin/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

// ─── Revenue ───

export async function apiRevenue(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/revenue${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Activity ───

export async function apiActivity(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/activity${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiPatchSiteSettings(body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/admin/settings`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ─── Tickets ───

export async function apiGetTickets(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '50', ...params });
  const res = await fetchWithRefresh(`${API_URL}/tickets/admin?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetTicketDetail(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/admin/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiReplyTicket(id: string, message: string, isInternal = false) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/admin/${id}/reply`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, isInternal }),
  });
  return handleResponse(res);
}

export async function apiForwardTicket(
  id: string,
  body: { sellerId?: string; note?: string },
) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/admin/${id}/forward`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateTicketStatus(id: string, status: string, priority?: string) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/admin/${id}/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, priority }),
  });
  return handleResponse(res);
}

export async function apiUpdateShipment(orderId: string, body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/admin/orders/${orderId}/shipment`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ─── Reports ───

export async function apiGetGstReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/gst${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadGstCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/gst/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gst-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function apiGetTdsReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/tds${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadTdsCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/tds/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tds-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function apiGetRefundReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/refunds${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Refund CSV ───

export async function apiDownloadRefundCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/refunds/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'refund-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Sales Report ───

export async function apiGetSalesReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/sales${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadSalesCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/sales/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sales-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Inventory Report ───

export async function apiGetInventoryReport() {
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/inventory`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadInventoryCsv() {
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/inventory/csv`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'inventory-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Seller Performance Report ───

export async function apiGetSellerPerformanceReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/sellers${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadSellerPerformanceCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/sellers/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'seller-performance-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Coupon Usage Report ───

export async function apiGetCouponUsageReport(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/coupons${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadCouponUsageCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/admin/reports/coupons/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'coupon-usage-report.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Duplicates & Pricing ───

export async function apiScanDuplicates() {
  const res = await fetchWithRefresh(`${API_URL}/admin/duplicates`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiHideDuplicate(productId: string) {
  const res = await fetchWithRefresh(`${API_URL}/admin/duplicates/${productId}/hide`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiScanPricing() {
  const res = await fetchWithRefresh(`${API_URL}/admin/pricing-flags`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Split Payment / Advance Payout ───

export async function apiCreateAdvancePayout(body: { sellerId: string; amount: number; orderId?: string; note?: string }) {
  const res = await fetchWithRefresh(`${API_URL}/admin/payouts/advance`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiGetSellerShares(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/admin/orders/${orderId}/seller-shares`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSettleOrder(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/admin/orders/${orderId}/settle`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Reverse Pickup ───

export async function apiScheduleReversePickup(returnId: string, body: { courier: string; awb?: string; trackingUrl?: string; pickupDate?: string }) {
  const res = await fetchWithRefresh(`${API_URL}/returns/${returnId}/reverse-pickup`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ─── Abandoned Cart ───

export async function apiGetAbandonedCarts(hours = 24) {
  const res = await fetchWithRefresh(`${API_URL}/admin/notifications/abandoned-carts?hours=${hours}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSendAbandonedCartReminders(hours = 24) {
  const res = await fetchWithRefresh(`${API_URL}/admin/notifications/abandoned-carts/send-reminders?hours=${hours}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiGetAbandonedCartStats() {
  const res = await fetchWithRefresh(`${API_URL}/admin/notifications/abandoned-carts/stats`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Fraud Detection ───

export async function apiGetFraudFlags(page = 1, all = false) {
  const res = await fetchWithRefresh(`${API_URL}/admin/notifications/fraud-flags?page=${page}&all=${all}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiReviewFraudFlag(flagId: string, body: { status: 'CLEARED' | 'BLOCKED'; adminNote: string }) {
  const res = await fetchWithRefresh(`${API_URL}/admin/notifications/fraud-flags/${flagId}/review`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ─── COD Risk ───

export async function apiAssessCodRisk(userId: string, amount: number) {
  const res = await fetchWithRefresh(`${API_URL}/cod/risk/${userId}?amount=${amount}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Reviews ───

export async function apiGetReviews(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '50', ...params });
  const res = await fetchWithRefresh(`${API_URL}/admin/reviews?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetPendingReviews(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '50', ...params });
  const res = await fetchWithRefresh(`${API_URL}/admin/reviews/pending?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiApproveReview(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/admin/reviews/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiRejectReview(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/admin/reviews/${id}/reject`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}
