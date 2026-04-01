import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents, useNearbyEvents } from '../hooks/useEvents';
import EventMap from '../components/EventMap';
import OrganiserAutocomplete from '../components/OrganiserAutocomplete';
import type { OrganiserOption } from '../hooks/useOrganiserSearch';
import type { Event, EventType } from '../types';

// ── Constants ─────────────────────────────────────────────────────────
const EVENT_TYPE_VALUES: (EventType | '')[] = [
  '', 'racing', 'car_show', 'track_day', 'meetup', 'drift', 'drag', 'hillclimb', 'other',
];

/**
 * Convert a search radius (km) to an appropriate Leaflet zoom level.
 */
function radiusToZoom(radiusKm: number): number {
  const EARTH_CIRCUMFERENCE_KM = 40_075;
  const MAP_PX = 500;
  const diameterKm = radiusKm * 2;
  const z = Math.log2((MAP_PX * EARTH_CIRCUMFERENCE_KM) / (256 * diameterKm));
  return Math.min(16, Math.max(3, Math.round(z)));
}

// ── Filter sidebar ────────────────────────────────────────────────────
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

  // ── Sidebar open / close ──────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Applied filters (what the map actually shows) ─────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  // Draft filters inside the sidebar (not applied until user clicks Apply)
  const [draft, setDraft] = useState<FilterState>(INITIAL_FILTERS);

  // Organiser autocomplete selection (kept as object for display name)
  const [selectedOrganiser, setSelectedOrganiser] = useState<OrganiserOption | null>(null);
  const [draftOrganiser, setDraftOrganiser] = useState<OrganiserOption | null>(null);

  // ── Geolocation ───────────────────────────────────────────────────
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Count how many filters are active (for the badge)
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.eventType) n++;
    if (filters.organiserId) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    if (filters.useLocation) n++;
    return n;
  }, [filters]);

  // ── Detect location helper ────────────────────────────────────────
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

  // ── Data fetching ─────────────────────────────────────────────────
  // Mode A: fetch all events (default, no location filter)
  // The backend excludes cancelled events by default when no status filter is set
  const allEventsQuery = useEvents({
    event_type: filters.eventType || undefined,
    organiser_id: filters.organiserId || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    limit: 100,
  });

  // Mode B: fetch nearby events (when location filter is on)
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

  // ── Map center / zoom ─────────────────────────────────────────────
  // When in location mode, center on user and zoom to radius.
  // Otherwise let the map auto-fit to all markers.
  const mapCenter = isLocationMode
    ? ([userLat!, userLng!] as [number, number])
    : undefined;
  const mapZoom = isLocationMode ? radiusToZoom(filters.radius) : undefined;

  // ── Sidebar actions ───────────────────────────────────────────────
  const handleApply = () => {
    if (draft.useLocation && (userLat == null || userLng == null)) {
      detectLocation();
      // The filter will be applied once the location resolves (see useEffect below)
      setFilters({ ...draft, useLocation: false }); // apply other filters now
    } else {
      setFilters({ ...draft });
    }
    setSelectedOrganiser(draftOrganiser);
    setSidebarOpen(false);
  };

  // Once location resolves and draft wanted it, apply location filter
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

  // Sync draft when opening sidebar
  const openSidebar = () => {
    setDraft(filters);
    setDraftOrganiser(selectedOrganiser);
    setSidebarOpen(true);
  };

  return (
    <div className="relative flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      {/* ── Floating Filter button (top-right over map) ─────────── */}
      <button
        onClick={openSidebar}
        className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
      >
        {/* Filter icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {t('eventMap.filters')}
        {activeFilterCount > 0 && (
          <span className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* ── Event count badge (top-left) ────────────────────────── */}
      <div className="absolute top-3 left-3 z-[1000] bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent" />
            {t('common.loading')}
          </span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: t('eventMap.eventsFound', { count: events.length }) }} />
        )}
      </div>

      {/* ── Full-height map ─────────────────────────────────────── */}
      <EventMap
        events={events}
        center={mapCenter}
        zoom={mapZoom}
        className="flex-1 w-full rounded-lg"
      />

      {/* ── Backdrop ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[1100] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-[1200] transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t('eventMap.filterEvents')}
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 130px)' }}>
          {/* ── Event type ──────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('eventMap.eventType')}
            </label>
            <select
              value={draft.eventType}
              onChange={(e) => setDraft({ ...draft, eventType: e.target.value as EventType | '' })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {EVENT_TYPE_VALUES.map((val) => (
                <option key={val} value={val}>
                  {val === '' ? t('eventList.allTypes') : t(`eventTypes.${val}`)}
                </option>
              ))}
            </select>
          </div>

          {/* ── Organiser ───────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

          {/* ── Date range ──────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('eventMap.dateRange')}
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('eventMap.from')}</label>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('eventMap.to')}</label>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* ── Location / Nearby ───────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('eventMap.nearbyLocation')}
            </label>

            {/* Toggle */}
            <label className="flex items-center gap-3 cursor-pointer mb-3">
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
                <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-primary-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('eventMap.filterByMyLocation')}
              </span>
            </label>

            {/* Location status */}
            {draft.useLocation && (
              <div className="space-y-3">
                {locating && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent" />
                    {t('eventMap.detectingLocation')}
                  </div>
                )}
                {locationError && (
                  <p className="text-sm text-red-500">{locationError}</p>
                )}
                {userLat != null && userLng != null && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('eventMap.locationDetected')}
                  </p>
                )}

                {/* Radius slider */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('eventMap.radius')}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{draft.radius} km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    value={draft.radius}
                    onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) })}
                    className="w-full accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                    <span>5 km</span>
                    <span>500 km</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.reset')}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('eventMap.applyFilters')}
          </button>
        </div>
      </div>
    </div>
  );
}
