import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users, Clock3, Bookmark, Star } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { usePlatformStats } from '../hooks/useStats';
import { formatEventDate } from '../utils/dateFormat';
import EventDetailModal from '../components/EventDetailModal';
import { useSearchParams } from 'react-router-dom';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailId = searchParams.get('detail');

  // Fetch recent events (latest 3)
  const { data: recentData } = useEvents({ limit: 3 });
  // Fetch total count for stats
  const { data: allData } = useEvents({ limit: 1 });
  // Fetch platform stats (user counts + featured event)
  const { data: stats } = usePlatformStats();

  const recentEvents = recentData?.items ?? [];
  const totalEvents = allData?.total ?? 0;

  // Featured event from the stats API (3-tier fallback: admin pick → most saved → latest)
  const featuredEvent = stats?.featured_event ?? null;

  const openDetail = (eventId: string) => {
    setSearchParams({ detail: eventId });
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Hero section with stats + featured event */}
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-2xl">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          {/* Left: intro + stats */}
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
              {t('home.eyebrow', { defaultValue: 'Discover, map, and save car events' })}
            </div>
            <div>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                {t('home.title', {
                  defaultValue:
                    'A social event platform for track days, meetups, drifting, and road runs.',
                })}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                {t('home.description', {
                  defaultValue:
                    'Browse what is trending, catch the newest events, and jump into event details from a curated home overview.',
                })}
              </p>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold">{totalEvents}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('home.allEvents', { defaultValue: 'All events' })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold">{stats?.total_users ?? '--'}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('home.gearheads', { defaultValue: 'Gearheads' })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold">{stats?.total_organisers ?? '--'}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('home.organizers', { defaultValue: 'Organizers' })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: featured event */}
          {featuredEvent && (
            <div className="rounded-[28px] border border-white/10 bg-black/25 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {featuredEvent.is_admin_pick && (
                      <Star className="h-4 w-4 text-amber-400" />
                    )}
                    {t('home.featuredEvent', { defaultValue: 'Featured event' })}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {featuredEvent.is_admin_pick
                      ? t('home.adminPick', { defaultValue: "Admin's pick" })
                      : featuredEvent.save_count > 0
                        ? t('home.mostSaved', { defaultValue: 'Most saved by the community' })
                        : t('home.featuredSubtitle', { defaultValue: 'Latest addition' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {featuredEvent.save_count > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                      <Bookmark className="h-3 w-3" /> {featuredEvent.save_count}
                    </div>
                  )}
                  {featuredEvent.max_attendees && (
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                      {featuredEvent.max_attendees} {t('eventDetail.maxAttendees', { defaultValue: 'attendees' })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/70 p-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {t(`eventTypes.${featuredEvent.event_type}`)}
                  </div>
                  <div className="mt-1 text-xl font-semibold">{featuredEvent.title}</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    {formatEventDate(
                      featuredEvent.start_datetime,
                      featuredEvent.is_all_day,
                      i18n.language,
                    )}{' '}
                    &bull; {featuredEvent.location_name}
                  </div>
                </div>
                {featuredEvent.organiser && (
                  <div className="space-y-2 text-sm text-zinc-300">
                    <div>
                      <span className="text-zinc-500">{t('eventDetail.organiser')}:</span>{' '}
                      {featuredEvent.organiser.display_name}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openDetail(featuredEvent.id)}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                  >
                    {t('eventDetail.viewDetails', { defaultValue: 'Open details' })}
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                  >
                    {t('home.viewAllEvents', { defaultValue: 'View all events' })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recently added events */}
      {recentEvents.length > 0 && (
        <div className="rounded-[32px] border border-white/10 bg-zinc-900 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {t('home.recentlyAdded', { defaultValue: 'Recently added events' })}
              </h3>
              <p className="text-sm text-zinc-400">
                {t('home.recentlyAddedDesc', {
                  defaultValue: 'Top 3 newest events added to the platform.',
                })}
              </p>
            </div>
            <button
              onClick={() => navigate('/events')}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
            >
              {t('home.viewAllEvents', { defaultValue: 'View all events' })}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recentEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => openDetail(event.id)}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {t(`eventTypes.${event.event_type}`)}
                  </div>
                  <Clock3 className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="text-lg font-semibold text-white">{event.title}</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location_name}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
                  <span>{event.organiser?.display_name ?? ''}</span>
                  {event.max_attendees && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" /> {event.max_attendees}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {detailId && (
        <EventDetailModal eventId={detailId} onClose={closeDetail} />
      )}
    </div>
  );
}
