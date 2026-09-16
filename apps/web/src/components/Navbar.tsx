import { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { ThemePicker } from "@/components/ThemePicker";

interface NavLinkItem {
  label: string;
  id: string;
  href: string;
}

const links: NavLinkItem[] = [
  { label: "landing.features", id: "features", href: "#features" },
  { label: "landing.technology", id: "how-it-works", href: "#how-it-works" },
  { label: "landing.impact", id: "impact", href: "#impact" },
  { label: "landing.sdgs", id: "sdgs", href: "#sdgs" },
  { label: "landing.about", id: "about", href: "#about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      window.history.pushState(null, "", `#${id}`);
      setActiveSection(id);
    }
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setOpen(false);

    if (location.pathname === "/" || location.pathname === "") {
      scrollToId(id);
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === "/" || location.pathname === "") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.pushState(null, "", "/");
      setActiveSection("");
    }
  };

  // Listen to hash changes when on landing page
  useEffect(() => {
    if ((location.pathname === "/" || location.pathname === "") && location.hash) {
      const id = location.hash.replace("#", "");
      const timer = setTimeout(() => {
        scrollToId(id);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash, scrollToId]);

  // Scroll spy & background shadow on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);

      if (location.pathname !== "/" && location.pathname !== "") return;

      const navHeight = 120;
      const scrollPosition = window.scrollY + navHeight;
      const sectionIds = ["features", "how-it-works", "impact", "sdgs", "about"];
      let currentSection = "";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSection = id;
            break;
          }
        }
      }

      setActiveSection(currentSection);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl border-b border-white/70 shadow-glass dark:border-slate-700/60 dark:bg-slate-900/70"
          : "bg-transparent"
      }`}
    >
      <nav className="section-container flex h-16 items-center justify-between sm:h-20">
        <Link to="/" onClick={handleLogoClick} className="group flex items-center gap-2.5">
          <Logo
            variant="icon"
            size={40}
            className="transition-transform group-hover:scale-105"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
            Harmony
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => {
            const isActive = activeSection === l.id;
            return (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={(e) => handleNavClick(e, l.id)}
                  className={`relative text-sm transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-brand-500 after:transition-all ${
                    isActive
                      ? "font-semibold text-brand-600 dark:text-brand-400 after:w-full"
                      : "font-medium text-ink-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 after:w-0 hover:after:w-full"
                  }`}
                >
                  {t(l.label)}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <ThemePicker />

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
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glass transition-all hover:bg-brand-700 hover:shadow-glow hover:-translate-y-0.5"
          >
            Masuk
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemePicker />

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
              {links.map((l) => {
                const isActive = activeSection === l.id;
                return (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      onClick={(e) => handleNavClick(e, l.id)}
                      className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-600 font-semibold dark:bg-slate-800 dark:text-brand-400"
                          : "text-ink-700 hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                      }`}
                    >
                      {t(l.label)}
                    </a>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/login");
              }}
              className="mt-3 block w-full rounded-full bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Masuk
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
