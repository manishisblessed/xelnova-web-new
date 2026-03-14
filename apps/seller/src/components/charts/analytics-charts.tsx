"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/mock-data";

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-4 py-2.5 rounded-xl shadow-card border border-warm-200">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold text-slate-800">
          {p.dataKey === "sales" ? formatINR(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
}

function CategoryTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-4 py-2.5 rounded-xl shadow-card border border-warm-200">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{formatINR(payload[0].value)}</p>
    </div>
  );
}

export function SalesChart({ data }: { data: { month: string; sales: number; orders: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis yAxisId="sales" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="orders" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <Tooltip content={<SalesTooltip />} />
          <Line yAxisId="sales" type="monotone" dataKey="sales" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: "#d97706", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#b45309", strokeWidth: 2, stroke: "#fff" }} />
          <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: { category: string; sales: number; percentage: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
          <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} width={100} />
          <Tooltip content={<CategoryTooltip />} />
          <Bar dataKey="sales" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
