import Link from 'next/link';

export function BusinessFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-10 text-sm text-slate-600">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-900">Xelnova Business</p>
          <p className="mt-2 max-w-xs">
            Procurement storefront for registered organizations. Not for marketplace operations — use the admin console
            for staff tools.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Policies</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/terms" className="hover:text-primary-600">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-primary-600">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Payments (v1)</p>
          <p className="mt-2 max-w-xs">
            Online prepay (card / UPI via Razorpay) on standard checkout. Net terms and pay-on-invoice are not enabled in
            this release.
          </p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-4 text-xs text-slate-500">
        © {new Date().getFullYear()} Xelnova. Business buyer accounts require a separate registration from retail
        customers.
      </p>
    </footer>
  );
}
