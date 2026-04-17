import { DashboardAuthProvider } from '@/lib/auth-context';
import { SellerProfileProvider } from '@/lib/seller-profile-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { SellerProfileGate } from '@/components/dashboard/seller-profile-gate';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { GlobalSearch } from '@/components/dashboard/global-search';

export default function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <SellerProfileProvider>
        <div className="relative h-dvh min-h-0 overflow-hidden bg-surface-raised">
          <DashboardSidebar />
          <div className="ml-64 flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
            <div className="flex items-center gap-3 px-6 py-2">
              <GlobalSearch />
              <div className="flex-1" />
              <NotificationBell />
            </div>
            <SellerProfileGate>{children}</SellerProfileGate>
          </div>
        </div>
      </SellerProfileProvider>
    </DashboardAuthProvider>
  );
}
