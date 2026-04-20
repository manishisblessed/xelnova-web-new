'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Building2, FileText, ArrowRight, Loader2,
  ShieldCheck, Truck, Users, Wallet,
} from 'lucide-react';
import { authApi } from '@xelnova/api';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

const benefits = [
  { icon: Building2, text: 'One workspace per organization' },
  { icon: FileText, text: 'Capture GSTIN for tax-ready invoices' },
  { icon: Users, text: 'Invite buyers and approvers later' },
  { icon: Wallet, text: 'Pay online by card / UPI / netbanking' },
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    legalName: '',
    gstin: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const gstinValid = !form.gstin || GSTIN_REGEX.test(form.gstin.toUpperCase());

  const canSubmit =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.organizationName.trim().length > 0 &&
    gstinValid &&
    agreed &&
    !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const result = await authApi.registerBusiness({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        organizationName: form.organizationName.trim(),
        legalName: form.legalName.trim() || undefined,
        gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : undefined,
      });
      document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/" className="inline-block mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <Building2 className="h-3.5 w-3.5" /> Xelnova Business
            </span>
            <h1 className="mt-6 text-4xl xl:text-5xl font-bold text-white font-display leading-tight">
              Procurement built <br />
              <span className="text-white/90">for your team</span>
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-md">
              Create a business workspace and start ordering from the full Xelnova catalog with company context.
            </p>
            <div className="mt-10 space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <b.icon size={20} className="text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{b.text}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/70">
                <ShieldCheck size={18} />
                <span className="text-sm">Secure checkout</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Truck size={18} />
                <span className="text-sm">Pan-India delivery</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <Link href="/" className="lg:hidden flex justify-center mb-8">
            <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto" />
          </Link>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-7">
              <Link href="/" className="hidden lg:inline-block mb-4">
                <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto mx-auto" />
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 font-display">Create a business account</h2>
              <p className="text-gray-500 mt-2">You become the org admin for this workspace</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bz-name" className="block text-sm font-medium text-gray-700 mb-2">Your name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="bz-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="bz-email" className="block text-sm font-medium text-gray-700 mb-2">Work email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="bz-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="bz-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="bz-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your organization</p>
              </div>

              <div>
                <label htmlFor="bz-org" className="block text-sm font-medium text-gray-700 mb-2">Company display name</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="bz-org"
                    type="text"
                    value={form.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                    placeholder="Acme Pvt Ltd"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bz-legal" className="block text-sm font-medium text-gray-700 mb-2">
                    Legal name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="bz-legal"
                    type="text"
                    value={form.legalName}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                    placeholder="Legal entity name"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="bz-gstin" className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="bz-gstin"
                    type="text"
                    value={form.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-mono text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  {form.gstin && !gstinValid && (
                    <p className="mt-1.5 text-xs text-red-600">Doesn&apos;t look like a valid GSTIN.</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="bz-agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="bz-agree" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  I agree to Xelnova&apos;s{' '}
                  <Link href="/terms" className="text-slate-900 hover:underline font-medium">Terms of Use</Link> and{' '}
                  <Link href="/privacy" className="text-slate-900 hover:underline font-medium">Privacy Policy</Link>, and
                  confirm I&apos;m authorized to register this organization.
                </label>
              </div>

              <button
                onClick={handleRegister}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have a business account?{' '}
              <Link href="/login" className="text-slate-900 hover:underline font-semibold">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
