'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle,
  Check,
  Copy,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
  TrendingUp,
  User,
  Pencil,
  Upload,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import { apiGetProfile, apiUpdateProfile, apiUploadImage } from '@/lib/api';

function SellerIdBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      toast.success('Seller ID copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className="group mt-2 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/70 px-2.5 py-1 text-xs font-mono font-semibold tracking-wide text-primary-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-100/80 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
    >
      <span className="text-[10px] font-sans font-medium uppercase tracking-[0.12em] text-primary-600/70">
        Seller ID
      </span>
      <span className="text-text-primary">{code}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success-500" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5 text-primary-500/70 transition-opacity group-hover:opacity-100 opacity-70" aria-hidden />
      )}
    </button>
  );
}

function storeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  const one = parts[0] ?? '';
  if (one.length >= 2) return one.slice(0, 2).toUpperCase();
  return one[0]?.toUpperCase() ?? '?';
}

function StoreLogoAvatar({
  src,
  alt,
  initials,
  size = 'lg',
}: {
  src?: string | null;
  alt: string;
  initials: string;
  size?: 'lg' | 'sm';
}) {
  const [failed, setFailed] = useState(false);
  const dim = size === 'lg' ? 'w-24 h-24 text-2xl' : 'w-16 h-16 text-lg';
  const showImg = Boolean(src?.trim()) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`relative ${dim} rounded-2xl border-4 border-surface bg-surface-muted overflow-hidden shadow-lg ring-1 ring-black/5`}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote seller logos; arbitrary URLs
        <img
          src={src!}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500 to-emerald-600 font-display font-bold text-white"
          aria-hidden
        >
          {initials}
        </div>
      )}
    </div>
  );
}

/**
 * GET /seller/profile — Prisma seller_profiles + user.
 * Display maps business* fields to address / city / state / pincode as in the API docs.
 */
interface SellerProfileResponse {
  id: string;
  storeName: string;
  slug: string;
  /** Friendly public seller code, e.g. "Grand_HR-XEL00001". Falls back to slug when null (legacy sellers). */
  sellerCode?: string | null;
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
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

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

