'use client';

import { useDashboardAuth } from '@/lib/auth-context';

export function DashboardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useDashboardAuth();
  return (
    <header className="border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary font-display">{title}</h1>
          {subtitle ? <p className="text-sm text-text-muted mt-0.5">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">{user?.name}</span>
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
            {user?.name?.charAt(0) || '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
