import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { enUS, bg } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useEvents } from '../hooks/useEvents';
import { EVENT_TYPE_CONFIG } from '../constants/eventTypes';
import { formatEventDate } from '../utils/dateFormat';
import type { Event, EventType } from '../types';

const DATE_LOCALES: Record<string, Locale> = { en: enUS, bg };

const WEEKDAY_KEYS = [
  'weekdays.mon', 'weekdays.tue', 'weekdays.wed', 'weekdays.thu',
  'weekdays.fri', 'weekdays.sat', 'weekdays.sun',
] as const;

/**
 * Group events by date string (YYYY-MM-DD) for fast lookup.
 * An event spans from start_datetime to end_datetime (or just start day).
 */
function groupEventsByDay(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();

  for (const event of events) {
    const start = parseISO(event.start_datetime);
    const end = event.end_datetime ? parseISO(event.end_datetime) : start;

    // For multi-day events, add to every day in the range
    const days = eachDayOfInterval({ start, end });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
  }

  return map;
}

/** Compact event chip showing emoji + truncated title. */
function EventChip({ event }: { event: Event }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
  const isCancelled = event.status === 'cancelled';

  return (
    <div
      className={`
        flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] leading-tight truncate
        ${isCancelled ? 'opacity-50 line-through' : ''}
      `}
      style={{
        backgroundColor: config.bg + '18',
        color: config.bg,
        borderLeft: `2px solid ${config.bg}`,
      }}
      title={event.title}
    >
      <span className="flex-shrink-0 text-[10px]">{config.emoji}</span>
      <span className="truncate font-medium">{event.title}</span>
    </div>
  );
}

/** A single day cell in the calendar grid. */
function DayCell({
  day,
  currentMonth,
  events,
  isSelected,
  onSelect,
  t,
}: {
  day: Date;
  currentMonth: Date;
  events: Event[];
  isSelected: boolean;
  onSelect: (day: Date) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const hasEvents = events.length > 0;
  const maxVisible = 3;
  const overflow = events.length - maxVisible;

  return (
    <button
      onClick={() => hasEvents && onSelect(day)}
      className={`
        relative flex flex-col items-stretch p-1 min-h-[5.5rem] sm:min-h-[7rem] rounded-lg transition-colors text-sm w-full text-left
        ${!inMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}
        ${today ? 'ring-2 ring-primary-500 ring-inset' : ''}
        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''}
        ${hasEvents && inMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'cursor-default'}
      `}
    >
      {/* Day number */}
      <span
        className={`
          text-xs sm:text-sm font-medium leading-none mb-1 self-start
          ${today ? 'bg-primary-600 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full' : ''}
        `}
      >
        {format(day, 'd')}
      </span>

      {/* Event chips */}
      {hasEvents && inMonth && (
        <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden min-w-0">
          {events.slice(0, maxVisible).map((e) => (
            <EventChip key={e.id} event={e} />
          ))}
          {overflow > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium pl-1.5">
              {t('common.moreCount', { count: overflow })}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/** Detail panel shown below the calendar when a day is selected. */
function DayDetailPanel({
  day,
  events,
  onClose,
  t,
  dateFnsLocale,
  lang,
}: {
  day: Date;
  events: Event[];
  onClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  dateFnsLocale: Locale;
  lang: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(day, 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            {t('common.events_count', { count: events.length })}
          </span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          aria-label={t('common.close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Event list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
        {events.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
          return (
            <button
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Event type indicator */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: config.bg + '20' }}
              >
                {config.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  event.status === 'cancelled'
                    ? 'text-gray-400 dark:text-gray-500 line-through'
                    : 'text-gray-800 dark:text-gray-100'
                }`}>
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t(`eventTypes.${event.event_type}`)}</span>
                  <span>&middot;</span>
                  <span>{formatEventDate(event.start_datetime, event.is_all_day, lang)}</span>
                  {event.location_name && (
                    <>
                      <span>&middot;</span>
                      <span className="truncate">{event.location_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Cancelled badge */}
              {event.status === 'cancelled' && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                  {t('eventStatus.cancelled')}
                </span>
              )}

              {/* Chevron */}
              <svg className="flex-shrink-0 w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Calendar Component ────────────────────────────────────

interface EventCalendarProps {
  /** Optional pre-selected event type filter (from the parent page). */
  eventTypeFilter?: EventType;
  /** Optional search filter. */
  searchFilter?: string;
}

export default function EventCalendar({
  eventTypeFilter,
  searchFilter,
}: EventCalendarProps) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = DATE_LOCALES[i18n.language] ?? enUS;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Calculate the visible date range (includes partial weeks from prev/next month)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  // Start week on Monday (weekStartsOn: 1)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch all events in this date range (with a generous limit)
  const { data, isLoading } = useEvents({
    date_from: calendarStart.toISOString(),
    date_to: calendarEnd.toISOString(),
    event_type: eventTypeFilter || undefined,
    search: searchFilter || undefined,
    offset: 0,
    limit: 200, // calendars need all events for the month
  });

  const events = data?.items ?? [];

  // Group events by day
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);

  // Events for the selected day
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];

  function handleDaySelect(day: Date) {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null); // toggle off
    } else {
      setSelectedDay(day);
    }
  }

  function handlePrevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDay(null);
  }

  function handleNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDay(null);
  }

  function handleToday() {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
          </h2>
          {!isSameMonth(currentMonth, new Date()) && (
            <button
              onClick={handleToday}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium px-2 py-0.5 rounded border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              {t('myCalendar.today')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label={t('myCalendar.previousMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label={t('myCalendar.nextMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-2"
            >
              {t(key)}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-700">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="bg-white dark:bg-gray-800">
                <DayCell
                  day={day}
                  currentMonth={currentMonth}
                  events={dayEvents}
                  isSelected={!!selectedDay && isSameDay(day, selectedDay)}
                  onSelect={handleDaySelect}
                  t={t}
                />
              </div>
            );
          })}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex justify-center py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: config.bg }}
            />
            <span>{t(`eventTypes.${type}`)}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <DayDetailPanel
          day={selectedDay}
          events={selectedDayEvents}
          onClose={() => setSelectedDay(null)}
          t={t}
          dateFnsLocale={dateFnsLocale}
          lang={i18n.language}
        />
      )}
    </div>
  );
}
