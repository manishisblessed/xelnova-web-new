'use client';

import { type ReactNode } from 'react';
import { useSellerProfile } from '@/lib/seller-profile-context';
import { CheckCircle } from 'lucide-react';

export function DashboardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { profile, isApproved } = useSellerProfile();

  const displayName = profile?.storeName || profile?.user?.name || 'Seller';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-border bg-surface px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold text-text-primary font-display truncate">{title}</h1>
          {subtitle ? <p className="text-xs sm:text-sm text-text-muted mt-0.5 line-clamp-2">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {actions}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{displayName}</span>
            {isApproved && (
              <CheckCircle className="w-4 h-4 text-green-500" aria-label="Verified seller" />
            )}
          </div>
          {profile?.logo ? (
            <img
              src={profile.logo}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
              {initial}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
