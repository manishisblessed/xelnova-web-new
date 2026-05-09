'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useDashboardAuth } from '@/lib/auth-context';
import { useSellerProfile } from '@/lib/seller-profile-context';
import { publicApiBase } from '@/lib/public-api-base';

const API_URL = publicApiBase();

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
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function inventoryHref(data: Record<string, unknown> | null): string {
  const productName = typeof data?.productName === 'string' ? data.productName.trim() : '';
  return productName ? `/inventory?search=${encodeURIComponent(productName)}` : '/inventory';
}

/**
 * Resolve the in-app destination for a seller-dashboard notification.
 * Returns `null` when the notification has no actionable target — the row
 * stays visible but isn't clickable.
 */
function getNotificationHref(n: Notification): string | null {
  const data =
    n.data && typeof n.data === 'object' && !Array.isArray(n.data)
      ? (n.data as Record<string, unknown>)
      : null;
  const orderNumber = typeof data?.orderNumber === 'string' ? data.orderNumber : null;
  const ticketId = typeof data?.ticketId === 'string' ? data.ticketId : null;

  switch (n.type) {
    case 'SELLER_VERIFIED':
      return '/dashboard';
    case 'SELLER_REJECTED':
      return '/profile';
    case 'PRODUCT_APPROVED':
    case 'PRODUCT_REJECTED':
    case 'PRODUCT_CHANGES_APPROVED':
    case 'PRODUCT_CHANGES_REJECTED':
    case 'PRODUCT_IMAGE_FEEDBACK':
    case 'LOW_STOCK_ALERT':
      return inventoryHref(data);
    case 'NEW_ORDER':
    case 'SELLER_RETURN_REQUESTED':
    case 'SELLER_REVERSE_PICKUP':
    case 'SELLER_SHIPMENT_STATUS':
      return orderNumber ? `/orders?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders';
    case 'PAYOUT_PROCESSED':
    case 'PAYOUT_REJECTED':
      return '/payouts';
    case 'TICKET_ASSIGNED':
    case 'TICKET_FORWARDED':
    case 'TICKET_CREATED':
    case 'TICKET_REPLY':
    case 'TICKET_UPDATE':
      return ticketId ? `/tickets?ticketId=${encodeURIComponent(ticketId)}` : '/tickets';
    case 'COUPON_APPROVED':
    case 'COUPON_REJECTED':
      return '/coupons';
    default:
      break;
  }

  if (n.type.startsWith('ORDER_')) {
    return orderNumber ? `/orders?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders';
  }

  return null;
}

export function NotificationBell() {
  const { isAuthenticated } = useDashboardAuth();
  const { refresh: refreshProfile, isApproved } = useSellerProfile();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shownVerifiedToastRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = authHeaders();
      if (!headers.Authorization) return;
      const res = await fetch(`${API_URL}/notifications?limit=10`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const newNotifications: Notification[] = data.data?.notifications || [];
        setNotifications(newNotifications);
        setUnread(data.data?.unread || 0);

        // Auto-refresh profile and show toast when SELLER_VERIFIED notification arrives
        const hasVerifiedNotification = newNotifications.some(
          (n) => n.type === 'SELLER_VERIFIED' && !n.read
        );
        if (hasVerifiedNotification && !isApproved && !shownVerifiedToastRef.current) {
          shownVerifiedToastRef.current = true;
          toast.success('Your seller account has been verified!', {
            description: 'You can now start adding products to your store.',
            duration: 6000,
          });
          refreshProfile();
        }
      }
    } catch (err) {
      console.warn('[NotificationBell] fetch error:', err);
    }
  }, [isApproved, refreshProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const headers = authHeaders();
      if (!headers.Authorization) return;
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers,
      });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }, []);

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

  const activateRow = useCallback(
    (n: Notification) => {
      if (!n.read) {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((prev) => Math.max(0, prev - 1));
        void markOneRead(n.id);
      }
      setOpen(false);
    },
    [markOneRead],
  );

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) fetchNotifications();
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
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
                const rowClass = `w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-2 transition-colors ${
                  interactive ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                } ${!n.read ? 'bg-primary-50/30' : ''}`;
                const inner = (
                  <>
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
                  </>
                );
                if (href) {
                  const onLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
                    activateRow(n);
                    const targetBase = href.split('?')[0] ?? href;
                    if (pathname === targetBase) {
                      e.preventDefault();
                      window.location.assign(href);
                    }
                  };
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      prefetch={false}
                      className={rowClass}
                      onClick={onLinkClick}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button key={n.id} type="button" onClick={() => activateRow(n)} className={rowClass}>
                    {inner}
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
