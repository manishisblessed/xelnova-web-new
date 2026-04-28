import { publicApiBase } from '@/lib/public-api-base';
import type { ProductAttributePresetsBundle } from '@/lib/product-attribute-presets';

const API_URL = publicApiBase();

/** Session JWT from httpOnly-style dashboard cookie (set by `/api/session`). */
export function getDashboardToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/xelnova-dashboard-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getToken(): string | null {
  return getDashboardToken();
}

/**
 * Header sent on EVERY request from the seller portal so the backend scopes
 * auth/login, OTP, register, etc. to the SELLER row only. A user who also
 * has a separate CUSTOMER row with the same email is a different account
 * and must never be returned here.
 */
const APP_ROLE_HEADER: Record<string, string> = { 'X-App-Role': 'SELLER' };

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

async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return fetch(input, { ...init, headers: authHeaders() });
    }
  }
  return res;
}

/** Public user profile (any authenticated role). Used e.g. seller /register to skip duplicate OTP when already verified. */
export async function apiGetUserProfile() {
  const res = await fetchWithRefresh(`${API_URL}/users/profile`, { headers: authHeaders() });
  return handleResponse<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    authProvider: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: string;
  }>(res);
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
  const res = await fetchWithRefresh(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...APP_ROLE_HEADER },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function apiSellerRegistrationStatus() {
  const res = await fetchWithRefresh(`${API_URL}/seller/registration-status`, { headers: authHeaders() });
  return handleResponse<{
    hasSellerProfile: boolean;
    sellerId?: string | null;
    onboardingStatus?: string | null;
    onboardingStep?: number | null;
    onboardingComplete?: boolean;
  }>(res);
}

// ─── Dashboard ───

