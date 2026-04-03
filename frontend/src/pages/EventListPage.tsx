import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvents } from '../hooks/useEvents';
import EventCalendar from '../components/EventCalendar';
import PageHero from '../components/PageHero';
import FilterBar from '../components/FilterBar';
import type { StatusFilter } from '../components/FilterBar';
import EventDetailModal from '../components/EventDetailModal';
import { List, Calendar, MapPin, Users, Clock3 } from 'lucide-react';
import { formatEventDate } from '../utils/dateFormat';
import type { EventType } from '../types';

type ViewMode = 'list' | 'calendar';

export default function EventListPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const detailId = searchParams.get('detail');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(0);
  const limit = 12;

  // Map the UI status filter to the API status param
  const apiStatus = statusFilter === 'upcoming' ? 'published' : statusFilter === 'cancelled' ? 'cancelled' : undefined;

  const { data, isLoading, isError } = useEvents(
    {
      search: search || undefined,
      event_type: eventType || undefined,
      status: apiStatus,
      offset: page * limit,
      limit,
    },
    viewMode === 'list',
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const openDetail = (eventId: string) => {
    setSearchParams({ detail: eventId });
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <PageHero
        eyebrow={t('eventList.eyebrow', { defaultValue: 'Search the full event catalog' })}
        title={t('eventList.heroTitle', { defaultValue: 'All events in one place.' })}
        description={t('eventList.heroDescription', {
          defaultValue:
            'Filter by type, city, organizer, and date to find the exact event you want.',
        })}
        accent="blue"
      />

      {/* Filters + view toggle */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-4">
        <FilterBar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(0);
          }}
          eventType={eventType}
          onEventTypeChange={(val) => {
            setEventType(val);
            setPage(0);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPage(0);
          }}
        >
          {/* View toggle slot */}
          <div className="inline-flex gap-1 rounded-2xl bg-white/5 p-1 justify-self-end">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={t('eventList.listView')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('eventList.list')}</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={t('eventList.calendarView')}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t('eventList.calendar')}</span>
            </button>
          </div>
        </FilterBar>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <EventCalendar
          eventTypeFilter={eventType || undefined}
          searchFilter={search || undefined}
          statusFilter={apiStatus}
          onEventClick={(event) => openDetail(event.id)}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="rounded-[32px] border border-white/10 bg-zinc-900 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('eventList.title')}</h3>
              <p className="text-sm text-zinc-400">
                {t('eventList.browseDesc', {
                  defaultValue: 'Browse every event and refine the list with filters.',
                })}
              </p>
            </div>
            {data && (
              <div className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 sm:block">
                {data.total} {t('eventList.matching', { defaultValue: 'matching' })}
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="rounded-3xl border border-dashed border-red-400/20 bg-red-500/5 p-8 text-center text-sm text-red-300">
              {t('eventList.failedToLoad')}
            </div>
          )}

          {/* Empty */}
          {data && data.items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
              {t('eventList.noEvents')}
            </div>
          )}

          {/* Event cards grid */}
          {data && data.items.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((event) => (
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
                        <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-200">
                          {t('eventStatus.cancelled')}
                        </span>
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
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{event.location_name}</span>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="min-w-[6.5rem] rounded-full border border-white/10 px-4 py-2 text-center text-sm text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    {t('common.previous')}
                  </button>
                  <span className="text-sm text-zinc-400">
                    {t('common.page', { current: page + 1, total: totalPages })}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="min-w-[6.5rem] rounded-full border border-white/10 px-4 py-2 text-center text-sm text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    {t('common.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailId && <EventDetailModal eventId={detailId} onClose={closeDetail} />}
    </div>
  );
}
