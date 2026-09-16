import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { navItems } from "@/components/dashboard/nav";
import { useTheme } from "@/hooks/useTheme";
import { ThemePicker } from "@/components/ThemePicker";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";

interface TopbarProps {
  onOpenMobile: () => void;
  title: string;
}

export function Topbar({ onOpenMobile, title }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { currentUser } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const displayName = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n, i) => (i === 0 ? n : n.charAt(0) + "."))
        .join(" ")
    : "User";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-100 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 sm:px-6">
      <button
        onClick={onOpenMobile}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="font-display text-lg font-bold tracking-tight text-ink-900 dark:text-white sm:text-xl truncate">
        {title}
      </h1>

      {/* Quick navigation search */}
      <div className="relative ml-auto hidden items-center md:flex">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const query = search.trim().toLowerCase();
              if (!query) return;
              const match = navItems.find(
                (item) =>
                  item.label.toLowerCase().includes(query) ||
                  item.id.includes(query),
              );
              if (match) {
                navigate(
                  match.id === "dashboard" ? "/app" : `/app/${match.id}`,
                );
                setSearch("");
              }
            }}
            placeholder="Cari menu..."
            aria-label="Cari menu"
            className="w-56 rounded-full border border-brand-100 bg-white/70 py-2 pl-9 pr-4 text-sm text-ink-700 outline-none transition-all placeholder:text-ink-400 focus:w-72 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:placeholder:text-slate-500 lg:w-64"
          />
          {search.trim() && (
            <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-brand-100 bg-white p-1.5 shadow-glass-lg dark:border-slate-700 dark:bg-slate-900">
              {navItems
                .filter(
                  (item) =>
                    item.label
                      .toLowerCase()
                      .includes(search.trim().toLowerCase()) ||
                    item.id.includes(search.trim().toLowerCase()),
                )
                .slice(0, 5)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(
                        item.id === "dashboard" ? "/app" : `/app/${item.id}`,
                      );
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <item.icon className="h-4 w-4 text-brand-500" />
                    {item.label}
                  </button>
                ))}
              {navItems.every(
                (item) =>
                  !item.label
                    .toLowerCase()
                    .includes(search.trim().toLowerCase()) &&
                  !item.id.includes(search.trim().toLowerCase()),
              ) && (
                <p className="px-3 py-2.5 text-xs text-ink-400 dark:text-slate-500">
                  Menu tidak ditemukan
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Theme picker */}
      <ThemePicker />



      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle dark mode"
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen((v) => !v)}
          aria-label="Buka notifikasi"
          aria-expanded={notificationsOpen}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-brand-100 bg-white p-4 shadow-glass-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">
                Notifikasi
              </h2>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Tutup
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-ink-500 dark:bg-slate-800 dark:text-slate-400">
              Tidak ada notifikasi baru.
            </p>
          </div>
        )}
      </div>

      {/* Profile */}
      <button
        onClick={() => navigate("/app/profile")}
        aria-label="Open profile"
        className="flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
      >
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
            currentUser?.role === "developer" ? "bg-gradient-to-br from-red-500 to-red-700" :
            currentUser?.role === "teacher" ? "bg-gradient-to-br from-amber-500 to-amber-700" :
            "bg-gradient-to-br from-brand-500 to-brand-700"
          }`}>
            {currentUser?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("") || "U"}
          </span>
        <span className="hidden text-sm font-semibold text-ink-800 dark:text-slate-200 sm:block">
          {displayName}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-ink-400 dark:text-slate-500 sm:block" />
      </button>
    </header>
  );
}