export async function apiDashboard() {
  const res = await fetchWithRefresh(`${API_URL}/seller/dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Products ───

export async function apiGetProductAttributePresets(): Promise<ProductAttributePresetsBundle> {
  const res = await fetchWithRefresh(`${API_URL}/seller/product-attribute-presets`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetProducts(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetchWithRefresh(`${API_URL}/seller/products?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetProduct(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/products/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export type BrandListingHint =
  | { mode: 'empty' }
  | { mode: 'new_brand' }
  | { mode: 'direct' }
  | { mode: 'dealer_authorization_required'; message: string };

export async function apiGetBrandListingHint(brand: string) {
  const q = new URLSearchParams({ brand: brand.trim() });
  const res = await fetchWithRefresh(`${API_URL}/seller/brands/listing-hint?${q}`, { headers: authHeaders() });
  return handleResponse(res) as Promise<BrandListingHint>;
}

export async function apiCreateProduct(body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/seller/products`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateProduct(id: string, body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/seller/products/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteProduct(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Orders ───

export async function apiGetOrders(params?: Record<string, string>) {
  const query = new URLSearchParams({ limit: '100', ...params });
  const res = await fetchWithRefresh(`${API_URL}/seller/orders?${query}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiUpdateOrderStatus(orderId: string, status: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

// ─── Shipping ───

export async function apiShipOrder(orderId: string, body: {
  shippingMode: string;
  carrierName?: string;
  awbNumber?: string;
  weight?: number;
  dimensions?: string;
  /** Pickup date (YYYY-MM-DD, IST). When supplied for an integrated
   *  courier, the backend books the manifest AND the pickup request in
   *  one shot (per Delhivery's documented two-call flow). */
  pickupDate?: string;
  /** Pickup time (HH:mm or HH:mm:ss, IST). Defaults server-side to 14:00. */
  pickupTime?: string;
  /** Number of packages in this pickup batch (defaults to 1). */
  expectedPackageCount?: number;
  /** Which seller pickup location to dispatch from. Omit to use the
   *  seller's default location. */
  pickupLocationId?: string;
}) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/ship`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateShipmentAwb(orderId: string, body: {
  awbNumber: string;
  carrierName?: string;
  trackingUrl?: string;
}) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment/awb`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateShipmentStatus(orderId: string, body: {
  status: string;
  location?: string;
  remark?: string;
}) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiGetShipment(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiTrackShipment(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment/track`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiCancelShipment(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

/**
 * Ask the carrier (Xelgo → Delhivery) to send a rider on the chosen
 * date/time. Returns `{ success, message, scheduledFor?, pickupId? }`.
 */
export async function apiSchedulePickup(
  orderId: string,
  body: { pickupDate: string; pickupTime?: string; expectedPackageCount?: number },
) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/shipment/schedule-pickup`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<{
    success: boolean;
    message: string;
    pickupId?: string;
    scheduledFor?: string;
  }>(res);
}

// ─── Pickup Warehouse (per-seller, registered with Xelgo carrier) ───

export type PickupWarehouseStatus = {
  warehouseName: string;
  registered: boolean;
  registeredAt: string | null;
  lastError: string | null;
  addressOnFile: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  missingFields: string[];
  addressDriftedSinceRegistration: boolean;
  readyToRegister: boolean;
};

export async function apiGetPickupWarehouse() {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-warehouse`, {
    headers: authHeaders(),
  });
  return handleResponse<PickupWarehouseStatus>(res);
}

export async function apiRegisterPickupWarehouse() {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-warehouse/register`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<{
    warehouseName: string;
    alreadyRegistered: boolean;
    message: string;
  }>(res);
}

// ─── Pickup Locations (multi-warehouse) ───
//
// New model: every seller can register N pickup addresses, each one
// becomes its own warehouse on the carrier (Delhivery). One is
// `isDefault` and is used when the seller doesn't pick one explicitly
// on the Ship modal.

export type SellerPickupLocation = {
  id: string;
  label: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
  warehouseName: string | null;
  registered: boolean;
  registeredAt: string | null;
  lastError: string | null;
  addressDriftedSinceRegistration: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePickupLocationPayload = {
  label: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  addressLine: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  makeDefault?: boolean;
};

export type UpdatePickupLocationPayload = Partial<
  Omit<CreatePickupLocationPayload, 'makeDefault'>
>;

export async function apiListPickupLocations() {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations`, {
    headers: authHeaders(),
  });
  return handleResponse<SellerPickupLocation[]>(res);
}

export async function apiCreatePickupLocation(payload: CreatePickupLocationPayload) {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SellerPickupLocation>(res);
}

export async function apiUpdatePickupLocation(
  id: string,
  payload: UpdatePickupLocationPayload,
) {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SellerPickupLocation>(res);
}

export async function apiDeletePickupLocation(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function apiSetDefaultPickupLocation(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations/${id}/set-default`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<SellerPickupLocation>(res);
}

export async function apiRegisterPickupLocation(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/pickup-locations/${id}/register`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<SellerPickupLocation>(res);
}

export async function apiCheckServiceability(orderId: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/orders/${orderId}/serviceability`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Shipping Label ───

async function downloadPdfBlob(url: string, filename: string, fallbackMessage: string) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    let msg = fallbackMessage;
    try { msg = JSON.parse(text).message || msg; } catch { /* plain text error */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiDownloadShippingLabel(orderId: string) {
  await downloadPdfBlob(
    `${API_URL}/seller/orders/${orderId}/label`,
    `shipping-label-${orderId}.pdf`,
    'Failed to download label',
  );
}

/** Customer-format invoice PDF (per testing observation #7). */
export async function apiDownloadCustomerInvoice(orderId: string) {
  await downloadPdfBlob(
    `${API_URL}/seller/orders/${orderId}/invoice`,
    `invoice-${orderId}.pdf`,
    'Failed to download invoice',
  );
}

/**
 * Bulk download every customer invoice for a calendar month as one merged
 * PDF (per testing observation #23). When year/month are omitted, the
 * backend uses the current calendar month.
 */
export async function apiDownloadMonthlyInvoices(opts: { year?: number; month?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.year != null) params.set('year', String(opts.year));
  if (opts.month != null) params.set('month', String(opts.month));
  const qs = params.toString();
  const y = opts.year ?? new Date().getFullYear();
  const m = opts.month ?? new Date().getMonth() + 1;
  await downloadPdfBlob(
    `${API_URL}/seller/invoices/monthly${qs ? `?${qs}` : ''}`,
    `invoices-${y}-${String(m).padStart(2, '0')}.pdf`,
    'Failed to download monthly invoices',
  );
}

// ─── Courier Configs ───

export async function apiGetCourierConfigs() {
  const res = await fetchWithRefresh(`${API_URL}/seller/courier-configs`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiSaveCourierConfig(body: {
  provider: string;
  apiKey: string;
  apiSecret?: string;
  accountId?: string;
  warehouseId?: string;
  metadata?: Record<string, any>;
}) {
  const res = await fetchWithRefresh(`${API_URL}/seller/courier-configs`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateCourierConfig(provider: string, body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/seller/courier-configs/${provider}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteCourierConfig(provider: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/courier-configs/${provider}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Revenue & Analytics ───

export async function apiGetRevenue(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/seller/revenue${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetAnalytics() {
  const res = await fetchWithRefresh(`${API_URL}/seller/analytics`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Upload ───

export async function apiUploadImage(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetchWithRefresh(`${API_URL}/upload/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<{ url: string; publicId: string }>(res);
}

export async function apiUploadImages(files: File[]): Promise<{ url: string; publicId: string }[]> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  const res = await fetchWithRefresh(`${API_URL}/upload/images`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<{ url: string; publicId: string }[]>(res);
}

export async function apiDeleteImage(publicId: string): Promise<void> {
  const res = await fetchWithRefresh(`${API_URL}/upload/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ─── Wallet ───

export async function apiGetWalletBalance() {
  const res = await fetchWithRefresh(`${API_URL}/wallet/balance`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetWalletTransactions(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const res = await fetchWithRefresh(`${API_URL}/wallet/transactions?${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiRequestPayout(amount: number, notes?: string) {
  const res = await fetchWithRefresh(`${API_URL}/wallet/payout`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, notes }),
  });
  return handleResponse(res);
}

export interface BankDetails {
  id: string;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankVerified: boolean;
  bankVerifiedAt: string | null;
  bankVerifiedName: string | null;
  bankName: string | null;
  bankBranch: string | null;
}

export async function apiGetBankDetails(): Promise<BankDetails> {
  const res = await fetchWithRefresh(`${API_URL}/wallet/bank-details`, { headers: authHeaders() });
  return handleResponse<BankDetails>(res);
}

export interface PayoutResponse {
  success: boolean;
  message: string;
  payout: {
    id: string;
    amount: number;
    status: string;
    isAdvance: boolean;
    requestedAt: string;
  };
  newBalance: number;
  bankDetails: {
    accountNumber: string;
    bankName: string | null;
    accountHolder: string | null;
  };
}

export async function apiRequestManualPayout(
  amount: number,
  acceptedTerms: boolean,
  notes?: string,
): Promise<PayoutResponse> {
  const res = await fetchWithRefresh(`${API_URL}/wallet/payout/manual`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, acceptedTerms, notes }),
  });
  return handleResponse<PayoutResponse>(res);
}

export async function apiRequestAdvancePayout(
  percentage: number,
  acceptedTerms: boolean,
  notes?: string,
): Promise<PayoutResponse & { percentage: number; amount: number }> {
  const res = await fetchWithRefresh(`${API_URL}/wallet/payout/advance`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ percentage, acceptedTerms, notes }),
  });
  return handleResponse<PayoutResponse & { percentage: number; amount: number }>(res);
}

export interface PayoutHistoryItem {
  id: string;
  amount: number;
  status: string;
  method: string;
  note: string | null;
  isAdvance: boolean;
  requestedAt: string;
  paidAt: string | null;
}

export async function apiGetPayoutHistory(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const res = await fetchWithRefresh(`${API_URL}/wallet/payouts?${params}`, { headers: authHeaders() });
  return handleResponse<{
    payouts: PayoutHistoryItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(res);
}

// ─── Tickets ───

export async function apiGetSellerTickets() {
  const res = await fetchWithRefresh(`${API_URL}/tickets/seller`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetSellerTicketDetail(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/seller/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSellerReplyTicket(id: string, message: string) {
  const res = await fetchWithRefresh(`${API_URL}/tickets/seller/${id}/reply`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return handleResponse(res);
}

// ─── Bulk Upload ───

export async function apiBulkUploadProducts(rows: Record<string, string>[]) {
  const res = await fetchWithRefresh(`${API_URL}/seller/products/bulk-upload`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  return handleResponse(res);
}

// ─── Inventory Alerts ───

export async function apiGetInventoryAlerts() {
  const res = await fetchWithRefresh(`${API_URL}/seller/inventory-alerts`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSendInventoryAlerts() {
  const res = await fetchWithRefresh(`${API_URL}/seller/inventory-alerts/notify`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Brand Proposal ───

export async function apiProposeBrand(name: string, logo?: string, authorizationCertificate?: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/brands/propose`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, logo, authorizationCertificate }),
  });
  return handleResponse(res);
}

export async function apiGetSellerBrands() {
  const res = await fetchWithRefresh(`${API_URL}/seller/brands`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Seller Coupons ───

export async function apiGetSellerCoupons() {
  const res = await fetchWithRefresh(`${API_URL}/seller/coupons`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreateSellerCoupon(body: {
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validUntil?: string;
  usageLimit?: number;
  scope?: string;
}) {
  const res = await fetchWithRefresh(`${API_URL}/seller/coupons`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateSellerCoupon(id: string, body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/seller/coupons/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteSellerCoupon(id: string) {
  const res = await fetchWithRefresh(`${API_URL}/seller/coupons/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Settlement Reports ───

export async function apiGetSettlement(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/seller/settlement${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDownloadSettlementCsv(params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetchWithRefresh(`${API_URL}/seller/settlement/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to download CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settlement-report.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Sales Analytics ───

export async function apiGetSalesAnalytics(period?: string) {
  const q = period ? `?period=${period}` : '';
  const res = await fetchWithRefresh(`${API_URL}/seller/sales-analytics${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Profile ───

export async function apiGetProfile() {
  const res = await fetchWithRefresh(`${API_URL}/seller/profile`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiUpdateProfile(body: Record<string, unknown>) {
  const res = await fetchWithRefresh(`${API_URL}/seller/profile`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ─── Public Settings ───

export interface ShippingRates {
  weightSlabs: { upToKg: number; rate: number }[];
  dimensionSlabs: { upToCm3: number; rate: number }[];
  baseCurrency: string;
}

export async function apiGetShippingRates(): Promise<ShippingRates> {
  const res = await fetchWithRefresh(`${API_URL}/products/shipping-rates`);
  return handleResponse<ShippingRates>(res);
}

// ─── Store Settings (Brand Store) ───

export interface SellerStoreBanner {
  id: string;
  title: string | null;
  imageUrl: string;
  mobileUrl: string | null;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface StoreSettings {
  heroBannerUrl: string | null;
  heroBannerMobile: string | null;
  aboutTitle: string | null;
  aboutDescription: string | null;
  storeThemeColor: string | null;
  featuredProductIds: string[];
  storeBanners: SellerStoreBanner[];
  availableProducts: { id: string; name: string; images: string[]; price: number }[];
  storeUrl: string;
}

export async function apiGetStoreSettings(): Promise<StoreSettings> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store`, { headers: authHeaders() });
  return handleResponse<StoreSettings>(res);
}

export async function apiUpdateStoreSettings(data: {
  heroBannerUrl?: string;
  heroBannerMobile?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  storeThemeColor?: string;
}): Promise<void> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiUpdateFeaturedProducts(productIds: string[]): Promise<void> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store/featured-products`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });
  return handleResponse(res);
}

export async function apiCreateStoreBanner(data: {
  title?: string;
  imageUrl: string;
  mobileUrl?: string;
  link?: string;
  sortOrder?: number;
}): Promise<SellerStoreBanner> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store/banners`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<SellerStoreBanner>(res);
}

export async function apiUpdateStoreBanner(
  id: string,
  data: {
    title?: string;
    imageUrl?: string;
    mobileUrl?: string;
    link?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<SellerStoreBanner> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store/banners/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<SellerStoreBanner>(res);
}

export async function apiDeleteStoreBanner(id: string): Promise<void> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store/banners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiReorderStoreBanners(bannerIds: string[]): Promise<SellerStoreBanner[]> {
  const res = await fetchWithRefresh(`${API_URL}/seller/store/banners/reorder`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ bannerIds }),
  });
  return handleResponse<SellerStoreBanner[]>(res);
}
