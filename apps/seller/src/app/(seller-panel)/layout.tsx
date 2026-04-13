import { DashboardAuthProvider } from '@/lib/auth-context';
import { SellerProfileProvider } from '@/lib/seller-profile-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { SellerProfileGate } from '@/components/dashboard/seller-profile-gate';
import { SessionTimer } from '@/components/dashboard/session-timer';
import { NotificationBell } from '@/components/dashboard/notification-bell';

export default function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <SellerProfileProvider>
        <div className="flex min-h-screen bg-surface-raised">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-end gap-3 px-6 py-2">
              <NotificationBell />
              <SessionTimer />
            </div>
            <SellerProfileGate>{children}</SellerProfileGate>
          </div>
        </div>
      </SellerProfileProvider>
    </DashboardAuthProvider>
  );
}
