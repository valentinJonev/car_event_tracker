import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle } from 'lucide-react';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';
import PageHero from '../components/PageHero';

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
    <div className="space-y-6">
      <PageHero
        title={t('notifications.title')}
        accent="blue"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              {t('notifications.noNotifications')}
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((n) => (
              <div
                key={n.id}
                className={`bg-white/5 border rounded-2xl p-4 flex items-start justify-between ${
                  n.status !== 'read'
                    ? 'border-red-400/20 bg-red-500/5'
                    : 'border-white/10'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm text-zinc-200">
                    {n.message || t('notifications.newEventNotification')}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>{n.channel}</span>
                    <span className={n.status !== 'read' ? 'text-red-400 font-medium' : ''}>{n.status}</span>
                    <span>{formatDate(n.created_at)}</span>
                  </div>
                </div>

                {n.status !== 'read' && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white whitespace-nowrap ml-4 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
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
                  className="px-4 py-2 text-sm border border-white/10 bg-white/5 rounded-full disabled:opacity-40 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  {t('common.previous')}
                </button>
                <span className="text-sm text-zinc-500">
                  {t('common.page', { current: page + 1, total: totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 text-sm border border-white/10 bg-white/5 rounded-full disabled:opacity-40 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
