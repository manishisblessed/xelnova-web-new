"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, ChevronRight, Truck, CheckCircle, Clock } from "lucide-react";
import { formatCurrency } from "@xelnova/utils";

const mockOrders = [
  { id: "XN260310423ABC", date: "2026-03-10", status: "delivered", total: 129999, items: [{ name: "Samsung Galaxy S24 Ultra", image: "https://picsum.photos/seed/s24ultra1/100/100", qty: 1 }] },
  { id: "XN260305187DEF", date: "2026-03-05", status: "shipped", total: 26990, items: [{ name: "Sony WH-1000XM5 Headphones", image: "https://picsum.photos/seed/sonyxm51/100/100", qty: 1 }] },
  { id: "XN260228091GHI", date: "2026-02-28", status: "processing", total: 3298, items: [{ name: "Levi's 511 Slim Fit Jeans", image: "https://picsum.photos/seed/levis5111/100/100", qty: 1 }, { name: "Milton Flask 1000ml", image: "https://picsum.photos/seed/miltonflask1/100/100", qty: 1 }] },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  delivered: { icon: CheckCircle, color: "text-success-400", label: "Delivered" },
  shipped: { icon: Truck, color: "text-gold-400", label: "Shipped" },
  processing: { icon: Clock, color: "text-surface-100", label: "Processing" },
};

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8 font-display">My Orders</h1>
        {mockOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30"><Package size={40} className="text-surface-200" /></div>
            <h3 className="text-lg font-semibold text-white">No orders yet</h3>
            <p className="mt-1 text-sm text-surface-100">Start shopping to see your orders here.</p>
            <Link href="/products" className="mt-4 rounded-xl bg-gold-400 px-6 py-2.5 text-sm font-semibold text-surface-950 hover:bg-gold-300">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mockOrders.map((order, i) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-surface-300/50 bg-surface-800 p-5 hover:border-gold-400/30 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm font-bold text-white">Order #{order.id}</p>
                      <p className="text-xs text-surface-100">Placed on {new Date(order.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon size={16} className={status.color} />
                      <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-surface-700 border border-surface-300/30 overflow-hidden relative">
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="text-xs text-surface-200">Qty: {item.qty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-surface-300/30 pt-3">
                    <p className="text-sm font-bold text-white">Total: {formatCurrency(order.total)}</p>
                    <Link href={`/account/orders/${order.id}`} className="flex items-center gap-1 text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors">
                      View Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
