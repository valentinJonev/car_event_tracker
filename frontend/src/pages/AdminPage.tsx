import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import {
  usePendingOrgRequests,
  useReviewOrgRequest,
} from '../hooks/useOrgRequests';
import PageHero from '../components/PageHero';

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = usePendingOrgRequests();
  const reviewRequest = useReviewOrgRequest();

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewRequest.mutate({ id, status });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <PageHero
        title={t('admin.title')}
        description={t('admin.pendingRequests')}
        accent="violet"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}

        {isError && (
          <p className="text-red-400 text-sm text-center">
            {t('admin.failedToLoadRequests')}
          </p>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              {t('admin.noPendingRequests')}
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-4">
            {data.items.map((req) => (
              <div
                key={req.id}
                className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {req.user?.display_name ?? t('admin.unknownUser')}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {req.user?.email ?? req.user_id}
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">
                      {t('admin.submitted', { date: formatDate(req.created_at) })}
                    </p>
                  </div>
                  <span className="text-xs bg-amber-500/10 border border-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                    {req.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase">{t('admin.reason')}</p>
                  <p className="text-sm text-zinc-300">{req.reason}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview(req.id, 'approved')}
                    disabled={reviewRequest.isPending}
                    className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/20 text-sm px-4 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'rejected')}
                    disabled={reviewRequest.isPending}
                    className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20 text-sm px-4 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('admin.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
