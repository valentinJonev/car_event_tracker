import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { useSavedEventStatus, useSaveEvent, useUnsaveEvent } from '../hooks/useCalendar';
import { formatEventDate } from '../utils/dateFormat';

interface EventCardProps {
  event: Event;
  /** When true, clicking the card opens the detail modal (via URL param). */
  onClick?: () => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Calendar save state
  const { data: savedStatus } = useSavedEventStatus(event.id, isAuthenticated);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const isSaved = savedStatus?.is_saved ?? false;
  const calendarLoading = saveEvent.isPending || unsaveEvent.isPending;

  const isOwnerOrAdmin =
    user && (user.role === 'admin' || user.id === event.organiser_id);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/events?detail=${event.id}`);
    }
  };

  const handleToggleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      unsaveEvent.mutate(event.id);
    } else {
      saveEvent.mutate(event.id);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/events?detail=${event.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded-3xl border p-4 transition-colors ${
        event.status === 'cancelled'
          ? 'border-red-400/20 bg-red-500/5 opacity-75'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Type label */}
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            {t(`eventTypes.${event.event_type}`, { defaultValue: event.event_type })}
          </div>

          {/* Title */}
          <div
            className={`mt-1 text-base font-semibold ${
              event.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-white'
            }`}
          >
            {event.title}
          </div>

          {/* Date & time */}
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}</span>
          </div>

          {/* Location */}
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.location_name}</span>
          </div>
        </div>

        {/* Status badge (owner/admin only) or cancelled banner */}
        <div className="flex flex-col items-end gap-1">
          {event.status === 'cancelled' && (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
              {t('eventStatus.cancelled')}
            </span>
          )}
          {isOwnerOrAdmin && event.status !== 'cancelled' && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                event.status === 'published'
                  ? 'border-green-400/30 bg-green-500/10 text-green-200'
                  : event.status === 'draft'
                    ? 'border-zinc-400/30 bg-zinc-500/10 text-zinc-300'
                    : 'border-blue-400/30 bg-blue-500/10 text-blue-200'
              }`}
            >
              {t(`eventStatus.${event.status}`)}
            </span>
          )}
        </div>
      </div>

      {/* Organiser & attendee count */}
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
        {event.organiser ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/organisers/${event.organiser!.id}`);
            }}
            className="cursor-pointer hover:text-white hover:underline"
          >
            {event.organiser.display_name}
          </span>
        ) : (
          <span />
        )}
        {event.max_attendees && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {event.max_attendees}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        {isAuthenticated && (
          <button
            onClick={handleToggleCalendar}
            disabled={calendarLoading}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
              isSaved
                ? 'bg-white text-zinc-900'
                : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
            }`}
          >
            {isSaved
              ? t('eventDetail.inMyCalendar', { defaultValue: 'Saved' })
              : t('eventDetail.addToCalendar', { defaultValue: 'Save to calendar' })}
          </button>
        )}
        <button
          onClick={handleViewDetails}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/10"
        >
          {t('eventDetail.viewDetails', { defaultValue: 'View details' })}
        </button>
      </div>
    </div>
  );
}
