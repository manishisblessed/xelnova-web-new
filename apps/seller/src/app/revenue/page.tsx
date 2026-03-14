import {
  Wallet,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  TrendingUp,
  ArrowRightLeft,
  Banknote,
} from "lucide-react";
import { transactions, revenueStats, formatINR, formatINRDecimal } from "@/lib/mock-data";

const typeIcons: Record<string, React.ReactNode> = {
  Sale: <ArrowDownLeft size={14} className="text-emerald-600" />,
  Commission: <ArrowUpRight size={14} className="text-rose-600" />,
  Payout: <Banknote size={14} className="text-sky-600" />,
  Refund: <ArrowRightLeft size={14} className="text-amber-600" />,
  Adjustment: <ArrowRightLeft size={14} className="text-slate-600" />,
};

const typeColors: Record<string, string> = {
  Sale: "text-emerald-800 bg-emerald-100",
  Commission: "text-rose-800 bg-rose-100",
  Payout: "text-sky-800 bg-sky-100",
  Refund: "text-amber-800 bg-amber-100",
  Adjustment: "text-slate-600 bg-warm-200",
};

export default function RevenuePage() {
  const summaryCards = [
    {
      label: "Total Earned",
      value: formatINR(revenueStats.totalEarned),
      icon: <TrendingUp size={20} />,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Commission Deducted",
      value: formatINR(revenueStats.commissionDeducted),
      icon: <ArrowUpRight size={20} />,
      color: "text-rose-600",
      bg: "bg-rose-500/10",
    },
    {
      label: "Net Revenue",
      value: formatINR(revenueStats.netRevenue),
      icon: <IndianRupee size={20} />,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Payouts",
      value: formatINR(revenueStats.totalPayouts),
      icon: <CreditCard size={20} />,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Revenue</h1>
        <p className="text-sm text-slate-600 mt-1">Track your earnings, payouts, and transactions</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-400 to-amber-600">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-white/80" />
            <span className="text-sm font-medium text-white/80">Available Balance</span>
          </div>
          <p className="text-4xl font-bold text-white mb-4">
            {formatINR(revenueStats.availableBalance)}
          </p>
          <button className="px-5 py-2.5 bg-white rounded-lg text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors shadow-sm">
            Request Payout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-warm-200 shadow-soft p-5 hover:border-warm-300 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center ${card.color} mb-3`}>
              {card.icon}
            </div>
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-warm-200">
          <h2 className="text-base font-semibold text-slate-900 font-display">Transaction History</h2>
          <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
            Download Statement
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100/80">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Description</th>
                <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Order #</th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-600">{txn.date}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        typeColors[txn.type]
                      }`}
                    >
                      {typeIcons[txn.type]}
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-600">{txn.description}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {txn.orderId ? (
                      <span className="text-sm text-amber-600 font-medium">{txn.orderId}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        txn.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {txn.amount >= 0 ? "+" : ""}
                      {formatINRDecimal(txn.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm text-slate-800 font-medium">
                      {formatINRDecimal(txn.balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
