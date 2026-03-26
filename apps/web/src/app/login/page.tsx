'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Smartphone,
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
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

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
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClicked, setGoogleClicked] = useState(false);
  const [error, setError] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

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
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
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
  };

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
        document.cookie = `xelnova-token=${data.data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `xelnova-refresh-token=${data.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
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

  const handleEmailSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await authApi.login(email, password);
      localStorage.setItem('xelnova-auth-provider', 'email');
      document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      window.location.href = redirectTo;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

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
      if (result.isNewUser) {
        setNeedsName(true);
      } else {
        localStorage.setItem('xelnova-auth-provider', 'phone');
        document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
        document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
        window.location.href = redirectTo;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleCompleteRegistration = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await authApi.completePhoneRegistration(`+91${phone}`, trimmedName, trimmedEmail);
      localStorage.setItem('xelnova-auth-provider', 'phone');
      document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      window.location.href = redirectTo;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Registration failed');
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
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
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

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Link href="/" className="inline-block mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
            </Link>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight mb-6">
              Shop Smarter, <br />
              <span className="text-white/90">Live Better</span>
            </h1>
            
            <p className="text-lg text-white/80 mb-12 max-w-md">
              Join millions of happy customers who trust Xelnova for quality products and amazing deals.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <benefit.icon size={20} className="text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{benefit.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/70">
                <Shield size={18} />
                <span className="text-sm">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Truck size={18} />
                <span className="text-sm">Fast Delivery</span>
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
              <h2 className="text-2xl font-bold text-gray-900 font-display">
                {needsName ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-gray-500 mt-2">
                {needsName ? 'Fill in your details to get started' : 'Sign in to continue shopping'}
              </p>
            </div>

            {/* Login Mode Toggle */}
            {!needsName && (
              <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                <button
                  onClick={() => { setMode('phone'); setOtpSent(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    mode === 'phone' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Smartphone size={16} /> Phone
                </button>
                <button
                  onClick={() => { setMode('email'); setOtpSent(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    mode === 'email' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            )}

            {mode === 'phone' ? (
              needsName ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mb-3">
                      <Shield size={24} className="text-violet-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Phone <span className="font-medium text-gray-800">+91 {phone}</span> verified! Complete your profile to continue.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fullName.trim() && regEmail.trim() && handleCompleteRegistration()}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCompleteRegistration}
                    disabled={fullName.trim().length < 2 || !isValidEmail(regEmail.trim()) || loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create Account & Sign In <ArrowRight size={16} /></>}
                  </button>
                </motion.div>
              ) : !otpSent ? (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="login-phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 overflow-hidden focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                      <span className="px-4 py-3.5 text-sm text-gray-600 border-r border-gray-200 bg-gray-100">+91</span>
                      <input
                        id="login-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter your phone number"
                        maxLength={10}
                        className="flex-1 bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
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
                    <button className="text-gray-600 hover:text-gray-900">
                      Resend OTP
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && email && password && handleEmailSignIn()}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && email && password && handleEmailSignIn()}
                      placeholder="Enter your password"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
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
                  <label htmlFor="login-remember" className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      id="login-remember"
                      name="remember"
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                    />
                    Remember me
                  </label>
                  <Link href="/forgot-password" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <button
                  onClick={handleEmailSignIn}
                  disabled={!email || !password || loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                </button>
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

            {!needsName && (
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
