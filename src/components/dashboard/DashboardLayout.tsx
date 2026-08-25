import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { navItems } from '@/components/dashboard/nav';
import { useState } from 'react';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeId = (() => {
    const path = location.pathname.replace('/app', '').replace(/^\//, '');
    if (!path) return 'dashboard';
    return path;
  })();

  const current = navItems.find((n) => n.id === activeId);

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
