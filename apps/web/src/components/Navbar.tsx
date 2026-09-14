import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShieldCheck, Sun, Moon, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { ThemePicker } from "@/components/ThemePicker";

const links = [
  { label: "landing.features", to: "/#features" },
  { label: "landing.technology", to: "/#how-it-works" },
  { label: "landing.impact", to: "/#impact" },
  { label: "landing.sdgs", to: "/#sdgs" },
  { label: "landing.about", to: "/#about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl border-b border-white/70 shadow-glass dark:border-slate-700/60 dark:bg-slate-900/70"
          : "bg-transparent"
      }`}
    >
      <nav className="section-container flex h-16 items-center justify-between sm:h-20">
        <Link to="/" className="group flex items-center gap-2.5">
          <Logo
            variant="icon"
            size={40}
            className="transition-transform group-hover:scale-105"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
            Harmony<span className="text-brand-600"> Edu</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                to={l.to}
                className="relative text-sm font-medium text-ink-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-brand-500 after:transition-all hover:after:w-full"
              >
                {t(l.label)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <ThemePicker />
          <button
            onClick={() => setLocale(locale === "id" ? "en" : "id")}
            className="p-2 text-slate-500 hover:text-brand-600 transition-colors flex items-center justify-center"
          >
            <span className="text-xs font-bold font-mono">
              {locale.toUpperCase()}
            </span>
          </button>
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
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
          >
            <ShieldCheck className="h-4 w-4" />
            {t("landing.start_learning")}
          </button>
          <button
            onClick={() => navigate("/login")}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:shadow-glow hover:-translate-y-0.5"
          >
            {t("landing.teacher_login")}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemePicker />
          <button
            onClick={() => setLocale(locale === "id" ? "en" : "id")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-700 hover:bg-slate-50"
          >
            <Globe className="h-5 w-5 text-slate-400" />
            <span>
              {locale === "id"
                ? "Switch to English"
                : "Ganti ke Bahasa Indonesia"}
            </span>
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="section-container pb-5">
          <div className="glass rounded-2xl p-4">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/login");
              }}
              className="mt-3 block w-full rounded-full bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Login Guru
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
