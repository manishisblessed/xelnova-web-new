'use client';

import { AuthProvider } from '@xelnova/api';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider authStoragePrefix="business" variant="business">
      {children}
    </AuthProvider>
  );
}
