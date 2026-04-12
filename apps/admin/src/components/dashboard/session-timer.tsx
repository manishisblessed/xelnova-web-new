'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDashboardAuth } from '@/lib/auth-context';
import { Clock, LogOut, Shield } from 'lucide-react';

const SESSION_DURATION_MS = 25 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_DEBOUNCE_MS = 5000;

export function SessionTimer() {
  const { isAuthenticated, logout } = useDashboardAuth();
  const [remaining, setRemaining] = useState(SESSION_DURATION_MS);
  const [showModal, setShowModal] = useState(false);
  const expiresAt = useRef(Date.now() + SESSION_DURATION_MS);
  const debounceRef = useRef(0);

  const resetTimer = useCallback(() => {
    expiresAt.current = Date.now() + SESSION_DURATION_MS;
    setRemaining(SESSION_DURATION_MS);
    setShowModal(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onActivity = () => {
      const now = Date.now();
      if (now - debounceRef.current < ACTIVITY_DEBOUNCE_MS) return;
      debounceRef.current = now;
      if (!showModal) {
        expiresAt.current = now + SESSION_DURATION_MS;
      }
    };

    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('scroll', onActivity, true);

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity, true);
    };
  }, [isAuthenticated, showModal]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const tick = setInterval(() => {
      const left = Math.max(0, expiresAt.current - Date.now());
      setRemaining(left);

      if (left <= WARNING_BEFORE_MS && left > 0 && !showModal) {
        setShowModal(true);
      }

      if (left === 0) {
        clearInterval(tick);
        logout();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [isAuthenticated, showModal, logout]);

  if (!isAuthenticated) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining < 5 * 60 * 1000;

  return (
    <>
      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${
        isLow ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
      }`}>
        <Clock size={12} />
        <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Session Expiring</h3>
            <p className="text-sm text-gray-600 mb-1">
              Your session will expire in{' '}
              <span className="font-bold text-red-600">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-6">Would you like to stay logged in?</p>
            <div className="flex gap-3">
              <button
                onClick={() => logout()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <LogOut size={14} />
                Log Out
              </button>
              <button
                onClick={resetTimer}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
