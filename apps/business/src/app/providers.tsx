'use client';

import { AuthProvider } from '@xelnova/api';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider authStoragePrefix="business" variant="business">
      <Toaster position="top-center" richColors />
      {children}
    </AuthProvider>
  );
}
