"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Package, Truck, Gift, RotateCcw, Loader2 } from "lucide-react";
import { notificationsApi, setAccessToken } from "@xelnova/api";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type Notification = {
  id: string; channel: string; type: string; title: string;
  body: string; read: boolean; createdAt: string;
};

const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ORDER_PLACED: Package,
  ORDER_SHIPPED: Truck,
  ORDER_DELIVERED: CheckCheck,
  REFUND_PROCESSED: RotateCcw,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    syncToken();
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications() as any;
      setNotifications(res.notifications || []);
      setUnread(res.unread || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      loadData();
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Notifications</h2>
          {unread > 0 && <p className="text-sm text-text-secondary">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            <CheckCheck size={16} />Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center">
          <Bell size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-text-secondary">No notifications yet</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-gray-50 ${!n.read ? "bg-primary-50/30" : ""}`}
              >
                <div className={`p-2 rounded-full shrink-0 ${!n.read ? "bg-primary-100" : "bg-gray-100"}`}>
                  <Icon size={16} className={!n.read ? "text-primary-600" : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? "font-semibold text-text-primary" : "text-text-secondary"}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />}
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5">{n.body}</p>
                  <p className="text-xs text-text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
