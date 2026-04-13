'use client';

import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useSellerProfile } from '@/lib/seller-profile-context';

export function VerificationBanner() {
  const { profile, isApproved, loading } = useSellerProfile();

  if (loading || !profile) return null;

  if (isApproved) return null;

  const status = profile.onboardingStatus;

  if (status === 'UNDER_REVIEW' || status === 'DOCUMENTS_SUBMITTED') {
    return (
      <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800">Account Verification Pending</p>
          <p className="text-sm text-amber-700 mt-1">
            Your seller account is being reviewed by our team. You&apos;ll be able to add products and manage inventory once approved.
            This usually takes 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Verification Failed</p>
          <p className="text-sm text-red-700 mt-1">
            Your seller application was not approved. Please contact support for more details.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function VerificationRequired({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isApproved, loading, profile } = useSellerProfile();

  if (loading) return null;

  if (!isApproved) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="text-center py-8 px-4">
        <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Required</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {profile?.onboardingStatus === 'REJECTED'
            ? 'Your account was not approved. Please contact support.'
            : 'Your account is pending verification. You can access this feature once approved.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
