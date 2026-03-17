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
  AlertTriangle,
  Warehouse,
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
  loading: () => <div className="h-64 sm:h-72 bg-page rounded-xl animate-pulse" />,
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
  const inventoryAlerts = products
    .filter((p) => p.stock > 0 && p.stock < 20)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-heading font-display tracking-tight">
            Hi, {sellerProfile.name.split(" ")[0]} 👋
          </h1>
          <p className="text-body text-sm mt-1">
            Here&apos;s how <span className="text-primary-600 font-semibold">{sellerProfile.storeName}</span> is doing today.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success-50 border border-success-200/80 w-fit">
          <TrendingUp size={18} className="text-success-600" />
          <span className="text-sm font-medium text-success-700">
            +{dashboardStats.monthlyGrowth}% this month
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border p-6 shadow-soft hover:shadow-card transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon size={24} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.changeColor}`}>
                <ArrowUpRight size={12} /> {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-heading mt-4 tracking-tight">{stat.value}</p>
            <p className="text-sm text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Inventory alerts */}
      {inventoryAlerts.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-warning-50/30">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning-600" />
              <h2 className="text-base font-semibold text-heading font-display">Inventory alerts</h2>
            </div>
            <Link href="/inventory" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {inventoryAlerts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-hover transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                  <Warehouse size={18} className="text-warning-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{product.name}</p>
                  <p className="text-xs text-muted">
                    {product.stock === 0 ? "Out of stock" : `${product.stock} units left`}
                  </p>
                </div>
                <span className="text-xs font-semibold text-warning-600">
                  {product.stock < 10 ? "Low" : "Running low"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-heading font-display">Revenue</h2>
            <p className="text-sm text-muted mt-0.5">Last 7 days</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary-400 to-primary-600" />
            Revenue
          </div>
        </div>
        <RevenueChart data={revenueChartData} />
      </div>

      {/* Orders + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-1/50">
            <h2 className="text-base font-semibold text-heading font-display">Recent orders</h2>
            <Link href="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-1/80">
                  <th className="text-left text-xs font-medium text-muted px-6 py-3">Order</th>
                  <th className="text-left text-xs font-medium text-muted px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted px-6 py-3 hidden md:table-cell">Product</th>
                  <th className="text-right text-xs font-medium text-muted px-6 py-3">Amount</th>
                  <th className="text-center text-xs font-medium text-muted px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-sidebar-hover transition-colors">
                    <td className="px-6 py-3.5"><span className="text-sm font-medium text-heading">{order.subOrderId}</span></td>
                    <td className="px-6 py-3.5"><span className="text-sm text-body">{order.customer}</span></td>
                    <td className="px-6 py-3.5 hidden md:table-cell"><span className="text-sm text-muted truncate max-w-[180px] block">{order.product}</span></td>
                    <td className="px-6 py-3.5 text-right"><span className="text-sm font-semibold text-heading">{formatINR(order.amount)}</span></td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] || "bg-surface-2 text-muted"}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-1/50">
            <h2 className="text-base font-semibold text-heading font-display">Top products</h2>
            <Link href="/products" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              See all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-hover transition-colors">
                <div className="relative flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-border" />
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{product.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted">{product.unitsSold} sold</span>
                    <span className="text-xs font-semibold text-success-600">{formatINR(product.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0"><Clock size={22} className="text-primary-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-heading">{dashboardStats.pendingOrders}</p>
            <p className="text-sm text-muted">Pending orders</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0"><Eye size={22} className="text-sky-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-heading">2,847</p>
            <p className="text-sm text-muted">Store views today</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center shrink-0"><IndianRupee size={22} className="text-success-600" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-heading">{formatINR(dashboardStats.totalRevenue)}</p>
            <p className="text-sm text-muted">Total revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
