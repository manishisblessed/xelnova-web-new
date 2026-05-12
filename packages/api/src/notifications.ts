import { api } from './client';
import { AxiosError } from 'axios';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

const EMPTY_NOTIFICATIONS = (page: number, limit: number) => ({
  notifications: [],
  unread: 0,
  pagination: { page, limit, total: 0, totalPages: 0 },
});

/** True when the request never reached a JSON error body (offline, API down, CORS, timeout). */
function isUnreachableOrUnauthenticated(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  if (error.response?.status === 401) return true;
  // No `response` → browser/network layer failure (Axios message is often "Network Error").
  return error.response == null;
}

export async function getNotifications(page = 1, limit = 20) {
  try {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data.data;
  } catch (error) {
    // Header polls every 30s — avoid console noise and Next.js dev overlays for cases where
    // we already degrade gracefully (empty notifications).
    if (isUnreachableOrUnauthenticated(error)) {
      return EMPTY_NOTIFICATIONS(page, limit);
    }
    console.error('[getNotifications]', extractErrorMessage(error, 'Failed to fetch notifications'));
    return EMPTY_NOTIFICATIONS(page, limit);
  }
}

export async function markAsRead(notificationId: string) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data.data;
}

export async function markAllAsRead() {
  const { data } = await api.post('/notifications/read-all');
  return data.data;
}

export async function registerPushToken(token: string, platform = 'web') {
  const { data } = await api.post('/notifications/push-token', { token, platform });
  return data.data;
}

// ─── Loyalty ───

export async function getLoyaltyBalance() {
  const { data } = await api.get('/loyalty/balance');
  return data.data;
}

export async function getLoyaltyLedger(page = 1) {
  const { data } = await api.get('/loyalty/ledger', { params: { page } });
  return data.data;
}

export async function redeemPoints(points: number) {
  const { data } = await api.post('/loyalty/redeem', { points });
  return data.data;
}

export async function getReferralCode() {
  const { data } = await api.get('/loyalty/referral');
  return data.data;
}

export async function getReferralStats() {
  const { data } = await api.get('/loyalty/referral/stats');
  return data.data;
}

export async function applyReferralCode(code: string) {
  const { data } = await api.post('/loyalty/referral/apply', { code });
  return data.data;
}
