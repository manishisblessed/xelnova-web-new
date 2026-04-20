'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShoppingBag,
  Truck,
  Shield,
  Gift,
  Heart,
  Star,
  Loader2,
} from 'lucide-react';
import { authApi, setAccessToken } from '@xelnova/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

const benefits = [
  { icon: ShoppingBag, text: 'Track your orders in real-time' },
  { icon: Heart, text: 'Save items to your wishlist' },
  { icon: Gift, text: 'Exclusive member discounts' },
  { icon: Star, text: 'Earn rewards on every purchase' },
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

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClicked, setGoogleClicked] = useState(false);
  const [error, setError] = useState('');
  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const googleCallbackRef = useRef<(response: { credential: string }) => void>(null);

  const initializeGoogleSignIn = useCallback(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => googleCallbackRef.current?.(response),
        auto_select: false,
      });

      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        buttonDiv.innerHTML = '';
        window.google.accounts.id.renderButton(buttonDiv, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 350,
        });
      }
    }
  }, []);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      initializeGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {
      // Don't remove — React strict mode double-mounts in dev
    };
  }, [initializeGoogleSignIn]);

  const handleGoogleCallback = async (response: { credential: string }) => {
    setGoogleClicked(false);
    setGoogleLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/google/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential, role: 'customer' }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const { setAccessToken } = await import('@xelnova/api');
        setAccessToken(data.data.accessToken);
        localStorage.setItem('xelnova-refresh-token', data.data.refreshToken);
        localStorage.setItem('xelnova-user', JSON.stringify(data.data.user));
        localStorage.setItem('xelnova-auth-provider', 'google');
        document.cookie = `xelnova-token=${data.data.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
        document.cookie = `xelnova-refresh-token=${data.data.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
        window.location.href = redirectTo;
      } else {
        console.error('Google sign-in API error:', res.status, data);
        setError(data.message || `Google sign-in failed (${res.status})`);
      }
    } catch (err) {
      console.error('Google sign-in network error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  googleCallbackRef.current = handleGoogleCallback;

  useEffect(() => {
    const handleBlur = () => {
      const googleBtn = document.getElementById('google-signin-button');
      if (googleBtn && document.activeElement?.tagName === 'IFRAME' && googleBtn.contains(document.activeElement)) {
        setGoogleClicked(true);
      }
    };

    const handleFocus = () => {
      setTimeout(() => {
        if (googleClicked && !googleLoading) {
          setGoogleClicked(false);
        }
      }, 3000);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [googleClicked, googleLoading]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    setError('');
    try {
      await authApi.sendOtp(`+91${phone}`);
      setOtpSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await authApi.verifyOtp(`+91${phone}`, otpString);
      if (!result.accessToken || !result.refreshToken) {
        setError('Could not sign you in. Please try again.');
        return;
      }
      localStorage.setItem('xelnova-auth-provider', 'phone');
      document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      window.location.href = redirectTo;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
    // Auto-submit when all 6 digits are entered
    if (value && newOtp.every((d) => d !== '') && newOtp.join('').length === 6) {
      setTimeout(() => {
        const otpString = newOtp.join('');
        if (otpString.length === 6) handleVerifyOtp();
      }, 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${focusIdx}`)?.focus();
    // Auto-submit if pasted a full 6-digit OTP
    if (pasted.length === 6) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Full-page loading overlay for Google sign-in */}
      {googleLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-2xl border border-gray-100">
            <Image src="/xelnova-icon-dark.png" alt="Xelnova" width={64} height={64} className="w-16 h-16" />
            <Loader2 size={32} className="animate-spin text-violet-600" />
            <p className="text-lg font-semibold text-gray-900">Signing you in...</p>
            <p className="text-sm text-gray-500">Please wait while we log you in with Google</p>
          </div>
        </motion.div>
      )}

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/xelnova-logo-white.png"
                alt="Xelnova"
                width={320}
                height={91}
                className="h-14 w-auto xl:h-16"
                priority
              />
            </Link>

            <h1 className="text-3xl xl:text-4xl font-bold text-white font-display leading-tight mb-4">
              Shop Smarter, <br />
              <span className="text-white/90">Live Better</span>
            </h1>

            <p className="text-base text-white/75 mb-8 max-w-sm">
              Join millions of happy customers who trust Xelnova for quality products and amazing deals.
            </p>

            {/* Benefits — compact 2×2 grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <benefit.icon size={18} className="text-white" />
                  </div>
                  <span className="text-sm text-white/90 font-medium leading-snug">{benefit.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-5 text-white/60">
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span className="text-xs">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={16} />
                <span className="text-xs">Fast Delivery</span>
              </div>
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
          <Link href="/" className="lg:hidden flex justify-center mb-8">
            <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto" />
          </Link>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 font-display">Welcome back</h2>
              <p className="text-gray-500 mt-2">Sign in to continue shopping</p>
            </div>

            {!otpSent ? (
                <div className="space-y-5">
                  <div
                    className="flex items-center rounded-xl border border-gray-200 bg-gray-50 overflow-hidden focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all"
                    role="group"
                    aria-label="Phone number"
                  >
                    <span className="px-4 py-3.5 text-sm text-gray-600 border-r border-gray-200 bg-gray-100 shrink-0">+91</span>
                    <input
                      id="login-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter your phone number"
                      maxLength={10}
                      aria-label="Mobile number (10 digits)"
                      className="flex-1 min-w-0 bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={phone.length !== 10 || loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Send OTP <ArrowRight size={16} /></>}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter OTP sent to +91 {phone}
                    </label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          className="h-12 w-12 rounded-xl border border-gray-200 bg-gray-50 text-center text-lg font-bold text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otp.some(d => !d) || loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Verify & Sign In <ArrowRight size={16} /></>}
                  </button>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <button onClick={() => setOtpSent(false)} className="text-violet-600 hover:text-violet-700 font-medium">
                      Change number
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={handleSendOtp} disabled={loading} className="text-gray-600 hover:text-gray-900 disabled:opacity-50">
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-50 border border-red-200"
              >
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {!otpSent && (
              <>
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
                    <div className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-violet-200 bg-violet-50">
                      <Loader2 size={20} className="animate-spin text-violet-600" />
                      <span className="text-sm font-medium text-violet-700">Signing you in with Google...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        id="google-signin-button"
                        className="flex justify-center"
                      />
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

                <p className="mt-6 text-center text-sm text-gray-600">
                  New to Xelnova?{' '}
                  <Link href="/register" className="text-violet-600 hover:text-violet-700 font-semibold">
                    Create an account
                  </Link>
                </p>
              </>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
      <div className="flex-1 flex items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="animate-pulse space-y-6">
            <div className="h-12 w-48 mx-auto bg-gray-200 rounded" />
            <div className="bg-white rounded-3xl p-8 space-y-4 border border-gray-100">
              <div className="h-8 w-32 mx-auto bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
