'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@xelnova/api';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      router.replace(redirect);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || 'Could not sign in. Use a business account registered on this site.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Sign in to Xelnova Business</h1>
        <p className="mt-2 text-sm text-slate-600">Business buyer accounts only — not retail or seller logins.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700">Work email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
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
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New organization?{' '}
        <Link href="/register" className="font-semibold text-primary-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
