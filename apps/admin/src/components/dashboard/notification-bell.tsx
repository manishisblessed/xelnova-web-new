'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboardAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-dashboard-token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Resolve the in-app destination for an admin-dashboard notification.
 * Admin notifications are emitted via `notifyAllAdmins` and use the
 * `ADMIN_*` type prefix (plus a few legacy types like `REVIEW_PENDING`).
 */
function getNotificationHref(n: Notification): string | null {
  const data =
    n.data && typeof n.data === 'object' && !Array.isArray(n.data)
      ? (n.data as Record<string, unknown>)
      : null;
  const orderNumber = typeof data?.orderNumber === 'string' ? data.orderNumber : null;
  const ticketId = typeof data?.ticketId === 'string' ? data.ticketId : null;
  const sellerId = typeof data?.sellerId === 'string' ? data.sellerId : null;
  const productSku = typeof data?.sku === 'string' ? data.sku : null;
  const productId = typeof data?.productId === 'string' ? data.productId : null;
  const isReapproval = data?.reapproval === true;

  switch (n.type) {
    case 'ADMIN_NEW_ORDER':
    case 'ADMIN_ORDER_SHIPPED':
    case 'ADMIN_ORDER_DELIVERED':
    case 'ADMIN_ORDER_CANCELLED':
    case 'ADMIN_REFUND_PROCESSED':
    case 'ADMIN_PAYMENT_SUCCESS':
    case 'ADMIN_PAYMENT_FAILED':
      return orderNumber ? `/orders?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders';
    case 'ADMIN_WALLET_CREDITED':
    case 'ADMIN_WALLET_DEBITED':
      return '/wallets';
    case 'ADMIN_RETURN_REQUESTED':
      return orderNumber ? `/orders?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders';
    case 'ADMIN_SELLER_ONBOARDING_REVIEW':
      return sellerId
        ? `/seller-onboarding?sellerId=${encodeURIComponent(sellerId)}`
        : '/seller-onboarding';
    case 'ADMIN_SUPPORT_TICKET':
    case 'ADMIN_TICKET_CUSTOMER_REPLY':
    case 'ADMIN_TICKET_SELLER_REPLY':
      return ticketId ? `/tickets?ticketId=${encodeURIComponent(ticketId)}` : '/tickets';
    case 'COUPON_PENDING':
      return '/coupons';
    case 'ADMIN_PRODUCT_SUBMITTED':
      // For re-approval (edited products), link without status filter since product stays ACTIVE
      // For new products, filter by PENDING status
      if (isReapproval) {
        return productSku
          ? `/products?hasPendingChanges=true&search=${encodeURIComponent(productSku)}`
          : '/products?hasPendingChanges=true';
      }
      return productSku
        ? `/products?status=PENDING&search=${encodeURIComponent(productSku)}`
        : '/products?status=PENDING';
    case 'ADMIN_PRODUCT_IMAGES_UPDATED':
      // Seller updated images for a previously flagged product — link to that product
      return productSku
        ? `/products?search=${encodeURIComponent(productSku)}`
        : '/products';
    case 'REVIEW_PENDING':
      return '/reviews';
    default:
      break;
  }

  if (n.type.startsWith('ADMIN_ORDER') || n.type.startsWith('ADMIN_PAYMENT')) {
    return orderNumber ? `/orders?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders';
  }

  return null;
}

export function NotificationBell() {
  const { isAuthenticated } = useDashboardAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = authHeaders();
      if (!headers.Authorization) return;
      const res = await fetch(`${API_URL}/notifications?limit=10`, { headers });
      if (!res.ok) {
        console.warn(`[NotificationBell] fetch failed: ${res.status} ${res.statusText}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data?.notifications || []);
        setUnread(data.data?.unread || 0);
      }
    } catch (err) {
      console.warn('[NotificationBell] fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      const headers = authHeaders();
      if (!headers.Authorization) return;
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers,
      });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn('[NotificationBell] mark-all-read error:', err);
    }
  };

  const markOneRead = useCallback(async (id: string) => {
    try {
      const headers = authHeaders();
      if (!headers.Authorization) return;
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
      });
    } catch {}
  }, []);

  const handleRowClick = useCallback(
    (n: Notification) => {
      const href = getNotificationHref(n);
      if (!n.read) {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((prev) => Math.max(0, prev - 1));
        void markOneRead(n.id);
      }
      setOpen(false);
      if (!href) return;

      // If we're already on the destination route, `router.push` is a silent
      // no-op. Force a hard reload so client-fetched data (lists, banners,
      // stat cards) re-renders with the latest state.
      const targetPath = href.split('?')[0] ?? href;
      if (pathname === targetPath) {
        if (typeof window !== 'undefined') window.location.assign(href);
        return;
      }

      router.push(href);
      router.refresh();
    },
    [markOneRead, router, pathname],
  );

  if (!isAuthenticated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map((n) => {
                const href = getNotificationHref(n);
                const interactive = href !== null;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleRowClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-2 transition-colors ${
                      interactive ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                    } ${!n.read ? 'bg-primary-50/30' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {interactive && (
                      <ChevronRight size={14} className="shrink-0 text-gray-300 mt-1" aria-hidden />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
