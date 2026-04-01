import { useTranslation } from 'react-i18next';
import {
  usePendingOrgRequests,
  useReviewOrgRequest,
} from '../hooks/useOrgRequests';

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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('admin.title')}</h1>

      <section>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          {t('admin.pendingRequests')}
        </h2>

        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        )}

        {isError && (
          <p className="text-red-500 text-sm">
            {t('admin.failedToLoadRequests')}
          </p>
        )}

        {data && data.items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('admin.noPendingRequests')}
          </p>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-4">
            {data.items.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {req.user?.display_name ?? t('admin.unknownUser')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {req.user?.email ?? req.user_id}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('admin.submitted', { date: formatDate(req.created_at) })}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded font-semibold">
                    {req.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{t('admin.reason')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{req.reason}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview(req.id, 'approved')}
                    disabled={reviewRequest.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
                  >
                    {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'rejected')}
                    disabled={reviewRequest.isPending}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
                  >
                    {t('admin.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
