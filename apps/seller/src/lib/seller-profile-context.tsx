'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiGetProfile, getDashboardToken } from './api';

export interface SellerProfile {
  id: string;
  storeName: string;
  slug: string;
  email: string;
  phone: string | null;
  verified: boolean;
  onboardingStatus: string;
  onboardingStep: number;
  gstVerified: boolean;
  gstNumber: string | null;
  logo: string | null;
  description: string | null;
  rating: number;
  totalSales: number;
  user?: {
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
}

interface SellerProfileContextValue {
  profile: SellerProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isApproved: boolean;
  canManageProducts: boolean;
}

const SellerProfileContext = createContext<SellerProfileContextValue | null>(null);

export function SellerProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!getDashboardToken()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetProfile() as SellerProfile;
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isApproved = profile?.onboardingStatus === 'APPROVED';
  const canManageProducts = isApproved && profile?.verified === true;

  return (
    <SellerProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        refresh: fetchProfile,
        isApproved,
        canManageProducts,
      }}
    >
      {children}
    </SellerProfileContext.Provider>
  );
}

export function useSellerProfile() {
  const ctx = useContext(SellerProfileContext);
  if (!ctx) {
    throw new Error('useSellerProfile must be used within SellerProfileProvider');
  }
  return ctx;
}
