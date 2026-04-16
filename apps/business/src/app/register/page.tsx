'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { authApi, useAuth } from '@xelnova/api';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    if (typeof window !== 'undefined') window.location.assign('/');
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.registerBusiness({
        organizationName,
        legalName: legalName || undefined,
        gstin: gstin || undefined,
        name,
        email,
        password,
      });
      toast.success('Account created');
      window.location.assign('/products');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Create a business account</h1>
        <p className="mt-2 text-sm text-slate-600">
          You&apos;ll be the organization admin for your company. One work email cannot share retail and business
          profiles — use a dedicated business login.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700">Company display name *</label>
          <input
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
            placeholder="e.g. Acme Procurement"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Legal name (optional)</label>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
            placeholder="Registered entity name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">GSTIN (optional, 15 chars)</label>
          <input
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            maxLength={15}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-primary-500"
            placeholder="27AAAAA0000A1Z5"
          />
        </div>
        <hr className="border-slate-100" />
        <div>
          <label className="text-sm font-medium text-slate-700">Your name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Work email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password *</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
