'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@xelnova/ui';
import { CheckCircle, XCircle, Star, Clock, Search, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiGetReviews, apiGetPendingReviews, apiApproveReview, apiRejectReview } from '@/lib/api';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';

interface ReviewUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface ReviewProduct {
  id: string;
  name: string;
  images: string[];
  slug: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  verified: boolean;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderationNote?: string | null;
  helpful: number;
  createdAt: string;
  user: ReviewUser;
  product: ReviewProduct;
}

type TabFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [previewReview, setPreviewReview] = useState<Review | null>(null);

  const extractItems = (payload: unknown): Review[] => {
    if (Array.isArray(payload)) return payload as Review[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
      return (payload as { items: Review[] }).items;
    }
    return [];
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();

      let payload: unknown;
      if (tab === 'pending') {
        payload = await apiGetPendingReviews(params);
      } else if (tab === 'approved') {
        params.moderationStatus = 'APPROVED';
        payload = await apiGetReviews(params);
      } else if (tab === 'rejected') {
        params.moderationStatus = 'REJECTED';
        payload = await apiGetReviews(params);
      } else {
        payload = await apiGetReviews(params);
      }
      setReviews(extractItems(payload));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiApproveReview(id);
      toast.success('Review approved');
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, moderationStatus: 'APPROVED' } : r)));
      if (tab === 'pending') {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason =
      typeof window !== 'undefined'
        ? window.prompt('Optional rejection note for the customer (leave blank for none):', '') ?? ''
        : '';
    setActionLoading(id);
    try {
      await apiRejectReview(id, reason.trim() || undefined);
      toast.success('Review rejected');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const openRejectConfirm = (id: string) => {
    setConfirmAction({ id, type: 'reject' });
    setConfirmOpen(true);
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const pendingCount = tab === 'pending' ? reviews.filter((r) => r.moderationStatus === 'PENDING').length : 0;

  const moderationBadge = (status: Review['moderationStatus']) => {
    if (status === 'APPROVED') return <Badge variant="success" className="text-xs">Approved</Badge>;
    if (status === 'REJECTED') return <Badge variant="danger" className="text-xs">Rejected</Badge>;
    return <Badge variant="warning" className="text-xs">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reviews</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage customer reviews before they appear on the website
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 bg-surface-muted rounded-xl p-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-surface text-primary-600 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'pending' && <Clock size={14} className="inline mr-1.5 -mt-0.5" />}
              {t === 'approved' && <CheckCircle size={14} className="inline mr-1.5 -mt-0.5" />}
              {t === 'rejected' && <XCircle size={14} className="inline mr-1.5 -mt-0.5" />}
              {t === 'all' && <Filter size={14} className="inline mr-1.5 -mt-0.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Clock size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No reviews found</h3>
          <p className="text-text-muted text-sm">
            {tab === 'pending' ? 'All reviews have been reviewed.' : 'No reviews match your criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {review.product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.product.images[0]}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-text-muted text-xs">N/A</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-medium text-text-primary line-clamp-1">
                          {review.product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {renderStars(review.rating)}
                          {moderationBadge(review.moderationStatus)}
                          {review.verified && (
                            <Badge variant="info" className="text-xs">
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {review.title && (
                      <p className="text-sm font-medium text-text-primary mt-2">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">{review.comment}</p>
                    )}

                    {review.images.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        {review.images.slice(0, 4).map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-border"
                          />
                        ))}
                        {review.images.length > 4 && (
                          <span className="text-xs text-text-muted">
                            +{review.images.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                      <span>
                        By <strong className="text-text-primary">{review.user.name}</strong>
                      </span>
                      <span>{formatDate(review.createdAt)}</span>
                      {review.helpful > 0 && <span>{review.helpful} found helpful</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 lg:flex-col lg:items-end">
                  <button
                    type="button"
                    onClick={() => setPreviewReview(review)}
                    className="p-2 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text-primary transition-colors"
                    title="View full review"
                  >
                    <Eye size={18} />
                  </button>
                  {review.moderationStatus === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(review.id)}
                        disabled={actionLoading === review.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openRejectConfirm(review.id)}
                        disabled={actionLoading === review.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={() => confirmAction && handleReject(confirmAction.id)}
        title="Reject Review"
        message="This will permanently delete the review. This action cannot be undone."
        loading={actionLoading !== null}
        confirmLabel="Reject & Delete"
        destructive
      />

      {previewReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewReview(null)}
        >
          <div
            className="bg-surface rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Review Details</h3>
                <p className="text-sm text-text-muted">{formatDate(previewReview.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReview(null)}
                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {previewReview.product.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewReview.product.images[0]}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-text-primary">{previewReview.product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(previewReview.rating)}
                    <span className="text-sm text-text-muted">({previewReview.rating}/5)</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-text-muted mb-1">Reviewer</p>
                <p className="font-medium text-text-primary">{previewReview.user.name}</p>
                <p className="text-sm text-text-muted">{previewReview.user.email}</p>
              </div>

              {previewReview.title && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Title</p>
                  <p className="font-medium text-text-primary">{previewReview.title}</p>
                </div>
              )}

              {previewReview.comment && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Comment</p>
                  <p className="text-text-primary whitespace-pre-wrap">{previewReview.comment}</p>
                </div>
              )}

              {previewReview.images.length > 0 && (
                <div>
                  <p className="text-sm text-text-muted mb-2">Images</p>
                  <div className="flex flex-wrap gap-2">
                    {previewReview.images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover border border-border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Badge variant={previewReview.moderationStatus === 'APPROVED' ? 'success' : previewReview.moderationStatus === 'REJECTED' ? 'danger' : 'warning'}>
                  {previewReview.moderationStatus === 'APPROVED'
                    ? 'Approved'
                    : previewReview.moderationStatus === 'REJECTED'
                      ? 'Rejected'
                      : 'Pending Approval'}
                </Badge>
                {previewReview.verified && <Badge variant="info">Verified Purchase</Badge>}
              </div>

              {previewReview.moderationStatus === 'PENDING' && (
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(previewReview.id);
                      setPreviewReview(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-success-600 text-white hover:bg-success-700 font-medium transition-colors"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewReview(null);
                      openRejectConfirm(previewReview.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-danger-600 text-white hover:bg-danger-700 font-medium transition-colors"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
