import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent, useCreateEvent, useUpdateEvent } from '../hooks/useEvents';
import LocationPicker from '../components/LocationPicker';
import type { EventType, EventStatus } from '../types';

const EVENT_TYPE_VALUES: EventType[] = [
  'racing', 'car_show', 'track_day', 'meetup', 'drift', 'drag', 'hillclimb', 'other',
];

const STATUS_VALUES: EventStatus[] = ['draft', 'published'];

/**
 * Helpers for splitting / merging date + time values.
 *
 * We store date as "YYYY-MM-DD" and time as "HH:MM" in local state,
 * then merge them into an ISO string for the API payload.
 */
function splitDatetime(iso: string): { date: string; time: string } {
  // iso comes from the API like "2025-06-15T10:00:00+00:00" or "2025-06-15T10:00"
  const dt = new Date(iso);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

function mergeDatetime(date: string, time: string): string {
  // Merge "YYYY-MM-DD" + "HH:MM" into an ISO string
  return new Date(`${date}T${time}`).toISOString();
}

function dateOnlyToIso(date: string): string {
  // For all-day events we send midnight UTC of that date
  return new Date(`${date}T00:00:00`).toISOString();
}

export default function EventFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useEvent(id);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(id || '');

  // ── Form state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('meetup');
  const [status, setStatus] = useState<EventStatus>('draft');

  // Date / time split state
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── Populate fields for editing ─────────────────────────────────────
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description || '');
      setEventType(existing.event_type);
      setStatus(existing.status);
      setIsAllDay(existing.is_all_day);

      const start = splitDatetime(existing.start_datetime);
      setStartDate(start.date);
      setStartTime(start.time);

      if (existing.end_datetime) {
        const end = splitDatetime(existing.end_datetime);
        setEndDate(end.date);
        setEndTime(end.time);
      } else {
        setEndDate('');
        setEndTime('');
      }

      setLocationName(existing.location_name);
      setAddress(existing.address || '');
      setLat(existing.latitude);
      setLng(existing.longitude);
      setCoverImageUrl(existing.cover_image_url || '');
      setMaxAttendees(existing.max_attendees?.toString() || '');
    }
  }, [existing]);

  // ── Submit ──────────────────────────────────────────────────────────
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate) {
      setError(t('eventForm.selectStartDate'));
      return;
    }
    if (!isAllDay && !startTime) {
      setError(t('eventForm.selectStartTime'));
      return;
    }
    if (lat === null || lng === null) {
      setError(t('eventForm.selectLocation'));
      return;
    }

    // Build datetimes
    const startIso = isAllDay
      ? dateOnlyToIso(startDate)
      : mergeDatetime(startDate, startTime);

    let endIso: string | null = null;
    if (endDate) {
      endIso = isAllDay
        ? dateOnlyToIso(endDate)
        : endTime
          ? mergeDatetime(endDate, endTime)
          : null;
    }

    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      event_type: eventType,
      status,
      start_datetime: startIso,
      end_datetime: endIso,
      is_all_day: isAllDay,
      location_name: locationName,
      address: address || null,
      latitude: lat,
      longitude: lng,
      cover_image_url: coverImageUrl || null,
      max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
    };

    try {
      if (isEdit) {
        const updated = await updateEvent.mutateAsync(payload);
        navigate(`/events/${updated.id}`);
      } else {
        const created = await createEvent.mutateAsync(payload);
        navigate(`/events/${created.id}`);
      }
    } catch {
      setError(t('eventForm.failedToSave'));
    }
  };

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        {isEdit ? t('eventForm.editEvent') : t('eventForm.createEvent')}
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-5"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('eventForm.title')} {t('eventForm.required')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('eventForm.description')}
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Type & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.eventType')} {t('eventForm.required')}
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
            >
              {EVENT_TYPE_VALUES.map((val) => (
                <option key={val} value={val}>
                  {t(`eventTypes.${val}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
            >
              {STATUS_VALUES.map((val) => (
                <option key={val} value={val}>
                  {t(`eventStatus.${val}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Date & Time section ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('eventForm.dateTime')}
            </label>

            {/* All Day toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('eventForm.allDay')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isAllDay}
                onClick={() => setIsAllDay((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  isAllDay
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAllDay ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Start date/time */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">
              {t('eventForm.start')} {t('eventForm.required')}
            </p>
            <div className={`grid gap-3 ${isAllDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
              />
              {!isAllDay && (
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
                />
              )}
            </div>
          </div>

          {/* End date/time */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">
              {t('eventForm.end')} <span className="font-normal normal-case">{t('eventForm.endOptional')}</span>
            </p>
            <div className={`grid gap-3 ${isAllDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Location name & address */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.locationName')} {t('eventForm.required')}
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
              placeholder={t('eventForm.locationNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.address')}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Map picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('eventForm.locationOnMap')} {t('eventForm.required')}
          </label>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />
        </div>

        {/* Extra fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.coverImageUrl')}
            </label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
              placeholder={t('eventForm.coverImagePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventForm.maxAttendees')}
            </label>
            <input
              type="number"
              min={1}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isPending
              ? t('eventForm.saving')
              : isEdit
                ? t('eventForm.updateEvent')
                : t('eventForm.createEvent')}
          </button>
        </div>
      </form>
    </div>
  );
}
