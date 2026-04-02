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
      className="block bg-white/5 border border-white/10 rounded-3xl hover:bg-white/[0.07] hover:border-white/20 transition-all overflow-hidden"
    >
      <div className="p-6 flex flex-col items-center text-center space-y-3">
        {/* Avatar */}
        {organiser.avatar_url ? (
          <img
            src={organiser.avatar_url}
            alt={organiser.display_name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/20">
            <span className="text-2xl font-bold text-white">
              {organiser.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name */}
        <h3 className="text-lg font-semibold text-white line-clamp-1">
          {organiser.display_name}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-white">
              {organiser.event_count}
            </span>
            <span className="text-xs">{t('organisers.events')}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-red-400">
              {organiser.upcoming_event_count}
            </span>
            <span className="text-xs">{t('organisers.upcoming')}</span>
          </div>
        </div>

        {/* View profile link */}
        <span className="text-sm text-zinc-400 hover:text-white font-medium transition-colors">
          {t('organisers.viewProfile')}
        </span>
      </div>
    </Link>
  );
}
