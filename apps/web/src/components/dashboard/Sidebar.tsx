import { X, LogOut, Map, LogIn, Satellite } from "lucide-react";
import { Link } from "react-router-dom";
import { navItems } from "@/components/dashboard/nav";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  active: string;
  onSelect: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  forceOverlay?: boolean;
  onRequireAuth?: (itemName: string, targetPath: string) => void;
}

export function Sidebar({
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
  forceOverlay = false,
  onRequireAuth,
}: SidebarProps) {
  const { t } = useI18n();
  const { currentUser, logout } = useAuth();

  const visibleNavItems = navItems.filter((item) => {
    if (item.roles && currentUser) {
      return item.roles.includes(currentUser.role);
    }
    if (!currentUser && item.roles && !item.roles.includes("student")) {
      return false;
    }
    return true;
  });

  const mapsItem = visibleNavItems.find((item) => item.id === "maps");
  const geospatialItem = visibleNavItems.find((item) => item.id === "geospatial");
  const regularNavItems = visibleNavItems.filter((item) => item.id !== "maps" && item.id !== "geospatial");
  const isMapsActive = active === "maps";
  const isGeospatialActive = active === "geospatial";

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm transition-opacity dark:bg-black/60 ${forceOverlay ? "" : "lg:hidden"} ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-brand-100 transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900/80 ${
          forceOverlay ? "" : "lg:static lg:z-0 lg:translate-x-0"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-2.5">
            <Logo
              variant="icon"
              size={36}
              className="transition-transform group-hover:scale-105"
            />
            <span className="font-display text-base font-extrabold tracking-tight text-ink-900 dark:text-white">
              Harmony
            </span>
          </Link>
          <button
            onClick={onCloseMobile}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-50 dark:text-slate-400 dark:hover:bg-slate-800 ${forceOverlay ? "" : "lg:hidden"}`}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* ── Standalone Top-Level Geospatial Feature: Harmony Maps ── */}
          {mapsItem && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between px-2">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                  </span>
                  Geospatial & Spasial
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Interactive GIS
                </span>
              </div>

              <Link
                to="/app/maps"
                onClick={onSelect}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 transition-all duration-300 ${
                  isMapsActive
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-600 text-white shadow-glass shadow-indigo-500/25 ring-2 ring-indigo-400/50"
                    : "border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 text-ink-900 shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 dark:border-indigo-900/50 dark:bg-slate-800/80 dark:text-white dark:hover:border-indigo-700 dark:hover:bg-slate-800"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                    isMapsActive
                      ? "bg-white/20 text-white shadow-inner"
                      : "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105"
                  }`}
                >
                  <Map className="h-5 w-5" strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-extrabold tracking-tight">
                      Harmony Maps
                    </span>
                    {isMapsActive ? (
                      <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300">
                        Buka
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 truncate text-[11px] font-medium ${
                      isMapsActive
                        ? "text-indigo-100"
                        : "text-ink-500 dark:text-slate-400"
                    }`}
                  >
                    Eksplorasi Peta Interaktif
                  </p>
                </div>
              </Link>

              {geospatialItem && (
                <Link
                  to="/app/geospatial"
                  onClick={onSelect}
                  className={`mt-2 group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 transition-all duration-300 ${
                    isGeospatialActive
                      ? "bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 text-white shadow-glass shadow-teal-500/25 ring-2 ring-teal-400/50"
                      : "border border-teal-200/60 bg-gradient-to-br from-teal-50/60 via-white to-cyan-50/40 text-ink-900 shadow-sm hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5 dark:border-teal-900/50 dark:bg-slate-800/80 dark:text-white dark:hover:border-teal-700 dark:hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      isGeospatialActive
                        ? "bg-white/20 text-white shadow-inner"
                        : "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25 group-hover:scale-105"
                    }`}
                  >
                    <Satellite className="h-5 w-5" strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold tracking-tight">
                        Geospatial Studio
                      </span>
                      {isGeospatialActive ? (
                        <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                      ) : (
                        <span className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:bg-teal-400/20 dark:text-teal-300">
                          11-Domain
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 truncate text-[11px] font-medium ${
                        isGeospatialActive
                          ? "text-teal-100"
                          : "text-ink-500 dark:text-slate-400"
                      }`}
                    >
                      Earth Intelligence & Cuaca
                    </p>
                  </div>
                </Link>
              )}

              {/* Distinct separation divider */}
              <div className="mt-4 mb-2 flex items-center gap-2 px-2">
                <div className="h-[1px] flex-1 bg-slate-200/80 dark:bg-slate-800" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Portal Menu
                </span>
                <div className="h-[1px] flex-1 bg-slate-200/80 dark:bg-slate-800" />
              </div>
            </div>
          )}

          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-slate-500">
            {t("sidebar.portal")}
          </p>
          <ul className="space-y-1">
            {regularNavItems.map((item) => {
              const isActive = active === item.id;
              const targetPath = item.id === "dashboard" ? "/app/dashboard" : `/app/${item.id}`;
              const itemLabel = item.labelOverrides?.[
                currentUser?.role as keyof typeof item.labelOverrides
              ] || t(`nav.${item.id}`, item.label);

              const handleClick = (e: React.MouseEvent) => {
                if (!currentUser) {
                  e.preventDefault();
                  onSelect();
                  onRequireAuth?.(itemLabel, targetPath);
                  return;
                }
                onSelect();
              };

              return (
                <li key={item.id}>
                  <Link
                    to={targetPath}
                    onClick={handleClick}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-glass"
                        : "text-ink-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={`h-[18px] w-[18px] ${
                        isActive
                          ? "text-white"
                          : "text-brand-500 group-hover:text-brand-600 dark:text-slate-400"
                      }`}
                      strokeWidth={2}
                    />
                    <span>{itemLabel}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer card */}
        <div className="p-3">
          {currentUser ? (
            <>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold text-white ${
                      currentUser?.role === "developer"
                        ? "bg-gradient-to-br from-red-500 to-red-700"
                        : currentUser?.role === "teacher"
                          ? "bg-gradient-to-br from-amber-500 to-amber-700"
                          : "bg-gradient-to-br from-brand-500 to-brand-700"
                    }`}
                  >
                    {currentUser?.name?.substring(0, 2).toUpperCase() || "GS"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink-900 dark:text-white">
                      {currentUser?.name || "Pengguna"}
                    </p>
                    <div
                      className={`mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        currentUser?.role === "developer"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : currentUser?.role === "teacher"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                      }`}
                    >
                      {currentUser?.role === "developer"
                        ? t("role.developer", "Developer")
                        : currentUser?.role === "teacher"
                          ? t("role.teacher", "Teacher")
                          : t("role.student", "Student")}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  onCloseMobile();
                }}
                className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-brand-950/40"
              >
                <LogOut className="h-4 w-4" />
                Keluar (Logout)
              </button>
            </>
          ) : (
            <>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold text-white bg-gradient-to-br from-slate-400 to-slate-600 dark:from-slate-600 dark:to-slate-800">
                    TM
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink-900 dark:text-white">
                      Mode Tamu (Guest)
                    </p>
                    <div className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Akses Bebas Peta
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onCloseMobile();
                  onRequireAuth?.("Portal Edukasi SPAB", "/app/dashboard");
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-brand-700 hover:to-indigo-700 active:scale-[0.99]"
              >
                <LogIn className="h-4 w-4" />
                Masuk / Daftar Akun
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
