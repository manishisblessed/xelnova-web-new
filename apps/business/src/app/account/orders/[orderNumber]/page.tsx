"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package, Truck, CheckCircle, Clock, ChevronLeft, MapPin, Phone,
  CreditCard, AlertCircle, Ban, RotateCcw, Banknote, Loader2,
  Copy, ShoppingBag, User, XCircle, Download, RefreshCw, Star,
} from "lucide-react";
import { formatCurrency, cn } from "@xelnova/utils";
import { ordersApi, returnsApi, reviewsApi, uploadApi, setAccessToken, type Order, type OrderItem } from "@xelnova/api";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type ItemRow = OrderItem & {
  product?: OrderItem["product"] & {
    isReturnable?: boolean;
    isReplaceable?: boolean;
    returnWindow?: number;
    replacementWindow?: number | null;
    returnPolicyPreset?: string | null;
  };
};

function itemName(item: ItemRow) {
  const n = item.product?.name ?? item.productName;
  const s = n != null ? String(n).trim() : "";
  return s || "Product";
}

function itemImage(item: ItemRow) {
  return item.variantImage || item.product?.images?.[0] || item.productImage;
}

function itemSlug(item: ItemRow) {
  return item.product?.slug;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  PENDING:    { icon: Clock,       color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200", label: "Pending" },
  PROCESSING: { icon: Clock,       color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",  label: "Processing" },
  CONFIRMED:  { icon: CheckCircle, color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",label: "Confirmed" },
  SHIPPED:    { icon: Truck,       color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",label: "Shipped" },
  DELIVERED:  { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", label: "Delivered" },
  CANCELLED:  { icon: Ban,         color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",   label: "Cancelled" },
  RETURNED:   { icon: RotateCcw,   color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",label: "Returned" },
  REFUNDED:   { icon: Banknote,    color: "text-gray-700",    bg: "bg-gray-50",     border: "border-gray-200",  label: "Refunded" },
};

function getStatus(s: string) {
  return statusConfig[s.toUpperCase()] ?? { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", label: s };
}

const PROGRESS_STEPS = ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED"];

const RETURN_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "DEFECTIVE", label: "Damaged / defective" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "SIZE_FIT", label: "Size / fit issue" },
  { value: "CHANGED_MIND", label: "Changed mind" },
  { value: "OTHER", label: "Other" },
];

export default function OrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addItem);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [refundOptions, setRefundOptions] = useState<Awaited<ReturnType<typeof ordersApi.getRefundOptions>> | null>(null);
  const [selectedRefundTo, setSelectedRefundTo] = useState<'WALLET' | 'SOURCE'>('WALLET');
  const [loadingRefundOptions, setLoadingRefundOptions] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnFlowKind, setReturnFlowKind] = useState<"RETURN" | "REPLACEMENT">("RETURN");
  const [returnReasonCode, setReturnReasonCode] = useState("DEFECTIVE");
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnImageUrls, setReturnImageUrls] = useState<string[]>([]);
  const [returnUploadBusy, setReturnUploadBusy] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<Awaited<ReturnType<typeof reviewsApi.getOrderReviewStatus>>>({});
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    syncToken();
    ordersApi
      .getOrderByNumber(params.orderNumber)
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch((e: { message?: string }) => {
        if (!cancelled) setError(e.message ?? "Order not found");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.orderNumber]);

  useEffect(() => {
    if (!order) return;
    const paid = (order as any).paymentStatus === "PAID";
    const eligible = ["CONFIRMED", "SHIPPED", "DELIVERED", "RETURNED", "REFUNDED"].includes(order.status.toUpperCase());
    if (!paid && !eligible) return;
    syncToken();
    reviewsApi
      .getOrderReviewStatus(order.orderNumber)
      .then(setReviewStatus)
      .catch(() => {});
  }, [order]);

  const handleSubmitReview = async () => {
    if (!reviewProductId || reviewRating < 1) return;
    setReviewSubmitting(true);
    try {
      syncToken();
      await reviewsApi.createReview({ productId: reviewProductId, rating: reviewRating, comment: reviewComment.trim() || undefined });
      setReviewStatus((prev) => ({ ...prev, [reviewProductId]: { reviewed: true, rating: reviewRating, status: "PENDING" } }));
      setReviewProductId(null);
      setReviewRating(0);
      setReviewComment("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const canCancel = order && ["PENDING", "PROCESSING", "CONFIRMED"].includes(order.status.toUpperCase());

  const openCancelModal = async () => {
    if (!order) return;
    setCancelModalOpen(true);
    setLoadingRefundOptions(true);
    try {
      syncToken();
      const options = await ordersApi.getRefundOptions(order.orderNumber);
      setRefundOptions(options);
      // Default to wallet if source not available
      const sourceOption = options.options.find(o => o.destination === 'SOURCE');
      setSelectedRefundTo(sourceOption?.available ? 'WALLET' : 'WALLET');
    } catch {
      setRefundOptions(null);
    } finally {
      setLoadingRefundOptions(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      syncToken();
      const updated = await ordersApi.cancelOrder(order.orderNumber, cancelReason || undefined, selectedRefundTo);
      setOrder(updated);
      setCancelModalOpen(false);
      setCancelReason("");
      setRefundOptions(null);
      // Show refund message if available
      if ((updated as any).refundMessage) {
        alert((updated as any).refundMessage);
      }
    } catch (e: any) {
      alert(e.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const returnEligibility = useMemo(() => {
    if (!order || order.status.toUpperCase() !== "DELIVERED") return null;
    const items = Array.isArray(order.items) ? (order.items as ItemRow[]) : [];
    if (!items.length) return null;
    const deliveredAt = order.shipment?.deliveredAt
      ? new Date(order.shipment.deliveredAt)
      : new Date(order.updatedAt || order.createdAt);
    const days = Math.floor((Date.now() - deliveredAt.getTime()) / (24 * 60 * 60 * 1000));

    const hasNonReturnable = items.some(
      (i) => i.product?.returnPolicyPreset === "NON_RETURNABLE",
    );
    const hasReplacementOnly = items.some(
      (i) => i.product?.returnPolicyPreset === "REPLACEMENT_ONLY",
    );

    const allReturnable =
      !hasNonReturnable &&
      !hasReplacementOnly &&
      items.every((i) => i.product?.isReturnable !== false);
    const allReplaceable =
      !hasNonReturnable && items.every((i) => !!i.product?.isReplaceable);

    const returnWindows = items.map((i) => Number(i.product?.returnWindow ?? 7));
    const replWindows = items.map((i) =>
      Number(i.product?.replacementWindow ?? i.product?.returnWindow ?? 7),
    );
    const returnLimit = Math.min(...returnWindows);
    const replLimit = Math.min(...replWindows);
    return {
      canReturn: allReturnable && days <= returnLimit,
      canReplace: allReplaceable && days <= replLimit,
      daysSinceDelivery: days,
      returnLimit,
      replLimit,
      hasNonReturnable,
      hasReplacementOnly,
    };
  }, [order]);

  const openReturnModal = (kind: "RETURN" | "REPLACEMENT") => {
    setReturnFlowKind(kind);
    setReturnReasonCode("DEFECTIVE");
    setReturnReason("");
    setReturnDescription("");
    setReturnImageUrls([]);
    setReturnModalOpen(true);
  };

  const handleReturnRequest = async () => {
    if (!order) return;
    if (returnReasonCode === "OTHER" && !returnDescription.trim() && !returnReason.trim()) {
      alert("Please add a short description for your request.");
      return;
    }
    setSubmittingReturn(true);
    try {
      syncToken();
      await returnsApi.createReturn(order.orderNumber, {
        kind: returnFlowKind,
        reasonCode: returnReasonCode,
        reason: returnReason.trim() || undefined,
        description: returnDescription.trim() || undefined,
        imageUrls: returnImageUrls.length ? returnImageUrls : undefined,
      });
      setReturnModalOpen(false);
      setReturnReason("");
      setReturnDescription("");
      setReturnImageUrls([]);
      alert("Request submitted successfully. The seller and our team have been notified.");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      syncToken();
      const blob = await ordersApi.downloadInvoice(order.orderNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${order.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Failed to download invoice");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleReorder = () => {
    if (!order) return;
    const items = Array.isArray(order.items) ? (order.items as ItemRow[]) : [];
    for (const item of items) {
      addToCart({
        id: item.productId,
        productId: item.productId,
        name: itemName(item),
        slug: itemSlug(item) || "",
        price: item.price,
        comparePrice: 0,
        image: itemImage(item) || "",
        variant: item.variant || undefined,
        seller: "",
      }, item.quantity);
    }
    router.push("/cart");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        <p className="mt-4 text-sm text-text-secondary">Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-danger-500" />
        <h2 className="mt-4 text-lg font-bold text-text-primary">Order Not Found</h2>
        <p className="mt-1 text-sm text-text-secondary">{error || "We couldn't find this order."}</p>
        <Link href="/account/orders" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ChevronLeft size={14} /> Back to Orders
        </Link>
      </div>
    );
  }

  const st = getStatus(order.status);
  const StatusIcon = st.icon;
  const isCancelled = ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status.toUpperCase());
  const stepIdx = PROGRESS_STEPS.indexOf(order.status.toUpperCase());
  const addr = order.shippingAddress;
  const lineItems = Array.isArray(order.items) ? (order.items as ItemRow[]) : [];

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
  };

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ChevronLeft size={16} /> Back to My Orders
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary">Order #{order.orderNumber}</h2>
              <button onClick={copyOrderNumber} className="p-1 rounded hover:bg-gray-100 text-text-muted" title="Copy order number">
                <Copy size={14} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${st.color} ${st.bg} ${st.border} border`}>
              <StatusIcon size={15} /> {st.label}
            </span>
            {canCancel && (
              <button
                onClick={() => void openCancelModal()}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <XCircle size={15} /> Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="mt-6 flex items-center">
            {PROGRESS_STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              const StepIcon = statusConfig[step]?.icon || Package;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`flex items-center justify-center h-9 w-9 rounded-full border-2 transition-colors ${
                      done ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
                    } ${active ? "ring-2 ring-emerald-200" : ""}`}>
                      {done ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <StepIcon size={15} className="text-gray-400" />
                      )}
                    </div>
                    <span className={`text-[11px] mt-1.5 font-medium ${done ? "text-emerald-700" : "text-text-muted"}`}>
                      {statusConfig[step]?.label}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 -mx-1 rounded ${i < stepIdx ? "bg-emerald-400" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCancelled && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 ${st.bg} ${st.border} border`}>
            <StatusIcon size={16} className={st.color} />
            <span className={`text-sm font-medium ${st.color}`}>This order has been {order.status.toLowerCase()}</span>
          </div>
        )}

        {order.estimatedDelivery && !isCancelled && order.status.toUpperCase() !== "DELIVERED" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <Truck size={15} className="text-primary-600" />
            <span>
              Estimated delivery:{" "}
              <strong className="text-text-primary">
                {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
              </strong>
            </span>
          </div>
        )}
      </motion.div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        {/* Items + Price breakdown */}
        <div className="min-w-0 space-y-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-text-primary mb-4">
              Items ({lineItems.length})
            </h3>
            {lineItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center">
                <Package className="mx-auto h-10 w-10 text-text-muted/70" aria-hidden />
                <p className="mt-3 text-sm font-medium text-text-primary">No products listed for this order</p>
                <p className="mt-1.5 text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                  Your totals are still shown below. Refresh the page or contact support if this looks wrong.
                </p>
              </div>
            ) : (
            <div className="space-y-3">
              {lineItems.map((item, i) => {
                const img = itemImage(item);
                const name = itemName(item);
                const slug = itemSlug(item);
                return (
                  <div key={item.id ?? i} className="flex gap-3 items-center rounded-xl border border-border p-3">
                    {slug ? (
                      <Link href={`/products/${slug}`} className="h-16 w-16 rounded-lg bg-gray-50 border border-border overflow-hidden shrink-0 flex items-center justify-center hover:border-primary-300 transition-colors">
                        {img ? (
                          <Image src={img} alt={name} width={64} height={64} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={22} className="text-gray-300" />
                        )}
                      </Link>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-50 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {img ? (
                          <Image src={img} alt={name} width={64} height={64} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={22} className="text-gray-300" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {slug ? (
                        <Link href={`/products/${slug}`} className="font-medium text-text-primary text-sm truncate block hover:text-primary-600 transition-colors">{name}</Link>
                      ) : (
                        <p className="font-medium text-text-primary text-sm truncate">{name}</p>
                      )}
                      <p className="text-xs text-text-muted mt-0.5">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                      {item.product?.xelnovaProductId ? (
                        <p className="text-[10px] font-mono text-text-muted mt-0.5">{item.product.xelnovaProductId}</p>
                      ) : null}
                      {item.variantSku || (item.variantAttributes && Object.keys(item.variantAttributes).length > 0) ? (
                        <div className="mt-1 space-y-0.5 text-[11px] text-text-secondary">
                          {item.variantAttributes &&
                            Object.entries(item.variantAttributes).map(([k, v]) => (
                              <p key={k} className="text-text-muted">
                                <span className="font-medium text-text-secondary">{k}:</span> {v}
                              </p>
                            ))}
                          {item.variantSku ? (
                            <p className="text-text-muted">
                              SKU:{' '}
                              <code className="font-mono text-[11px] bg-surface-muted px-1 rounded">{item.variantSku}</code>
                            </p>
                          ) : null}
                        </div>
                      ) : item.variant && item.variant !== '__default__' ? (
                        <p className="text-xs text-text-muted mt-0.5">Variant: {item.variant.replace(/-/g, ' / ')}</p>
                      ) : null}
                    </div>
                    <p className="font-bold text-text-primary text-sm shrink-0">
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                );
              })}
            </div>
            )}

            {/* Price breakdown */}
            <div className="mt-5 pt-4 border-t border-border space-y-2.5 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-muted">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? <span className="font-semibold text-success-600">FREE</span> : formatCurrency(order.shipping)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Tax (GST)</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-text-primary text-base pt-2.5 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Order meta */}
        <div className="min-w-0 space-y-3">
          {/* Shipping address */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-white p-3 shadow-card sm:p-4">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
              <MapPin size={14} /> Shipping Address
            </h3>
            {addr ? (
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-text-primary">{addr.fullName}</p>
                <p className="text-text-secondary">{addr.addressLine1}</p>
                {addr.addressLine2 && <p className="text-text-secondary">{addr.addressLine2}</p>}
                <p className="text-text-secondary">{addr.city}, {addr.state} — {addr.pincode}</p>
                <p className="flex items-center gap-1 text-text-muted mt-1">
                  <Phone size={11} /> {addr.phone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No address on file</p>
            )}
          </motion.div>

          {/* Payment */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-white p-3 shadow-card sm:p-4">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
              <CreditCard size={14} /> Payment
            </h3>
            <div className="text-xs space-y-1.5">
              <p className="text-text-secondary capitalize">{order.paymentMethod?.replace("_", " ") || "N/A"}</p>
              {order.couponCode && (
                <p className="text-success-600 text-xs font-medium">Coupon applied: {order.couponCode}</p>
              )}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-white p-3 shadow-card sm:p-4 space-y-2">
            <h3 className="text-sm font-bold text-text-primary mb-2">Actions</h3>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="w-full flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {downloadingInvoice ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Download Invoice
            </button>
            <button
              onClick={handleReorder}
              className="w-full flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <RefreshCw size={15} /> Buy Again
            </button>
            {returnEligibility?.canReturn && (
              <button
                onClick={() => openReturnModal("RETURN")}
                className="w-full flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              >
                <RotateCcw size={15} /> Return item
              </button>
            )}
            {returnEligibility?.canReplace && (
              <button
                onClick={() => openReturnModal("REPLACEMENT")}
                className="w-full flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                <RefreshCw size={15} /> Request replacement
              </button>
            )}
            {order?.status.toUpperCase() === "DELIVERED" && returnEligibility && !returnEligibility.canReturn && !returnEligibility.canReplace && (
              <p className="text-xs text-text-muted text-center px-1">
                {returnEligibility.hasNonReturnable
                  ? "This order contains a non-returnable product."
                  : returnEligibility.hasReplacementOnly && !returnEligibility.canReplace
                    ? "Replacement window has ended for this order."
                    : "Return or replacement window has ended for this order."}
              </p>
            )}
          </motion.div>

          {/* Rate & Review */}
          {order && ((order as any).paymentStatus === "PAID" || ["CONFIRMED", "SHIPPED", "DELIVERED", "RETURNED", "REFUNDED"].includes(order.status.toUpperCase())) && order.items?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-2xl border border-border bg-white p-3 shadow-card sm:p-4 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Star size={15} className="text-amber-500" /> Rate &amp; Review
              </h3>
              <div className="space-y-2">
                {(order.items as ItemRow[]).map((item) => {
                  const reviewed = reviewStatus[item.productId];
                  const isOpen = reviewProductId === item.productId;
                  return (
                    <div key={item.productId} className="rounded-xl border border-border p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        {itemImage(item) && (
                          <Image src={itemImage(item)!} alt={itemName(item)} width={36} height={36} className="rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{itemName(item)}</p>
                          {reviewed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              <CheckCircle size={10} /> Reviewed ({reviewed.rating}★)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewProductId(isOpen ? null : item.productId);
                                setReviewRating(0);
                                setReviewComment("");
                              }}
                              className="text-[10px] font-semibold text-primary-600 hover:text-primary-700"
                            >
                              {isOpen ? "Cancel" : "Write a Review"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isOpen && !reviewed && (
                        <div className="space-y-2 pt-1 border-t border-border">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setReviewHover(star)}
                                onMouseLeave={() => setReviewHover(0)}
                                onClick={() => setReviewRating(star)}
                                className="p-0.5"
                              >
                                <Star
                                  size={20}
                                  className={cn(
                                    "transition-colors",
                                    (reviewHover || reviewRating) >= star
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-gray-300",
                                  )}
                                />
                              </button>
                            ))}
                            {reviewRating > 0 && (
                              <span className="text-xs text-text-muted ml-1">{reviewRating}/5</span>
                            )}
                          </div>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share your experience (optional)"
                            rows={2}
                            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSubmitReview()}
                            disabled={reviewSubmitting || reviewRating < 1}
                            className="w-full rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {reviewSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
                            Submit Review
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Need help */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-border bg-gradient-to-br from-primary-50 to-blue-50 p-5">
            <h3 className="text-sm font-bold text-text-primary mb-1">Need Help?</h3>
            <p className="text-xs text-text-secondary mb-3">
              Have a question about this order? Our support team is here to help.
            </p>
            <Link href="/support" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              Contact Support
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-50">
                <XCircle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Cancel Order</h3>
                <p className="text-sm text-text-secondary">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              Are you sure you want to cancel order <strong>#{order.orderNumber}</strong>?
            </p>

            {/* Refund Options */}
            {order.paymentStatus === "PAID" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  Where should we send your refund?
                </label>
                {loadingRefundOptions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-primary-600" />
                  </div>
                ) : refundOptions ? (
                  <div className="space-y-2">
                    {refundOptions.options.map((option) => (
                      <label
                        key={option.destination}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          !option.available 
                            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                            : selectedRefundTo === option.destination
                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                            : 'border-border hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="refundTo"
                          value={option.destination}
                          checked={selectedRefundTo === option.destination}
                          onChange={() => setSelectedRefundTo(option.destination)}
                          disabled={!option.available}
                          className="mt-1 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">{option.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-muted">
                              {option.timeline}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{option.description}</p>
                        </div>
                      </label>
                    ))}
                    <p className="text-xs text-text-muted mt-2">
                      Refund amount: <strong className="text-text-primary">₹{refundOptions.refundAmount}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">Refund will be credited to your Xelnova Wallet.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Reason for cancellation <span className="text-text-muted">(optional)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed my mind, found a better price, ordered by mistake..."
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setCancelModalOpen(false); setCancelReason(""); setRefundOptions(null); }}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => void handleCancelOrder()}
                disabled={cancelling || loadingRefundOptions}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Order"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return / replacement modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full ${
                  returnFlowKind === "REPLACEMENT" ? "bg-indigo-50" : "bg-orange-50"
                }`}
              >
                {returnFlowKind === "REPLACEMENT" ? (
                  <RefreshCw size={22} className="text-indigo-600" />
                ) : (
                  <RotateCcw size={22} className="text-orange-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {returnFlowKind === "REPLACEMENT" ? "Request replacement" : "Request return"}
                </h3>
                <p className="text-sm text-text-secondary">Order #{order?.orderNumber}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Reason</label>
              <select
                value={returnReasonCode}
                onChange={(e) => setReturnReasonCode(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {RETURN_REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Notes <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Short summary for the seller"
                rows={2}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Details {returnReasonCode === "OTHER" ? <span className="text-red-500">*</span> : null}
              </label>
              <textarea
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                placeholder="Describe the issue (required when reason is Other)"
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Photos <span className="text-text-muted font-normal">(optional, up to 3)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={returnUploadBusy || returnImageUrls.length >= 3}
                className="block w-full text-xs text-text-secondary file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3 - returnImageUrls.length);
                  if (!files.length) return;
                  setReturnUploadBusy(true);
                  try {
                    syncToken();
                    const urls: string[] = [];
                    for (const f of files) {
                      urls.push(await uploadApi.uploadImage(f));
                    }
                    setReturnImageUrls((prev) => [...prev, ...urls].slice(0, 3));
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setReturnUploadBusy(false);
                    e.target.value = "";
                  }
                }}
              />
              {returnImageUrls.length > 0 && (
                <p className="text-xs text-text-muted mt-1">{returnImageUrls.length} image(s) attached</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnReason("");
                  setReturnDescription("");
                  setReturnImageUrls([]);
                }}
                disabled={submittingReturn}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReturnRequest()}
                disabled={
                  submittingReturn ||
                  returnUploadBusy ||
                  (returnReasonCode === "OTHER" && !returnDescription.trim() && !returnReason.trim())
                }
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReturn ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
