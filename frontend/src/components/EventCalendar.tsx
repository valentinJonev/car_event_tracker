import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
import type { Event, EventType, EventStatus } from '../types';

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
        ${!inMonth ? 'text-zinc-700' : 'text-zinc-200'}
        ${today ? 'ring-2 ring-red-500/50 ring-inset' : ''}
        ${isSelected ? 'bg-white/10' : ''}
        ${hasEvents && inMonth ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}
      `}
    >
      {/* Day number */}
      <span
        className={`
          text-xs sm:text-sm font-medium leading-none mb-1 self-start
          ${today ? 'bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full' : ''}
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
            <span className="text-[10px] text-zinc-500 font-medium pl-1.5">
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
  onEventClick,
  t,
  dateFnsLocale,
  lang,
}: {
  day: Date;
  events: Event[];
  onClose: () => void;
  onEventClick?: (event: Event) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  dateFnsLocale: Locale;
  lang: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white">
          {format(day, 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {t('common.events_count', { count: events.length })}
          </span>
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Event list */}
      <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
        {events.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
          return (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
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
                    ? 'text-zinc-600 line-through'
                    : 'text-white'
                }`}>
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
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
                <span className="flex-shrink-0 text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                  {t('eventStatus.cancelled')}
                </span>
              )}

              {/* Chevron */}
              <ChevronRight className="flex-shrink-0 w-4 h-4 text-zinc-600" />
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
  /** Optional status filter. */
  statusFilter?: EventStatus;
  /** Optional callback when an event is clicked (e.g. to open detail modal). */
  onEventClick?: (event: Event) => void;
}

export default function EventCalendar({
  eventTypeFilter,
  searchFilter,
  statusFilter,
  onEventClick,
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
    status: statusFilter || undefined,
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
          <h2 className="text-lg font-semibold text-white">
            {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
          </h2>
          {!isSameMonth(currentMonth, new Date()) && (
            <button
              onClick={handleToday}
              className="text-xs text-zinc-400 hover:text-white font-medium px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/5 transition-colors"
            >
              {t('myCalendar.today')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            aria-label={t('myCalendar.previousMonth')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            aria-label={t('myCalendar.nextMonth')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide py-2"
            >
              {t(key)}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-white/5">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="bg-zinc-900">
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
          <div className="flex justify-center py-4 border-t border-white/10">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/40" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
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
          onEventClick={onEventClick}
          t={t}
          dateFnsLocale={dateFnsLocale}
          lang={i18n.language}
        />
      )}
    </div>
  );
}
