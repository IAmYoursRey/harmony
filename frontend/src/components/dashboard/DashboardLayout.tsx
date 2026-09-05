import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { navItems } from '@/components/dashboard/nav';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { currentUser, isLoading } = useAuth();

  const activeId = (() => {
    const path = location.pathname.replace('/app', '').replace(/^\//, '');
    if (!path) return 'dashboard';
    return path;
  })();

  const current = navItems.find((n) => n.id === activeId);

  // Global Auth Protection
  if (!isLoading && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // RBAC Route Protection
  if (!isLoading && current?.roles && currentUser && !current.roles.includes(currentUser.role)) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-brand-50/40 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <div className="flex h-[100dvh]">
        <Sidebar
          active={activeId}
          onSelect={() => setMobileOpen(false)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onOpenMobile={() => setMobileOpen(true)} title={current?.label ?? 'Dashboard'} />

          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div key={activeId} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
