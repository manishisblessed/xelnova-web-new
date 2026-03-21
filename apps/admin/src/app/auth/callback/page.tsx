'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your login...');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');
    const isNewUser = searchParams.get('isNewUser') === 'true';

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (token && refreshToken) {
      setStatus('success');
      setMessage(isNewUser ? 'Admin account created!' : 'Welcome back, Admin!');
      
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, role: 'admin' }),
      }).then(() => {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }).catch(() => {
        setStatus('error');
        setMessage('Failed to create session');
        setTimeout(() => router.push('/login'), 3000);
      });
    } else {
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-500/20 border border-primary-500/30 flex items-center justify-center">
            <Shield size={32} className="text-primary-400" />
          </div>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-primary-400 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Please wait</h2>
            <p className="text-slate-400">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
            <p className="text-slate-400">{message}</p>
            <p className="text-sm text-slate-500 mt-2">Redirecting to dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <XCircle size={48} className="mx-auto text-red-400 mb-4" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white mb-2">Oops!</h2>
            <p className="text-slate-400">{message}</p>
            <p className="text-sm text-slate-500 mt-2">Redirecting to login...</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-500/20 border border-primary-500/30 flex items-center justify-center">
            <Shield size={32} className="text-primary-400" />
          </div>
        </div>
        <Loader2 size={48} className="mx-auto text-primary-400 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Please wait</h2>
        <p className="text-slate-400">Processing your login...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
