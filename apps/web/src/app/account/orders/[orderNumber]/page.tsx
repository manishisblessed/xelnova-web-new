"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package, Truck, CheckCircle, Clock, ChevronLeft, MapPin, Phone,
  CreditCard, AlertCircle, Ban, RotateCcw, Banknote, Loader2,
  Copy, ShoppingBag, User, XCircle, Download, RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@xelnova/utils";
import { ordersApi, returnsApi, setAccessToken, type Order, type OrderItem } from "@xelnova/api";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type ItemRow = OrderItem & { product?: { name?: string; images?: string[] } };

function itemName(item: ItemRow) {
  return item.product?.name ?? item.productName;
}

function itemImage(item: ItemRow) {
  return item.product?.images?.[0] ?? item.productImage;
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
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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

  const canCancel = order && ["PENDING", "PROCESSING", "CONFIRMED"].includes(order.status.toUpperCase());

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      syncToken();
      const updated = await ordersApi.cancelOrder(order.orderNumber, cancelReason || undefined);
      setOrder(updated);
      setCancelModalOpen(false);
      setCancelReason("");
    } catch (e: any) {
      alert(e.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const canReturn = order && order.status.toUpperCase() === "DELIVERED";

  const handleReturnRequest = async () => {
    if (!order || !returnReason.trim()) return;
    setSubmittingReturn(true);
    try {
      syncToken();
      await returnsApi.createReturn(order.orderNumber, returnReason);
      setReturnModalOpen(false);
      setReturnReason("");
      alert("Return request submitted successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to submit return request");
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
    for (const item of order.items as ItemRow[]) {
      addToCart({
        id: item.productId,
        productId: item.productId,
        name: itemName(item),
        slug: "",
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

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
  };

  return (
    <div className="space-y-5">
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
                onClick={() => setCancelModalOpen(true)}
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

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Items + Price breakdown */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-text-primary mb-4">
              Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {(order.items as ItemRow[]).map((item, i) => {
                const img = itemImage(item);
                const name = itemName(item);
                return (
                  <div key={item.id ?? i} className="flex gap-3 items-center rounded-xl border border-border p-3">
                    <div className="h-16 w-16 rounded-lg bg-gray-50 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <Image src={img} alt={name} width={64} height={64} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={22} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{name}</p>
                      <p className="text-xs text-text-muted mt-0.5">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                      {item.variant && <p className="text-xs text-text-muted">Variant: {item.variant}</p>}
                    </div>
                    <p className="font-bold text-text-primary text-sm shrink-0">
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                );
              })}
            </div>

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

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Shipping address */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
              <MapPin size={14} /> Shipping Address
            </h3>
            {addr ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-text-primary">{addr.fullName}</p>
                <p className="text-text-secondary">{addr.addressLine1}</p>
                {addr.addressLine2 && <p className="text-text-secondary">{addr.addressLine2}</p>}
                <p className="text-text-secondary">{addr.city}, {addr.state} — {addr.pincode}</p>
                <p className="flex items-center gap-1 text-text-muted mt-1.5">
                  <Phone size={12} /> {addr.phone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No address on file</p>
            )}
          </motion.div>

          {/* Payment */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
              <CreditCard size={14} /> Payment
            </h3>
            <div className="text-sm space-y-1.5">
              <p className="text-text-secondary capitalize">{order.paymentMethod?.replace("_", " ") || "N/A"}</p>
              {order.couponCode && (
                <p className="text-success-600 text-xs font-medium">Coupon applied: {order.couponCode}</p>
              )}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-2.5">
            <h3 className="text-sm font-bold text-text-primary mb-3">Actions</h3>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="w-full flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {downloadingInvoice ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Download Invoice
            </button>
            <button
              onClick={handleReorder}
              className="w-full flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <RefreshCw size={15} /> Buy Again
            </button>
            {canReturn && (
              <button
                onClick={() => setReturnModalOpen(true)}
                className="w-full flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              >
                <RotateCcw size={15} /> Request Return
              </button>
            )}
          </motion.div>

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
              {order.paymentMethod !== "cod" && " If payment was made, a refund will be initiated."}
            </p>

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
                onClick={() => { setCancelModalOpen(false); setCancelReason(""); }}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => void handleCancelOrder()}
                disabled={cancelling}
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

      {/* Return Request Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-50">
                <RotateCcw size={22} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Request Return</h3>
                <p className="text-sm text-text-secondary">Order #{order?.orderNumber}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Reason for return <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Product damaged, wrong item received, not as described..."
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setReturnModalOpen(false); setReturnReason(""); }}
                disabled={submittingReturn}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReturnRequest()}
                disabled={submittingReturn || !returnReason.trim()}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReturn ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Return"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
