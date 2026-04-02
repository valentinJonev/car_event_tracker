import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users } from 'lucide-react';
import { useOrganisers } from '../hooks/useOrganisers';
import OrganiserCard from '../components/OrganiserCard';
import PageHero from '../components/PageHero';

export default function OrganisersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data, isLoading, isError } = useOrganisers({
    search: search || undefined,
    offset: page * limit,
    limit,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('organisers.eyebrow', { defaultValue: 'Community of event creators' })}
        title={t('organisers.title')}
        description={t('organisers.heroDescription', {
          defaultValue:
            'Discover the people behind the events. Follow your favourite organisers to get notified about new events.',
        })}
        accent="blue"
      />

      <div className="max-w-6xl mx-auto">
        {/* Search bar */}
        <div className="flex justify-end mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder={t('organisers.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 text-white rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-zinc-500 w-full sm:w-72"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-red-400">
            {t('organisers.failedToLoad')}
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">{t('organisers.noOrganisers')}</p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.items.map((organiser) => (
                <OrganiserCard key={organiser.id} organiser={organiser} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="min-w-[6.5rem] px-4 py-2 text-center text-sm border border-white/10 bg-white/5 rounded-full disabled:opacity-40 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  {t('common.previous')}
                </button>
                <span className="text-sm text-zinc-500">
                  {t('common.page', { current: page + 1, total: totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="min-w-[6.5rem] px-4 py-2 text-center text-sm border border-white/10 bg-white/5 rounded-full disabled:opacity-40 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
