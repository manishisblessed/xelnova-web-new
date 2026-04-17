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
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-1 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Xelnova. Business buyer accounts require a separate registration from retail
          customers.
        </p>
        <p className="text-slate-500">
          Engineered with{' '}
          <span aria-hidden className="text-primary-500">&hearts;</span>
          <span className="sr-only">love</span>{' '}
          by{' '}
          <a
            href="https://www.shahworks.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold bg-gradient-to-r from-primary-600 via-primary-500 to-amber-500 bg-clip-text text-transparent hover:from-primary-700 hover:to-amber-600 transition-all underline-offset-4 hover:underline"
          >
            Shah Works
          </a>
        </p>
      </div>
    </footer>
  );
}
