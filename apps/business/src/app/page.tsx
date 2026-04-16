'use client';

import Link from 'next/link';
import { ArrowRight, Building2, FileText, Shield } from 'lucide-react';
import { productsApi } from '@xelnova/api';
import { useEffect, useState } from 'react';

export default function BusinessHomePage() {
  const [stats, setStats] = useState<{ products: number; sellers: number } | null>(null);

  useEffect(() => {
    productsApi.getStats().then(setStats).catch(() => setStats({ products: 0, sellers: 0 }));
  }, []);

  return (
    <div className="bg-surface-raised">
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-300">Procurement</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
            Buy for your organization on Xelnova Business
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            Same marketplace catalog with company context, GSTIN on invoices where applicable, and order history for
            your team. Contract pricing and approvals are not enabled in v1 — list prices apply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Create business account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse catalog
            </Link>
          </div>
          {stats && (
            <p className="mt-8 text-sm text-slate-400">
              Catalog: {stats.products.toLocaleString('en-IN')}+ SKUs · {stats.sellers.toLocaleString('en-IN')}+ sellers
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-lg font-semibold text-slate-900">Built for procurement teams</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Building2 className="h-8 w-8 text-primary-600" />
            <h3 className="mt-3 font-semibold text-slate-900">Organization context</h3>
            <p className="mt-2 text-sm text-slate-600">
              Always see which company you are purchasing for. Org admins manage GSTIN and company legal name.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <FileText className="h-8 w-8 text-primary-600" />
            <h3 className="mt-3 font-semibold text-slate-900">India tax-ready</h3>
            <p className="mt-2 text-sm text-slate-600">
              Collect and display GSTIN for invoices. Checkout uses standard GST rules on product tax fields.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Shield className="h-8 w-8 text-primary-600" />
            <h3 className="mt-3 font-semibold text-slate-900">Roles (v1)</h3>
            <p className="mt-2 text-sm text-slate-600">
              Org admin, buyer, and approver roles are modeled; approval workflows ship in a later release unless
              enabled for your tenant.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-slate-600">
            Need the consumer storefront?{' '}
            <a href={process.env.NEXT_PUBLIC_RETAIL_SITE_URL || 'https://www.xelnova.in'} className="font-medium text-primary-600 hover:underline">
              Go to Xelnova retail
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
