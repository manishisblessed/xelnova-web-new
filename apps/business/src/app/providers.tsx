'use client';

import { AuthProvider, setAppRole } from '@xelnova/api';
import { SupportWidget } from '@xelnova/ui';

// Tag every API request from the business buyer app with X-App-Role:BUSINESS
// so the backend resolves auth lookups against the BUSINESS row only.
setAppRole('BUSINESS');

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider authStoragePrefix="business" variant="business">
      {children}
      <SupportWidget audience="customer" />
    </AuthProvider>
  );
}
