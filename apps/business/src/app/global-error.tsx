'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen flex flex-col items-center justify-center bg-surface-raised p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-text-muted text-sm mb-6">
            A critical error occurred. Please refresh the page or try again later.
          </p>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
