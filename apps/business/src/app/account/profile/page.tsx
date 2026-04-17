"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Loader2 } from "lucide-react";
import { usersApi, setAccessToken, type AuthUser } from "@xelnova/api";

function syncTokenFromCookie() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    syncTokenFromCookie();
    usersApi
      .getProfile()
      .then((data) => { if (!cancelled) setUser(data); })
      .catch((e: { response?: { data?: { message?: string } }; message?: string }) => {
        if (!cancelled) setError(e.response?.data?.message ?? e.message ?? "Failed to load profile");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!user) return;
    syncTokenFromCookie();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await usersApi.updateProfile({
        name: user.name,
        email: user.email?.trim() ? user.email : undefined,
        phone: user.phone?.trim() ? user.phone : undefined,
      });
      setUser(updated);
      setSuccess(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("xelnova-user", JSON.stringify(updated));
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message ?? err.message ?? "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-white p-6 shadow-card"
    >
      <h2 className="text-lg font-bold text-text-primary mb-6">Personal Information</h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-text-secondary">Loading profile…</p>
        </div>
      ) : !user ? (
        <p className="py-12 text-center text-sm text-danger-600" role="alert">
          {error ?? "Could not load profile."}
        </p>
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-2.5 text-sm text-danger-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="mb-4 rounded-lg bg-success-50 border border-success-100 px-4 py-2.5 text-sm text-success-700">
              Profile updated successfully!
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
                <span className="px-3 text-text-muted"><User size={16} /></span>
                <input
                  type="text"
                  value={user.name ?? ""}
                  onChange={(e) => setUser((u) => (u ? { ...u, name: e.target.value } : u))}
                  className="flex-1 bg-transparent px-1 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
                <span className="px-3 text-text-muted"><Mail size={16} /></span>
                <input
                  type="email"
                  value={user.email ?? ""}
                  onChange={(e) => setUser((u) => (u ? { ...u, email: e.target.value || null } : u))}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent px-1 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
              {!user.email && (
                <p className="mt-1 text-xs text-text-muted">Add an email to receive order updates and invoices.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone Number</label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
                <span className="px-3 text-text-muted"><Phone size={16} /></span>
                <input
                  type="tel"
                  value={user.phone ?? ""}
                  onChange={(e) => setUser((u) => (u ? { ...u, phone: e.target.value || null } : u))}
                  placeholder="+91 98765 43210"
                  className="flex-1 bg-transparent px-1 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || !user}
            onClick={handleSave}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 hover:shadow-primary transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </>
      )}
    </motion.div>
  );
}
