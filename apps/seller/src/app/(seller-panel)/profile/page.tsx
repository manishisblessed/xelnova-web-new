'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
  TrendingUp,
  User,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import { apiGetProfile, apiUpdateProfile } from '@/lib/api';

/**
 * GET /seller/profile — Prisma seller_profiles + user.
 * Display maps business* fields to address / city / state / pincode as in the API docs.
 */
interface SellerProfileResponse {
  id: string;
  storeName: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  verified: boolean;
  location?: string | null;
  rating: number;
  totalSales: number;
  gstNumber?: string | null;
  panNumber?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  businessAddress?: string | null;
  businessCity?: string | null;
  businessState?: string | null;
  businessPincode?: string | null;
  commissionRate?: number;
  user: {
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SellerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [location, setLocation] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGetProfile()
      .then((res) => {
        const p = res as SellerProfileResponse;
        setProfile(p);
        setStoreName(p.storeName ?? '');
        setDescription(p.description ?? '');
        setLogo(p.logo ?? '');
        setLocation(p.location ?? '');
        setGstNumber(p.gstNumber ?? '');
        setPanNumber(p.panNumber ?? '');
        setBankAccountName(p.bankAccountName ?? '');
        setBankAccountNumber(p.bankAccountNumber ?? '');
        setBankIfscCode(p.bankIfscCode ?? '');
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!profile) return;
    setStoreName(profile.storeName ?? '');
    setDescription(profile.description ?? '');
    setLogo(profile.logo ?? '');
    setLocation(profile.location ?? '');
    setGstNumber(profile.gstNumber ?? '');
    setPanNumber(profile.panNumber ?? '');
    setBankAccountName(profile.bankAccountName ?? '');
    setBankAccountNumber(profile.bankAccountNumber ?? '');
    setBankIfscCode(profile.bankIfscCode ?? '');
    setEditOpen(true);
  };

  const save = async () => {
    if (!storeName.trim()) {
      toast.error('Store name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiUpdateProfile({
        storeName: storeName.trim(),
        description: description.trim() || undefined,
        logo: logo.trim() || undefined,
        location: location.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankIfscCode: bankIfscCode.trim() || undefined,
      });
      setProfile(updated as SellerProfileResponse);
      toast.success('Profile updated');
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <>
        <DashboardHeader title="My profile" />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-surface-muted rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-surface-muted rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <DashboardHeader title="My profile" />
        <div className="p-6 text-text-muted">Could not load profile.</div>
      </>
    );
  }

  const avatarSrc = profile.logo || profile.user?.avatar || undefined;

  return (
    <>
      <DashboardHeader title="My profile" />
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card"
        >
          <div className="h-28 bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-4 border-surface bg-surface-muted overflow-hidden">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={profile.storeName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-100">
                      <Building2 size={32} className="text-primary-500" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 sm:pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-text-primary">{profile.storeName}</h1>
                  {profile.verified ? <CheckCircle size={18} className="text-primary-500" /> : null}
                  <Badge variant={profile.verified ? 'success' : 'warning'}>
                    {profile.verified ? 'Verified' : 'Pending verification'}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">{profile.user?.email}</p>
                <p className="text-xs text-text-muted mt-1">Store slug: {profile.slug}</p>
              </div>
              <Button type="button" variant="outline" onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <StatCard loading={false} label="Total sales" value={profile.totalSales} icon={TrendingUp} />
              <StatCard
                loading={false}
                label="Rating"
                value={typeof profile.rating === 'number' ? profile.rating.toFixed(1) : '—'}
                icon={Star}
              />
              <StatCard
                loading={false}
                label="Commission rate"
                value={profile.commissionRate != null ? `${profile.commissionRate}%` : '—'}
                icon={Shield}
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <User size={20} className="text-primary-500" />
              Account
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 py-2 border-b border-border-light">
                <User className="h-4 w-4 text-text-muted mt-0.5" />
                <div>
                  <p className="text-xs text-text-muted">Name</p>
                  <p className="text-text-primary">{profile.user?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2 border-b border-border-light">
                <Mail className="h-4 w-4 text-text-muted mt-0.5" />
                <div>
                  <p className="text-xs text-text-muted">Email</p>
                  <p className="text-text-primary">{profile.user?.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2">
                <Phone className="h-4 w-4 text-text-muted mt-0.5" />
                <div>
                  <p className="text-xs text-text-muted">Phone</p>
                  <p className="text-text-primary">{profile.user?.phone || '—'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary-500" />
              Store
            </h2>
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {profile.description?.trim() ? profile.description : 'No description yet.'}
            </p>
            {profile.location ? (
              <p className="text-xs text-text-muted mt-3">Short location: {profile.location}</p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card lg:col-span-2"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-500" />
              Business address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted">Address</p>
                <p className="text-text-primary">{profile.businessAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">City</p>
                <p className="text-text-primary">{profile.businessCity || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">State</p>
                <p className="text-text-primary">{profile.businessState || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Pincode</p>
                <p className="text-text-primary">{profile.businessPincode || '—'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">GST</h2>
            <p className="text-sm font-mono text-text-primary">{profile.gstNumber || '—'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">Bank (read-only)</h2>
            <p className="text-xs text-text-muted">Last digits only for security</p>
            <p className="text-sm text-text-primary mt-2">
              {profile.bankAccountNumber ? `****${String(profile.bankAccountNumber).slice(-4)}` : '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">{profile.bankAccountName || ''}</p>
          </motion.div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => !saving && setEditOpen(false)} title="Edit profile" size="lg">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Input label="Store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <div>
            <label className="text-xs text-secondary-500 block mb-1">Description</label>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-dark-400 bg-dark-200 px-3 py-2 text-sm text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Input label="Logo URL" value={logo} onChange={(e) => setLogo(e.target.value)} />
          <Input
            label="Short location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mumbai warehouse"
          />
          <p className="text-xs text-text-muted">
            Street address and pincode are managed during onboarding; update them through support if they change.
          </p>
          <Input label="GST number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          <Input label="PAN number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
          <Input label="Bank account name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
          <Input
            label="Bank account number"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
          />
          <Input label="Bank IFSC" value={bankIfscCode} onChange={(e) => setBankIfscCode(e.target.value)} />
        </motion.div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
