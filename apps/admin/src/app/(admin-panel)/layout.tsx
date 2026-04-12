import { DashboardAuthProvider } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { SessionTimer } from '@/components/dashboard/session-timer';
import { NotificationBell } from '@/components/dashboard/notification-bell';

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <div className="relative h-dvh min-h-0 overflow-hidden bg-surface-raised">
        <DashboardSidebar />
        <div className="ml-64 flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
          <div className="flex items-center justify-end gap-3 px-6 py-2">
            <NotificationBell />
            <SessionTimer />
          </div>
          {children}
        </div>
      </div>
    </DashboardAuthProvider>
  );
}
