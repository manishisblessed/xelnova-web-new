'use client';

import { DashboardHeader } from './dashboard-header';

export function SectionPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <DashboardHeader title={title} />
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-card">
          <p className="text-text-muted text-sm">
            {description ?? `${title} management — list, add, edit, and manage here. Connect to your backend API when ready.`}
          </p>
        </div>
      </div>
    </>
  );
}
