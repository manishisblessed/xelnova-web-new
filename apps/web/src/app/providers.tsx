'use client';

import { AuthProvider, setAppRole } from '@xelnova/api';

// Tag every API request from the customer storefront with X-App-Role:CUSTOMER
// so the backend resolves auth/login, OTP, register, etc. against the
// customer row only. A user who also has a separate SELLER row with the same
// email is a different account and must not be silently logged in here.
setAppRole('CUSTOMER');

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
