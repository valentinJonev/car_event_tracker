import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, List, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
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
  isPast,
} from 'date-fns';
import { enUS, bg } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import {
  useMyCalendar,
  useUnsaveEvent,
  useCalendarFeedInfo,
  useGenerateFeedToken,
  useRevokeFeedToken,
} from '../hooks/useCalendar';
import { EVENT_TYPE_CONFIG } from '../constants/eventTypes';
import { formatEventDate } from '../utils/dateFormat';
import PageHero from '../components/PageHero';
import EventDetailModal from '../components/EventDetailModal';
import type { Event } from '../types';

const DATE_LOCALES: Record<string, Locale> = { en: enUS, bg };

const WEEKDAY_KEYS = [
  'weekdays.mon', 'weekdays.tue', 'weekdays.wed', 'weekdays.thu',
  'weekdays.fri', 'weekdays.sat', 'weekdays.sun',
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────

function extractEvents(items: { event: Event }[]): Event[] {
  return items.map((s) => s.event);
}

function groupByDay(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const event of events) {
    const start = parseISO(event.start_datetime);
    const end = event.end_datetime ? parseISO(event.end_datetime) : start;
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

// ── Sub-components ──────────────────────────────────────────────────────

function CalendarSubscription() {
  const { t } = useTranslation();
  const { data: feedInfo, isLoading } = useCalendarFeedInfo();
  const generateToken = useGenerateFeedToken();
  const revokeToken = useRevokeFeedToken();
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const feedUrl = feedInfo?.feed_url ?? null;
  const hasToken = !!feedUrl;

  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = feedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = () => generateToken.mutate();

  const handleRevoke = () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      setTimeout(() => setConfirmRevoke(false), 3000);
      return;
    }
    revokeToken.mutate();
    setConfirmRevoke(false);
  };

  if (isLoading) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-300">{t('calendarSubscription.title')}</h3>
        {hasToken && (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs text-red-300 hover:text-red-200 font-medium"
          >
            {showInstructions ? t('calendarSubscription.hideInstructions') : t('calendarSubscription.howToSubscribe')}
          </button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {!hasToken ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-zinc-400">{t('calendarSubscription.subscribeDescription')}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('calendarSubscription.readOnlyFeed')}</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generateToken.isPending}
              className="flex-shrink-0 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {generateToken.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-zinc-900" />
              ) : (
                t('calendarSubscription.generateLink')
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <code className="text-xs text-zinc-400 break-all select-all">{feedUrl}</code>
              </div>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${
                  copied
                    ? 'border-green-400/30 bg-green-500/10 text-green-300'
                    : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                }`}
              >
                {copied ? t('calendarSubscription.copied') : t('calendarSubscription.copy')}
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={handleGenerate}
                disabled={generateToken.isPending}
                className="text-zinc-400 hover:text-white font-medium disabled:opacity-50"
              >
                {generateToken.isPending ? t('calendarSubscription.regenerating') : t('calendarSubscription.regenerateLink')}
              </button>
              <span className="text-zinc-700">|</span>
              <button
                onClick={handleRevoke}
                disabled={revokeToken.isPending}
                className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
              >
                {revokeToken.isPending
                  ? t('calendarSubscription.revoking')
                  : confirmRevoke
                    ? t('calendarSubscription.confirmRevoke')
                    : t('calendarSubscription.revokeLink')}
              </button>
            </div>

            <p className="text-[11px] text-zinc-600">{t('calendarSubscription.securityNote')}</p>
          </>
        )}

        {showInstructions && hasToken && (
          <div className="mt-2 space-y-4 border-t border-white/10 pt-3">
            <div>
              <h4 className="mb-1.5 text-sm font-semibold text-zinc-300">
                &#63743; {t('calendarSubscription.appleCalendarTitle')}
              </h4>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-zinc-400">
                <li>{t('calendarSubscription.appleStep1')}</li>
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep5') }} />
              </ol>
              <p className="ml-6 mt-1 text-[11px] text-zinc-500" dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleMacNote') }} />
            </div>
            <div>
              <h4 className="mb-1.5 text-sm font-semibold text-zinc-300">{t('calendarSubscription.googleCalendarTitle')}</h4>
              <ol className="ml-6 list-decimal space-y-1 text-xs text-zinc-400">
                <li>{t('calendarSubscription.googleStep1')}</li>
                <li>
                  {t('calendarSubscription.googleStep2').split('<0>')[0]}
                  <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:underline">Google Calendar</a>
                  {t('calendarSubscription.googleStep2').split('</0>')[1] ?? ''}
                </li>
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep5') }} />
              </ol>
              <p className="ml-6 mt-1 text-[11px] text-zinc-500">{t('calendarSubscription.googleNote')}</p>
            </div>
            <div>
              <h4 className="mb-1.5 text-sm font-semibold text-zinc-300">{t('calendarSubscription.otherAppsTitle')}</h4>
              <p className="ml-6 text-xs text-zinc-400">{t('calendarSubscription.otherAppsDesc')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventChip({ event }: { event: Event }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
  const isCancelled = event.status === 'cancelled';
  return (
    <div
      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] leading-tight sm:text-[11px] ${
        isCancelled ? 'opacity-50 line-through' : ''
      }`}
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

function DayCell({
  day,
  currentMonth,
  events,
  isSelected,
  onSelect,
}: {
  day: Date;
  currentMonth: Date;
  events: Event[];
  isSelected: boolean;
  onSelect: (d: Date) => void;
}) {
  const { t } = useTranslation();
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const hasEvents = events.length > 0;
  const maxVisible = 3;
  const overflow = events.length - maxVisible;

  return (
    <button
      onClick={() => hasEvents && onSelect(day)}
      className={`relative flex min-h-[5.5rem] w-full flex-col items-stretch rounded-xl border p-1 text-left text-sm transition-colors sm:min-h-[7rem] ${
        !inMonth
          ? 'border-transparent text-zinc-700'
          : today
            ? 'border-red-400/30 bg-red-500/5 text-white'
            : isSelected
              ? 'border-red-400/30 bg-red-500/10 text-white'
              : hasEvents
                ? 'cursor-pointer border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                : 'cursor-default border-white/5 text-zinc-400'
      }`}
    >
      <span
        className={`mb-1 self-start text-xs font-medium leading-none sm:text-sm ${
          today
            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white sm:h-6 sm:w-6'
            : ''
        }`}
      >
        {format(day, 'd')}
      </span>
      {hasEvents && inMonth && (
        <div className="mt-0.5 flex min-w-0 flex-col gap-0.5 overflow-hidden">
          {events.slice(0, maxVisible).map((e) => (
            <EventChip key={e.id} event={e} />
          ))}
          {overflow > 0 && (
            <span className="pl-1.5 text-[10px] font-medium text-zinc-500">
              {t('common.moreCount', { count: overflow })}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function DayDetailPanel({
  day,
  events,
  onClose,
  onRemove,
  removing,
  onOpenDetail,
}: {
  day: Date;
  events: Event[];
  onClose: () => void;
  onRemove: (eventId: string) => void;
  removing: boolean;
  onOpenDetail: (eventId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateFnsLocale = DATE_LOCALES[lang] ?? enUS;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold">
          {format(day, 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {t('common.events_count', { count: events.length })}
          </span>
        </h3>
        <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-1 text-zinc-400 hover:text-white" aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-64 divide-y divide-white/5 overflow-y-auto">
        {events.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
          return (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
              <button
                onClick={() => onOpenDetail(event.id)}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ backgroundColor: config.bg + '20' }}
                >
                  {config.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${
                    event.status === 'cancelled' ? 'text-zinc-500 line-through' : 'text-white'
                  }`}>
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{t(`eventTypes.${event.event_type}`)}</span>
                    <span>&middot;</span>
                    <span>{formatEventDate(event.start_datetime, event.is_all_day, lang)}</span>
                  </div>
                </div>
                {event.status === 'cancelled' && (
                  <span className="flex-shrink-0 rounded-full border border-red-400/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                    {t('eventStatus.cancelled')}
                  </span>
                )}
              </button>
              <button
                onClick={() => onRemove(event.id)}
                disabled={removing}
                className="flex-shrink-0 p-1 text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                title={t('myCalendar.removeFromCalendar')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingList({
  events,
  onRemove,
  removing,
  onOpenDetail,
}: {
  events: Event[];
  onRemove: (eventId: string) => void;
  removing: boolean;
  onOpenDetail: (eventId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const upcoming = events.filter((e) => !isPast(parseISO(e.start_datetime)));
  const past = events.filter((e) => isPast(parseISO(e.start_datetime)));

  const renderEvent = (event: Event) => {
    const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
    return (
      <div key={event.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5">
        <button
          onClick={() => onOpenDetail(event.id)}
          className="flex flex-1 min-w-0 items-center gap-4 text-left"
        >
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-base"
            style={{ backgroundColor: config.bg + '20' }}
          >
            {config.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-medium ${
              event.status === 'cancelled' ? 'text-zinc-500 line-through' : 'text-white'
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
          {event.status === 'cancelled' && (
            <span className="flex-shrink-0 rounded-full border border-red-400/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
              {t('eventStatus.cancelled')}
            </span>
          )}
        </button>
        <button
          onClick={() => onRemove(event.id)}
          disabled={removing}
          className="flex-shrink-0 p-1.5 text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
          title={t('myCalendar.removeFromCalendar')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              {t('myCalendar.upcoming', { count: upcoming.length })}
            </h3>
          </div>
          <div className="divide-y divide-white/5">{upcoming.map(renderEvent)}</div>
        </div>
      )}

      {past.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 opacity-60">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-500">
              {t('myCalendar.past', { count: past.length })}
            </h3>
          </div>
          <div className="divide-y divide-white/5">{past.map(renderEvent)}</div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="py-16 text-center text-zinc-400">
          <Calendar className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
          <p className="mb-1 text-lg font-medium">{t('myCalendar.emptyCalendar')}</p>
          <p className="mb-4 text-sm">{t('myCalendar.emptyCalendarDesc')}</p>
          <Link
            to="/events"
            className="inline-block rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            {t('myCalendar.browseEvents')}
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────

type ViewMode = 'calendar' | 'list';

export default function MyCalendarPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateFnsLocale = DATE_LOCALES[lang] ?? enUS;
  const [searchParams, setSearchParams] = useSearchParams();
  const detailId = searchParams.get('detail');

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const unsaveEvent = useUnsaveEvent();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: calendarData, isLoading: calendarLoading } = useMyCalendar(
    {
      date_from: calendarStart.toISOString(),
      date_to: calendarEnd.toISOString(),
      limit: 200,
    },
    viewMode === 'calendar',
  );

  const { data: listData, isLoading: listLoading } = useMyCalendar(
    { limit: 100 },
    viewMode === 'list',
  );

  const calendarEvents = useMemo(
    () => (calendarData ? extractEvents(calendarData.items) : []),
    [calendarData],
  );
  const eventsByDay = useMemo(() => groupByDay(calendarEvents), [calendarEvents]);

  const listEvents = useMemo(
    () => (listData ? extractEvents(listData.items) : []),
    [listData],
  );

  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];

  const handleDaySelect = (day: Date) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  const handleRemove = (eventId: string) => {
    unsaveEvent.mutate(eventId);
  };

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
        eyebrow={t('myCalendar.eyebrow', { defaultValue: 'Your saved plans' })}
        title={t('myCalendar.heroTitle', { defaultValue: 'Track your subscribed events.' })}
        description={t('myCalendar.heroDescription', {
          defaultValue:
            'Keep your saved events organized in a personal calendar and revisit them whenever you need.',
        })}
        accent="violet"
      />

      {/* Calendar subscription */}
      <CalendarSubscription />

      {/* View toggle + header */}
      <div className="rounded-[32px] border border-white/10 bg-zinc-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('myCalendar.title')}</h3>
            <p className="text-sm text-zinc-400">
              {t('myCalendar.pageDesc', {
                defaultValue: 'A personal calendar populated from your saved events.',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-900">
              {calendarEvents.length || listEvents.length} {t('myCalendar.savedLabel', { defaultValue: 'saved' })}
            </div>
            <div className="flex overflow-hidden rounded-2xl border border-white/10">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-zinc-900'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myCalendar.calendar')}</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-white/10 ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t('myCalendar.list')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar view */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
                </h2>
                {!isSameMonth(currentMonth, new Date()) && (
                  <button
                    onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null); }}
                    className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20"
                  >
                    {t('myCalendar.today')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}
                  className="rounded-full border border-white/10 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t('myCalendar.previousMonth')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}
                  className="rounded-full border border-white/10 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t('myCalendar.nextMonth')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                {WEEKDAY_KEYS.map((key) => (
                  <div key={key} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t(key)}
                  </div>
                ))}
              </div>
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
                      />
                    </div>
                  );
                })}
              </div>
              {calendarLoading && (
                <div className="flex justify-center border-t border-white/10 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.bg }} />
                  <span>{t(`eventTypes.${type}`)}</span>
                </div>
              ))}
            </div>

            {/* Day detail */}
            {selectedDay && selectedDayEvents.length > 0 && (
              <DayDetailPanel
                day={selectedDay}
                events={selectedDayEvents}
                onClose={() => setSelectedDay(null)}
                onRemove={handleRemove}
                removing={unsaveEvent.isPending}
                onOpenDetail={openDetail}
              />
            )}

            {/* Empty state */}
            {!calendarLoading && calendarEvents.length === 0 && (
              <div className="py-10 text-center text-zinc-400">
                <p className="text-sm">{t('myCalendar.noSavedEventsThisMonth')}</p>
                <Link to="/events" className="mt-1 inline-block text-sm text-red-300 hover:underline">
                  {t('myCalendar.browseEventsToAdd')}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <>
            {listLoading && (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
              </div>
            )}
            {!listLoading && (
              <UpcomingList
                events={listEvents}
                onRemove={handleRemove}
                removing={unsaveEvent.isPending}
                onOpenDetail={openDetail}
              />
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailId && <EventDetailModal eventId={detailId} onClose={closeDetail} />}
    </div>
  );
}
