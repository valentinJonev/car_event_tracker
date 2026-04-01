import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { OrganiserPageItem } from '../types';

interface OrganiserCardProps {
  organiser: OrganiserPageItem;
}

export default function OrganiserCard({ organiser }: OrganiserCardProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/organisers/${organiser.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="p-6 flex flex-col items-center text-center space-y-3">
        {/* Avatar */}
        {organiser.avatar_url ? (
          <img
            src={organiser.avatar_url}
            alt={organiser.display_name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-700"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center ring-2 ring-primary-200 dark:ring-primary-700">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {organiser.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
          {organiser.display_name}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {organiser.event_count}
            </span>
            <span className="text-xs">{t('organisers.events')}</span>
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {organiser.upcoming_event_count}
            </span>
            <span className="text-xs">{t('organisers.upcoming')}</span>
          </div>
        </div>

        {/* View profile link */}
        <span className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
          {t('organisers.viewProfile')}
        </span>
      </div>
    </Link>
  );
}
