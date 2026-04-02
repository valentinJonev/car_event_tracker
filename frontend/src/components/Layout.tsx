import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Home, CalendarDays, Map, Users, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { RoleGuard } from './RoleGuard';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('bg') ? 'bg' : 'en';

  const toggle = () => {
    i18n.changeLanguage(currentLang === 'en' ? 'bg' : 'en');
  };

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
      title={currentLang === 'en' ? 'Switch to Bulgarian' : 'Switch to English'}
    >
      {currentLang === 'en' ? 'BG' : 'EN'}
    </button>
  );
}

const navItems = [
  { to: '/', label: 'nav.home', exact: true, minW: 'min-w-[5.5rem]', icon: Home },
  { to: '/events', label: 'nav.events', exact: false, minW: 'min-w-[5.5rem]', icon: CalendarDays },
  { to: '/map', label: 'nav.map', exact: false, minW: 'min-w-[4.5rem]', icon: Map },
  { to: '/organisers', label: 'nav.organisers', exact: false, minW: 'min-w-[8rem]', icon: Users },
] as const;

export function Layout() {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                {t('common.appTagline', { defaultValue: 'Car Event Platform' })}
              </span>
              <h1 className="text-2xl font-semibold">{t('common.appName')}</h1>
            </Link>
          </div>

          {/* Center: Nav pills (desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `${item.minW} rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-zinc-900'
                      : 'border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {t(item.label)}
              </NavLink>
            ))}

            {isAuthenticated && (
              <>
                <RoleGuard roles={['organiser', 'admin']}>
                  <NavLink
                    to="/events/new"
                    className={({ isActive }) =>
                      `min-w-[9rem] rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white text-zinc-900'
                          : 'border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {t('nav.createEvent')}
                  </NavLink>
                </RoleGuard>

              </>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {isAuthenticated ? (
              <>
                <NotificationBell />
                <UserDropdown />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="min-w-[7.5rem] rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-200 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Sidebar panel */}
        <aside
          className={`absolute top-0 right-0 h-full w-72 bg-zinc-950 border-l border-white/10 flex flex-col transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <span className="text-sm font-semibold text-white">{t('nav.menu', { defaultValue: 'Menu' })}</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-zinc-900'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {t(item.label)}
                </NavLink>
              );
            })}

            {isAuthenticated && (
              <RoleGuard roles={['organiser', 'admin']}>
                <NavLink
                  to="/events/new"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-zinc-900'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <PlusCircle className="h-5 w-5 shrink-0" />
                  {t('nav.createEvent')}
                </NavLink>
              </RoleGuard>
            )}
          </nav>

          {/* Footer: auth actions for guests */}
          {!isAuthenticated && (
            <div className="border-t border-white/10 px-4 py-4 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-full border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-full bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                {t('nav.signUp')}
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
