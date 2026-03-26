import { DashboardAuthProvider } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { SellerProfileGate } from '@/components/dashboard/seller-profile-gate';

export default function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <div className="flex min-h-screen bg-surface-raised">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <SellerProfileGate>{children}</SellerProfileGate>
        </div>
      </div>
    </DashboardAuthProvider>
  );
}
