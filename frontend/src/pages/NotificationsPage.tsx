import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const limit = 20;
  const { data, isLoading } = useNotifications(page * limit, limit);
  const markRead = useMarkNotificationRead();

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('notifications.title')}</h1>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-10">
          {t('notifications.noNotifications')}
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((n) => (
            <div
              key={n.id}
              className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-start justify-between ${
                n.status !== 'read' ? 'border-l-4 border-primary-500' : ''
              }`}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {n.message || t('notifications.newEventNotification')}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                  <span>{n.channel}</span>
                  <span>{n.status}</span>
                  <span>{formatDate(n.created_at)}</span>
                </div>
              </div>

              {n.status !== 'read' && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  disabled={markRead.isPending}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 whitespace-nowrap ml-4"
                >
                  {t('notifications.markRead')}
                </button>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                {t('common.previous')}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('common.page', { current: page + 1, total: totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
