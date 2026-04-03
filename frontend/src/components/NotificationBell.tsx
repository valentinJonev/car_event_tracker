import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, X } from 'lucide-react';
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
  const bellRef = useRef<HTMLButtonElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const { data: unreadCount } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications(0, 15);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsData?.items ?? [];
  const hasUnread = (unreadCount ?? 0) > 0;

  const updatePanelPos = useCallback(() => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  function openPanel() {
    updatePanelPos();
    setIsOpen(true);
  }

  function closePanel() {
    setIsOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;

      // Check if click is inside the bell button
      if (bellRef.current?.contains(target)) return;

      // Check if click is inside the desktop panel (rendered in a portal)
      if (desktopPanelRef.current?.contains(target)) return;

      // Check if click is inside the mobile panel
      if (mobilePanelRef.current?.contains(target)) return;

      closePanel();
    }

    // Use a microtask delay so the opening click doesn't immediately close
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleNavigate(eventId: string, notificationId: string) {
    // Mark notification as read, then navigate to events page with detail modal
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification && notification.status !== 'read') {
      markRead.mutate(notificationId);
    }
    closePanel();
    navigate(`/events?detail=${eventId}`);
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="relative">
      {/* Bell button */}
        <button
          ref={bellRef}
          onClick={() => (isOpen ? closePanel() : openPanel())}
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
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in-soft" onClick={closePanel} />

          <div ref={mobilePanelRef} className="fixed inset-x-0 top-0 z-[60] flex max-h-[80vh] flex-col overflow-hidden rounded-b-[28px] border-b border-white/10 bg-zinc-900 shadow-2xl animate-slide-down-sheet md:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <h3 className="text-sm font-semibold text-white">
                {t('notifications.title')}
              </h3>
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markAllRead.isPending}
                    className="text-xs font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                  >
                    {t('notifications.markAllAsRead')}
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white/40" />
                </div>
              )}

              {!isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center px-4 py-10">
                  <BellOff className="mb-2 h-10 w-10 text-zinc-600" />
                  <p className="text-sm text-zinc-500">
                    {t('notifications.noNotificationsYet')}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
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

            {!isLoading && notifications.length > 0 && (
              <div className="border-t border-white/10 px-4 py-3 text-center">
                <span className="text-xs text-zinc-500">
                  {t('notifications.showingLatest', { count: notifications.length })}
                  {notificationsData && notificationsData.total > notifications.length && (
                    <> {t('notifications.ofTotal', { total: notificationsData.total })}</>
                  )}
                </span>
              </div>
            )}
          </div>

          {createPortal(
          <div
            ref={desktopPanelRef}
            style={{ top: panelPos.top, right: panelPos.right }}
            className="animate-fade-in-soft fixed z-[9998] hidden w-96 max-h-[28rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl md:flex"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">
                {t('notifications.title')}
              </h3>
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markAllRead.isPending}
                    className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
                  >
                    {t('notifications.markAllAsRead')}
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
          </div>,
          document.body,
          )}
        </>
      )}
    </div>
  );
}
