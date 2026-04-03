import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent, useCreateEvent, useUpdateEvent } from '../hooks/useEvents';
import LocationPicker from '../components/LocationPicker';
import type { EventType, EventStatus } from '../types';

const EVENT_TYPE_VALUES: EventType[] = [
  'racing', 'car_show', 'track_day', 'meetup', 'drift', 'drag', 'hillclimb', 'other',
];

const inputCls =
  'w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500';

const selectCls =
  'w-full bg-zinc-900 border border-white/10 text-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20';

/**
 * Helpers for splitting / merging date + time values.
 */
function splitDatetime(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

function mergeDatetime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function dateOnlyToIso(date: string): string {
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
  const onSubmit = async (e: FormEvent, nextStatus = status) => {
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
      status: nextStatus,
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
        navigate(`/events?detail=${updated.id}`);
      } else {
        const created = await createEvent.mutateAsync(payload);
        navigate(`/events?detail=${created.id}`);
      }
    } catch {
      setError(t('eventForm.failedToSave'));
    }
  };

  const isPending = createEvent.isPending || updateEvent.isPending;
  const isPublished = status === 'published';

  const handleSubmitWithStatus = async (nextStatus: EventStatus) => {
    const fakeEvent = { preventDefault() {} } as FormEvent;
    await onSubmit(fakeEvent, nextStatus);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isEdit ? t('eventForm.editEvent') : t('eventForm.createEvent')}
      </h1>

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {t('eventForm.title')} {t('eventForm.required')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Event type */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {t('eventForm.eventType')} {t('eventForm.required')}
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className={selectCls}
          >
            {EVENT_TYPE_VALUES.map((val) => (
              <option key={val} value={val}>
                {t(`eventTypes.${val}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {t('eventForm.description')}
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* ── Date & Time section ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-medium text-zinc-300">
              {t('eventForm.dateTime')}
            </label>

            {/* All Day toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-zinc-400">{t('eventForm.allDay')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isAllDay}
                onClick={() => setIsAllDay((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
                  isAllDay
                    ? 'bg-white'
                    : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    isAllDay ? 'translate-x-6 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Start date/time */}
          <div>
            <p className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wide">
              {t('eventForm.start')} {t('eventForm.required')}
            </p>
            <div className={`grid grid-cols-1 gap-3 ${isAllDay ? '' : 'sm:grid-cols-2'}`}>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
              {!isAllDay && (
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          {/* End date/time */}
          <div>
            <p className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wide">
              {t('eventForm.end')} <span className="font-normal normal-case">{t('eventForm.endOptional')}</span>
            </p>
            <div className={`grid grid-cols-1 gap-3 ${isAllDay ? '' : 'sm:grid-cols-2'}`}>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>
        </div>

        {/* Location name */}
        <div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              {t('eventForm.locationName')} {t('eventForm.required')}
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={inputCls}
              placeholder={t('eventForm.locationNamePlaceholder')}
            />
          </div>
        </div>

        {/* Map picker */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {t('eventForm.locationOnMap')} {t('eventForm.required')}
          </label>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
            onAddressResolved={(nextAddress) => {
              setAddress(nextAddress);
            }}
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            {t('eventForm.address')}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Extra fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              {t('eventForm.coverImageUrl')}
            </label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className={inputCls}
              placeholder={t('eventForm.coverImagePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              {t('eventForm.maxAttendees')}
            </label>
            <input
              type="number"
              min={1}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/10"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleSubmitWithStatus(isPublished ? 'published' : 'draft')}
            className={`rounded-full px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              isPublished
                ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
            }`}
          >
            {isPending
              ? t('eventForm.saving')
              : isPublished
                ? t('eventForm.saveEvent', { defaultValue: 'Save' })
                : isEdit
                  ? t('eventForm.saveDraft', { defaultValue: 'Save' })
                  : t('eventForm.saveAsDraft', { defaultValue: 'Save as draft' })}
          </button>
          {!isPublished && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleSubmitWithStatus('published')}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {isPending
                ? t('eventForm.saving')
                : t('eventForm.publishEvent', { defaultValue: 'Publish' })}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
