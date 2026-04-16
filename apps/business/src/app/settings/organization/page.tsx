'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Building2 } from 'lucide-react';
import { businessApi, useAuth } from '@xelnova/api';
import type { OrganizationSummary } from '@xelnova/api';
import { toast } from 'sonner';

export default function OrganizationSettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await businessApi.listOrganizations();
        if (cancelled) return;
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem('xelnova-business-org-id') : null;
        const pick = list.find((o) => o.id === stored) ?? list[0];
        if (pick) {
          setOrg(pick);
          setName(pick.name);
          setLegalName(pick.legalName || '');
          setGstin(pick.gstin || '');
          if (typeof window !== 'undefined') localStorage.setItem('xelnova-business-org-id', pick.id);
        }
      } catch {
        toast.error('Could not load organization');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-600">Sign in to manage company details.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-primary-600 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    if (org.myRole !== 'ORG_ADMIN') {
      toast.error('Only an organization admin can edit company details');
      return;
    }
    setSaving(true);
    try {
      await businessApi.updateOrganization(org.id, {
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        gstin: gstin.trim() || undefined,
      });
      toast.success('Saved');
      const updated = await businessApi.getOrganization(org.id);
      setOrg({ ...updated, myRole: org.myRole });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Building2 className="h-6 w-6 text-slate-800" />
        <h1 className="text-xl font-bold text-slate-900">Company &amp; tax</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : !org ? (
        <p className="text-slate-600">No organization found for your account.</p>
      ) : (
        <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs text-slate-500">
            Your role: <span className="font-medium text-slate-700">{org.myRole.replace('_', ' ')}</span>
            {org.myRole !== 'ORG_ADMIN' && (
              <span className="block mt-1">Contact an org admin to change legal name or GSTIN.</span>
            )}
          </p>
          <div>
            <label className="text-sm font-medium text-slate-700">Company display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={org.myRole !== 'ORG_ADMIN'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Legal name</label>
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={org.myRole !== 'ORG_ADMIN'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">GSTIN (India)</label>
            <input
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              disabled={org.myRole !== 'ORG_ADMIN'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-50"
            />
          </div>
          {org.myRole === 'ORG_ADMIN' && (
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          )}
        </form>
      )}
    </div>
  );
}
