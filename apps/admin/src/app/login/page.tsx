'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Activity,
  Users,
  BarChart3,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@xelnova/ui';
import { DashboardAuthProvider, useDashboardAuth } from '@/lib/auth-context';
import { apiLogin } from '@/lib/api';

const features = [
  { icon: BarChart3, title: 'Real-time Analytics', description: 'Monitor sales, traffic, and performance metrics' },
  { icon: Users, title: 'User Management', description: 'Manage customers, sellers, and admin roles' },
  { icon: Shield, title: 'Security Controls', description: 'Advanced security and access management' },
  { icon: Activity, title: 'Activity Logs', description: 'Track all system activities and changes' },
];

function LoginFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useDashboardAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email.trim(), password);

      if (data.user.role !== 'ADMIN') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setUser(data.user);
      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: data.accessToken, role: 'admin', user: data.user, refreshToken: data.refreshToken }),
      });
      if (!sessionRes.ok) throw new Error('Session failed');

      if (data.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg === 'Failed to fetch' || msg.includes('fetch')) {
        setError('Cannot reach the API server. Make sure the backend is running.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-white/80">ADMIN</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight mb-6">
              Command Center for Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">E-commerce Empire</span>
            </h1>
            
            <p className="text-lg text-slate-400 mb-12 max-w-md">
              Access powerful tools to manage your marketplace, monitor performance, and drive growth.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  <feature.icon size={24} className="text-primary-400 mb-3" />
                  <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-slate-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-500/20 border border-primary-500/30 mb-4">
              <Fingerprint size={32} className="text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white font-display">Welcome back</h2>
            <p className="text-slate-400 mt-2">Sign in to access your admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-blue-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden focus-within:border-primary-500 transition-colors">
                  <span className="pl-4 text-slate-500"><Mail size={18} /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@xelnova.in"
                    required
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-blue-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden focus-within:border-primary-500 transition-colors">
                  <span className="pl-4 text-slate-500"><Lock size={18} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <span className="group-hover:text-slate-300 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </a>
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
              fullWidth
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 py-3.5 text-white font-medium shadow-lg shadow-primary-500/25 transition-all"
            >
              Sign In to Dashboard <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400 transition-colors">Help</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-16 w-16 mx-auto bg-slate-800 rounded-2xl" />
          <div className="h-8 w-48 mx-auto bg-slate-800 rounded" />
          <div className="h-12 bg-slate-800 rounded-xl" />
          <div className="h-12 bg-slate-800 rounded-xl" />
          <div className="h-12 bg-slate-800 rounded-xl" />
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
