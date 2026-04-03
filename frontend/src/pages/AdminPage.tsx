import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Users,
  Star,
  Calendar,
  Mail,
  MoreVertical,
} from 'lucide-react';
import { usePendingOrgRequests, useReviewOrgRequest } from '../hooks/useOrgRequests';
import {
  useAdminUsers,
  useClearFeaturedEventOverride,
  useFeaturedEventOverride,
  useSetFeaturedEventOverride,
  useUpdateUserRole,
} from '../hooks/useAdmin';
import { useEvent, useEvents } from '../hooks/useEvents';
import { usePlatformStats } from '../hooks/useStats';
import { formatEventDate } from '../utils/dateFormat';

type AdminSectionKey = 'approvals' | 'users' | 'featured';
type FeaturedMode = 'automatic' | 'manual';

const SECTION_KEYS: AdminSectionKey[] = ['approvals', 'users', 'featured'];

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<AdminSectionKey>('approvals');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [featuredMode, setFeaturedMode] = useState<FeaturedMode>('automatic');
  const [selectedFeaturedEventId, setSelectedFeaturedEventId] = useState<string | null>(null);
  const [pickEventOpen, setPickEventOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [userActionMenuId, setUserActionMenuId] = useState<string | null>(null);
  const [roleModalUserId, setRoleModalUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<'user' | 'organiser' | 'admin'>('user');
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const pendingRequests = usePendingOrgRequests();
  const reviewRequest = useReviewOrgRequest();
  const usersQuery = useAdminUsers(userSearch);
  const updateUserRole = useUpdateUserRole();
  const featuredOverride = useFeaturedEventOverride();
  const platformStats = usePlatformStats();
  const setFeaturedEvent = useSetFeaturedEventOverride();
  const clearFeaturedEvent = useClearFeaturedEventOverride();

  const overrideEventId = featuredOverride.data?.event_id ?? undefined;
  const overrideEvent = useEvent(overrideEventId);
  const selectedFeaturedEvent = useEvent(selectedFeaturedEventId ?? undefined);
  const featuredSearch = useEvents(
    {
      search: eventSearch || undefined,
      status: 'published',
      limit: 50,
    },
    activeSection === 'featured',
  );

  const selectableFeaturedEvents = (featuredSearch.data?.items ?? []).filter(
    (event) => event.status !== 'cancelled',
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
    }
    if (mobileNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileNavOpen]);

  const navLabels: Record<AdminSectionKey, string> = {
    approvals: t('admin.approvalsSection'),
    users: t('admin.usersSection'),
    featured: t('admin.featuredSection'),
  };

  const navIcons: Record<AdminSectionKey, ReactNode> = {
    approvals: <Shield className="h-4 w-4" />,
    users: <Users className="h-4 w-4" />,
    featured: <Star className="h-4 w-4" />,
  };

  const currentFeaturedEvent = useMemo(() => {
    if (featuredMode === 'manual') {
      if (selectedFeaturedEvent.data) return selectedFeaturedEvent.data;
      if (overrideEvent.data && selectedFeaturedEventId === overrideEvent.data.id) return overrideEvent.data;
      return null;
    }

    return platformStats.data?.featured_event ?? null;
  }, [
    featuredMode,
    overrideEvent.data,
    platformStats.data,
    selectedFeaturedEvent.data,
    selectedFeaturedEventId,
  ]);

  useEffect(() => {
    setFeaturedMode(featuredOverride.data?.event_id ? 'manual' : 'automatic');
    setSelectedFeaturedEventId(featuredOverride.data?.event_id ?? null);
  }, [featuredOverride.data?.event_id]);

  const hasPendingFeaturedChanges =
    (featuredOverride.data?.event_id ? 'manual' : 'automatic') !== featuredMode ||
    ((featuredOverride.data?.event_id ?? null) !== selectedFeaturedEventId && featuredMode === 'manual');

  const canSaveFeaturedChanges =
    hasPendingFeaturedChanges && (featuredMode === 'automatic' || !!selectedFeaturedEventId);

  const handleConfirmFeaturedSave = async () => {
    if (featuredMode === 'automatic') {
      await clearFeaturedEvent.mutateAsync();
    } else if (selectedFeaturedEventId) {
      await setFeaturedEvent.mutateAsync({ event_id: selectedFeaturedEventId });
    }

    setConfirmSaveOpen(false);
  };

  const roleModalUser = usersQuery.data?.items.find((user) => user.id === roleModalUserId) ?? null;

  const openRoleModal = (userId: string, role: 'user' | 'organiser' | 'admin') => {
    setUserActionMenuId(null);
    setRoleModalUserId(userId);
    setPendingRole(role);
  };

  const handleSaveUserRole = async () => {
    if (!roleModalUserId) return;

    await updateUserRole.mutateAsync({
      userId: roleModalUserId,
      role: pendingRole,
    });

    setRoleModalUserId(null);
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewRequest.mutate({ id, status });
  };

  const renderApprovals = () => {
    if (pendingRequests.isLoading) {
      return (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
        </div>
      );
    }

    if (pendingRequests.isError) {
      return <p className="text-sm text-red-400">{t('admin.failedToLoadRequests')}</p>;
    }

    if (!pendingRequests.data || pendingRequests.data.items.length === 0) {
      return (
        <div className="py-12 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-400">{t('admin.noPendingRequests')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {pendingRequests.data.items.map((req) => (
          <div key={req.id} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {req.user?.display_name ?? t('admin.unknownUser')}
                </p>
                <p className="text-xs text-zinc-500">{req.user?.email ?? req.user_id}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {t('admin.submitted', { date: formatDateTime(req.created_at) })}
                </p>
              </div>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                {req.status}
              </span>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">{t('admin.reason')}</p>
              <p className="text-sm text-zinc-300">{req.reason}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleReview(req.id, 'approved')}
                disabled={reviewRequest.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {t('admin.approve')}
              </button>
              <button
                onClick={() => handleReview(req.id, 'rejected')}
                disabled={reviewRequest.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {t('admin.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div className="space-y-3">
        <input
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder={t('admin.searchUsersPlaceholder')}
          className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
        />
        <div className="text-sm text-zinc-400">
          {t('admin.totalUsersLabel', { count: usersQuery.data?.total ?? 0 })}
        </div>

        {usersQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
          </div>
        ) : usersQuery.isError ? (
          <p className="text-sm text-red-400">{t('admin.failedToLoadUsers')}</p>
        ) : !usersQuery.data || usersQuery.data.items.length === 0 ? (
          <p className="text-sm text-zinc-400">{t('admin.noUsers')}</p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            {usersQuery.data.items.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium text-white">{user.display_name}</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300">
                      {t(`roles.${user.role}`, { defaultValue: user.role })}
                    </span>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs text-zinc-500">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!user.is_active && (
                    <span className="text-xs text-red-400">{t('admin.inactive')}</span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setUserActionMenuId((current) => (current === user.id ? null : user.id))
                      }
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {userActionMenuId === user.id && (
                      <div className="absolute right-0 top-11 z-20 min-w-[11rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
                        <button
                          onClick={() => openRoleModal(user.id, user.role)}
                          className="block w-full px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:bg-white/5"
                        >
                          {t('admin.changeRole')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFeatured = () => {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{t('admin.promotedEventTitle')}</h3>
              <p className="mt-1 text-sm text-zinc-400">{t('admin.promotedEventDescription')}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-1.5">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    setFeaturedMode('automatic');
                  }}
                  className={`rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-out active:scale-[0.98] ${
                    featuredMode === 'automatic'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {t('admin.promoteMostSubscribed')}
                </button>
                <button
                  onClick={() => setFeaturedMode('manual')}
                  className={`rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-out active:scale-[0.98] ${
                    featuredMode === 'manual'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {t('admin.forceSpecificEvent')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            {currentFeaturedEvent ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {t(`eventTypes.${currentFeaturedEvent.event_type}`)}
                </div>
                <div className="text-lg font-semibold text-white">{currentFeaturedEvent.title}</div>
                <div className="flex flex-col gap-2 text-sm text-zinc-400">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatEventDate(
                      currentFeaturedEvent.start_datetime,
                      currentFeaturedEvent.is_all_day,
                      i18n.language,
                    )}
                  </span>
                  <span>{currentFeaturedEvent.location_name}</span>
                  {currentFeaturedEvent.organiser && (
                    <span>{currentFeaturedEvent.organiser.display_name}</span>
                  )}
                </div>
                {featuredMode !== 'manual' && (
                  <div className="text-xs text-zinc-500">
                    {t('admin.promotedEventAutomatic')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">{t('admin.noPromotedEvent')}</p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            {featuredMode === 'manual' && (
              <button
                onClick={() => setPickEventOpen(true)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
              >
                {selectedFeaturedEventId ? t('admin.changeSelectedEvent') : t('admin.selectPromotedEvent')}
              </button>
            )}

            <button
              onClick={() => setConfirmSaveOpen(true)}
              disabled={
                !canSaveFeaturedChanges || clearFeaturedEvent.isPending || setFeaturedEvent.isPending
              }
              className={`rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 ${featuredMode === 'manual' ? 'flex-1' : 'w-full'}`}
            >
              {t('common.save')}
            </button>
          </div>

          {hasPendingFeaturedChanges && featuredMode === 'manual' && selectedFeaturedEventId && (
            <span className="mt-3 block text-xs text-amber-300">{t('admin.unsavedFeaturedChanges')}</span>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (section: AdminSectionKey) => {
    switch (section) {
      case 'approvals':
        return renderApprovals();
      case 'users':
        return renderUsers();
      case 'featured':
        return renderFeatured();
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t('admin.title')}</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t('admin.dashboardHeading')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">{t('admin.dashboardDescription')}</p>
      </div>

      <div className="flex max-w-5xl flex-col gap-6 md:flex-row">
        <div className="relative md:hidden" ref={mobileNavRef}>
          <button
            onClick={() => setMobileNavOpen((s) => !s)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5 text-zinc-400" />
            ) : (
              <Menu className="h-5 w-5 text-zinc-400" />
            )}
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              {navIcons[activeSection]}
              {navLabels[activeSection]}
            </span>
          </button>

          {mobileNavOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 space-y-0.5 rounded-2xl border border-white/10 bg-zinc-900 p-1.5 shadow-2xl">
              {SECTION_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveSection(key);
                    setMobileNavOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    activeSection === key
                      ? 'bg-white text-zinc-900'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={activeSection === key ? 'text-zinc-900' : 'text-zinc-500'}>
                    {navIcons[key]}
                  </span>
                  {navLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden w-56 flex-shrink-0 md:block">
          <nav className="sticky top-24 space-y-1 rounded-3xl border border-white/10 bg-white/5 p-2">
            <h2 className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t('admin.management')}
            </h2>
            {SECTION_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex w-full items-center space-x-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={activeSection === key ? 'text-white' : 'text-zinc-500'}>
                  {navIcons[key]}
                </span>
                <span>{navLabels[key]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            {renderSection(activeSection)}
          </div>
        </main>
      </div>

      {confirmSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {t('admin.confirmPromotedEventTitle')}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {featuredMode === 'automatic'
                ? t('admin.confirmPromotedEventAutomatic')
                : t('admin.confirmPromotedEventManual', {
                    title: currentFeaturedEvent?.title ?? t('admin.selectedEventFallback'),
                  })}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmSaveOpen(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={handleConfirmFeaturedSave}
                disabled={clearFeaturedEvent.isPending || setFeaturedEvent.isPending}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                {t('admin.confirmSavePromotedEvent')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pickEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('admin.selectPromotedEvent')}</h3>
                <p className="mt-1 text-sm text-zinc-400">{t('admin.selectPromotedEventHint')}</p>
              </div>
              <button
                onClick={() => setPickEventOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder={t('admin.searchEventsPlaceholder')}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
            />

            <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {featuredSearch.isLoading && (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white" />
                </div>
              )}

              {!featuredSearch.isLoading && selectableFeaturedEvents.length === 0 && (
                <p className="text-sm text-zinc-400">{t('admin.noEventsFound')}</p>
              )}

              {selectableFeaturedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{event.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{event.location_name}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {formatEventDate(event.start_datetime, event.is_all_day, i18n.language)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFeaturedMode('manual');
                      setSelectedFeaturedEventId(event.id);
                      setPickEventOpen(false);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                  >
                    {t('admin.setAsPromoted')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">{t('admin.changeRole')}</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {t('admin.changeRoleForUser', { name: roleModalUser.display_name })}
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-zinc-400">{t('admin.roleLabel')}</label>
              <select
                value={pendingRole}
                onChange={(e) => setPendingRole(e.target.value as 'user' | 'organiser' | 'admin')}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none"
              >
                <option value="user">{t('roles.user')}</option>
                <option value="organiser">{t('roles.organiser')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRoleModalUserId(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={handleSaveUserRole}
                disabled={updateUserRole.isPending}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
