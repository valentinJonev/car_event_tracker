import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Clock, CheckCircle, XCircle } from 'lucide-react';
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          {t('becomeOrganiser.alreadyRole', { role: user.role })}
        </h1>
        <p className="text-zinc-400">
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/20 mb-4">
          <Award className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{t('becomeOrganiser.title')}</h1>
        <p className="text-zinc-400 mt-2">
          {t('becomeOrganiser.description')}
        </p>
      </div>

      {/* Show existing request status */}
      {existingRequest && (
        <div
          className={`rounded-3xl p-5 text-sm border ${
            existingRequest.status === 'pending'
              ? 'bg-amber-500/10 border-amber-400/20'
              : existingRequest.status === 'approved'
                ? 'bg-emerald-500/10 border-emerald-400/20'
                : 'bg-red-500/10 border-red-400/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {existingRequest.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
            {existingRequest.status === 'approved' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {existingRequest.status === 'rejected' && <XCircle className="w-4 h-4 text-red-400" />}
            <p className={`font-semibold ${
              existingRequest.status === 'pending' ? 'text-amber-300' :
              existingRequest.status === 'approved' ? 'text-emerald-300' : 'text-red-300'
            }`}>
              {t('becomeOrganiser.requestStatus')}{' '}
              <span className="uppercase">{existingRequest.status}</span>
            </p>
          </div>
          <p className="text-zinc-400">
            {t('becomeOrganiser.submittedReason', { reason: existingRequest.reason })}
          </p>
          {existingRequest.reviewed_at && (
            <p className="text-xs text-zinc-500 mt-1">
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
          className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              {t('becomeOrganiser.formLabel')}
            </label>
            <textarea
              rows={4}
              required
              minLength={10}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500"
              placeholder={t('becomeOrganiser.formPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={submitRequest.isPending}
            className="bg-white text-zinc-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {submitRequest.isPending ? t('becomeOrganiser.submitting') : t('becomeOrganiser.submitRequest')}
          </button>
        </form>
      )}
    </div>
  );
}
