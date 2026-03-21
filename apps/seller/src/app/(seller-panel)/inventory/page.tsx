'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function SellerInventoryPage() {
  return (
    <>
      <DashboardHeader title="Inventory" />
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-text-muted">Inventory management will be loaded here.</div>
      </div>
    </>
  );
}
