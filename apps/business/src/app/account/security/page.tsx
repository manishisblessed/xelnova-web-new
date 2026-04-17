"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Lock, Loader2, CheckCircle, Smartphone, Mail, KeyRound } from "lucide-react";
import { usersApi, setAccessToken } from "@xelnova/api";

type AuthProviderType = "EMAIL" | "PHONE" | "GOOGLE";

function syncTokenFromCookie() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

const providerInfo: Record<string, { icon: React.ElementType; label: string; description: string }> = {
  GOOGLE: {
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" width="20" height="20">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    label: "Google Account",
    description: "You signed in using your Google account. Your password is managed by Google.",
  },
  PHONE: {
    icon: Smartphone,
    label: "Phone Number (OTP)",
    description: "You signed in using your phone number with OTP verification.",
  },
  EMAIL: {
    icon: Mail,
    label: "Email & Password",
    description: "You signed in using your email and password.",
  },
};

export default function SecurityPage() {
  const [provider, setProvider] = useState<AuthProviderType | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    syncTokenFromCookie();
    usersApi
      .getProfile()
      .then((profile) => {
        setProvider(profile.authProvider ?? null);
      })
      .catch(() => {
        const stored = typeof window !== "undefined"
          ? (localStorage.getItem("xelnova-auth-provider")?.toUpperCase() as AuthProviderType | undefined)
          : undefined;
        setProvider(stored ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const isGoogleOrPhone = provider === "GOOGLE" || provider === "PHONE";

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(false);

    if (!isGoogleOrPhone && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await usersApi.changePassword({
        newPassword,
        ...(isGoogleOrPhone ? {} : { currentPassword }),
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (isGoogleOrPhone) {
        const profile = await usersApi.getProfile();
        setProvider(profile.authProvider ?? null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const info = provider ? providerInfo[provider] : null;
  const ProviderIcon = info?.icon ?? KeyRound;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-primary">Security</h2>
        <p className="text-sm text-text-secondary mt-1">Manage your password and account security.</p>
      </div>

      {/* Login Method Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-white p-6 shadow-card mb-5"
      >
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Sign-in Method</h3>
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary-50 p-3 flex-shrink-0">
            <ProviderIcon className="text-primary-600" size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{info?.label ?? "Unknown"}</p>
            <p className="text-sm text-text-secondary mt-0.5">{info?.description ?? "Unable to determine your sign-in method."}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-success-600 font-medium">
              <CheckCircle size={13} />
              Active session
            </div>
          </div>
        </div>
      </motion.div>

      {/* Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-white p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-full bg-primary-50 p-2.5">
            <Shield size={20} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {isGoogleOrPhone ? "Set a Password" : "Change Password"}
            </h3>
            <p className="text-xs text-text-secondary">
              {isGoogleOrPhone
                ? "You can set a password to also log in with email and password."
                : "Update your password to keep your account secure."}
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-2.5 text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-lg bg-success-50 border border-success-100 px-4 py-2.5 text-sm text-success-700">
            Password {isGoogleOrPhone ? "set" : "changed"} successfully!
          </p>
        )}

        <div className="space-y-4 max-w-md">
          {!isGoogleOrPhone && (
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
                <span className="px-3 text-text-muted"><Lock size={16} /></span>
                <input
                  id="current-password"
                  name="current-password"
                  autoComplete="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="px-3 text-text-muted hover:text-text-secondary transition-colors">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1.5">
              {isGoogleOrPhone ? "Password" : "New Password"}
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
              <span className="px-3 text-text-muted"><Lock size={16} /></span>
              <input
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="px-3 text-text-muted hover:text-text-secondary transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-500 transition-colors">
              <span className="px-3 text-text-muted"><Lock size={16} /></span>
              <input
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="Re-enter password"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="px-3 text-text-muted hover:text-text-secondary transition-colors">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleChangePassword}
          className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 hover:shadow-primary transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isGoogleOrPhone ? "Set Password" : "Update Password"}
        </button>
      </motion.div>
    </div>
  );
}
