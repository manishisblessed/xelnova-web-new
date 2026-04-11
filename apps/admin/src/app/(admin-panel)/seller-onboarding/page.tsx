'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  ExternalLink,
  Loader2,
  Search,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge } from '@xelnova/ui';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormTextarea, FormInput } from '@/components/dashboard/form-field';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface SellerDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  verifiedAt?: string;
}

interface SellerProfile {
  id: string;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  storeName: string;
  slug: string;
  description?: string;
  verified: boolean;
  onboardingStatus: string;
  onboardingStep: number;
  rejectionReason?: string;
  reviewedAt?: string;
  gstNumber?: string;
  gstVerified: boolean;
  gstVerifiedData?: { tradeName?: string; legalName?: string };
  sellsNonGstProducts: boolean;
  panNumber?: string;
  panName?: string;
  panVerified: boolean;
  panVerifiedData?: { panNumber?: string; name?: string; panStatus?: string; nameStatus?: string; dobStatus?: string; aadhaarSeedingStatus?: string };
  panDocumentUrl?: string;
  maskedAadhaarUrl?: string;
  aadhaarNumber?: string;
  aadhaarVerified: boolean;
  aadhaarVerifiedData?: { fullName?: string; dob?: string; gender?: string; address?: Record<string, string> };
  signatureUrl?: string;
  signatureData?: string;
  signatureVerified?: boolean;
  signatureRejectionNote?: string;
  categorySelectionType?: string;
  selectedCategories?: string[];
  bankAccountName?: string;
  /** Name returned from bank verification (penny drop / name match) */
  bankVerifiedName?: string | null;
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
  businessCategory?: string;
  shippingMethod?: string;
  offerFreeDelivery: boolean;
  commissionRate: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
  } | null;
  documents: SellerDocument[];
  _count?: { products: number };
}

const statusColors: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  PENDING_VERIFICATION: 'warning',
  EMAIL_VERIFIED: 'warning',
  PHONE_VERIFIED: 'warning',
  DOCUMENTS_SUBMITTED: 'warning',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const statusLabels: Record<string, string> = {
  PENDING_VERIFICATION: 'Pending',
  EMAIL_VERIFIED: 'Email Verified',
  PHONE_VERIFIED: 'Phone Verified',
  DOCUMENTS_SUBMITTED: 'Docs Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  electronics: 'Electronics',
  fashion: 'Fashion & Apparel',
  home: 'Home & Kitchen',
  beauty: 'Beauty & Personal Care',
  sports: 'Sports & Fitness',
  books: 'Books & Stationery',
  toys: 'Toys & Games',
  grocery: 'Grocery & Gourmet',
  health: 'Health & Wellness',
  automotive: 'Automotive',
};
const ALL_CATEGORY_LABELS = Object.keys(CATEGORY_LABEL_MAP);

/** Cloudinary and common image URLs may omit a file extension in the path */
function isLikelyImageUrl(url: string): boolean {
  if (!url) return false;
  if (/^data:image\//i.test(url)) return true;
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?|#|$)/i.test(url)) return true;
  if (/res\.cloudinary\.com\/.+\/image\/upload/i.test(url)) return true;
  return false;
}

function SellerSignatureImage({
  signatureUrl,
  signatureData,
  className = 'max-h-24 w-full object-contain',
}: {
  signatureUrl?: string | null;
  signatureData?: string | null;
  className?: string;
}) {
  const url = signatureUrl?.trim();
  const data = signatureData?.trim();
  const src = url || data || '';
  if (!src) return null;
  if (src.startsWith('data:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image does not optimize data URLs
      <img src={src} alt="Seller signature" className={className} />
    );
  }
  return (
    <Image src={src} alt="Seller signature" width={400} height={120} className={className} />
  );
}

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('xelnova-dashboard-token='))
    ?.split('=')[1] ?? null;
}

