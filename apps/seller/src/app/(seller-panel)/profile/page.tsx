'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Camera,
  FileText,
  TrendingUp,
  Package,
  Star,
  Calendar,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@xelnova/ui';
import { useDashboardAuth } from '@/lib/auth-context';

interface SellerProfile {
  id: string;
  storeName: string;
  slug: string;
  logo?: string;
  description?: string;
  verified: boolean;
  location?: string;
  rating: number;
  totalSales: number;
  gstNumber?: string;
  gstVerified: boolean;
  panNumber?: string;
  panVerified: boolean;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankVerified: boolean;
  bankName?: string;
  bankBranch?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPincode?: string;
  businessType?: string;
  commissionRate: number;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginLocation?: { city?: string; country?: string };
  loginCount: number;
  createdAt: string;
  sellerProfile?: SellerProfile;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ProfilePage() {
  const { user } = useDashboardAuth();
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('xelnova-dashboard-token='))
          ?.split('=')[1];

        if (!token) return;

        const res = await fetch(`${API_BASE}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfileData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <>
        <DashboardHeader title="My Profile" />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-surface-muted rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-surface-muted rounded-2xl" />
              <div className="h-64 bg-surface-muted rounded-2xl" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const profile = profileData?.sellerProfile;

  return (
    <>
      <DashboardHeader title="My Profile" />
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface overflow-hidden"
        >
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400" />
          
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-4 border-surface bg-surface-muted overflow-hidden">
                  {profile?.logo || profileData?.avatar ? (
                    <img
                      src={profile?.logo || profileData?.avatar}
                      alt={profile?.storeName || profileData?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-100">
                      <Building2 size={32} className="text-primary-500" />
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              
              <div className="flex-1 sm:pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-text-primary">{profile?.storeName || profileData?.name}</h1>
                  {profile?.verified && (
                    <CheckCircle size={18} className="text-primary-500" />
                  )}
                </div>
                <p className="text-sm text-text-muted">{profileData?.email}</p>
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-muted transition-colors">
                <Edit2 size={16} />
                Edit Profile
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-surface-muted">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <TrendingUp size={16} />
                  <span className="text-xs">Total Sales</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{profile?.totalSales || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-muted">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Star size={16} />
                  <span className="text-xs">Rating</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{profile?.rating?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-muted">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Package size={16} />
                  <span className="text-xs">Commission</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{profile?.commissionRate || 10}%</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-muted">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Calendar size={16} />
                  <span className="text-xs">Member Since</span>
                </div>
                <p className="text-xl font-bold text-text-primary">
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <User size={20} className="text-primary-500" />
              Personal Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <p className="text-sm text-text-primary">{profileData?.email}</p>
                  </div>
                </div>
                {profileData?.emailVerified ? (
                  <Badge variant="success" className="text-xs">Verified</Badge>
                ) : (
                  <Badge variant="warning" className="text-xs">Unverified</Badge>
                )}
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <p className="text-sm text-text-primary">{profileData?.phone || 'Not provided'}</p>
                  </div>
                </div>
                {profileData?.phone && (
                  profileData?.phoneVerified ? (
                    <Badge variant="success" className="text-xs">Verified</Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">Unverified</Badge>
                  )
                )}
              </div>
              <div className="flex items-center gap-3 py-3">
                <Clock size={18} className="text-text-muted" />
                <div>
                  <p className="text-xs text-text-muted">Last Login</p>
                  <p className="text-sm text-text-primary">
                    {profileData?.lastLoginAt 
                      ? new Date(profileData.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </p>
                  {profileData?.lastLoginLocation?.city && (
                    <p className="text-xs text-text-muted mt-0.5">
                      from {profileData.lastLoginLocation.city}, {profileData.lastLoginLocation.country}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Business Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary-500" />
              Business Information
            </h2>
            <div className="space-y-4">
              <div className="py-3 border-b border-border-light">
                <p className="text-xs text-text-muted">Store Name</p>
                <p className="text-sm text-text-primary font-medium">{profile?.storeName || '-'}</p>
              </div>
              <div className="py-3 border-b border-border-light">
                <p className="text-xs text-text-muted">Business Type</p>
                <p className="text-sm text-text-primary">{profile?.businessType || '-'}</p>
              </div>
              <div className="py-3 border-b border-border-light">
                <p className="text-xs text-text-muted">Store URL</p>
                <p className="text-sm text-primary-500">xelnova.com/store/{profile?.slug || '-'}</p>
              </div>
              {profile?.description && (
                <div className="py-3">
                  <p className="text-xs text-text-muted">Description</p>
                  <p className="text-sm text-text-primary">{profile.description}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tax & Compliance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary-500" />
              Tax & Compliance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div>
                  <p className="text-xs text-text-muted">GSTIN</p>
                  <p className="text-sm text-text-primary font-mono">{profile?.gstNumber || 'Not provided'}</p>
                </div>
                {profile?.gstNumber && (
                  profile?.gstVerified ? (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </Badge>
                  )
                )}
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs text-text-muted">PAN</p>
                  <p className="text-sm text-text-primary font-mono">{profile?.panNumber || 'Not provided'}</p>
                </div>
                {profile?.panNumber && (
                  profile?.panVerified ? (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </Badge>
                  )
                )}
              </div>
            </div>
          </motion.div>

          {/* Bank Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary-500" />
              Bank Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div>
                  <p className="text-xs text-text-muted">Account Holder</p>
                  <p className="text-sm text-text-primary">{profile?.bankAccountName || '-'}</p>
                </div>
                {profile?.bankAccountNumber && (
                  profile?.bankVerified ? (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </Badge>
                  )
                )}
              </div>
              <div className="py-3 border-b border-border-light">
                <p className="text-xs text-text-muted">Account Number</p>
                <p className="text-sm text-text-primary font-mono">
                  {profile?.bankAccountNumber 
                    ? `****${profile.bankAccountNumber.slice(-4)}`
                    : '-'}
                </p>
              </div>
              <div className="py-3 border-b border-border-light">
                <p className="text-xs text-text-muted">IFSC Code</p>
                <p className="text-sm text-text-primary font-mono">{profile?.bankIfscCode || '-'}</p>
              </div>
              {profile?.bankName && (
                <div className="py-3">
                  <p className="text-xs text-text-muted">Bank</p>
                  <p className="text-sm text-text-primary">{profile.bankName}</p>
                  {profile.bankBranch && (
                    <p className="text-xs text-text-muted">{profile.bankBranch}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Business Address */}
        {(profile?.businessAddress || profile?.businessCity) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-500" />
              Business Address
            </h2>
            <p className="text-sm text-text-primary">
              {[
                profile?.businessAddress,
                profile?.businessCity,
                profile?.businessState,
                profile?.businessPincode,
              ].filter(Boolean).join(', ')}
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
