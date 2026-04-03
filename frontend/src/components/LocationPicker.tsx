import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Explicit marker icon to avoid the common react-leaflet broken-icon issue
const pickerIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:#3b82f6;transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">
      <span style="transform:rotate(45deg);font-size:18px;line-height:1">📍</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onAddressResolved?: (address: string) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
  onAddressResolved,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const center: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : [42.7, 25.5];
  const [resolvedAddress, setResolvedAddress] = useState<string>('');

  useEffect(() => {
    if (lat === null || lng === null) {
      setResolvedAddress('');
      return;
    }

    const controller = new AbortController();

    const resolveAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { display_name?: string };
        const nextAddress = data.display_name?.trim() ?? '';

        setResolvedAddress(nextAddress);
        if (nextAddress) {
          onAddressResolved?.(nextAddress);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    };

    void resolveAddress();

    return () => controller.abort();
  }, [lat, lng, onAddressResolved]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">{t('locationPicker.clickToSet')}</p>
      <MapContainer
        center={center}
        zoom={lat ? 13 : 7}
        className="h-64 w-full rounded-2xl border border-white/10"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={pickerIcon} />
        )}
      </MapContainer>
      {lat !== null && lng !== null && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">
            {t('locationPicker.latLng', { lat: lat.toFixed(6), lng: lng.toFixed(6) })}
          </p>
          {resolvedAddress && (
            <p className="text-xs text-zinc-400">
              {t('locationPicker.resolvedAddress', {
                defaultValue: 'Detected address: {{address}}',
                address: resolvedAddress,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
