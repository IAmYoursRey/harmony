import { X, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { navItems } from '@/components/dashboard/nav';
import { Logo } from '@/components/Logo';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  active: string;
  onSelect: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ active, onSelect, mobileOpen, onCloseMobile }: SidebarProps) {
  const { t } = useI18n();
  const { currentUser, logout } = useAuth();
  
  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    if (item.roles && currentUser) {
      return item.roles.includes(currentUser.role);
    }
    return true; // Visible to everyone if no roles are specified
  });
  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm transition-opacity dark:bg-black/60 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-brand-100 transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900/80 lg:static lg:z-0 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-2.5">
            <Logo variant="icon" size={36} className="transition-transform group-hover:scale-105" />
            <span className="font-display text-base font-extrabold tracking-tight text-ink-900 dark:text-white">
              GeoSense<span className="text-brand-600"> Edu</span>
            </span>
          </Link>
          <button
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-50 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-slate-500">
            {t('sidebar.portal')}
          </p>
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <Link
                    to={item.id === 'dashboard' ? '/app' : `/app/${item.id}`}
                    onClick={onSelect}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-glass'
                        : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`h-[18px] w-[18px] ${
                        isActive ? 'text-white' : 'text-brand-500 group-hover:text-brand-600 dark:text-slate-400'
                      }`}
                      strokeWidth={2}
                    />
                    {t(`nav.${item.id}`)}
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
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-extrabold text-white ${currentUser?.role === 'dev' ? 'bg-gradient-to-br from-red-500 to-red-700' : currentUser?.role === 'teacher' ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-brand-500 to-brand-700'}`}>
                {currentUser?.name?.substring(0, 2).toUpperCase() || 'GS'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink-900 dark:text-white">{currentUser?.name || 'Pengguna'}</p>
                <p className="truncate text-[11px] text-ink-500 dark:text-slate-400 uppercase tracking-wider">{currentUser?.role === 'dev' ? t('role.dev', 'Pengembang') : currentUser?.role === 'teacher' ? t('role.teacher', 'Guru') : t('role.student', 'Peserta Didik')}</p>
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
        </div>
      </aside>
    </>
  );
}