export default function SellerOnboardingPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [signatureComment, setSignatureComment] = useState('');
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/seller-onboarding/admin/sellers?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
      });
      const data = await res.json();

      if (data.success) {
        setSellers(data.data.sellers);
        setPagination((prev) => ({ ...prev, ...data.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleReview = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedSeller) return;
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    if (decision === 'APPROVED') {
      const hasSig = !!(selectedSeller.signatureUrl?.trim() || selectedSeller.signatureData?.trim());
      if (!hasSig) {
        toast.error('Cannot approve: no signature on file');
        return;
      }
      if (!selectedSeller.signatureVerified) {
        toast.error('Cannot approve: verify the seller’s signature in Seller Details first');
        return;
      }
    }

    setReviewLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/seller-onboarding/admin/review/${selectedSeller.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
          commissionRate: decision === 'APPROVED' ? commissionRate : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Seller ${decision.toLowerCase()}`);
        setReviewOpen(false);
        setSelectedSeller(null);
        setRejectionReason('');
        fetchSellers();
      } else {
        toast.error(data.message || 'Review failed');
      }
    } catch {
      toast.error('Review failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSignatureVerification = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (!selectedSeller) return;
    if (decision === 'REJECTED' && !signatureComment.trim()) {
      toast.error('Please provide a comment for rejection');
      return;
    }
    setSignatureLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/seller-onboarding/admin/verify-signature/${selectedSeller.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
        body: JSON.stringify({
          decision,
          comment: signatureComment || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Signature ${decision.toLowerCase()}`);
        setSignatureComment('');
        setSelectedSeller((prev) =>
          prev ? { ...prev, signatureVerified: decision === 'VERIFIED', signatureRejectionNote: decision === 'REJECTED' ? signatureComment : undefined } : null
        );
        fetchSellers();
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch {
      toast.error('Signature verification failed');
    } finally {
      setSignatureLoading(false);
    }
  };

  /* ── Stats ── */
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const token = getAuthToken();
    fetch(`${API_BASE}/seller-onboarding/admin/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
      },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch(() => {});
  }, [sellers]);

  const signaturePresent =
    !!(selectedSeller?.signatureUrl?.trim() || selectedSeller?.signatureData?.trim());
  const canApproveApplication =
    !!selectedSeller && signaturePresent && !!selectedSeller.signatureVerified;
  const mustVerifySignatureBeforeReview =
    !!selectedSeller &&
    selectedSeller.onboardingStatus === 'UNDER_REVIEW' &&
    signaturePresent &&
    !selectedSeller.signatureVerified;

  const pendingCount = stats.UNDER_REVIEW || 0;
  const approvedCount = stats.APPROVED || 0;
  const rejectedCount = stats.REJECTED || 0;
  const inProgressCount =
    (stats.PENDING_VERIFICATION || 0) +
    (stats.EMAIL_VERIFIED || 0) +
    (stats.PHONE_VERIFIED || 0) +
    (stats.DOCUMENTS_SUBMITTED || 0);

  /* ── Table columns ── */
  const columns: Column<SellerProfile>[] = [
    {
      key: 'storeName',
      header: 'Seller',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Store size={18} className="text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">{row.storeName}</p>
            <p className="text-xs text-text-muted truncate">{row.user?.name || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm text-text-primary truncate">{row.email ?? row.user?.email ?? '—'}</p>
          <p className="text-xs text-text-muted">{row.phone ?? row.user?.phone ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={row.gstVerified || row.sellsNonGstProducts ? 'success' : 'warning'}>
            GST {row.gstVerified ? '✓' : row.sellsNonGstProducts ? 'N/A' : '?'}
          </Badge>
          <Badge variant={row.aadhaarVerified ? 'success' : 'warning'}>
            KYC {row.aadhaarVerified ? '✓' : '?'}
          </Badge>
          <Badge variant={row.bankVerified ? 'success' : 'warning'}>
            Bank {row.bankVerified ? '✓' : '?'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'onboardingStatus',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusColors[row.onboardingStatus] || 'default'}>
          {statusLabels[row.onboardingStatus] || row.onboardingStatus}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Applied',
      render: (row) => (
        <span className="text-sm text-text-muted">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: '_actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => { setSelectedSeller(row); setDetailOpen(true); }}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {row.onboardingStatus === 'UNDER_REVIEW' && (
            <Button
              size="sm"
              onClick={() => { setSelectedSeller(row); setReviewOpen(true); }}
            >
              Review
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DashboardHeader title="Seller Onboarding" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Review" value={pendingCount} icon={Clock} loading={loading} />
          <StatCard label="Approved" value={approvedCount} icon={CheckCircle} loading={loading} />
          <StatCard label="Rejected" value={rejectedCount} icon={XCircle} loading={loading} />
          <StatCard label="In Progress" value={inProgressCount} icon={Store} loading={loading} />
        </div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search by store name, email, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"
          >
            <option value="">All Statuses</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="EMAIL_VERIFIED">Email Verified</option>
            <option value="PHONE_VERIFIED">Phone Verified</option>
            <option value="DOCUMENTS_SUBMITTED">Documents Submitted</option>
          </select>
          <button
            onClick={() => { setLoading(true); fetchSellers(); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </motion.div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <DataTable<SellerProfile>
            columns={columns}
            data={sellers}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage="No sellers found"
          />
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <ActionModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Seller Details"
        wide
        onSubmit={
          selectedSeller?.onboardingStatus === 'UNDER_REVIEW'
            ? () => { setDetailOpen(false); setReviewOpen(true); }
            : undefined
        }
        submitLabel="Review Application"
        submitDisabled={mustVerifySignatureBeforeReview}
        submitDisabledReason="Verify the seller's signature in this window before continuing to approval"
      >
        {selectedSeller && (
          <div className="space-y-6">
            {/* Store Info */}
            <DetailSection title="Store Information">
              <DetailGrid>
                <DetailItem label="Store Name" value={selectedSeller.storeName} />
                <DetailItem label="Commission Rate" value={`${selectedSeller.commissionRate}%`} />
              </DetailGrid>
            </DetailSection>

            {/* Contact Info */}
            <DetailSection title="Contact Information">
              <DetailGrid>
                <DetailItem label="Owner Name" value={selectedSeller.user?.name} />
                <DetailItem label="Email" value={selectedSeller.email ?? selectedSeller.user?.email} />
                <DetailItem label="Phone" value={selectedSeller.phone ?? selectedSeller.user?.phone} />
              </DetailGrid>
            </DetailSection>

            {/* Tax & Verification Details */}
            <DetailSection title="Verification Details">
              <DetailGrid>
                <DetailItem
                  label="GST Number"
                  value={selectedSeller.gstNumber || (selectedSeller.sellsNonGstProducts ? 'Non-GST Seller' : undefined)}
                  verified={selectedSeller.gstVerified}
                />
                <DetailItem label="Aadhaar" value={selectedSeller.aadhaarNumber} verified={selectedSeller.aadhaarVerified} />
              </DetailGrid>
              {selectedSeller.gstVerifiedData && (
                <div className="mt-3 rounded-xl bg-success-50 border border-success-200 p-3">
                  <p className="text-sm font-medium text-success-700">GST Verified</p>
                  <p className="text-sm text-success-600">Trade Name: {selectedSeller.gstVerifiedData.tradeName}</p>
                  <p className="text-sm text-success-600">Legal Name: {selectedSeller.gstVerifiedData.legalName}</p>
                </div>
              )}
              {selectedSeller.aadhaarVerifiedData && (
                <div className="mt-3 rounded-xl bg-success-50 border border-success-200 p-3">
                  <p className="text-sm font-medium text-success-700">Aadhaar Verified</p>
                  <p className="text-sm text-success-600">Name: {selectedSeller.aadhaarVerifiedData.fullName}</p>
                  <p className="text-sm text-success-600">DOB: {selectedSeller.aadhaarVerifiedData.dob} | Gender: {selectedSeller.aadhaarVerifiedData.gender}</p>
                  {selectedSeller.aadhaarVerifiedData.address?.state && (
                    <p className="text-sm text-success-600">State: {selectedSeller.aadhaarVerifiedData.address.state}</p>
                  )}
                </div>
              )}
            </DetailSection>

            {/* Category */}
            {selectedSeller.categorySelectionType && (
              <DetailSection title="Category Selection">
                <DetailItem label="Type" value={selectedSeller.categorySelectionType === 'all' ? 'All Categories' : 'Selected Categories'} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedSeller.categorySelectionType === 'all' ? (
                    <>
                      {(selectedSeller.selectedCategories && selectedSeller.selectedCategories.length > 0
                        ? selectedSeller.selectedCategories
                        : ALL_CATEGORY_LABELS
                      ).map((cat) => (
                        <Badge key={cat} variant="default">{CATEGORY_LABEL_MAP[cat] || cat}</Badge>
                      ))}
                    </>
                  ) : (
                    selectedSeller.selectedCategories?.map((cat) => (
                      <Badge key={cat} variant="default">{CATEGORY_LABEL_MAP[cat] || cat}</Badge>
                    ))
                  )}
                </div>
              </DetailSection>
            )}

            {/* Address */}
            <DetailSection title="Pickup Address">
              <div className="rounded-xl bg-surface-muted p-4">
                <p className="text-sm font-medium text-text-primary">
                  {selectedSeller.businessAddress || '—'}
                </p>
                <p className="text-sm text-text-muted mt-0.5">
                  {[selectedSeller.businessCity, selectedSeller.businessState, selectedSeller.businessPincode]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
            </DetailSection>

            {/* Bank Details */}
            <DetailSection title="Bank Details">
              <DetailGrid>
                <DetailItem
                  label="Account Holder"
                  value={
                    selectedSeller.bankVerified
                      ? (selectedSeller.bankVerifiedName || selectedSeller.bankAccountName)
                      : undefined
                  }
                  footnote={
                    !selectedSeller.bankVerified
                      ? 'Account holder name is shown after bank account verification completes.'
                      : undefined
                  }
                />
                <DetailItem
                  label="Account Number"
                  value={
                    selectedSeller.bankAccountNumber
                      ? `****${selectedSeller.bankAccountNumber.slice(-4)}`
                      : undefined
                  }
                />
                <DetailItem
                  label="IFSC Code"
                  value={selectedSeller.bankIfscCode}
                  verified={selectedSeller.bankVerified}
                />
                <DetailItem
                  label="Bank"
                  value={
                    selectedSeller.bankName
                      ? `${selectedSeller.bankName}${selectedSeller.bankBranch ? ` (${selectedSeller.bankBranch})` : ''}`
                      : undefined
                  }
                />
              </DetailGrid>
            </DetailSection>

            {/* Signature with Verification */}
            {(selectedSeller.signatureUrl || selectedSeller.signatureData) && (
              <DetailSection title="Signature">
                <div className="rounded-xl border border-border overflow-hidden bg-white p-4 max-w-md relative min-h-[96px]">
                  <SellerSignatureImage
                    signatureUrl={selectedSeller.signatureUrl}
                    signatureData={selectedSeller.signatureData}
                  />
                </div>
                {selectedSeller.signatureVerified ? (
                  <div className="mt-3 rounded-xl bg-success-50 border border-success-200 p-3">
                    <p className="text-sm font-medium text-success-700 flex items-center gap-1.5">
                      <CheckCircle size={14} /> Signature Verified
                    </p>
                  </div>
                ) : selectedSeller.signatureRejectionNote ? (
                  <div className="mt-3 rounded-xl bg-danger-50 border border-danger-200 p-3">
                    <p className="text-sm font-medium text-danger-700 flex items-center gap-1.5">
                      <XCircle size={14} /> Signature Rejected
                    </p>
                    <p className="text-sm text-danger-600 mt-1">{selectedSeller.signatureRejectionNote}</p>
                  </div>
                ) : null}
                {!selectedSeller.signatureVerified && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">
                        <MessageSquare size={12} className="inline mr-1" />
                        Comment (required for rejection)
                      </label>
                      <textarea
                        value={signatureComment}
                        onChange={(e) => setSignatureComment(e.target.value)}
                        placeholder="Add a comment about the signature..."
                        rows={2}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSignatureVerification('REJECTED')}
                        disabled={signatureLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {signatureLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Reject Signature
                      </button>
                      <Button size="sm" onClick={() => handleSignatureVerification('VERIFIED')} loading={signatureLoading}>
                        <CheckCircle size={14} />
                        Verify Signature
                      </Button>
                    </div>
                  </div>
                )}
              </DetailSection>
            )}

            {/* Other Documents */}
            {selectedSeller.documents?.length > 0 && (
              <DetailSection title="All Documents">
                <div className="space-y-2">
                  {selectedSeller.documents.map((doc) => {
                    const isImage = isLikelyImageUrl(doc.fileUrl);
                    const isData = doc.fileUrl?.startsWith('data:');
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/50 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isImage ? (
                            isData ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={doc.fileUrl}
                                alt={doc.type}
                                className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <Image
                                src={doc.fileUrl}
                                alt={doc.type}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-lg object-cover border border-border"
                              />
                            )
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center">
                              <FileText size={18} className="text-text-muted" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {doc.type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-text-muted truncate">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={doc.verified ? 'success' : 'warning'}>
                            {doc.verified ? 'Verified' : 'Pending'}
                          </Badge>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DetailSection>
            )}

            {/* Shipping */}
            <DetailSection title="Shipping Preferences">
              <DetailGrid>
                <DetailItem
                  label="Shipping Method"
                  value={
                    selectedSeller.shippingMethod === 'easy_ship'
                      ? 'Easy Ship (Xelnova handles shipping)'
                      : selectedSeller.shippingMethod === 'self_ship'
                        ? 'Self Ship'
                        : selectedSeller.shippingMethod
                  }
                />
                <DetailItem
                  label="Free Delivery"
                  value={selectedSeller.offerFreeDelivery ? 'Yes' : 'No'}
                />
              </DetailGrid>
            </DetailSection>

            {/* Rejection Reason */}
            {selectedSeller.rejectionReason && (
              <div className="rounded-xl bg-danger-50 border border-danger-200 p-4">
                <p className="text-sm font-medium text-danger-700">Rejection Reason</p>
                <p className="text-sm text-danger-600 mt-1">{selectedSeller.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </ActionModal>

      {/* ── Review Modal ── */}
      <ActionModal
        open={reviewOpen}
        onClose={() => { setReviewOpen(false); setRejectionReason(''); }}
        title={`Review — ${selectedSeller?.storeName ?? ''}`}
      >
        {selectedSeller && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <ReviewStatusItem
                label="GST Status"
                verified={selectedSeller.gstVerified}
                fallback={selectedSeller.sellsNonGstProducts ? 'Non-GST' : undefined}
              />
              <ReviewStatusItem label="Aadhaar KYC" verified={selectedSeller.aadhaarVerified} />
              <ReviewStatusItem label="Bank Status" verified={selectedSeller.bankVerified} />
              <div>
                <p className="text-xs text-text-muted">Signature</p>
                <p className="text-sm font-medium flex items-center gap-1 text-text-primary">
                  {selectedSeller.signatureVerified ? (
                    <><CheckCircle size={14} className="text-success-500" /> Verified</>
                  ) : selectedSeller.signatureUrl || selectedSeller.signatureData ? (
                    'Provided (not verified)'
                  ) : (
                    <><XCircle size={14} className="text-danger-500" /> Missing</>
                  )}
                </p>
                {signaturePresent && (
                  <div className="mt-2 rounded-lg border border-border bg-white p-2 max-w-[200px]">
                    <SellerSignatureImage
                      signatureUrl={selectedSeller.signatureUrl}
                      signatureData={selectedSeller.signatureData}
                      className="max-h-16 w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <FormField label="Commission Rate (%)">
              <FormInput
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 10"
              />
              <p className="text-xs text-text-muted mt-1">Set the commission percentage for this seller (default: 10%)</p>
            </FormField>

            <FormField label="Rejection Reason (required if rejecting)">
              <FormTextarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the application is being rejected..."
                rows={3}
              />
            </FormField>

            <div className="space-y-3 pt-2">
              {!canApproveApplication && signaturePresent && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Approve is available only after you open Seller Details and use <strong>Verify Signature</strong>.
                </p>
              )}
              {!signaturePresent && (
                <p className="text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
                  This application has no signature on file. Reject or ask the seller to resubmit.
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setReviewOpen(false); setRejectionReason(''); }}
                  disabled={reviewLoading}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => handleReview('REJECTED')}
                  disabled={reviewLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {reviewLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Reject
                </button>
                <Button
                  size="sm"
                  onClick={() => handleReview('APPROVED')}
                  loading={reviewLoading}
                  disabled={!canApproveApplication}
                  title={
                    !canApproveApplication
                      ? 'Verify the seller’s signature in Seller Details first'
                      : undefined
                  }
                >
                  <CheckCircle size={14} />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        )}
      </ActionModal>
    </>
  );
}

/* ── Shared sub-components ── */

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function DetailItem({
  label,
  value,
  verified,
  footnote,
}: {
  label: string;
  value?: string | null;
  verified?: boolean;
  footnote?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-muted">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-text-primary truncate">{value || '—'}</p>
        {verified && <CheckCircle size={14} className="text-success-500 shrink-0" />}
      </div>
      {footnote ? (
        <p className="text-xs text-text-muted mt-1 leading-snug">{footnote}</p>
      ) : null}
    </div>
  );
}

function DocCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{label}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ExternalLink size={13} />
        </a>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Image src={url} alt={label} width={400} height={144} className="w-full h-36 object-contain bg-white p-2" />
      </a>
    </div>
  );
}

function ReviewStatusItem({
  label,
  verified,
  fallback,
}: {
  label: string;
  verified: boolean;
  fallback?: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-medium flex items-center gap-1 text-text-primary">
        {verified ? (
          <>
            <CheckCircle size={14} className="text-success-500" /> Verified
          </>
        ) : fallback ? (
          fallback
        ) : (
          <>
            <XCircle size={14} className="text-danger-500" /> Not Verified
          </>
        )}
      </p>
    </div>
  );
}
