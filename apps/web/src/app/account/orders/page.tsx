"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  ChevronRight,
  Truck,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Ban,
  RotateCcw,
  Banknote,
  ShoppingBag,
  Star,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, friendlyError } from "@xelnova/utils";
import {
  ordersApi,
  reviewsApi,
  setAccessToken,
  type Order,
  type OrderItem,
} from "@xelnova/api";
import { getReturnEligibility } from "@/lib/orders/return-eligibility";

function syncTokenFromCookie() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type ItemRow = OrderItem & {
  product?: { name?: string; slug?: string; images?: string[] };
};

function itemName(item: ItemRow) {
  return item.product?.name ?? item.productName;
}

function itemImage(item: ItemRow) {
  return item.product?.images?.[0] ?? item.productImage;
}

function itemSlug(item: ItemRow) {
  return item.product?.slug;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  PENDING:    { icon: Clock,       color: "text-text-muted",    bg: "bg-gray-100",      label: "Pending" },
  PROCESSING: { icon: Clock,       color: "text-accent-600",    bg: "bg-accent-50",     label: "Processing" },
  CONFIRMED:  { icon: CheckCircle, color: "text-primary-600",   bg: "bg-primary-50",    label: "Confirmed" },
  SHIPPED:    { icon: Truck,       color: "text-info-600",      bg: "bg-info-50",       label: "Shipped" },
  DELIVERED:  { icon: CheckCircle, color: "text-success-600",   bg: "bg-success-50",    label: "Delivered" },
  CANCELLED:  { icon: Ban,         color: "text-danger-600",    bg: "bg-danger-50",     label: "Cancelled" },
  RETURNED:   { icon: RotateCcw,   color: "text-accent-700",    bg: "bg-accent-50",     label: "Returned" },
  REFUNDED:   { icon: Banknote,    color: "text-accent-700",    bg: "bg-accent-50",     label: "Refunded" },
};

function statusDisplay(status: string) {
  const key = status.toUpperCase();
  return statusConfig[key] ?? { icon: AlertCircle, color: "text-text-muted", bg: "bg-gray-100", label: status.replace(/_/g, " ") };
}

