'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@xelnova/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-danger-600" />
        </div>
        <h1 className="text-xl font-bold text-text-primary font-display mb-2">Something went wrong</h1>
        <p className="text-text-muted text-sm mb-6">
          An unexpected error occurred. You can try again or go back to the dashboard.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
