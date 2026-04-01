import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useMyOrgRequest, useSubmitOrgRequest } from '../hooks/useOrgRequests';

export default function BecomeOrganiserPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { data: existingRequest, isLoading } = useMyOrgRequest();
  const submitRequest = useSubmitOrgRequest();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Already an organiser or admin
  if (user && (user.role === 'organiser' || user.role === 'admin')) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          {t('becomeOrganiser.alreadyRole', { role: user.role })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('becomeOrganiser.canCreateEvents')}
        </p>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await submitRequest.mutateAsync(reason);
      setReason('');
    } catch {
      setError(t('becomeOrganiser.failedToSubmit'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('becomeOrganiser.title')}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {t('becomeOrganiser.description')}
      </p>

      {/* Show existing request status */}
      {existingRequest && (
        <div
          className={`rounded-lg p-4 text-sm ${
            existingRequest.status === 'pending'
              ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
              : existingRequest.status === 'approved'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <p className="font-semibold">
            {t('becomeOrganiser.requestStatus')}{' '}
            <span className="uppercase">{existingRequest.status}</span>
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t('becomeOrganiser.submittedReason', { reason: existingRequest.reason })}
          </p>
          {existingRequest.reviewed_at && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('becomeOrganiser.reviewed', {
                date: new Date(existingRequest.reviewed_at).toLocaleDateString(i18n.language),
              })}
            </p>
          )}
        </div>
      )}

      {/* Show form only if no pending request */}
      {(!existingRequest || existingRequest.status === 'rejected') && (
        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('becomeOrganiser.formLabel')}
            </label>
            <textarea
              rows={4}
              required
              minLength={10}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('becomeOrganiser.formPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={submitRequest.isPending}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {submitRequest.isPending ? t('becomeOrganiser.submitting') : t('becomeOrganiser.submitRequest')}
          </button>
        </form>
      )}
    </div>
  );
}
