'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

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
      document.cookie = `xelnova-token=${token}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      
      setStatus('success');
      setMessage(isNewUser ? 'Account created successfully!' : 'Welcome back!');
      
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-primary-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Please wait</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-2">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-2">Redirecting to login...</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
        <Loader2 size={48} className="mx-auto text-primary-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Please wait</h2>
        <p className="text-gray-500">Processing your login...</p>
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
