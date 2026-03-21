'use client';

import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { Skeleton } from '@xelnova/ui';

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  loading?: boolean;
}

export function StatCard({ label, value, change, changeLabel, icon: Icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <Skeleton shape="text" lines={2} className="mb-2" />
        <Skeleton shape="rectangle" height={40} width="60%" />
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface p-6 shadow-card hover:shadow-card-hover transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary font-display">{value}</p>
          {(change !== undefined || changeLabel) && (
            <p className="mt-1 text-xs text-text-muted">
              {change !== undefined && (
                <span className={change >= 0 ? 'text-success-600' : 'text-danger-500'}>{change >= 0 ? '+' : ''}{change}%</span>
              )}
              {changeLabel && <span className="ml-1">{changeLabel}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-xl bg-primary-50 p-2.5">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
