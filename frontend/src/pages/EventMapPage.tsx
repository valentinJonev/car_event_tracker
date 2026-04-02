import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { useEvents, useNearbyEvents } from '../hooks/useEvents';
import EventMap from '../components/EventMap';
import EventDetailModal from '../components/EventDetailModal';
import OrganiserAutocomplete from '../components/OrganiserAutocomplete';
import PageHero from '../components/PageHero';
import type { OrganiserOption } from '../hooks/useOrganiserSearch';
import type { Event, EventType } from '../types';

const EVENT_TYPE_VALUES: (EventType | '')[] = [
  '', 'racing', 'car_show', 'track_day', 'meetup', 'drift', 'drag', 'hillclimb', 'other',
];

function radiusToZoom(radiusKm: number): number {
  const EARTH_CIRCUMFERENCE_KM = 40_075;
  const MAP_PX = 500;
  const diameterKm = radiusKm * 2;
  const z = Math.log2((MAP_PX * EARTH_CIRCUMFERENCE_KM) / (256 * diameterKm));
  return Math.min(16, Math.max(3, Math.round(z)));
}

interface FilterState {
  eventType: EventType | '';
  organiserId: string;
  dateFrom: string;
  dateTo: string;
  useLocation: boolean;
  radius: number;
}

const INITIAL_FILTERS: FilterState = {
  eventType: '',
  organiserId: '',
  dateFrom: '',
  dateTo: '',
  useLocation: false,
  radius: 100,
};

export default function EventMapPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailId = searchParams.get('detail');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedOrganiser, setSelectedOrganiser] = useState<OrganiserOption | null>(null);
  const [draftOrganiser, setDraftOrganiser] = useState<OrganiserOption | null>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.eventType) n++;
    if (filters.organiserId) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    if (filters.useLocation) n++;
    return n;
  }, [filters]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('eventMap.geolocationNotSupported'));
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        setDraft((d) => ({ ...d, useLocation: true }));
      },
      () => {
        setLocating(false);
        setLocationError(t('eventMap.couldNotGetLocation'));
      },
      { timeout: 8000 },
    );
  }, [t]);

  const allEventsQuery = useEvents({
    event_type: filters.eventType || undefined,
    organiser_id: filters.organiserId || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    limit: 100,
  });

  const nearbyQuery = useNearbyEvents(
    filters.useLocation && userLat != null && userLng != null
      ? {
          lat: userLat,
          lng: userLng,
          radius_km: filters.radius,
          event_type: filters.eventType || undefined,
          organiser_id: filters.organiserId || undefined,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
          limit: 100,
        }
      : null,
  );

  const isLocationMode = filters.useLocation && userLat != null && userLng != null;
  const query = isLocationMode ? nearbyQuery : allEventsQuery;
  const isLoading = query.isLoading;
  const events: Event[] = query.data?.items || [];

  const mapCenter = isLocationMode ? ([userLat!, userLng!] as [number, number]) : undefined;
  const mapZoom = isLocationMode ? radiusToZoom(filters.radius) : undefined;

  const handleApply = () => {
    if (draft.useLocation && (userLat == null || userLng == null)) {
      detectLocation();
      setFilters({ ...draft, useLocation: false });
    } else {
      setFilters({ ...draft });
    }
    setSelectedOrganiser(draftOrganiser);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (userLat != null && userLng != null && draft.useLocation && !filters.useLocation) {
      setFilters((f) => ({ ...f, useLocation: true }));
    }
  }, [userLat, userLng, draft.useLocation, filters.useLocation]);

  const handleReset = () => {
    setDraft(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setDraftOrganiser(null);
    setSelectedOrganiser(null);
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setDraft(filters);
    setDraftOrganiser(selectedOrganiser);
    setSidebarOpen(true);
  };

  const openDetail = (eventId: string) => {
    setSearchParams({ detail: eventId });
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eventMap.eyebrow', { defaultValue: 'Explore events visually' })}
        title={t('eventMap.heroTitle', { defaultValue: 'Find events through the map.' })}
        description={t('eventMap.heroDescription', {
          defaultValue:
            'See event locations at a glance, inspect pins by event type, and move straight into event details.',
        })}
        accent="emerald"
      />

      {/* Map container */}
      <div className="rounded-[32px] border border-white/10 bg-zinc-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {t('eventMap.mapDiscovery', { defaultValue: 'Map discovery' })}
            </h3>
            <p className="text-sm text-zinc-400">
              {t('eventMap.mapDesc', {
                defaultValue: 'Pins react to your current filters. Click one to inspect the event.',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Event count */}
            <div className="hidden sm:block rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.loading')}
                </span>
              ) : (
                <span>{events.length} {t('eventMap.visiblePins', { defaultValue: 'visible pins' })}</span>
              )}
            </div>
            {/* Filter button */}
            <button
              onClick={openSidebar}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('eventMap.filters')}
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10" style={{ height: '560px' }}>
          <EventMap
            events={events}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            onEventClick={(event) => openDetail(event.id)}
          />
        </div>
      </div>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 z-[1200] h-full w-80 transform border-l border-white/10 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold">{t('eventMap.filterEvents')}</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-300 transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="space-y-6 overflow-y-auto px-5 py-5"
          style={{ height: 'calc(100% - 130px)' }}
        >
          {/* Event type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              {t('eventMap.eventType')}
            </label>
            <select
              value={draft.eventType}
              onChange={(e) => setDraft({ ...draft, eventType: e.target.value as EventType | '' })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
            >
              {EVENT_TYPE_VALUES.map((val) => (
                <option key={val} value={val} className="bg-zinc-900 text-white">
                  {val === '' ? t('eventList.allTypes') : t(`eventTypes.${val}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Organiser */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              {t('eventMap.organiser')}
            </label>
            <OrganiserAutocomplete
              value={draftOrganiser}
              onChange={(org) => {
                setDraftOrganiser(org);
                setDraft((d) => ({ ...d, organiserId: org?.id ?? '' }));
              }}
            />
          </div>

          {/* Date range */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              {t('eventMap.dateRange')}
            </label>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t('eventMap.from')}</label>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t('eventMap.to')}</label>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>

          {/* Nearby location */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              {t('eventMap.nearbyLocation')}
            </label>

            {/* Toggle */}
            <label className="mb-3 flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={draft.useLocation}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDraft({ ...draft, useLocation: checked });
                    if (checked && userLat == null) detectLocation();
                  }}
                  className="sr-only peer"
                />
                <div className="h-5 w-10 rounded-full bg-zinc-700 transition-colors peer-checked:bg-red-500" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-zinc-400">{t('eventMap.filterByMyLocation')}</span>
            </label>

            {draft.useLocation && (
              <div className="space-y-3">
                {locating && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('eventMap.detectingLocation')}
                  </div>
                )}
                {locationError && (
                  <p className="text-sm text-red-400">{locationError}</p>
                )}
                {userLat != null && userLng != null && (
                  <p className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3.5 w-3.5" />
                    {t('eventMap.locationDetected')}
                  </p>
                )}

                {/* Radius */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-500">
                    <span>{t('eventMap.radius')}</span>
                    <span className="font-medium text-zinc-200">{draft.radius} km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    value={draft.radius}
                    onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) })}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>5 km</span>
                    <span>500 km</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-3 border-t border-white/10 bg-zinc-900 px-5 py-4">
          <button
            onClick={handleReset}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10"
          >
            {t('common.reset')}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            {t('eventMap.applyFilters')}
          </button>
        </div>
      </div>

      {/* Detail modal */}
      {detailId && <EventDetailModal eventId={detailId} onClose={closeDetail} />}
    </div>
  );
}
