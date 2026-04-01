import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent, useDeleteEvent } from '../hooks/useEvents';
import { useSavedEventStatus, useSaveEvent, useUnsaveEvent } from '../hooks/useCalendar';
import { useAuthStore } from '../store/authStore';
import EventMap from '../components/EventMap';
import { formatEventDateLong } from '../utils/dateFormat';

/** Calendar plus / check icon SVG. */
function CalendarIcon({ saved }: { saved: boolean }) {
  if (saved) {
    // Calendar with checkmark
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
      </svg>
    );
  }
  // Calendar with plus
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m-3-3h6" />
    </svg>
  );
}

export default function EventDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { data: event, isLoading, isError } = useEvent(id);
  const deleteEvent = useDeleteEvent();

  // Personal calendar state
  const { data: savedStatus } = useSavedEventStatus(id, isAuthenticated);
  const saveEvent = useSaveEvent();
  const unsaveEvent = useUnsaveEvent();
  const isSaved = savedStatus?.is_saved ?? false;
  const calendarLoading = saveEvent.isPending || unsaveEvent.isPending;

  const canEdit =
    user &&
    event &&
    (user.role === 'admin' || user.id === event.organiser_id);

  // Only the event organiser or an admin can see the internal status (draft/published)
  const isOwnerOrAdmin = canEdit;

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(t('eventDetail.confirmCancel'))) return;
    await deleteEvent.mutateAsync(event.id);
    navigate('/events');
  };

  const handleToggleCalendar = () => {
    if (!id) return;
    if (isSaved) {
      unsaveEvent.mutate(id);
    } else {
      saveEvent.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-red-500">{t('eventDetail.eventNotFound')}</h2>
        <Link to="/events" className="text-primary-600 dark:text-primary-400 hover:underline mt-4 inline-block">
          {t('eventDetail.backToEvents')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/events" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            &larr; {t('eventDetail.backToEvents')}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{event.title}</h1>

            {/* Add / Remove from calendar button */}
            {isAuthenticated && (
              <button
                onClick={handleToggleCalendar}
                disabled={calendarLoading}
                title={isSaved ? t('eventDetail.removeFromCalendar') : t('eventDetail.addToCalendar')}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0
                  ${
                    isSaved
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                      : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500'
                  }
                `}
              >
                <CalendarIcon saved={isSaved} />
                <span className="hidden sm:inline">
                  {calendarLoading
                    ? t('eventDetail.savingCalendar')
                    : isSaved
                      ? t('eventDetail.inMyCalendar')
                      : t('eventDetail.addToCalendar')}
                </span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300 px-2 py-0.5 rounded text-xs font-medium">
              {t(`eventTypes.${event.event_type}`)}
            </span>
            {/* Cancelled — visible to everyone */}
            {event.status === 'cancelled' && (
              <span className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-semibold px-2 py-0.5 rounded">
                {t('eventStatus.cancelled')}
              </span>
            )}
            {/* Internal status badge — only visible to organiser / admin */}
            {isOwnerOrAdmin && event.status !== 'cancelled' && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  event.status === 'published'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {t(`eventStatus.${event.status}`)}
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Link
              to={`/events/${event.id}/edit`}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md"
            >
              {t('common.edit')}
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
            >
              {t('eventDetail.cancelEvent')}
            </button>
          </div>
        )}
      </div>

      {/* Cover */}
      {event.cover_image_url && (
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="w-full max-h-80 object-cover rounded-lg"
        />
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-lg">{t('eventDetail.details')}</h2>

          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{t('eventDetail.when')}</p>
            <div className="flex items-center gap-2">
              <p className="text-gray-800 dark:text-gray-100">
                {formatEventDateLong(event.start_datetime, event.is_all_day, i18n.language)}
              </p>
              {event.is_all_day && (
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded">
                  {t('eventDetail.allDay')}
                </span>
              )}
            </div>
            {event.end_datetime && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('common.to')} {formatEventDateLong(event.end_datetime, event.is_all_day, i18n.language)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{t('eventDetail.where')}</p>
            <p className="text-gray-800 dark:text-gray-100">{event.location_name}</p>
            {event.address && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">{event.address}</p>
            )}
          </div>

          {event.max_attendees && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{t('eventDetail.maxAttendees')}</p>
              <p className="text-gray-800 dark:text-gray-100">{event.max_attendees}</p>
            </div>
          )}

          {event.organiser && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{t('eventDetail.organiser')}</p>
              <Link
                to={`/organisers/${event.organiser.id}`}
                className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                {event.organiser.display_name}
              </Link>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-lg mb-3">
            {t('eventDetail.description')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {event.description || t('eventDetail.noDescription')}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-lg mb-3">{t('eventDetail.location')}</h2>
        <EventMap
          events={[event]}
          center={[event.latitude, event.longitude]}
          zoom={13}
          className="h-72 w-full rounded-lg"
        />
      </div>
    </div>
  );
}
