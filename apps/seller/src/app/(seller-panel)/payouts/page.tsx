'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function SellerPayoutsPage() {
  return (
    <>
      <DashboardHeader title="Payouts" />
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-text-muted">Payout history will be loaded here.</div>
      </div>
    </>
  );
}
