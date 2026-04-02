import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, Trash2 } from 'lucide-react';
import {
  useSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
} from '../hooks/useSubscriptions';
import OrganiserAutocomplete from '../components/OrganiserAutocomplete';
import type { OrganiserOption } from '../hooks/useOrganiserSearch';
import type { EventType } from '../types';
import PageHero from '../components/PageHero';

const EVENT_TYPE_VALUES: EventType[] = [
  'racing',
  'car_show',
  'track_day',
  'meetup',
  'drift',
  'drag',
  'hillclimb',
  'other',
];

const FILTER_TYPE_VALUES = ['event_type', 'organiser', 'location'] as const;

const inputCls =
  'w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500';

const selectCls =
  'w-full bg-zinc-900 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20';

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSubscriptions();
  const createSub = useCreateSubscription();
  const deleteSub = useDeleteSubscription();

  const [filterType, setFilterType] = useState('event_type');
  const [filterValue, setFilterValue] = useState('');
  const [selectedOrganiser, setSelectedOrganiser] = useState<OrganiserOption | null>(null);
  const [radiusKm, setRadiusKm] = useState('50');
  const [error, setError] = useState<string | null>(null);

  const filterTypeLabels: Record<string, string> = {
    event_type: t('subscriptions.eventType'),
    organiser: t('subscriptions.organiser'),
    location: t('subscriptions.locationLatLng'),
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let value = filterValue;
    if (filterType === 'organiser') {
      if (!selectedOrganiser) {
        setError(t('subscriptions.selectOrganiser'));
        return;
      }
      value = selectedOrganiser.id;
    }

    try {
      const payload: {
        filter_type: string;
        filter_value: string;
        filter_meta?: Record<string, unknown>;
      } = {
        filter_type: filterType,
        filter_value: value,
      };

      if (filterType === 'location') {
        payload.filter_meta = { radius_km: parseInt(radiusKm, 10) || 50 };
      }
      if (filterType === 'organiser' && selectedOrganiser) {
        payload.filter_meta = { display_name: selectedOrganiser.display_name };
      }

      await createSub.mutateAsync(payload);
      setFilterValue('');
      setSelectedOrganiser(null);
    } catch {
      setError(t('subscriptions.failedToCreate'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('subscriptions.confirmRemove'))) return;
    await deleteSub.mutateAsync(id);
  };

  /** Friendly display for a subscription's filter value */
  const displayFilterValue = (sub: { filter_type: string; filter_value: string; filter_meta: Record<string, unknown> | null }) => {
    if (sub.filter_type === 'organiser' && sub.filter_meta?.display_name) {
      return sub.filter_meta.display_name as string;
    }
    if (sub.filter_type === 'event_type') {
      return t(`eventTypes.${sub.filter_value}`);
    }
    return sub.filter_value;
  };

  /** Display label for a filter_type value */
  const displayFilterType = (filterTypeVal: string) =>
    filterTypeLabels[filterTypeVal] ?? filterTypeVal;

  return (
    <div className="space-y-6">
      <PageHero
        title={t('subscriptions.title')}
        accent="amber"
      />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Create form */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="font-semibold text-white mb-4">
            {t('subscriptions.addSubscription')}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  {t('subscriptions.filterType')}
                </label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setFilterValue('');
                    setSelectedOrganiser(null);
                  }}
                  className={selectCls}
                >
                  {FILTER_TYPE_VALUES.map((ft) => (
                    <option key={ft} value={ft}>
                      {filterTypeLabels[ft]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  {filterType === 'organiser'
                    ? t('subscriptions.organiser')
                    : filterType === 'event_type'
                    ? t('subscriptions.eventType')
                    : t('subscriptions.location')}
                </label>
                {filterType === 'event_type' ? (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    required
                    className={selectCls}
                  >
                    <option value="">{t('subscriptions.selectType')}</option>
                    {EVENT_TYPE_VALUES.map((et) => (
                      <option key={et} value={et}>
                        {t(`eventTypes.${et}`)}
                      </option>
                    ))}
                  </select>
                ) : filterType === 'organiser' ? (
                  <OrganiserAutocomplete
                    value={selectedOrganiser}
                    onChange={setSelectedOrganiser}
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="42.70,25.50"
                    className={inputCls}
                  />
                )}
              </div>
            </div>

            {filterType === 'location' && (
              <div className="max-w-xs">
                <label className="block text-xs text-zinc-500 mb-1">
                  {t('subscriptions.radiusKm')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={createSub.isPending}
              className="bg-white text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {createSub.isPending ? t('subscriptions.adding') : t('subscriptions.addSubscriptionBtn')}
            </button>
          </form>
        </div>

        {/* Existing subscriptions */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-12">
            <Newspaper className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              {t('subscriptions.noSubscriptions')}
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((sub) => (
              <div
                key={sub.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 mr-2">
                    {displayFilterType(sub.filter_type)}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">
                    {displayFilterValue(sub)}
                  </span>
                  {sub.filter_type === 'location' && !!sub.filter_meta?.radius_km && (
                    <span className="ml-2 text-xs text-zinc-500">
                      ({String(sub.filter_meta.radius_km)} km)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(sub.id)}
                  disabled={deleteSub.isPending}
                  className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('common.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
