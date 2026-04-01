import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatEventDate } from '../utils/dateFormat';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Only the event organiser or an admin can see the internal status badge
  const isOwnerOrAdmin =
    user && (user.role === 'admin' || user.id === event.organiser_id);

  return (
    <Link
      to={`/events/${event.id}`}
      className={`block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden ${
        event.status === 'cancelled' ? 'opacity-75' : ''
      }`}
    >
      {/* Cover image or placeholder */}
      <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-700 relative">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-4xl font-bold opacity-30">
            {t(`eventTypes.${event.event_type}`, { defaultValue: event.event_type })}
          </div>
        )}

        {/* Cancelled banner — visible to everyone */}
        {event.status === 'cancelled' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
              {t('eventStatus.cancelled')}
            </span>
          </div>
        )}

        {/* Internal status badge — only visible to organiser / admin */}
        {isOwnerOrAdmin && event.status !== 'cancelled' && (
          <span
            className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded ${STATUS_COLORS[event.status] || ''}`}
          >
            {t(`eventStatus.${event.status}`)}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className={`text-lg font-semibold line-clamp-1 ${
          event.status === 'cancelled'
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-800 dark:text-gray-100'
        }`}>
          {event.title}
        </h3>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-2">
          <span className="bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300 px-2 py-0.5 rounded text-xs font-medium">
            {t(`eventTypes.${event.event_type}`, { defaultValue: event.event_type })}
          </span>
          <span>{formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="truncate">{event.location_name}</span>
        </p>

        {event.organiser && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('common.by')}{' '}
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/organisers/${event.organiser!.id}`);
              }}
              className="text-primary-500 dark:text-primary-400 hover:underline cursor-pointer"
            >
              {event.organiser.display_name}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
