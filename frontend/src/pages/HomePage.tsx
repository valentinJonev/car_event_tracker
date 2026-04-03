import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users, Clock3, Bookmark, Star, Images } from 'lucide-react';
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
  // Fetch latest events with cover images for the gallery section
  const { data: latestImagesData } = useEvents({ limit: 12 });
  // Fetch total count for stats
  const { data: allData } = useEvents({ limit: 1 });
  // Fetch platform stats (user counts + featured event)
  const { data: stats } = usePlatformStats();

  const recentEvents = recentData?.items ?? [];
  const latestEventImages = (latestImagesData?.items ?? [])
    .filter((event) => !!event.cover_image_url)
    .slice(0, 6);
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-xl font-semibold sm:text-2xl">{totalEvents}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('home.allEvents', { defaultValue: 'All events' })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-xl font-semibold sm:text-2xl">{stats?.total_users ?? '--'}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('home.gearheads', { defaultValue: 'Gearheads' })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-xl font-semibold sm:text-2xl">{stats?.total_organisers ?? '--'}</div>
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
                    <Star className="h-4 w-4 text-amber-400" />
                    {t('home.featuredEvent', { defaultValue: 'Featured event' })}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
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
                  {featuredEvent.max_attendees && !featuredEvent.is_admin_pick && (
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                      {featuredEvent.max_attendees} {t('eventDetail.maxAttendees', { defaultValue: 'attendees' })}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => openDetail(featuredEvent.id)}
                className="w-full space-y-4 rounded-3xl border border-white/10 bg-zinc-900/70 p-4 text-left transition-colors hover:bg-white/10"
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {t(`eventTypes.${featuredEvent.event_type}`)}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">{featuredEvent.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {formatEventDate(
                        featuredEvent.start_datetime,
                        featuredEvent.is_all_day,
                        i18n.language,
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{featuredEvent.location_name}</span>
                  </div>
                </div>
                {featuredEvent.organiser && (
                  <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
                    <span>{featuredEvent.organiser.display_name}</span>
                    {featuredEvent.max_attendees && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" /> {featuredEvent.max_attendees}
                      </span>
                    )}
                  </div>
                )}
              </button>
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
                className={`rounded-3xl border p-4 text-left transition-colors ${
                  event.status === 'cancelled'
                    ? 'border-red-400/20 bg-red-500/5 opacity-75'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {t(`eventTypes.${event.event_type}`)}
                  </div>
                  {event.status === 'cancelled' ? (
                    <div className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
                      {t('eventStatus.cancelled')}
                    </div>
                  ) : (
                    <Clock3 className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    event.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-white'
                  }`}
                >
                  {event.title}
                </div>
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

      {/* Latest uploaded images */}
      {latestEventImages.length > 0 && (
        <section className="rounded-[32px] border border-white/10 bg-zinc-900 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Images className="h-4 w-4 text-red-300" />
                {t('home.latestImages', { defaultValue: 'Latest uploaded images' })}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">
                {t('home.latestImagesTitle', { defaultValue: 'Fresh event visuals from the community' })}
              </h3>
              <p className="text-sm text-zinc-400">
                {t('home.latestImagesDesc', {
                  defaultValue: 'Recently uploaded cover images from newly added events.',
                })}
              </p>
            </div>
            <button
              onClick={() => navigate('/events')}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
            >
              {t('home.exploreEvents', { defaultValue: 'Explore events' })}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {latestEventImages.map((event) => (
              <button
                key={event.id}
                onClick={() => openDetail(event.id)}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black text-left"
              >
                <img
                  src={event.cover_image_url!}
                  alt={event.title}
                  className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-zinc-200 backdrop-blur-sm w-fit">
                    {t(`eventTypes.${event.event_type}`)}
                  </div>
                  <div className="mt-3 line-clamp-1 text-base font-semibold text-white">
                    {event.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-300">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{event.location_name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Event detail modal */}
      {detailId && (
        <EventDetailModal eventId={detailId} onClose={closeDetail} />
      )}
    </div>
  );
}
