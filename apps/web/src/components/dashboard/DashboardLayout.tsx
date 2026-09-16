import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { navItems } from "@/components/dashboard/nav";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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
            <main className="flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 sm:py-8 lg:px-8">
              <div className="page-enter">
                <div className="space-y-6 animate-pulse">
                  <div className="h-48 w-full rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"
                      ></div>
                    ))}
                  </div>
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
