"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  MapPin,
  Shield,
  LogOut,
  Camera,
  Loader2,
  RotateCcw,
  Wallet,
  HelpCircle,
  Gift,
  Bell,
} from "lucide-react";
import { useAuth, usersApi, setAccessToken, type AuthUser } from "@xelnova/api";
import { useEffect, useState } from "react";

function syncTokenFromCookie() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)xelnova-token=/.test(document.cookie);
}

const navLinks = [
  { icon: User, label: "My Profile", href: "/account/profile" },
  { icon: Package, label: "My Orders", href: "/account/orders" },
  { icon: RotateCcw, label: "Returns", href: "/account/returns" },
  { icon: Wallet, label: "Wallet", href: "/account/wallet" },
  { icon: Heart, label: "Wishlist", href: "/account/wishlist" },
  { icon: MapPin, label: "Addresses", href: "/account/addresses" },
  { icon: Gift, label: "Loyalty & Referral", href: "/account/loyalty" },
  { icon: Bell, label: "Notifications", href: "/account/notifications" },
  { icon: HelpCircle, label: "Support", href: "/account/support" },
  { icon: Shield, label: "Security", href: "/account/security" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!hasAuthCookie() && !authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setAuthChecked(true);
  }, [authLoading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    syncTokenFromCookie();
    usersApi
      .getProfile()
      .then((data) => { if (!cancelled) setUser(data); })
      .catch((err: any) => {
        if (!cancelled) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          }
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authChecked, pathname, router]);

  const handleLogout = async () => {
    await logout();
    document.cookie = "xelnova-token=; path=/; max-age=0";
    document.cookie = "xelnova-refresh-token=; path=/; max-age=0";
    localStorage.removeItem("xelnova-auth-provider");
    window.location.href = "/";
  };

  if (!authChecked || (loading && !user)) {
    return (
      <div className="min-h-screen bg-surface-raised flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-text-secondary">Loading your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-text-primary mb-8 font-display">My Account</h1>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="lg:self-start lg:sticky lg:top-28">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-3">
                  <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center border-2 border-primary-200">
                    <User size={32} className="text-primary-600" />
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 rounded-full bg-primary-600 p-1.5 text-white hover:bg-primary-700 transition-colors"
                  >
                    <Camera size={12} />
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-1.5">
                    <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
                    <div className="h-3.5 w-36 animate-pulse rounded bg-gray-100" />
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-text-primary">{user?.name ?? "—"}</p>
                    <p className="text-xs text-text-secondary">{user?.email ?? ""}</p>
                  </>
                )}
              </div>
              <nav className="space-y-0.5">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-700 font-semibold"
                          : "text-text-secondary hover:text-primary-700 hover:bg-primary-50"
                      }`}
                    >
                      <link.icon size={16} /> {link.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Page Content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
