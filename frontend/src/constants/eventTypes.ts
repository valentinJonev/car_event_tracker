import type { EventType } from '../types';

/**
 * Shared event-type configuration: emoji icon, display label, and theme colour.
 * Used by the map markers, notification dropdown, and anywhere else that needs
 * per-type visual differentiation.
 */
export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { emoji: string; label: string; bg: string }
> = {
  racing:    { emoji: '🏁', label: 'Racing',    bg: '#ef4444' },
  car_show:  { emoji: '🚗', label: 'Car Show',  bg: '#8b5cf6' },
  track_day: { emoji: '🏎️', label: 'Track Day', bg: '#f97316' },
  meetup:    { emoji: '🤝', label: 'Meetup',    bg: '#3b82f6' },
  drift:     { emoji: '💨', label: 'Drift',     bg: '#06b6d4' },
  drag:      { emoji: '⚡', label: 'Drag',      bg: '#eab308' },
  hillclimb: { emoji: '⛰️', label: 'Hillclimb', bg: '#22c55e' },
  other:     { emoji: '📌', label: 'Other',     bg: '#6b7280' },
};
