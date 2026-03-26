'use client';

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  TrendingUp,
  Package,
  Wallet,
  BarChart3,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@xelnova/ui';
import { DashboardAuthProvider, useDashboardAuth } from '@/lib/auth-context';
import { apiLogin } from '@/lib/api';

/** Must match `GOOGLE_CLIENT_ID` in the Nest backend `.env`. */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const benefits = [
  { icon: TrendingUp, title: 'Grow Your Business', description: 'Access millions of customers nationwide' },
  { icon: Package, title: 'Easy Inventory', description: 'Manage products with powerful tools' },
  { icon: Wallet, title: 'Fast Payments', description: 'Get paid within 7 days of delivery' },
  { icon: BarChart3, title: 'Smart Analytics', description: 'Track sales and optimize performance' },
];

const stats = [
  { value: '10K+', label: 'Active Sellers' },
  { value: '₹2Cr+', label: 'Daily Sales' },
  { value: '99.5%', label: 'Delivery Rate' },
];

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function LoginFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClicked, setGoogleClicked] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useDashboardAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const registered = searchParams.get('registered');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const googleCallbackRef = useRef<(response: { credential: string }) => Promise<void>>(null!);

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleClicked(false);
    setGoogleLoading(true);
    setError('');

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30_000);
    
    try {
      const res = await fetch(`${API_BASE}/auth/google/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential, role: 'seller' }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      const raw = await res.text();
      let data: {
        success?: boolean;
        message?: string;
        data?: {
          accessToken: string;
          hasSellerProfile?: boolean;
          user: { id: string; name: string; email: string; role: string; avatar?: string | null };
        };
      } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setError('Invalid response from server. Please try again.');
        return;
      }

      if (res.ok && data.success) {
        const payload = data.data;
        if (!payload?.user || !payload.accessToken) {
          setError('Invalid sign-in response. Please try again.');
          return;
        }

        const u = payload.user;

        if (u.role === 'ADMIN') {
          setError('Admin accounts cannot be used here. Use the Admin app to sign in.');
          return;
        }

        const dashboardUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'seller' as const,
          avatar: u.avatar ?? null,
        };
        setUser(dashboardUser);

        const sessionRes = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token: payload.accessToken,
            role: 'seller',
            user: dashboardUser,
          }),
        });

        if (!sessionRes.ok) throw new Error('Session failed');

        // Hard navigation — keep the spinner visible until the browser
        // fully unloads this page. Do NOT clear googleLoading here.
        if (payload.hasSellerProfile === false) {
          window.location.href = '/register';
        } else {
          window.location.href = redirectTo;
        }
        return;
      } else {
        const msg =
          (typeof data.message === 'string' && data.message.trim()) ||
          (res.status === 503
            ? 'Sign-in service is unavailable. Ensure the API backend is running (port 4000).'
            : '');
        setError(msg || 'Google sign-in failed');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Sign-in request timed out. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      }
    }
    setGoogleLoading(false);
  }, [setUser, redirectTo]);

  googleCallbackRef.current = handleGoogleCallback;

  const initializeGoogleSignIn = useCallback(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          googleCallbackRef.current?.(response);
        },
        auto_select: false,
        use_fedcm_for_prompt: true,
      });

      const buttonDiv = document.getElementById('google-signin-button-seller');
      if (buttonDiv) {
        buttonDiv.innerHTML = '';
        window.google.accounts.id.renderButton(buttonDiv, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      }
    }
  }, []);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        existingScript.addEventListener('load', initializeGoogleSignIn);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {};
  }, [initializeGoogleSignIn]);

  useEffect(() => {
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleBlur = () => {
      const googleBtn = document.getElementById('google-signin-button-seller');
      if (googleBtn && document.activeElement?.tagName === 'IFRAME' && googleBtn.contains(document.activeElement)) {
        setGoogleClicked(true);
        if (clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          setGoogleClicked((prev) => {
            if (prev) return false;
            return prev;
          });
        }, 120_000);
      }
    };

    const handleFocus = () => {
      setTimeout(() => {
        setGoogleClicked((prev) => {
          if (prev) return false;
          return prev;
        });
      }, 5000);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (clickTimeout) clearTimeout(clickTimeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email.trim(), password);

      if (data.user.role === 'ADMIN') {
        setError('Admin accounts cannot be used here. Use the Admin app to sign in.');
        setLoading(false);
        return;
      }

      const dashboardUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: 'seller' as const,
        avatar: data.user.avatar ?? null,
      };
      setUser(dashboardUser);
      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: data.accessToken, role: 'seller', user: dashboardUser }),
      });
      if (!sessionRes.ok) throw new Error('Session failed');
      if (data.hasSellerProfile === false) {
        window.location.href = '/register';
      } else {
        window.location.href = redirectTo;
      }
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {googleLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-2xl border border-gray-100">
            <Image src="/xelnova-icon-green.png" alt="Xelnova" width={64} height={64} className="w-16 h-16" />
            <Loader2 size={32} className="animate-spin text-primary-500" />
            <p className="text-lg font-semibold text-gray-900">Signing you in...</p>
            <p className="text-sm text-gray-500">Please wait while we log you in with Google</p>
          </div>
        </motion.div>
      )}

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.3' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-medium text-white">SELLER</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight mb-6">
              Your Business, <br />
              <span className="text-white/90">Amplified</span>
            </h1>
            
            <p className="text-lg text-white/80 mb-12 max-w-md">
              Join thousands of sellers who trust Xelnova to grow their business and reach millions of customers.
            </p>

            {/* Stats */}
            <div className="flex gap-8 mb-12">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                >
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/70">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-white/20">
                    <benefit.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{benefit.title}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Image src="/xelnova-icon-dark.png" alt="Xelnova" width={48} height={48} className="h-10 w-10" />
            <span className="text-2xl font-bold text-gray-900 font-display">Xelnova Seller</span>
          </div>

          {registered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-sm text-green-800">Registration successful! Please sign in to continue.</p>
              </div>
            </motion.div>
          )}

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 font-display">Welcome back</h2>
              <p className="text-gray-500 mt-2">Sign in to your seller dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  Remember me
                </label>
                <a href="#" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Forgot password?
                </a>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-50 border border-red-200"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="w-full rounded-xl bg-primary-500 hover:bg-primary-600 py-3.5 text-white font-medium shadow-lg shadow-primary-500/25"
              >
                Sign In <ArrowRight size={18} />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-500">or continue with</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <div className="space-y-3">
              {googleLoading ? (
                <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-primary-200 bg-primary-50 w-full max-w-[320px] mx-auto">
                  <Loader2 size={22} className="animate-spin text-primary-500" />
                  <span className="text-sm font-medium text-primary-700">Signing in with Google...</span>
                </div>
              ) : (
                <div className="relative">
                  <div id="google-signin-button-seller" className="flex justify-center" />
                  {googleClicked && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500"
                    >
                      <Loader2 size={16} className="animate-spin" />
                      <span>Waiting for Google sign-in...</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600 mb-3">Don&apos;t have an account?</p>
              <Link
                href="/register"
                className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-500 bg-gradient-to-b from-primary-50 to-white px-4 py-3.5 text-sm font-semibold text-primary-700 shadow-sm transition-all duration-200 hover:border-primary-600 hover:bg-primary-500 hover:text-white hover:shadow-md hover:shadow-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Start selling today
                <ArrowRight
                  size={18}
                  className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-48 mx-auto bg-gray-200 rounded" />
          <div className="bg-white rounded-3xl p-8 space-y-4">
            <div className="h-8 w-32 mx-auto bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <DashboardAuthProvider>
      <Suspense fallback={<LoginFallback />}>
        <LoginFormInner />
      </Suspense>
    </DashboardAuthProvider>
  );
}
