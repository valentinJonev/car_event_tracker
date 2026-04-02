import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { handleRegister, error, submitting, clearError } = useAuth();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 8) {
      setLocalError(t('auth.passwordMinLength'));
      return;
    }

    handleRegister(email, password, displayName);
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {t('auth.createAccount')}
          </h1>
        </div>

        {displayError && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl mb-4 text-sm flex items-center justify-between">
            <span>{displayError}</span>
            <button
              onClick={() => {
                setLocalError(null);
                clearError();
              }}
              className="text-red-400 hover:text-red-200 ml-2"
            >
              &times;
            </button>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl px-8 py-8 space-y-5"
        >
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              {t('auth.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500"
              placeholder={t('auth.displayNamePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500"
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500"
              placeholder={t('auth.minCharacters')}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500"
              placeholder={t('auth.repeatPassword')}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-zinc-900 font-medium py-2.5 rounded-full transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="text-white hover:text-zinc-300 font-medium"
          >
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
