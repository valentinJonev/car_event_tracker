import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { RoleGuard } from './RoleGuard';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-700 text-white'
      : 'text-gray-300 hover:bg-primary-600 hover:text-white'
  }`;

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('bg') ? 'bg' : 'en';

  const toggle = () => {
    i18n.changeLanguage(currentLang === 'en' ? 'bg' : 'en');
  };

  return (
    <button
      onClick={toggle}
      className="text-gray-300 hover:text-white p-2 rounded-md transition-colors text-sm font-medium"
      title={currentLang === 'en' ? 'Switch to Bulgarian' : 'Switch to English'}
    >
      {currentLang === 'en' ? 'BG' : 'EN'}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="text-gray-300 hover:text-white p-2 rounded-md transition-colors"
      aria-label={t('theme.toggleDarkMode')}
      title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      {theme === 'dark' ? (
        /* Sun icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        /* Moon icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export function Layout() {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Navbar */}
      <nav className="bg-primary-800 dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side: logo + nav links */}
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-white font-bold text-xl tracking-tight"
              >
                {t('common.appName')}
              </Link>

              <div className="hidden md:flex items-center space-x-1">
                <NavLink to="/events" className={navLinkClass}>
                  {t('nav.events')}
                </NavLink>
                <NavLink to="/map" className={navLinkClass}>
                  {t('nav.map')}
                </NavLink>
                <NavLink to="/organisers" className={navLinkClass}>
                  {t('nav.organisers')}
                </NavLink>

                {isAuthenticated && (
                  <>
                    <RoleGuard roles={['organiser', 'admin']}>
                      <NavLink to="/events/new" className={navLinkClass}>
                        {t('nav.createEvent')}
                      </NavLink>
                    </RoleGuard>

                    <RoleGuard roles={['admin']}>
                      <NavLink to="/admin" className={navLinkClass}>
                        {t('nav.admin')}
                      </NavLink>
                    </RoleGuard>
                  </>
                )}
              </div>
            </div>

            {/* Right side: language + theme toggle + auth actions */}
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <ThemeToggle />

              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-white text-sm font-medium"
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('nav.signUp')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden px-2 pb-3 space-y-1">
          <NavLink to="/events" className={navLinkClass}>
            {t('nav.events')}
          </NavLink>
          <NavLink to="/map" className={navLinkClass}>
            {t('nav.map')}
          </NavLink>
          <NavLink to="/organisers" className={navLinkClass}>
            {t('nav.organisers')}
          </NavLink>
          {isAuthenticated && (
            <>
              <RoleGuard roles={['organiser', 'admin']}>
                <NavLink to="/events/new" className={navLinkClass}>
                  {t('nav.createEvent')}
                </NavLink>
              </RoleGuard>
              <RoleGuard roles={['admin']}>
                <NavLink to="/admin" className={navLinkClass}>
                  {t('nav.admin')}
                </NavLink>
              </RoleGuard>
            </>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
