import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import i18n from '../i18n';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
}

export function useAuth() {
  const navigate = useNavigate();
  const { login, register, logout, user, isAuthenticated, isLoading } =
    useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setSubmitting(true);
      try {
        await login(email, password);
        navigate('/events');
      } catch (err) {
        const axiosErr = err as AxiosError<ApiErrorResponse>;
        setError(
          axiosErr.response?.data?.detail || i18n.t('auth.loginFailed'),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [login, navigate],
  );

  const handleRegister = useCallback(
    async (email: string, password: string, displayName: string) => {
      setError(null);
      setSubmitting(true);
      try {
        await register(email, password, displayName);
        navigate('/login?registered=1');
      } catch (err) {
        const axiosErr = err as AxiosError<ApiErrorResponse>;
        setError(
          axiosErr.response?.data?.detail ||
            i18n.t('auth.registrationFailed'),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [register, navigate],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    submitting,
    handleLogin,
    handleRegister,
    handleLogout,
    clearError: () => setError(null),
  };
}
