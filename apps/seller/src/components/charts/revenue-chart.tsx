"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/mock-data";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-4 py-2.5 rounded-xl shadow-card border border-warm-200">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{formatINR(payload[0].value)}</p>
    </div>
  );
}

export default function RevenueChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#d97706"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, fill: "#d97706", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
