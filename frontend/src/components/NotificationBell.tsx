import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff } from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';
import { EVENT_TYPE_CONFIG } from '../constants/eventTypes';
import { formatEventDate } from '../utils/dateFormat';
import type { Notification, EventType } from '../types';

function formatTimeAgo(iso: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('notifications.justNow');
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NotificationItem({
  notification,
  onNavigate,
  t,
  lang,
}: {
  notification: Notification;
  onNavigate: (eventId: string, notificationId: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  lang: string;
}) {
  const evt = notification.event;
  const eventType = (evt?.event_type ?? 'other') as EventType;
  const config = EVENT_TYPE_CONFIG[eventType] ?? EVENT_TYPE_CONFIG.other;
  const isUnread = notification.status !== 'read';

  // Determine if this is an "update" notification by checking the message
  const isUpdate = notification.message?.includes(' updated ') ?? false;

  const title = evt
    ? isUpdate
      ? t('notifications.updatedEvent', { organiser: evt.organiser_name, title: evt.title })
      : t('notifications.newEventByOrganiser', { type: t(`eventTypes.${eventType}`), organiser: evt.organiser_name })
    : notification.message || t('notifications.newEventNotification');

  const eventDate = evt
    ? formatEventDate(evt.start_datetime, evt.is_all_day ?? false, lang)
    : null;

  return (
    <button
      onClick={() => onNavigate(notification.event_id, notification.id)}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
        isUnread ? 'bg-red-500/5' : ''
      }`}
    >
      {/* Event type emoji icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: config.bg + '20' }}
        title={t(`eventTypes.${eventType}`)}
      >
        {config.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug truncate ${
            isUnread
              ? 'font-semibold text-white'
              : 'text-zinc-400'
          }`}
        >
          {title}
        </p>

        {/* Event date & time ago */}
        <div className="flex items-center gap-2 mt-0.5">
          {eventDate && (
            <span className="text-xs text-zinc-500 truncate">
              {eventDate}
            </span>
          )}
          <span className="text-xs text-zinc-600">
            · {formatTimeAgo(notification.created_at, t)}
          </span>
        </div>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="flex-shrink-0 mt-2">
          <span className="block w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}
    </button>
  );
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications(0, 15);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsData?.items ?? [];
  const hasUnread = (unreadCount ?? 0) > 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  function handleNavigate(eventId: string, notificationId: string) {
    // Mark notification as read, then navigate to events page with detail modal
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification && notification.status !== 'read') {
      markRead.mutate(notificationId);
    }
    setIsOpen(false);
    navigate(`/events?detail=${eventId}`);
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-zinc-400 hover:text-white relative p-2 rounded-full transition-colors focus:outline-none"
        aria-label={t('notifications.title')}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center min-w-[18px] px-1">
            {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">
              {t('notifications.title')}
            </h3>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
              >
                {t('notifications.markAllAsRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/40" />
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <BellOff className="h-10 w-10 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">
                  {t('notifications.noNotificationsYet')}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {t('notifications.subscribeToGetNotified')}
                </p>
              </div>
            )}

            {!isLoading &&
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onNavigate={handleNavigate}
                  t={t}
                  lang={i18n.language}
                />
              ))}
          </div>

          {/* Footer with count */}
          {!isLoading && notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/10 text-center">
              <span className="text-xs text-zinc-500">
                {t('notifications.showingLatest', { count: notifications.length })}
                {notificationsData && notificationsData.total > notifications.length && (
                  <> {t('notifications.ofTotal', { total: notificationsData.total })}</>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
