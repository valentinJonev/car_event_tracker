import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { User, Calendar, Shield, LogOut, ChevronDown, Settings } from 'lucide-react';

export default function UserDropdown() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
      >
        {/* Avatar circle */}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <span className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/20">
            {initials}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-medium">
          {user.display_name}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-1 backdrop-blur-xl">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white truncate">
              {user.display_name}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {user.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <User className="h-4 w-4 mr-3 text-zinc-500" />
              {t('userDropdown.myProfile')}
            </Link>

            <Link
              to="/my-calendar"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Calendar className="h-4 w-4 mr-3 text-zinc-500" />
              {t('userDropdown.myCalendar')}
            </Link>

            {user.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4 mr-3 text-zinc-500" />
                {t('userDropdown.adminPanel')}
              </Link>
            )}

            {user.role === 'user' && (
              <Link
                to="/become-organiser"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Shield className="h-4 w-4 mr-3 text-zinc-500" />
                {t('userDropdown.becomeOrganiser')}
              </Link>
            )}
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-white/10 py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {t('userDropdown.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
