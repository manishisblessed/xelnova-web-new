'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function SellerOrdersPage() {
  return (
    <>
      <DashboardHeader title="Orders" />
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-text-muted">Orders list will be loaded here.</div>
      </div>
    </>
  );
}
