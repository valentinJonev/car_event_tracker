import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import EventCalendar from '../components/EventCalendar';
import type { EventType } from '../types';

const EVENT_TYPE_VALUES: (EventType | '')[] = [
  '', 'racing', 'car_show', 'track_day', 'meetup', 'drift', 'drag', 'hillclimb', 'other',
];

type ViewMode = 'list' | 'calendar';

/** SVG icon for list view. */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

/** SVG icon for calendar view. */
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export default function EventListPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [page, setPage] = useState(0);
  const limit = 12;

  // List view data (only fetched when in list mode to avoid wasted requests)
  const { data, isLoading, isError } = useEvents(
    {
      search: search || undefined,
      event_type: eventType || undefined,
      offset: page * limit,
      limit,
    },
    viewMode === 'list', // disable query when calendar is active
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t('eventList.title')}
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder={t('eventList.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {/* Event type filter */}
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value as EventType | '');
              setPage(0);
            }}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {EVENT_TYPE_VALUES.map((val) => (
              <option key={val} value={val}>
                {val === '' ? t('eventList.allTypes') : t(`eventTypes.${val}`)}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden self-start">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              aria-label={t('eventList.listView')}
              title={t('eventList.listView')}
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('eventList.list')}</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              aria-label={t('eventList.calendarView')}
              title={t('eventList.calendarView')}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('eventList.calendar')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (
        <EventCalendar
          eventTypeFilter={eventType || undefined}
          searchFilter={search || undefined}
        />
      )}

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <>
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          )}

          {isError && (
            <div className="text-center py-20 text-red-500">
              {t('eventList.failedToLoad')}
            </div>
          )}

          {data && data.items.length === 0 && (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              {t('eventList.noEvents')}
            </div>
          )}

          {data && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

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
            </>
          )}
        </>
      )}
    </div>
  );
}
