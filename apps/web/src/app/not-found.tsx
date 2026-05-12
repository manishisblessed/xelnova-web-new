import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-text-primary">Page not found</h1>
      <p className="mt-3 text-sm text-text-secondary">
        The page you are looking for does not exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