type ReviewedMap = Record<string, { reviewed: true; rating: number; status: string }>;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewedByOrder, setReviewedByOrder] = useState<Record<string, ReviewedMap>>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState<{ key: string; value: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    syncTokenFromCookie();
    ordersApi
      .getOrders()
      .then((data) => { if (!cancelled) setOrders(data); })
      .catch((e: { response?: { data?: { message?: string } }; message?: string }) => {
        if (!cancelled) setError(e.response?.data?.message ?? e.message ?? "Failed to load orders");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Pull review status only for orders that are eligible (delivered family).
  // Runs once orders are loaded; one tiny request per eligible order.
  useEffect(() => {
    if (!orders.length) return;
    const eligible = orders.filter((o) =>
      ["DELIVERED", "RETURNED", "REFUNDED"].includes(o.status.toUpperCase()),
    );
    if (!eligible.length) return;
    let cancelled = false;
    syncTokenFromCookie();
    Promise.all(
      eligible.map((o) =>
        reviewsApi
          .getOrderReviewStatus(o.orderNumber)
          .then((status) => [o.orderNumber, status] as const)
          .catch(() => [o.orderNumber, {} as ReviewedMap] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setReviewedByOrder((prev) => {
        const next = { ...prev };
        for (const [num, status] of entries) next[num] = status;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [orders]);

  const handleQuickRate = async (orderNumber: string, productId: string, rating: number) => {
    const key = `${orderNumber}:${productId}`;
    setSubmittingRating(key);
    try {
      syncTokenFromCookie();
      await reviewsApi.createReview({ productId, rating });
      setReviewedByOrder((prev) => ({
        ...prev,
        [orderNumber]: {
          ...(prev[orderNumber] ?? {}),
          [productId]: { reviewed: true, rating, status: "PENDING" },
        },
      }));
      toast.success("Thanks for rating! You can add a written review from order details.");
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save your rating. Please try again."));
    } finally {
      setSubmittingRating(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">My Orders</h2>
        {orders.length > 0 && (
          <span className="text-xs font-medium text-text-muted bg-surface-muted px-3 py-1 rounded-full">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-text-secondary">Loading your orders…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
          <p className="mt-3 text-sm text-text-primary">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-card">
          <div className="rounded-full bg-primary-50 p-5 mb-4">
            <ShoppingBag size={36} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No orders yet</h3>
          <p className="mt-1 text-sm text-text-secondary max-w-xs">
            When you place your first order, it will show up here.
          </p>
          <Link
            href="/products"
            className="mt-5 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => {
            const status = statusDisplay(order.status);
            const StatusIcon = status.icon;
            const eligibility = getReturnEligibility(order);
            const reviewed = reviewedByOrder[order.orderNumber] ?? {};
            const isDeliveredFamily = ["DELIVERED", "RETURNED", "REFUNDED"].includes(
              order.status.toUpperCase(),
            );
            const items = (order.items ?? []) as ItemRow[];
            const unrated = isDeliveredFamily ? items.filter((it) => !reviewed[it.productId]) : [];
            const showReturnBar = !!eligibility && (eligibility.canReturn || eligibility.canReplace);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-bold text-text-primary">Order #{order.orderNumber}</p>
                    <p className="text-xs text-text-secondary">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.color} ${status.bg}`}>
                    <StatusIcon size={13} /> {status.label}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {(order.items as ItemRow[]).map((item, idx) => {
                    const img = itemImage(item);
                    const name = itemName(item);
                    const slug = itemSlug(item);
                    const cls = `flex items-center gap-3 ${slug ? "group cursor-pointer" : ""}`;
                    const hoverBorder = slug ? "group-hover:border-primary-300 transition-colors" : "";
                    const hoverText = slug ? "group-hover:text-primary-600 transition-colors" : "";
                    const content = (
                      <>
                        <div className={`h-12 w-12 rounded-lg bg-surface-muted border border-border-light overflow-hidden flex items-center justify-center flex-shrink-0 ${hoverBorder}`}>
                          {img ? (
                            <Image src={img} alt={name} width={48} height={48} className="h-full w-full object-cover" />
                          ) : (
                            <Package size={20} className="text-text-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium text-text-primary truncate ${hoverText}`}>{name}</p>
                          <p className="text-xs text-text-secondary">Qty: {item.quantity}</p>
                        </div>
                      </>
                    );
                    return slug ? (
                      <Link key={item.id ?? idx} href={`/products/${slug}`} className={cls}>{content}</Link>
                    ) : (
                      <div key={item.id ?? idx} className={cls}>{content}</div>
                    );
                  })}
                </div>

                {/* Quick rate — surfaces stars right on the card so customers don't need to open details */}
                {isDeliveredFamily && unrated.length > 0 && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                      <Star size={13} className="fill-amber-500 text-amber-500" />
                      {unrated.length === 1 ? "Rate your purchase" : `Rate ${unrated.length} items from this order`}
                    </p>
                    <div className="space-y-1.5">
                      {unrated.map((it) => {
                        const key = `${order.orderNumber}:${it.productId}`;
                        const busy = submittingRating === key;
                        const hovered = hoverRating?.key === key ? hoverRating.value : 0;
                        return (
                          <div key={it.productId} className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary truncate flex-1 min-w-0">
                              {itemName(it)}
                            </span>
                            <div
                              className="flex items-center"
                              onMouseLeave={() => setHoverRating(null)}
                            >
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={busy}
                                  aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                                  onMouseEnter={() => setHoverRating({ key, value: s })}
                                  onClick={() => void handleQuickRate(order.orderNumber, it.productId, s)}
                                  className="p-0.5 disabled:opacity-50"
                                >
                                  <Star
                                    size={16}
                                    className={
                                      hovered >= s
                                        ? "fill-amber-400 text-amber-400 transition-colors"
                                        : "text-gray-300 hover:text-amber-300 transition-colors"
                                    }
                                  />
                                </button>
                              ))}
                              {busy && <Loader2 size={12} className="ml-1 animate-spin text-amber-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Return / replacement bar with days-left countdown */}
                {showReturnBar && eligibility && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/60 px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-orange-800">
                      {eligibility.canReturn
                        ? `${eligibility.daysLeftToReturn} day${eligibility.daysLeftToReturn === 1 ? "" : "s"} left to return`
                        : `${eligibility.daysLeftToReplace} day${eligibility.daysLeftToReplace === 1 ? "" : "s"} left to replace`}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {eligibility.canReturn && (
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-orange-300 px-3 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                          <RotateCcw size={11} /> Return
                        </Link>
                      )}
                      {eligibility.canReplace && (
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-300 px-3 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <RefreshCw size={11} /> Replace
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border-light pt-3">
                  <p className="text-sm font-bold text-text-primary">Total: {formatCurrency(order.total)}</p>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    View Details <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
