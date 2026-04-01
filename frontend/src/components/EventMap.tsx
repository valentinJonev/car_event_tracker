import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import type { Event, EventType } from '../types';
import { EVENT_TYPE_CONFIG } from '../constants/eventTypes';
import { formatEventDate } from '../utils/dateFormat';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (common react-leaflet issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Build (and cache) a Leaflet DivIcon for each event type. */
const iconCache = new Map<EventType, L.DivIcon>();

function getEventIcon(type: EventType): L.DivIcon {
  const cached = iconCache.get(type);
  if (cached) return cached;

  const { emoji, bg } = EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.other;
  const icon = L.divIcon({
    className: '', // disable default leaflet-div-icon styles
    html: `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        background:${bg};transform:rotate(-45deg);
        border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
      ">
        <span style="transform:rotate(45deg);font-size:18px;line-height:1">${emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36], // tip of the rotated corner
    popupAnchor: [0, -36],
  });
  iconCache.set(type, icon);
  return icon;
}

/**
 * Auto-fits the map to the bounding box of all events whenever the list changes.
 * Falls back to a default view when there are no events.
 * If an explicit `center` override is provided (e.g. from geolocation), it uses that instead.
 */
function AutoFitBounds({
  events,
  center,
  zoom,
}: {
  events: Event[];
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    // If an explicit center is provided (geolocation / nearby search), use it
    if (center) {
      map.setView(center, zoom ?? 10);
      return;
    }

    // Fit to all event markers
    if (events.length > 0) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      // No events – show default view (Bulgaria)
      map.setView([42.7, 25.5], 7);
    }
  }, [map, events, center, zoom]);

  return null;
}

interface EventMapProps {
  events: Event[];
  /** When set, overrides auto-fit and centers on this point. */
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function EventMap({
  events,
  center,
  zoom,
  className = 'h-[500px] w-full rounded-lg',
}: EventMapProps) {
  const { t, i18n } = useTranslation();
  return (
    <MapContainer
      center={center ?? [42.7, 25.5]}
      zoom={zoom ?? 7}
      className={className}
      scrollWheelZoom
    >
      <AutoFitBounds events={events} center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.latitude, event.longitude]}
          icon={getEventIcon(event.event_type)}
        >
          <Popup>
            <div className="text-sm">
              <Link
                to={`/events/${event.id}`}
                className={`font-semibold hover:underline ${
                  event.status === 'cancelled'
                    ? 'text-red-600 line-through'
                    : 'text-primary-600'
                }`}
              >
                {event.status === 'cancelled' ? `${t('eventMap.cancelledPrefix')} ${event.title}` : event.title}
              </Link>
              <p className="text-gray-500 mt-1">{event.location_name}</p>
              <p className="text-gray-400 text-xs">
                {t(`eventTypes.${event.event_type}`)} &middot;{' '}
                {formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
