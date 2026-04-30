'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@xelnova/ui';
import { DashboardAuthProvider } from '@/lib/auth-context';
import { apiChangePassword } from '@/lib/api';

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordChecks = [
    { label: 'At least 6 characters', met: newPassword.length >= 6 },
    { label: 'Different from current password', met: newPassword.length > 0 && newPassword !== currentPassword },
    { label: 'Passwords match', met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];

  const allChecksMet = passwordChecks.every((c) => c.met) && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Changed</h2>
          <p className="text-slate-400">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-white/80">ADMIN</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight mb-6">
              Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Account</span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 max-w-md">
              For your security, you must set a new password before accessing the admin dashboard.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Shield size={20} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">Why change your password?</h3>
                  <p className="text-xs text-slate-400">Your account was created with a temporary password. Setting a personal password ensures only you can access this admin account.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Lock size={20} className="text-primary-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">Keep it strong</h3>
                  <p className="text-xs text-slate-400">Use a unique password with at least 6 characters. Avoid reusing passwords from other sites.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Image src="/xelnova-icon-dark.png" alt="Xelnova" width={48} height={48} className="h-10 w-10" />
            <span className="text-2xl font-bold text-white font-display">Xelnova Admin</span>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
              <Lock size={32} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white font-display">Set New Password</h2>
            <p className="text-slate-400 mt-2">Enter your temporary password and choose a new one</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Temporary Password</label>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden focus-within:border-amber-500 transition-colors">
                  <span className="pl-4 text-slate-500"><Lock size={18} /></span>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter the password from your email"
                    required
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-blue-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden focus-within:border-primary-500 transition-colors">
                  <span className="pl-4 text-slate-500"><Lock size={18} /></span>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    required
                    minLength={6}
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-blue-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden focus-within:border-primary-500 transition-colors">
                  <span className="pl-4 text-slate-500"><Lock size={18} /></span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={6}
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password strength checks */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${check.met ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                    {check.met && <CheckCircle2 size={12} className="text-green-400" />}
                  </div>
                  <span className={`text-xs transition-colors ${check.met ? 'text-green-400' : 'text-slate-500'}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!allChecksMet}
              fullWidth
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 py-3.5 text-white font-medium shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set New Password <ArrowRight size={18} />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            This is a one-time security step. You won&apos;t be asked again.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <DashboardAuthProvider>
      <ChangePasswordForm />
    </DashboardAuthProvider>
  );
}
