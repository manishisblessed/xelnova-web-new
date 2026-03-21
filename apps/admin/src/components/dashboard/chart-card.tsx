'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export interface ChartCardProps {
  title: string;
  data: ChartDataPoint[];
  dataKey?: string;
  loading?: boolean;
}

export function ChartCard({ title, data, dataKey = 'value', loading }: ChartCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card h-[280px] flex items-center justify-center">
        <div className="w-full h-full max-w-[400px] rounded-xl bg-surface-muted animate-pulse" />
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface p-6 shadow-card"
    >
      <h3 className="text-sm font-medium text-text-muted mb-4">{title}</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)' }} formatter={(value: number) => [value, '']} />
            <Area type="monotone" dataKey={dataKey} stroke="var(--color-primary-500)" strokeWidth={2} fill="url(#chartGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
