import { DashboardAuthProvider } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <div className="relative h-dvh min-h-0 overflow-hidden bg-surface-raised">
        <DashboardSidebar />
        <div className="ml-64 flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">{children}</div>
      </div>
    </DashboardAuthProvider>
  );
}
