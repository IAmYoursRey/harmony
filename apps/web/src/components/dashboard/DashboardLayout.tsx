import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { navItems } from "@/components/dashboard/nav";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogoSpinner } from "@/components/ui/LogoSpinner";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { currentUser, currentProfile, isLoading } = useAuth();

  const activeId = (() => {
    const path = location.pathname.replace("/app", "").replace(/^\//, "");
    if (!path) return "dashboard";
    return path;
  })();

  const current = navItems.find((n) => n.id === activeId);

  if (!isLoading && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (
    !isLoading &&
    currentUser &&
    currentUser.role !== "developer" &&
    (!currentProfile?.schoolId || currentProfile.schoolId === "unknown")
  ) {
    return <Navigate to="/school-selection" replace />;
  }

  if (
    !isLoading &&
    current?.roles &&
    currentUser &&
    !current.roles.includes(currentUser.role)
  ) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
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
            <Topbar
              onOpenMobile={() => setMobileOpen(true)}
              title={current?.label ?? "Dashboard"}
            />
            <main className="flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 sm:py-8 lg:px-8 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl glass p-8 text-center max-w-sm shadow-glass">
                <LogoSpinner size="lg" />
                <div className="space-y-1.5">
                  <h3 className="font-display text-base font-bold text-ink-900 dark:text-white animate-pulse">
                    Memuat Dasbor & Profil...
                  </h3>
                  <p className="text-xs text-ink-500 dark:text-slate-400">
                    Menghubungkan sesi Anda dengan aman
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const isEditorMode =
    location.pathname.includes("/editor/") ||
    location.pathname.includes("/scenario-editor/") ||
    location.pathname.includes("/play/");

  if (isEditorMode) {
    return (
      <div className="h-[100dvh] w-full overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col">
        <Outlet />
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
          forceOverlay={activeId === "maps"}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeId !== "maps" && (
            <Topbar
              onOpenMobile={() => setMobileOpen(true)}
              title={current?.label ?? "Dashboard"}
            />
          )}

          <main className={activeId === "maps" ? "flex-1 relative overflow-hidden" : "flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 sm:py-8 lg:px-8"}>
            <div key={activeId} className={activeId === "maps" ? "h-full w-full" : "page-enter"}>
              <Outlet context={{ setMobileOpen }} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
