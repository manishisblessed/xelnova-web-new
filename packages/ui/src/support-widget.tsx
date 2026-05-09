"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Headphones,
  HelpCircle,
  MessageCircle,
  Package,
  RotateCcw,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@xelnova/utils";

export type SupportWidgetAudience = "customer" | "seller";

const FAQ_CUSTOMER: { q: string; a: string }[] = [
  {
    q: "Where is my order?",
    a: "Open My Orders, select the order, and use Track Shipment. Tracking updates when the courier scans your package.",
  },
  {
    q: "How do returns work?",
    a: "Start a return from the order detail page if the item is eligible. You will get pickup or drop-off steps and refund timelines in-app.",
  },
  {
    q: "Payment failed — what now?",
    a: "Retry checkout with the same or another method. If money was debited but no order was created, your bank usually reverses within a few days.",
  },
];

const FAQ_SELLER: { q: string; a: string }[] = [
  {
    q: "When can I ship an order?",
    a: "After payment is received the order becomes eligible to ship. Use Ship Now from the order detail page to book pickup or add a self-ship AWB.",
  },
  {
    q: "How do payouts work?",
    a: "Settlements follow your dashboard schedule. Ensure bank details are verified under Wallet / Profile to avoid delays.",
  },
  {
    q: "Courier or AWB errors?",
    a: "Check Shipping settings and pickup address registration. If booking fails, read the error message — it often indicates pincode serviceability or missing pickup phone.",
  },
];

const CATEGORIES_CUSTOMER = [
  { id: "orders", label: "Orders & tracking", icon: Package },
  { id: "returns", label: "Returns & refunds", icon: RotateCcw },
  { id: "delivery", label: "Delivery & delays", icon: Truck },
] as const;

const CATEGORIES_SELLER = [
  { id: "orders", label: "Orders & shipping", icon: Package },
  { id: "listings", label: "Listings & inventory", icon: Store },
  { id: "support", label: "Tickets & disputes", icon: Headphones },
] as const;

function TawkLoader() {
  useEffect(() => {
    const propId =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim()
        : "";
    const widgetId =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim()
        : "";
    if (!propId || !widgetId || typeof window === "undefined") return;
    if (document.getElementById("tawkto-xelnova")) return;

    const s = document.createElement("script");
    s.id = "tawkto-xelnova";
    s.async = true;
    s.src = `https://embed.tawk.to/${propId}/${widgetId}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.head.appendChild(s);
  }, []);
  return null;
}

export interface SupportWidgetProps {
  audience: SupportWidgetAudience;
  /** Optional note under the header (e.g. SLA or hours). */
  subheading?: ReactNode;
  className?: string;
}

/**
 * Floating help entry: loads Tawk.to when `NEXT_PUBLIC_TAWK_PROPERTY_ID` and
 * `NEXT_PUBLIC_TAWK_WIDGET_ID` are set; otherwise shows an in-app panel with
 * FAQs and quick categories suitable for customers or sellers.
 */
export function SupportWidget({
  audience,
  subheading,
  className,
}: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const tawkEnabled = useMemo(() => {
    const a = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();
    const b = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim();
    return Boolean(a && b);
  }, []);

  const faqs = audience === "seller" ? FAQ_SELLER : FAQ_CUSTOMER;
  const categories =
    audience === "seller" ? CATEGORIES_SELLER : CATEGORIES_CUSTOMER;

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
  }, [faqs, query]);

  if (tawkEnabled) {
    return <TawkLoader />;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6",
          className,
        )}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mb-1 w-[min(100vw-2rem,22rem)] max-h-[min(72dvh,28rem)] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border bg-surface-muted/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <MessageCircle size={16} className="text-primary-600 shrink-0" />
                    {audience === "seller" ? "Seller support" : "Help & support"}
                  </p>
                  {subheading ? (
                    <p className="text-xs text-text-muted mt-0.5">{subheading}</p>
                  ) : (
                    <p className="text-xs text-text-muted mt-0.5">
                      Search FAQs or live chat when Tawk is connected via env.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-primary"
                  aria-label="Close support"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 border-b border-border space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Quick topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setQuery(c.label)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:border-primary-300 hover:text-primary-700"
                      >
                        <Icon size={12} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-3 pt-2 pb-1">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help..."
                    className="w-full rounded-xl border border-border bg-gray-50 py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
                {filteredFaq.length === 0 ? (
                  <p className="text-xs text-text-muted py-6 text-center">
                    No matching articles. Try another phrase or contact support
                    from your account area.
                  </p>
                ) : (
                  filteredFaq.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-border bg-white open:shadow-sm"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium text-text-primary">
                        <span className="flex items-start gap-2 min-w-0">
                          <HelpCircle
                            size={14}
                            className="text-primary-500 shrink-0 mt-0.5"
                          />
                          <span>{item.q}</span>
                        </span>
                        <ChevronDown
                          size={14}
                          className="text-text-muted shrink-0 transition group-open:rotate-180"
                        />
                      </summary>
                      <p className="px-3 pb-3 pt-0 text-[11px] leading-relaxed text-text-secondary border-t border-border/60">
                        {item.a}
                      </p>
                    </details>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            "inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
            "bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2",
          )}
          aria-expanded={open}
          aria-label={open ? "Close help" : "Open help"}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </motion.button>
      </div>
    </>
  );
}
