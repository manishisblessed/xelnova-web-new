import dynamic from "next/dynamic";
import {
  TrendingUp,
  ShoppingCart,
  RotateCcw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { analyticsData, formatINR } from "@/lib/mock-data";

const SalesChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.SalesChart),
  { loading: () => <div className="h-72 bg-warm-100 rounded-xl animate-pulse" />, ssr: false }
);

const CategoryChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.CategoryChart),
  { loading: () => <div className="h-64 bg-warm-100 rounded-xl animate-pulse" />, ssr: false }
);

export default function AnalyticsPage() {
  const metrics = [
    { label: "Conversion Rate", value: `${analyticsData.conversionRate}%`, change: "+0.5%", positive: true, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Avg Order Value", value: formatINR(analyticsData.avgOrderValue), change: "+₹320", positive: true, icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Return Rate", value: `${analyticsData.returnRate}%`, change: "-0.3%", positive: true, icon: RotateCcw, color: "text-sky-600", bg: "bg-sky-100" },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Track your store performance and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-2xl border border-warm-200 shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${metric.bg} flex items-center justify-center ${metric.color}`}>
                <metric.icon size={18} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${metric.positive ? "text-emerald-600" : "text-rose-600"}`}>
                {metric.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {metric.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
            <p className="text-xs text-slate-500 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-display">Sales Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">Monthly sales performance</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Sales (₹)</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-400" />Orders</div>
          </div>
        </div>
        <SalesChart data={analyticsData.monthlySales} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
          <h2 className="text-base font-semibold text-slate-900 font-display mb-5">Category Breakdown</h2>
          <CategoryChart data={analyticsData.categoryBreakdown} />
        </div>

        <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
          <h2 className="text-base font-semibold text-slate-900 font-display mb-5">Top Search Terms</h2>
          <div className="space-y-3">
            {analyticsData.topSearchTerms.map((term, index) => (
              <div key={term.term} className="flex items-center justify-between p-3 rounded-lg hover:bg-warm-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-warm-200 text-[11px] font-bold text-slate-600 flex items-center justify-center">{index + 1}</span>
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-800">{term.term}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">{term.count.toLocaleString()} searches</span>
                  <span className="text-xs font-medium text-amber-600">{term.conversion}% conv.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Category Performance</h2>
        <div className="space-y-3">
          {analyticsData.categoryBreakdown.map((cat) => (
            <div key={cat.category} className="flex items-center gap-4">
              <span className="text-sm text-slate-600 w-28">{cat.category}</span>
              <div className="flex-1 h-2.5 bg-warm-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700" style={{ width: `${cat.percentage}%` }} />
              </div>
              <span className="text-sm font-medium text-slate-800 w-16 text-right">{cat.percentage}%</span>
              <span className="text-xs text-slate-500 w-24 text-right">{formatINR(cat.sales)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
