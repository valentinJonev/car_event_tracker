import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, User, Share2, Plus, X, Check } from 'lucide-react';
import { useEvent, useDeleteEvent } from '../hooks/useEvents';
import { useSavedEventStatus, useSaveEvent, useUnsaveEvent } from '../hooks/useCalendar';
import { useAuthStore } from '../store/authStore';
import EventMap from './EventMap';
import { formatEventDateLong } from '../utils/dateFormat';

interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
}

export default function EventDetailModal({ eventId, onClose }: EventDetailModalProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: event, isLoading, isError } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();

  // Calendar save / unsave
  const { data: savedStatus } = useSavedEventStatus(eventId, isAuthenticated);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const isSaved = savedStatus?.is_saved ?? false;
  const calendarLoading = saveEvent.isPending || unsaveEvent.isPending;

  const canEdit =
    user && event && (user.role === 'admin' || user.id === event.organiser_id);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleToggleCalendar = () => {
    if (isSaved) {
      unsaveEvent.mutate(eventId);
    } else {
      saveEvent.mutate(eventId);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(t('eventDetail.confirmCancel'))) return;
    await deleteEvent.mutateAsync(event.id);
    onClose();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/events?detail=${eventId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="py-20 text-center">
            <p className="text-red-400">{t('eventDetail.eventNotFound')}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              {t('common.close', { defaultValue: 'Close' })}
            </button>
          </div>
        )}

        {/* Content */}
        {event && (
          <>
            {/* Header */}
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {t('eventDetail.details')}
                </div>
                <h3 className="mt-1 text-2xl font-semibold">
                  {event.title}
                  {event.status === 'cancelled' && (
                    <span className="ml-3 text-base text-red-400">
                      ({t('eventStatus.cancelled')})
                    </span>
                  )}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                  {event.organiser && (
                    <span className="inline-flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <Link
                        to={`/organisers/${event.organiser.id}`}
                        onClick={onClose}
                        className="hover:text-white hover:underline"
                      >
                        {event.organiser.display_name}
                      </Link>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatEventDateLong(event.start_datetime, event.is_all_day, i18n.language)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location_name}
                    {event.address ? `, ${event.address}` : ''}
                  </span>
                </div>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {t(`eventTypes.${event.event_type}`)}
                  </span>
                  {event.max_attendees && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {t('eventDetail.maxAttendees')}: {event.max_attendees}
                    </span>
                  )}
                  {event.is_all_day && (
                    <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                      {t('eventDetail.allDay')}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={handleShare}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
                  title={t('common.share', { defaultValue: 'Share' })}
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {isAuthenticated && (
                  <button
                    onClick={handleToggleCalendar}
                    disabled={calendarLoading}
                    className={`rounded-full border p-2 transition-colors disabled:opacity-50 ${
                      isSaved
                        ? 'border-green-400/30 bg-green-500/15 text-green-300'
                        : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                    title={
                      isSaved
                        ? t('eventDetail.removeFromCalendar')
                        : t('eventDetail.addToCalendar')
                    }
                  >
                    {isSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Cover image */}
            {event.cover_image_url && (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="mb-6 max-h-64 w-full rounded-3xl border border-white/10 object-cover"
              />
            )}

            {/* Two-column content */}
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-stretch">
              {/* Description / Details */}
              <div className="flex">
                <div className="flex min-h-[18rem] w-full flex-col rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-medium text-white">
                    {t('eventDetail.description')}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                    {event.description || t('eventDetail.noDescription')}
                  </p>

                  {/* Additional details at bottom */}
                  <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
                    {event.end_datetime && (
                      <div>
                        <span className="text-xs text-zinc-500">{t('common.to')}:</span>{' '}
                        <span className="text-sm text-zinc-300">
                          {formatEventDateLong(
                            event.end_datetime,
                            event.is_all_day,
                            i18n.language,
                          )}
                        </span>
                      </div>
                    )}
                    {event.organiser && (
                      <div>
                        <span className="text-xs text-zinc-500">
                          {t('eventDetail.organiser')}:
                        </span>{' '}
                        <Link
                          to={`/organisers/${event.organiser.id}`}
                          onClick={onClose}
                          className="text-sm text-zinc-300 hover:text-white hover:underline"
                        >
                          {event.organiser.display_name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex">
                <div className="flex min-h-[18rem] w-full flex-col rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-white">
                      {t('eventDetail.location')}
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name + (event.address ? ', ' + event.address : ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-white/10"
                    >
                      {t('eventDetail.openInMaps', { defaultValue: 'Open in Google Maps' })}
                    </a>
                  </div>
                  <div className="flex-1 overflow-hidden rounded-3xl border border-white/10">
                    <EventMap
                      events={[event]}
                      center={[event.latitude, event.longitude]}
                      zoom={13}
                      className="h-full min-h-[14rem] w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner / admin actions */}
            {canEdit && (
              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/events/${event.id}/edit`);
                  }}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteEvent.isPending}
                  className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {t('eventDetail.cancelEvent')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
