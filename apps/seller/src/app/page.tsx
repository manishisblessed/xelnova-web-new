import dynamic from "next/dynamic";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Star,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Eye,
} from "lucide-react";
import {
  sellerProfile,
  dashboardStats,
  revenueChartData,
  orders,
  products,
  formatINR,
} from "@/lib/mock-data";

const RevenueChart = dynamic(() => import("@/components/charts/revenue-chart"), {
  loading: () => <div className="h-64 sm:h-72 bg-warm-100 rounded-xl animate-pulse" />,
  ssr: false,
});

const statCards = [
  { label: "Today's sales", value: formatINR(dashboardStats.todaySales), icon: IndianRupee, change: "+18.2%", bg: "bg-emerald-100", iconColor: "text-emerald-600", changeColor: "text-emerald-600" },
  { label: "Orders today", value: dashboardStats.ordersToday.toString(), icon: ShoppingCart, change: "+12.5%", bg: "bg-sky-100", iconColor: "text-sky-600", changeColor: "text-sky-600" },
  { label: "Total products", value: dashboardStats.totalProducts.toString(), icon: Package, change: "+3", bg: "bg-amber-100", iconColor: "text-amber-600", changeColor: "text-amber-600" },
  { label: "Avg. rating", value: dashboardStats.averageRating.toFixed(1), icon: Star, change: "+0.2", bg: "bg-violet-100", iconColor: "text-violet-600", changeColor: "text-violet-600" },
];

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-sky-100 text-sky-800",
  Shipped: "bg-violet-100 text-violet-800",
  Delivered: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-800",
};

export default function SellerDashboard() {
  const recentOrders = orders.slice(0, 5);
  const topProducts = products
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 4);

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
            Hi, {sellerProfile.name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Here&apos;s how <span className="text-amber-600 font-semibold">{sellerProfile.storeName}</span> is doing today.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-100 border border-emerald-200/80 w-fit">
          <TrendingUp size={18} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            +{dashboardStats.monthlyGrowth}% this month
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-warm-200 p-6 shadow-soft hover:shadow-card transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon size={24} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.changeColor}`}>
                <ArrowUpRight size={12} /> {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-4 tracking-tight">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 font-display">Revenue</h2>
            <p className="text-sm text-slate-500 mt-0.5">Last 7 days</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
            Revenue
          </div>
        </div>
        <RevenueChart data={revenueChartData} />
      </div>

      {/* Orders + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-soft">
          <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200 bg-warm-50/50">
            <h2 className="text-base font-semibold text-slate-900 font-display">Recent orders</h2>
            <Link href="/orders" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100/80">
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Order</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3 hidden md:table-cell">Product</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">Amount</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors">
                    <td className="px-6 py-3.5"><span className="text-sm font-medium text-slate-800">{order.subOrderId}</span></td>
                    <td className="px-6 py-3.5"><span className="text-sm text-slate-600">{order.customer}</span></td>
                    <td className="px-6 py-3.5 hidden md:table-cell"><span className="text-sm text-slate-500 truncate max-w-[180px] block">{order.product}</span></td>
                    <td className="px-6 py-3.5 text-right"><span className="text-sm font-semibold text-slate-800">{formatINR(order.amount)}</span></td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] || "bg-slate-100 text-slate-600"}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-soft">
          <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200 bg-warm-50/50">
            <h2 className="text-base font-semibold text-slate-900 font-display">Top products</h2>
            <Link href="/products" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              See all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-warm-50 transition-colors">
                <div className="relative flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-warm-200" />
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{product.unitsSold} sold</span>
                    <span className="text-xs font-semibold text-emerald-600">{formatINR(product.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-warm-200 p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><Clock size={22} className="text-amber-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900">{dashboardStats.pendingOrders}</p>
            <p className="text-sm text-slate-500">Pending orders</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0"><Eye size={22} className="text-sky-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900">2,847</p>
            <p className="text-sm text-slate-500">Store views today</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><IndianRupee size={22} className="text-emerald-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900">{formatINR(dashboardStats.totalRevenue)}</p>
            <p className="text-sm text-slate-500">Total revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
