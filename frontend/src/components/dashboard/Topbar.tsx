import { Menu, Search, Bell, ChevronDown, Sun, Moon, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';

interface TopbarProps {
  onOpenMobile: () => void;
  title: string;
}

export function Topbar({ onOpenMobile, title }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { currentUser } = useAuth();
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();

  // Format the name nicely (e.g. "Raihan A.")
  const displayName = currentUser?.name 
    ? currentUser.name.split(' ').map((n, i) => i === 0 ? n : n.charAt(0) + '.').join(' ')
    : 'User';

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

      {/* Search */}
      <div className="ml-auto hidden items-center md:flex">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search lessons, simulations..."
            className="w-56 rounded-full border border-brand-100 bg-white/70 py-2 pl-9 pr-4 text-sm text-ink-700 outline-none transition-all placeholder:text-ink-400 focus:w-72 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:placeholder:text-slate-500 lg:w-64"
          />
        </div>
      </div>

      {/* Theme picker */}
      <ThemePicker />

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
        className="flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle language"
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{locale}</span>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle dark mode"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      {/* Notifications */}
      <button onClick={() => navigate('/app/ai-learning')} aria-label="View notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />
      </button>

      {/* Profile */}
      <button onClick={() => navigate('/app/profile')} aria-label="Open profile" className="flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
          {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
        </span>
        <span className="hidden text-sm font-semibold text-ink-800 dark:text-slate-200 sm:block">{displayName}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-400 dark:text-slate-500 sm:block" />
      </button>
    </header>
  );
}