  const logoSrc = useMemo(() => {
    if (!profile) return null;
    return profile.logo?.trim() || profile.user?.avatar?.trim() || null;
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile) return '?';
    return storeInitials(profile.storeName);
  }, [profile]);

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
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

  const onLogoFile = async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setLogoUploading(true);
    try {
      const { url } = await apiUploadImage(file);
      setLogo(url);
      toast.success('Logo uploaded — save to apply');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <>
      <DashboardHeader title="My profile" />
      <div className="p-4 sm:p-6 lg:p-8 pb-10 max-w-5xl mx-auto w-full space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card"
        >
          <div className="relative h-32 sm:h-36 bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface/90 to-transparent rounded-b-2xl" />
          </div>
          <div className="px-5 sm:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between -mt-14 sm:-mt-16">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <StoreLogoAvatar src={logoSrc} alt={profile.storeName} initials={initials} size="lg" />
                <div className="sm:pb-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-display tracking-tight">
                      {profile.storeName}
                    </h1>
                    {profile.verified ? (
                      <CheckCircle size={20} className="text-primary-500 shrink-0" aria-label="Verified" />
                    ) : null}
                    <Badge variant={profile.verified ? 'success' : 'warning'}>
                      {profile.verified ? 'Verified' : 'Pending verification'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{profile.user?.email}</span>
                  </p>
                  <SellerIdBadge code={profile.sellerCode || profile.slug} />
                </div>
              </div>
              <Button type="button" variant="outline" onClick={openEdit} className="shrink-0 self-start sm:self-end">
                <Pencil className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card"
          >
            <h2 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <User size={18} className="text-primary-600" />
              </span>
              Account
            </h2>
            <div className="space-y-0 text-sm">
              <div className="flex items-start gap-3 py-3 border-b border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Name</p>
                  <p className="text-text-primary mt-0.5">{profile.storeName || profile.user?.name || '—'}</p>
                  {profile.user?.name && profile.user.name !== profile.storeName ? (
                    <p className="text-xs text-text-muted mt-0.5">Owner: {profile.user.name}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3 py-3 border-b border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Email</p>
                  <p className="text-text-primary mt-0.5 break-all">{profile.user?.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Phone</p>
                  <p className="text-text-primary mt-0.5">{profile.user?.phone || '—'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card"
          >
            <h2 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <Building2 size={18} className="text-primary-600" />
              </span>
              Store
            </h2>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap min-h-[3rem]">
              {profile.description?.trim() ? profile.description : 'No description yet. Add one when you edit your profile.'}
            </p>
            {profile.location ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-muted/80 px-3 py-2.5 text-sm">
                <MapPin className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                <span className="text-text-secondary">{profile.location}</span>
              </div>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card lg:col-span-2"
          >
            <h2 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2 pb-3 border-b border-border">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <MapPin size={18} className="text-primary-600" />
              </span>
              Business address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-2.5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Address</p>
                <p className="text-text-primary mt-1">{profile.businessAddress || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-2.5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">City</p>
                <p className="text-text-primary mt-1">{profile.businessCity || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-2.5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">State</p>
                <p className="text-text-primary mt-1">{profile.businessState || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/40 px-3 py-2.5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Pincode</p>
                <p className="text-text-primary mt-1">{profile.businessPincode || '—'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card"
          >
            <h2 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border">GST</h2>
            <p className="text-sm font-mono text-text-primary tracking-wide">{profile.gstNumber || '—'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card"
          >
            <h2 className="text-base font-semibold text-text-primary mb-2 pb-3 border-b border-border">Bank</h2>
            <p className="text-xs text-text-muted">Masked for security</p>
            <p className="text-lg font-semibold text-text-primary mt-3 font-mono tracking-wider">
              {profile.bankAccountNumber ? `•••• ${String(profile.bankAccountNumber).slice(-4)}` : '—'}
            </p>
            <p className="text-sm text-text-secondary mt-2">{profile.bankAccountName || '—'}</p>
          </motion.div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit profile"
        size="lg"
        className="max-w-2xl w-full"
      >
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-0">
          <div className="overflow-y-auto overscroll-contain max-h-[min(70vh,520px)] pr-1 -mr-1 space-y-6">
            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Store</p>
              <Input label="Store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              <div>
                <label htmlFor="profile-description" className="mb-1.5 block text-xs font-medium text-text-muted">
                  Description
                </label>
                <textarea
                  id="profile-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers what you sell and what makes your store special."
                  className="w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/50 p-4 space-y-3">
                <p className="text-xs font-medium text-text-muted">Store logo</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <StoreLogoAvatar
                    src={logo}
                    alt="Preview"
                    initials={storeInitials(storeName || 'Store')}
                    size="sm"
                  />
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      aria-label="Upload store logo"
                      onChange={(e) => {
                        onLogoFile(e.target.files?.[0] ?? null);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={logoUploading}
                      onClick={() => logoFileRef.current?.click()}
                    >
                      {logoUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload image
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-text-muted">JPG, PNG or WebP, max 5 MB. Or paste a URL below.</p>
                    <Input
                      label="Logo image URL (optional)"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              </div>
              <Input
                label="Short location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New Delhi warehouse"
              />
              <p className="text-xs text-text-muted leading-relaxed rounded-lg bg-surface-muted/60 px-3 py-2 border border-border/60">
                Street address and PIN are set during onboarding. Contact support if they need to change.
              </p>
            </section>

            <section className="space-y-4 pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Tax &amp; registration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="GST number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                <Input label="PAN number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
              </div>
            </section>

            <section className="space-y-4 pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Bank details</p>
              <Input label="Bank account name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
              <Input
                label="Bank account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
              <Input label="Bank IFSC" value={bankIfscCode} onChange={(e) => setBankIfscCode(e.target.value)} />
            </section>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5 mt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving || logoUploading}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving || logoUploading}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </motion.div>
      </Modal>
    </>
  );
}
