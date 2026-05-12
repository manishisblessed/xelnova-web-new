'use client';

import { useCallback } from 'react';
import { AuthProvider, setAppRole, ticketsApi } from '@xelnova/api';
import { SupportWidget } from '@xelnova/ui';

setAppRole('BUSINESS');

export function Providers({ children }: { children: React.ReactNode }) {
  const handleChat = useCallback(async (message: string, orderNumber?: string) => {
    return ticketsApi.chatWithBot(message, orderNumber);
  }, []);

  return (
    <AuthProvider authStoragePrefix="business" variant="business">
      {children}
      <SupportWidget audience="customer" onChat={handleChat} />
    </AuthProvider>
  );
}
