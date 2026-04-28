'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import { apiSellerRegistrationStatus, getDashboardToken } from '@/lib/api';

type GateState = 'checking' | 'ok' | 'incomplete' | 'under_review' | 'rejected';

interface RegistrationStatus {
  hasSellerProfile: boolean;
  sellerId?: string | null;
  onboardingStatus?: string | null;
  onboardingStep?: number | null;
  onboardingComplete?: boolean;
}

/**
 * Ensures the authenticated seller has completed onboarding before showing the dashboard.
 * - No profile at all → /register
 * - Profile exists but onboarding incomplete → show message + link to /register
 * - Under review → show "pending review" message
 * - Approved / Documents submitted → show dashboard
 */
export function SellerProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>('checking');
  const [status, setStatus] = useState<RegistrationStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getDashboardToken()) {
      router.replace('/login');
      return;
    }
    apiSellerRegistrationStatus()
      .then(async (res: RegistrationStatus) => {
        if (cancelled) return;
        setStatus(res);

        if (!res.hasSellerProfile) {
          try {
            await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
          } catch { /* best effort */ }
          if (typeof window !== 'undefined') localStorage.removeItem('xelnova-dashboard-user');
          router.replace('/login');
          return;
        }

        if (res.onboardingComplete) {
          setState('ok');
        } else if (res.onboardingStatus === 'UNDER_REVIEW') {
          setState('under_review');
        } else if (res.onboardingStatus === 'REJECTED') {
          setState('rejected');
        } else {
          setState('incomplete');
        }
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        // handleResponse() redirects to /login and throws on 401 — do not show dashboard
        if (message === 'Session expired' || message.includes('Session expired')) {
          return;
        }
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          try {
            await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
          } catch { /* best effort */ }
          if (typeof window !== 'undefined') localStorage.removeItem('xelnova-dashboard-user');
          router.replace('/login');
        } else {
          setState('ok');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'checking') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" aria-hidden />
        <p className="text-sm">Checking your seller account…</p>
      </div>
    );
  }

  if (state === 'incomplete') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Registration Incomplete</h2>
        <p className="text-gray-600 max-w-md">
          You haven&apos;t finished setting up your seller account.
          Complete all registration steps to access the seller dashboard.
        </p>
        <p className="text-sm text-gray-500">
          Continue from account setup (step 1 of 3) — verify contact details and password.
        </p>
        <button
          onClick={() => {
            if (status?.sellerId) {
              try {
                sessionStorage.setItem('xelnova-reg', JSON.stringify({
                  sellerId: status.sellerId,
                  step: 1,
                }));
              } catch { /* ignore */ }
            }
            router.push('/register');
          }}
          className="mt-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
        >
          Complete Registration
        </button>
      </div>
    );
  }

  if (state === 'under_review') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
          <Clock className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Application Under Review</h2>
        <p className="text-gray-600 max-w-md">
          Your seller application has been submitted and is being reviewed by our team.
          You&apos;ll be able to access the dashboard once approved.
        </p>
        <p className="text-sm text-gray-500">This usually takes 1–2 business days.</p>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Application Not Approved</h2>
        <p className="text-gray-600 max-w-md">
          Your seller application was not approved. Please contact support or
          re-submit your application with the correct details.
        </p>
        <button
          onClick={() => router.push('/register')}
          className="mt-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
        >
          Re-apply
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
