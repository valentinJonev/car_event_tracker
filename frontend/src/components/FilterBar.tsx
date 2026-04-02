import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EventType } from '../types';

const EVENT_TYPE_VALUES: (EventType | '')[] = [
  '',
  'racing',
  'car_show',
  'track_day',
  'meetup',
  'drift',
  'drag',
  'hillclimb',
  'other',
];

type StatusFilter = '' | 'upcoming' | 'cancelled';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  eventType: EventType | '';
  onEventTypeChange: (value: EventType | '') => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  /** If true, renders in a single-column compact layout (for mobile drawers). */
  compact?: boolean;
  /** Extra content rendered after the built-in controls. */
  children?: React.ReactNode;
}

export default function FilterBar({
  search,
  onSearchChange,
  eventType,
  onEventTypeChange,
  statusFilter,
  onStatusFilterChange,
  compact = false,
  children,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`grid gap-3 ${compact ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-5'}`}
    >
      {/* Search */}
      <div className={`relative ${compact ? '' : 'xl:col-span-2'}`}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('eventList.searchPlaceholder')}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
        />
      </div>

      {/* Event type filter */}
      <select
        value={eventType}
        onChange={(e) => onEventTypeChange(e.target.value as EventType | '')}
        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-white/20"
      >
        {EVENT_TYPE_VALUES.map((val) => (
          <option key={val} value={val} className="bg-zinc-900 text-white">
            {val === '' ? t('eventList.allTypes') : t(`eventTypes.${val}`)}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-white/20"
      >
        <option value="" className="bg-zinc-900 text-white">
          {t('eventList.allStatuses', { defaultValue: 'All statuses' })}
        </option>
        <option value="upcoming" className="bg-zinc-900 text-white">
          {t('eventList.upcoming', { defaultValue: 'Upcoming' })}
        </option>
        <option value="cancelled" className="bg-zinc-900 text-white">
          {t('eventList.cancelled', { defaultValue: 'Cancelled' })}
        </option>
      </select>

      {children}
    </div>
  );
}

export type { StatusFilter };
