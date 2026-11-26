import { useState } from "react";
import { X, LogOut, Map, LogIn, Satellite, Sprout, ChevronDown, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getPersonaNavGroups,
  navItems,
  resolveNavLabel,
  type NavItem,
} from "@/components/dashboard/nav";
import { Logo } from "@/components/Logo";
import { ThemePicker } from "@/components/ThemePicker";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { isDemoNgoroUser } from "@/utils/demoSchool";

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const personaGroups = getPersonaNavGroups(currentUser?.role);
  const toggleGroup = (groupId: string, defaultCollapsed: boolean) => {
    setExpandedGroups((prev) => {
      const currentOpen = prev[groupId] ?? !defaultCollapsed;
      return { ...prev, [groupId]: !currentOpen };
    });
  };

  const renderSpecialCard = (item: NavItem) => {
    if (item.id === "maps") {
      const isMapsActive = active === "maps";
      return (
        <Link
          key="maps"
          to="/app/maps"
          onClick={onSelect}
          className={`group press-bounce relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 transition-all duration-300 ${
            isMapsActive
              ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-600 text-white shadow-glass shadow-indigo-500/25 ring-2 ring-indigo-400/50"
              : "border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 text-ink-900 shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 dark:border-indigo-900/50 dark:bg-slate-800/80 dark:text-white dark:hover:border-indigo-700 dark:hover:bg-slate-800"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
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
                {currentUser ? "Peta Utama" : "Peta Siaga Publik"}
              </span>
              {isMapsActive ? (
                <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
              ) : (
                <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300">
                  WebGIS
                </span>
              )}
            </div>
            <p className={`mt-0.5 truncate text-[11px] font-medium ${isMapsActive ? "text-indigo-100" : "text-ink-500 dark:text-slate-400"}`}>
              Peta Bencana &amp; Rute Aman
            </p>
          </div>
        </Link>
      );
    }

    if (item.id === "geospatial") {
      const isGeospatialActive = active === "geospatial";
      return (
        <Link
          key="geospatial"
          to="/app/geospatial"
          onClick={onSelect}
          className={`group press-bounce relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 transition-all duration-300 ${
            isGeospatialActive
              ? "bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 text-white shadow-glass shadow-teal-500/25 ring-2 ring-teal-400/50"
              : "border border-teal-200/60 bg-gradient-to-br from-teal-50/60 via-white to-cyan-50/40 text-ink-900 shadow-sm hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5 dark:border-teal-900/50 dark:bg-slate-800/80 dark:text-white dark:hover:border-teal-700 dark:hover:bg-slate-800"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
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
                {currentUser?.role === "developer" ? "Studio Geospasial" : "Cuaca & Peringatan BMKG"}
              </span>
              {isGeospatialActive ? (
                <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
              ) : (
                <span className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:bg-teal-400/20 dark:text-teal-300">
                  BMKG
                </span>
              )}
            </div>
            <p className={`mt-0.5 truncate text-[11px] font-medium ${isGeospatialActive ? "text-teal-100" : "text-ink-500 dark:text-slate-400"}`}>
              Prakiraan Cuaca &amp; Wilayah
            </p>
          </div>
        </Link>
      );
    }

    if (item.id === "field-telemetry") {
      const isTelemetryActive = active === "field-telemetry";
      return (
        <Link
          key="field-telemetry"
          to="/app/field-telemetry"
          onClick={onSelect}
          className={`group press-bounce relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 transition-all duration-300 ${
            isTelemetryActive
              ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-glass shadow-emerald-500/25 ring-2 ring-emerald-400/50"
              : "border border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 text-ink-900 shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 dark:border-emerald-900/50 dark:bg-slate-800/80 dark:text-white dark:hover:border-emerald-700 dark:hover:bg-slate-800"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              isTelemetryActive
                ? "bg-white/20 text-white shadow-inner"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 group-hover:scale-105"
            }`}
          >
            <Sprout className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-display text-sm font-extrabold tracking-tight truncate">
                {resolveNavLabel(item, currentUser?.role, t)}
              </span>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                  isTelemetryActive
                    ? "bg-white/20 text-white"
                    : "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
                }`}
              >Beta</span>
            </div>
            <p className={`mt-0.5 truncate text-[11px] font-medium ${isTelemetryActive ? "text-emerald-100" : "text-ink-500 dark:text-slate-400"}`}>
              IoT Tanah, FFMC &amp; Titik Panas
            </p>
          </div>
        </Link>
      );
    }

    return null;
  };

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white/85 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl border-r border-brand-100 transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900/85 ${
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
          <div className="flex items-center gap-1.5">
            <div className="sm:hidden">
              <ThemePicker align="sidebar" />
            </div>
            <button
              onClick={onCloseMobile}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-brand-50 dark:text-slate-400 dark:hover:bg-slate-800 ${forceOverlay ? "" : "lg:hidden"}`}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Persona-Separated Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {personaGroups.map((group) => {
            const hasActiveChild = group.items.some((i) => i.id === active);
            const isOpen = group.collapsible
              ? (expandedGroups[group.id] ?? (hasActiveChild || !group.defaultCollapsed))
              : true;

            return (
              <div key={group.id} className="space-y-1.5">
                {group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id, Boolean(group.defaultCollapsed))}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 transition-colors hover:bg-slate-100/80 hover:text-ink-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400">
                      {group.title}
                    </span>
                    {group.badge && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/20 dark:bg-brand-950/60 dark:text-brand-300">
                        {group.badge}
                      </span>
                    )}
                  </div>
                )}

                {isOpen && (
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      if (item.id === "maps" || item.id === "geospatial" || item.id === "field-telemetry") {
                        return <li key={item.id}>{renderSpecialCard(item)}</li>;
                      }

                      const isActive = active === item.id;
                      const targetPath = item.id === "dashboard" ? "/app/dashboard" : `/app/${item.id}`;
                      const itemLabel = resolveNavLabel(item, currentUser?.role, t);

                      return (
                        <li key={item.id}>
                          <Link
                            to={targetPath}
                            onClick={onSelect}
                            className={`group press-bounce flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
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
                            <span className="truncate">{itemLabel}</span>
                            {isActive && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {!currentUser && (
            <div className="rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/50 p-3.5 dark:border-brand-900/50 dark:from-slate-800/80 dark:to-slate-900/80">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <GraduationCap className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-ink-900 dark:text-white">
                    Portal Edukasi Sekolah
                  </p>
                  <p className="text-[11px] leading-snug text-ink-500 dark:text-slate-400">
                    Kuis, simulasi denah 3D, dan dasbor kelas terbuka saat masuk akun.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onRequireAuth?.("Portal Edukasi Sekolah", "/app/dashboard");
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk Murid atau Guru</span>
              </button>
            </div>
          )}
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
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                      </span>
                      {isDemoNgoroUser(currentUser) && (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Demo Account
                        </span>
                      )}
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
                Keluar
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
                      Mode Tamu
                    </p>
                    <div className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Akses Peta
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
                Masuk Akun
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
