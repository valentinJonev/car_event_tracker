import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, BellOff, Check } from 'lucide-react';
import { useOrganiserDetail } from '../hooks/useOrganisers';
import { useEvents } from '../hooks/useEvents';
import { useSubscriptions, useCreateSubscription, useDeleteSubscription } from '../hooks/useSubscriptions';
import { useAuthStore } from '../store/authStore';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';

export default function OrganiserDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { data: organiser, isLoading, isError } = useOrganiserDetail(id);

  // Events by this organiser
  const [page, setPage] = useState(0);
  const limit = 6;
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    organiser_id: id,
    offset: page * limit,
    limit,
  });
  const totalPages = eventsData ? Math.ceil(eventsData.total / limit) : 0;

  // Subscription state
  const { data: subsData } = useSubscriptions({ enabled: isAuthenticated });
  const createSub = useCreateSubscription();
  const deleteSub = useDeleteSubscription();

  const existingSub = subsData?.items.find(
    (s) => s.filter_type === 'organiser' && s.filter_value === id
  );
  const isSubscribed = !!existingSub;

  // Detail modal
  const [searchParams, setSearchParams] = useSearchParams();
  const detailId = searchParams.get('detail');

  const handleSubscribe = async () => {
    if (!id || !organiser) return;
    await createSub.mutateAsync({
      filter_type: 'organiser',
      filter_value: id,
      filter_meta: { display_name: organiser.display_name },
    });
  };

  const handleUnsubscribe = async () => {
    if (!existingSub) return;
    await deleteSub.mutateAsync(existingSub.id);
  };

  const formatMemberSince = (iso: string) => {
    return new Date(iso).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  if (isError || !organiser) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-red-400">{t('organisers.organiserNotFound')}</h2>
        <Link
          to="/organisers"
          className="text-white hover:text-zinc-300 mt-4 inline-block"
        >
          {t('organisers.backToOrganisers')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back link */}
      <Link
        to="/organisers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('organisers.backToOrganisers')}
      </Link>

      {/* Profile header */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-red-500/20 to-violet-500/20" />

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="-mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4">
            <div className="flex items-end gap-4">
              {organiser.avatar_url ? (
                <img
                  src={organiser.avatar_url}
                  alt={organiser.display_name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-zinc-950 bg-zinc-900"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center ring-4 ring-zinc-950">
                  <span className="text-3xl font-bold text-white">
                    {organiser.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="pb-1">
                <h1 className="text-2xl font-bold text-white">
                  {organiser.display_name}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-sm text-zinc-400">
                    {t('organisers.memberSince', { date: formatMemberSince(organiser.created_at) })}
                  </p>
                  {organiser.social_links &&
                    (organiser.social_links.facebook || organiser.social_links.instagram) && (
                      <div className="flex items-center gap-2">
                        {organiser.social_links.facebook && (
                          <a
                            href={organiser.social_links.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-blue-400 transition-colors"
                            title={t('organisers.facebook')}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </a>
                        )}
                        {organiser.social_links.instagram && (
                          <a
                            href={organiser.social_links.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-pink-400 transition-colors"
                            title={t('organisers.instagram')}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Subscribe button */}
            {isAuthenticated && user?.id !== id && (
              <div>
                {isSubscribed ? (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={deleteSub.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {t('organisers.subscribed')}
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={createSub.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-white text-zinc-900 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4" />
                    {t('organisers.subscribe')}
                  </button>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-white text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                <BellOff className="w-4 h-4" />
                {t('organisers.signInToSubscribe')}
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-6 pt-4 border-t border-white/10">
            <div>
              <span className="text-2xl font-bold text-white">
                {organiser.event_count}
              </span>
              <span className="ml-1 text-sm text-zinc-400">
                {t('organisers.totalEvents')}
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold text-red-400">
                {organiser.upcoming_event_count}
              </span>
              <span className="ml-1 text-sm text-zinc-400">
                {t('organisers.upcoming')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Events section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          {t('organisers.eventsByOrganiser', { name: organiser.display_name })}
        </h2>

        {eventsLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}

        {eventsData && eventsData.items.length === 0 && (
          <div className="text-center py-10 text-zinc-400 bg-white/5 border border-white/10 rounded-3xl">
            {t('organisers.noEventsYet')}
          </div>
        )}

        {eventsData && eventsData.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsData.items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

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
          </>
        )}
      </div>

      {/* Event detail modal */}
      {detailId && (
        <EventDetailModal
          eventId={detailId}
          onClose={() => {
            searchParams.delete('detail');
            setSearchParams(searchParams, { replace: true });
          }}
        />
      )}
    </div>
  );
}
