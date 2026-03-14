"use client";

import { useState } from "react";
import {
  Search,
  Clock,
  Loader2,
  Truck,
  CheckCircle2,
  Filter,
  Eye,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { orders, formatINR } from "@/lib/mock-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-sky-100 text-sky-800",
  Shipped: "bg-violet-100 text-violet-800",
  Delivered: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-800",
  Returned: "bg-rose-100 text-rose-800",
};

const orderStats = [
  {
    label: "Pending",
    count: orders.filter((o) => o.status === "Pending").length,
    icon: <Clock size={18} />,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  {
    label: "Processing",
    count: orders.filter((o) => o.status === "Processing").length,
    icon: <Loader2 size={18} />,
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
  {
    label: "Shipped",
    count: orders.filter((o) => o.status === "Shipped").length,
    icon: <Truck size={18} />,
    color: "text-violet-600",
    bg: "bg-violet-100",
  },
  {
    label: "Delivered",
    count: orders.filter((o) => o.status === "Delivered").length,
    icon: <CheckCircle2 size={18} />,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
];

const statusOptions = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.subOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and track all your orders</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {orderStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="bg-white rounded-2xl border border-warm-200 shadow-soft p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 shadow-soft p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer, product..."
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
              ))}
            </select>
            <input
              type="date"
              className="h-9 px-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100/80">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Sub-Order #</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Product</th>
                <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Qty</th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Amount</th>
                <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Date</th>
                <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-amber-600">{order.subOrderId}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{order.customer}</p>
                      <p className="text-xs text-slate-500">{order.shippingAddress}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={order.productImage}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover"
                      />
                      <span className="text-sm text-slate-700 truncate max-w-[180px]">{order.product}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-sm text-slate-700">{order.quantity}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-medium text-slate-700">{formatINR(order.amount)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-xl text-xs font-medium ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-sm text-slate-500">{order.date}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-warm-100 transition-colors">
                        <Eye size={15} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowStatusDropdown(
                              showStatusDropdown === order.id ? null : order.id
                            )
                          }
                          className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          <RefreshCw size={15} />
                        </button>
                        {showStatusDropdown === order.id && (
                          <div className="absolute right-0 top-9 w-40 bg-white rounded-xl shadow-card border border-warm-200 py-1 z-10">
                            {["Processing", "Shipped", "Delivered"].map((status) => (
                              <button
                                key={status}
                                onClick={() => setShowStatusDropdown(null)}
                                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-warm-50 transition-colors"
                              >
                                Mark as {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <Filter size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500 text-sm">No orders match your filters</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
