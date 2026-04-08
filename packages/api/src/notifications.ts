import { api } from './client';

export async function getNotifications(page = 1, limit = 20) {
  const { data } = await api.get('/notifications', { params: { page, limit } });
  return data.data;
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
