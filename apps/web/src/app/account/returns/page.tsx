"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Banknote,
} from "lucide-react";
import { formatCurrency } from "@xelnova/utils";
import { returnsApi, setAccessToken } from "@xelnova/api";

type ReturnRequest = Awaited<ReturnType<typeof returnsApi.getReturns>>[number];

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  REQUESTED: { icon: Clock, color: "text-amber-700", bg: "bg-amber-50", label: "Requested" },
  APPROVED: { icon: CheckCircle, color: "text-blue-700", bg: "bg-blue-50", label: "Approved" },
  REJECTED: { icon: XCircle, color: "text-red-700", bg: "bg-red-50", label: "Rejected" },
  PICKED_UP: { icon: Truck, color: "text-purple-700", bg: "bg-purple-50", label: "Picked Up" },
  REFUNDED: { icon: Banknote, color: "text-emerald-700", bg: "bg-emerald-50", label: "Refunded" },
};

function getStatus(s: string) {
  return (
    statusConfig[s.toUpperCase()] ?? {
      icon: AlertCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
      label: s,
    }
  );
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    syncToken();
    returnsApi
      .getReturns()
      .then((data) => {
        if (!cancelled) setReturns(data);
      })
      .catch((e: { message?: string }) => {
        if (!cancelled) setError(e.message ?? "Failed to load returns");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Returns & Refunds</h2>
        {returns.length > 0 && (
          <span className="text-xs font-medium text-text-muted bg-surface-muted px-3 py-1 rounded-full">
            {returns.length} request{returns.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-text-secondary">Loading returns…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
          <p className="mt-3 text-sm text-text-primary">{error}</p>
        </div>
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-card">
          <div className="rounded-full bg-primary-50 p-5 mb-4">
            <RotateCcw size={36} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No return requests</h3>
          <p className="mt-1 text-sm text-text-secondary max-w-xs">
            You haven&apos;t submitted any return requests yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((req, i) => {
            const st = getStatus(req.status);
            const StatusIcon = st.icon;
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-bold text-text-primary">
                      Order #{req.order.orderNumber}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Requested on{" "}
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${st.color} ${st.bg}`}
                  >
                    <StatusIcon size={13} /> {st.label}
                  </span>
                </div>

                <p className="text-sm text-text-secondary mb-2">
                  <span className="font-medium text-text-primary">Reason:</span> {req.reason}
                </p>

                {req.adminNote && (
                  <p className="text-sm text-text-secondary mb-2">
                    <span className="font-medium text-text-primary">Admin note:</span>{" "}
                    {req.adminNote}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-border-light pt-3 mt-3">
                  <p className="text-sm text-text-secondary">
                    Refund amount:{" "}
                    <span className="font-bold text-text-primary">
                      {req.refundAmount != null
                        ? formatCurrency(req.refundAmount)
                        : formatCurrency(req.order.total)}
                    </span>
                  </p>
                  <Link
                    href={`/account/orders/${req.order.orderNumber}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    View Order
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
