'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  Download,
  Shield,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button, Badge } from '@xelnova/ui';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  userId: string;
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
  gstVerifiedData?: any;
  sellsNonGstProducts: boolean;
  panNumber?: string;
  panName?: string;
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
  businessCategory?: string;
  shippingMethod?: string;
  offerFreeDelivery: boolean;
  commissionRate: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
  };
  documents: SellerDocument[];
  _count?: {
    products: number;
  };
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
  DOCUMENTS_SUBMITTED: 'Documents Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function SellerOnboardingPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('UNDER_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE}/seller-onboarding/admin/sellers?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setSellers(data.data.sellers);
        setPagination(prev => ({ ...prev, ...data.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [pagination.page, statusFilter, searchQuery]);

  const handleReview = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedSeller) return;
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/admin/review/${selectedSeller.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Seller ${decision.toLowerCase()}`);
        setReviewModalOpen(false);
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

  const openDetailModal = (seller: SellerProfile) => {
    setSelectedSeller(seller);
    setDetailModalOpen(true);
  };

  const openReviewModal = (seller: SellerProfile) => {
    setSelectedSeller(seller);
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Onboarding</h1>
          <p className="text-gray-600 mt-1">Review and approve seller applications</p>
        </div>
        <Button variant="outline" onClick={fetchSellers}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review', value: sellers.filter(s => s.onboardingStatus === 'UNDER_REVIEW').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Approved', value: sellers.filter(s => s.onboardingStatus === 'APPROVED').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: 'Rejected', value: sellers.filter(s => s.onboardingStatus === 'REJECTED').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
          { label: 'In Progress', value: sellers.filter(s => !['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(s.onboardingStatus)).length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Store },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by store name, email, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="DOCUMENTS_SUBMITTED">Documents Submitted</option>
        </select>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-500" />
          </div>
        ) : sellers.length === 0 ? (
          <div className="text-center py-20">
            <Store size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No sellers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <Store size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{seller.storeName}</p>
                          <p className="text-sm text-gray-500">{seller.user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{seller.user.email}</p>
                      <p className="text-sm text-gray-500">{seller.user.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={seller.gstVerified || seller.sellsNonGstProducts ? 'success' : 'default'}>
                          GST {seller.gstVerified ? '✓' : seller.sellsNonGstProducts ? 'N/A' : '✗'}
                        </Badge>
                        <Badge variant={seller.bankVerified ? 'success' : 'default'}>
                          Bank {seller.bankVerified ? '✓' : '✗'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={statusColors[seller.onboardingStatus] || 'default'}>
                        {statusLabels[seller.onboardingStatus] || seller.onboardingStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(seller.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(seller)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {seller.onboardingStatus === 'UNDER_REVIEW' && (
                          <Button size="sm" onClick={() => openReviewModal(seller)}>
                            Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedSeller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Seller Details</h2>
                <button onClick={() => setDetailModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Store Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Store Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Store Name</p>
                      <p className="font-medium">{selectedSeller.storeName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Business Type</p>
                      <p className="font-medium">{selectedSeller.businessType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium">{selectedSeller.businessCategory || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Commission Rate</p>
                      <p className="font-medium">{selectedSeller.commissionRate}%</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Owner Name</p>
                      <p className="font-medium">{selectedSeller.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedSeller.user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedSeller.user.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Tax Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Tax Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">GST Number</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedSeller.gstNumber || (selectedSeller.sellsNonGstProducts ? 'Non-GST Seller' : '-')}</p>
                        {selectedSeller.gstVerified && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">PAN Number</p>
                      <p className="font-medium">{selectedSeller.panNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">PAN Name</p>
                      <p className="font-medium">{selectedSeller.panName || '-'}</p>
                    </div>
                  </div>
                  {selectedSeller.gstVerifiedData && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">GST Verified</p>
                      <p className="text-sm text-green-700">
                        Trade Name: {selectedSeller.gstVerifiedData.tradeName}
                      </p>
                      <p className="text-sm text-green-700">
                        Legal Name: {selectedSeller.gstVerifiedData.legalName}
                      </p>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Pickup Address</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedSeller.businessAddress || '-'}</p>
                    <p className="text-gray-600">
                      {[selectedSeller.businessCity, selectedSeller.businessState, selectedSeller.businessPincode].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Account Holder</p>
                      <p className="font-medium">{selectedSeller.bankAccountName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Account Number</p>
                      <p className="font-medium">{selectedSeller.bankAccountNumber ? `****${selectedSeller.bankAccountNumber.slice(-4)}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">IFSC Code</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedSeller.bankIfscCode || '-'}</p>
                        {selectedSeller.bankVerified && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bank</p>
                      <p className="font-medium">{selectedSeller.bankName || '-'} {selectedSeller.bankBranch ? `(${selectedSeller.bankBranch})` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {selectedSeller.documents && selectedSeller.documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Documents</h3>
                    <div className="space-y-2">
                      {selectedSeller.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{doc.type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-gray-500">{doc.fileName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.verified ? (
                              <Badge variant="success">Verified</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-gray-200"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shipping */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Shipping Preferences</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Shipping Method</p>
                      <p className="font-medium">{selectedSeller.shippingMethod === 'easy_ship' ? 'Easy Ship (Xelnova handles shipping)' : 'Self Ship'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Free Delivery</p>
                      <p className="font-medium">{selectedSeller.offerFreeDelivery ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedSeller.rejectionReason && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800">Rejection Reason</p>
                    <p className="text-red-700 mt-1">{selectedSeller.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
                {selectedSeller.onboardingStatus === 'UNDER_REVIEW' && (
                  <Button onClick={() => { setDetailModalOpen(false); openReviewModal(selectedSeller); }}>
                    Review Application
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && selectedSeller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setReviewModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Review Application</h2>
                <p className="text-gray-600 mt-1">{selectedSeller.storeName}</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">GST Status</p>
                    <p className="font-medium flex items-center gap-1">
                      {selectedSeller.gstVerified ? (
                        <><CheckCircle size={14} className="text-green-500" /> Verified</>
                      ) : selectedSeller.sellsNonGstProducts ? (
                        'Non-GST'
                      ) : (
                        <><XCircle size={14} className="text-red-500" /> Not Verified</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bank Status</p>
                    <p className="font-medium flex items-center gap-1">
                      {selectedSeller.bankVerified ? (
                        <><CheckCircle size={14} className="text-green-500" /> Verified</>
                      ) : (
                        <><XCircle size={14} className="text-red-500" /> Not Verified</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Documents</p>
                    <p className="font-medium">{selectedSeller.documents?.length || 0} uploaded</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium">{selectedSeller.businessCity ? 'Provided' : 'Missing'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (required if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the application is being rejected..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setReviewModalOpen(false)} disabled={reviewLoading}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReview('REJECTED')}
                  disabled={reviewLoading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject
                </Button>
                <Button onClick={() => handleReview('APPROVED')} disabled={reviewLoading}>
                  {reviewLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Approve
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
