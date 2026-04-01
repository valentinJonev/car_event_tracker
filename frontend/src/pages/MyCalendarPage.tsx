import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import type { Event } from '../types';

const DATE_LOCALES: Record<string, Locale> = { en: enUS, bg };

const WEEKDAY_KEYS = [
  'weekdays.mon', 'weekdays.tue', 'weekdays.wed', 'weekdays.thu',
  'weekdays.fri', 'weekdays.sat', 'weekdays.sun',
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Extract Event objects from the saved-events response. */
function extractEvents(
  items: { event: Event }[]
): Event[] {
  return items.map((s) => s.event);
}

/** Group events by day key. */
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
      // Fallback for older browsers
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

  const handleGenerate = () => {
    generateToken.mutate();
  };

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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('calendarSubscription.title')}</h3>
        </div>
        {hasToken && (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
          >
            {showInstructions ? t('calendarSubscription.hideInstructions') : t('calendarSubscription.howToSubscribe')}
          </button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {!hasToken ? (
          /* ── No token yet ── */
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('calendarSubscription.subscribeDescription')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('calendarSubscription.readOnlyFeed')}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generateToken.isPending}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              {generateToken.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {t('calendarSubscription.generateLink')}
            </button>
          </div>
        ) : (
          /* ── Has token ── */
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
                <code className="text-xs text-gray-600 dark:text-gray-400 break-all select-all">{feedUrl}</code>
              </div>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  copied
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('calendarSubscription.copied')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t('calendarSubscription.copy')}
                  </>
                )}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={handleGenerate}
                disabled={generateToken.isPending}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium disabled:opacity-50"
              >
                {generateToken.isPending ? t('calendarSubscription.regenerating') : t('calendarSubscription.regenerateLink')}
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={handleRevoke}
                disabled={revokeToken.isPending}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium disabled:opacity-50"
              >
                {revokeToken.isPending
                  ? t('calendarSubscription.revoking')
                  : confirmRevoke
                    ? t('calendarSubscription.confirmRevoke')
                    : t('calendarSubscription.revokeLink')}
              </button>
            </div>

            {/* Security note */}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {t('calendarSubscription.securityNote')}
            </p>
          </>
        )}

        {/* ── Instructions panel ── */}
        {showInstructions && hasToken && (
          <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-4">
            {/* Apple Calendar */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">&#63743;</span>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('calendarSubscription.appleCalendarTitle')}</h4>
              </div>
              <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 ml-6 list-decimal">
                <li>{t('calendarSubscription.appleStep1')}</li>
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleStep5') }} />
              </ol>
              <p
                className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-6"
                dangerouslySetInnerHTML={{ __html: t('calendarSubscription.appleMacNote') }}
              />
            </div>

            {/* Google Calendar */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <rect width="20" height="20" x="2" y="2" rx="2" fill="#4285F4" />
                  <rect width="8" height="8" x="8" y="8" rx="1" fill="#fff" />
                  <rect width="3" height="10" x="4" y="7" rx="0.5" fill="#EA4335" />
                  <rect width="10" height="3" x="7" y="4" rx="0.5" fill="#FBBC04" />
                  <rect width="3" height="10" x="17" y="7" rx="0.5" fill="#34A853" />
                  <rect width="10" height="3" x="7" y="17" rx="0.5" fill="#4285F4" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('calendarSubscription.googleCalendarTitle')}</h4>
              </div>
              <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 ml-6 list-decimal">
                <li>{t('calendarSubscription.googleStep1')}</li>
                <li>
                  {t('calendarSubscription.googleStep2').split('<0>')[0]}
                  <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Google Calendar</a>
                  {t('calendarSubscription.googleStep2').split('</0>')[1] ?? ''}
                </li>
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('calendarSubscription.googleStep5') }} />
              </ol>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-6">
                {t('calendarSubscription.googleNote')}
              </p>
            </div>

            {/* Other apps */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('calendarSubscription.otherAppsTitle')}</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                {t('calendarSubscription.otherAppsDesc')}
              </p>
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
      className={`
        relative flex flex-col items-stretch p-1 min-h-[5.5rem] sm:min-h-[7rem] rounded-lg transition-colors text-sm w-full text-left
        ${!inMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}
        ${today ? 'ring-2 ring-primary-500 ring-inset' : ''}
        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''}
        ${hasEvents && inMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'cursor-default'}
      `}
    >
      <span
        className={`
          text-xs sm:text-sm font-medium leading-none mb-1 self-start
          ${today ? 'bg-primary-600 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full' : ''}
        `}
      >
        {format(day, 'd')}
      </span>
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

function DayDetailPanel({
  day,
  events,
  onClose,
  onRemove,
  removing,
}: {
  day: Date;
  events: Event[];
  onClose: () => void;
  onRemove: (eventId: string) => void;
  removing: boolean;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;
  const dateFnsLocale = DATE_LOCALES[lang] ?? enUS;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(day, 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            {t('common.events_count', { count: events.length })}
          </span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" aria-label={t('common.close')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
        {events.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
          return (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <button
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: config.bg + '20' }}
                >
                  {config.emoji}
                </div>
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
                  </div>
                </div>
                {event.status === 'cancelled' && (
                  <span className="flex-shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                    {t('eventStatus.cancelled')}
                  </span>
                )}
              </button>
              {/* Remove button */}
              <button
                onClick={() => onRemove(event.id)}
                disabled={removing}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors disabled:opacity-50"
                title={t('myCalendar.removeFromCalendar')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Upcoming list below the calendar ────────────────────────────────────

function UpcomingList({
  events,
  onRemove,
  removing,
}: {
  events: Event[];
  onRemove: (eventId: string) => void;
  removing: boolean;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;

  // Split into upcoming and past
  const upcoming = events.filter((e) => !isPast(parseISO(e.start_datetime)));
  const past = events.filter((e) => isPast(parseISO(e.start_datetime)));

  const renderEvent = (event: Event) => {
    const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
    return (
      <div
        key={event.id}
        className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <button
          onClick={() => navigate(`/events/${event.id}`)}
          className="flex items-center gap-4 flex-1 min-w-0 text-left"
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base"
            style={{ backgroundColor: config.bg + '20' }}
          >
            {config.emoji}
          </div>
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
          {event.status === 'cancelled' && (
            <span className="flex-shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
              {t('eventStatus.cancelled')}
            </span>
          )}
        </button>
        <button
          onClick={() => onRemove(event.id)}
          disabled={removing}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 transition-colors disabled:opacity-50"
          title={t('myCalendar.removeFromCalendar')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('myCalendar.upcoming', { count: upcoming.length })}
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcoming.map(renderEvent)}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {t('myCalendar.past', { count: past.length })}
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 opacity-60">
            {past.map(renderEvent)}
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium mb-1">{t('myCalendar.emptyCalendar')}</p>
          <p className="text-sm mb-4">{t('myCalendar.emptyCalendarDesc')}</p>
          <Link
            to="/events"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
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

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const unsaveEvent = useUnsaveEvent();

  // Calendar view range
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch calendar data (generous limit for calendar grid)
  const { data: calendarData, isLoading: calendarLoading } = useMyCalendar(
    {
      date_from: calendarStart.toISOString(),
      date_to: calendarEnd.toISOString(),
      limit: 200,
    },
    viewMode === 'calendar',
  );

  // Fetch all saved events for list view (no date filter, reasonable limit)
  const { data: listData, isLoading: listLoading } = useMyCalendar(
    { limit: 100 },
    viewMode === 'list',
  );

  // Calendar events
  const calendarEvents = useMemo(
    () => (calendarData ? extractEvents(calendarData.items) : []),
    [calendarData],
  );
  const eventsByDay = useMemo(() => groupByDay(calendarEvents), [calendarEvents]);

  // List events
  const listEvents = useMemo(
    () => (listData ? extractEvents(listData.items) : []),
    [listData],
  );

  // Selected day detail
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('myCalendar.title')}</h1>

        {/* View toggle */}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden self-start">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">{t('myCalendar.calendar')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">{t('myCalendar.list')}</span>
          </button>
        </div>
      </div>

      {/* Calendar subscription */}
      <CalendarSubscription />

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
              </h2>
              {!isSameMonth(currentMonth, new Date()) && (
                <button
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null); }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium px-2 py-0.5 rounded border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                >
                  {t('myCalendar.today')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label={t('myCalendar.previousMonth')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label={t('myCalendar.nextMonth')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              {WEEKDAY_KEYS.map((key) => (
                <div key={key} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-2">
                  {t(key)}
                </div>
              ))}
            </div>
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
                    />
                  </div>
                );
              })}
            </div>
            {calendarLoading && (
              <div className="flex justify-center py-4 border-t border-gray-100 dark:border-gray-700">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.bg }} />
                <span>{t(`eventTypes.${type}`)}</span>
              </div>
            ))}
          </div>

          {/* Day detail panel */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <DayDetailPanel
              day={selectedDay}
              events={selectedDayEvents}
              onClose={() => setSelectedDay(null)}
              onRemove={handleRemove}
              removing={unsaveEvent.isPending}
            />
          )}

          {/* Empty state for calendar */}
          {!calendarLoading && calendarEvents.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <p className="text-sm">{t('myCalendar.noSavedEventsThisMonth')}</p>
              <Link to="/events" className="text-primary-600 dark:text-primary-400 hover:underline text-sm mt-1 inline-block">
                {t('myCalendar.browseEventsToAdd')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <>
          {listLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          )}
          {!listLoading && (
            <UpcomingList
              events={listEvents}
              onRemove={handleRemove}
              removing={unsaveEvent.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}
