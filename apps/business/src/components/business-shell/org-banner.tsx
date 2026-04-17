'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Settings } from 'lucide-react';
import { useAuth, businessApi, getAccessToken } from '@xelnova/api';
import type { OrganizationSummary } from '@xelnova/api';

export function BusinessOrgBanner() {
  const { user, isAuthenticated } = useAuth();
  const [org, setOrg] = useState<OrganizationSummary | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'BUSINESS') {
      setOrg(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== 'undefined' && !getAccessToken()) return;
        const orgs = await businessApi.listOrganizations();
        if (cancelled) return;
        const storedId =
          typeof window !== 'undefined' ? localStorage.getItem('xelnova-business-org-id') : null;
        const pick = orgs.find((o) => o.id === storedId) ?? orgs[0];
        if (pick) {
          setOrg(pick);
          if (typeof window !== 'undefined') {
            localStorage.setItem('xelnova-business-org-id', pick.id);
          }
        } else {
          setOrg(null);
        }
      } catch {
        if (!cancelled) setOrg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  return (
    <div className="bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-white">Xelnova Business</span>
          <span className="hidden text-slate-400 sm:inline">·</span>
          <span className="hidden text-slate-300 sm:inline">
            Buying for work — GSTIN &amp; company details apply at checkout (India).
          </span>
        </div>
        <div className="flex items-center gap-3">
          {org ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-medium text-white">
              <span className="text-slate-300">Org:</span>
              <span>{org.name}</span>
            </span>
          ) : isAuthenticated ? (
            <Link
              href="/register"
              className="font-medium text-white underline-offset-2 hover:underline"
            >
              Set up organization
            </Link>
          ) : null}
          <Link
            href="/settings/organization"
            className="hidden items-center gap-1 font-medium text-white hover:underline sm:inline-flex"
          >
            <Settings className="h-3.5 w-3.5" /> Company &amp; tax
          </Link>
        </div>
      </div>
    </div>
  );
}
