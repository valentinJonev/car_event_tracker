/**
 * Shared date formatting utilities that are aware of the `is_all_day` flag.
 * All functions accept an optional `locale` string (e.g. 'en', 'bg') that is
 * forwarded to `toLocaleDateString`. When omitted the browser default is used.
 */

/**
 * Format a date for display on event cards (compact).
 * All-day events show only the date; timed events include time.
 */
export function formatEventDate(
  iso: string,
  isAllDay: boolean,
  locale?: string,
): string {
  const date = new Date(iso);
  if (isAllDay) {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date for display on the event detail page (verbose).
 * All-day events show only the date; timed events include weekday & time.
 */
export function formatEventDateLong(
  iso: string,
  isAllDay: boolean,
  locale?: string,
): string {
  const date = new Date(iso);
  if (isAllDay) {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
