'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useDashboardAuth } from '@/lib/auth-context';

export function DashboardHeader({ title }: { title: string }) {
  const { user, logout } = useDashboardAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary font-display">{title}</h1>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className="text-sm text-text-muted hidden sm:inline">{user?.name}</span>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium shrink-0">
              {user?.name?.charAt(0) || '?'}
            </div>
            <ChevronDown
              size={16}
              className={`text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-border bg-surface py-1 shadow-lg"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-muted truncate" title={user?.email ?? undefined}>
                  {user?.email}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut size={16} aria-hidden />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
