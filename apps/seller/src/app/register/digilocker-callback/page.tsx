'use client';

import { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function DigilockerCallbackPage() {
  useEffect(() => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'digilocker-done' }, '*');
      }
    } catch { /* cross-origin */ }

    const timer = setTimeout(() => {
      try { window.close(); } catch { /* browser may block */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 rounded-2xl bg-white shadow-lg border border-gray-200 max-w-sm mx-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Complete</h1>
        <p className="text-sm text-gray-600 mb-4">
          Your Digilocker verification is complete. This window will close automatically.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" />
          Closing...
        </div>
      </div>
    </div>
  );
}
