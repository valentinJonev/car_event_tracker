import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import {
  useSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
} from '../hooks/useSubscriptions';
import OrganiserAutocomplete from '../components/OrganiserAutocomplete';
import type { OrganiserOption } from '../hooks/useOrganiserSearch';
import type { EventType } from '../types';

/* ── Constants ─────────────────────────────────────────────────────────── */

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

/* ── Sidebar navigation items ──────────────────────────────────────────── */

type SectionKey = 'profile' | 'social' | 'password' | 'notifications' | 'subscriptions';

const NAV_ICONS: Record<SectionKey, JSX.Element> = {
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  social: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  password: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  subscriptions: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
};

const NAV_KEYS: SectionKey[] = ['profile', 'social', 'password', 'notifications', 'subscriptions'];

/* ── Reusable helpers ──────────────────────────────────────────────────── */

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
      {children}
    </h2>
  );
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-md mb-4 text-sm">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-4 text-sm">
      {message}
    </div>
  );
}

/* ── Profile Section ───────────────────────────────────────────────────── */

function ProfileSection() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initials = (user?.display_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl || undefined,
      });
      setSuccess(t('profile.profileUpdated'));
    } catch {
      setError(t('profile.failedToUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>{t('profile.profile')}</SectionTitle>
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />

      <div className="flex items-center space-x-4 mb-6">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="h-16 w-16 rounded-full object-cover border-2 border-primary-500"
          />
        ) : (
          <span className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold border-2 border-primary-500">
            {initials}
          </span>
        )}
        <div>
          <p className="text-gray-800 dark:text-gray-100 font-medium">
            {user?.display_name}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {user?.email}
          </p>
          {(user?.role === 'organiser' || user?.role === 'admin') && (
            <span className="inline-block mt-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
              {user.role}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.displayName')}
          </label>
          <input
            type="text"
            required
            minLength={1}
            maxLength={100}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.avatarUrl')}
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={t('profile.avatarPlaceholder')}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.emailLabel')}
          </label>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
            className={`${inputCls} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('profile.emailReadonly')}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving') : t('profile.saveProfile')}
        </button>
      </form>
    </>
  );
}

/* ── Social Links Section ──────────────────────────────────────────────── */

function SocialLinksSection() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [facebook, setFacebook] = useState(user?.social_links?.facebook ?? '');
  const [instagram, setInstagram] = useState(user?.social_links?.instagram ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({
        social_links: {
          facebook: facebook || null,
          instagram: instagram || null,
        },
      });
      setSuccess(t('profile.socialLinksUpdated'));
    } catch {
      setError(t('profile.failedToUpdateSocialLinks'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>{t('profile.socialLinks')}</SectionTitle>
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.facebookPageUrl')}
          </label>
          <input
            type="url"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder={t('profile.facebookPlaceholder')}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.instagramPageUrl')}
          </label>
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={t('profile.instagramPlaceholder')}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving') : t('profile.saveSocialLinks')}
        </button>
      </form>
    </>
  );
}

/* ── Password Section ──────────────────────────────────────────────────── */

function PasswordSection() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // OAuth-only users without a password can't change password
  const isOAuthOnly = user?.oauth_provider && !user?.email;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t('profile.newPasswordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('profile.newPasswordMinLength'));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(t('profile.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t('profile.failedToChangePassword');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isOAuthOnly) {
    return (
      <>
        <SectionTitle>{t('profile.changePassword')}</SectionTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('profile.oauthPasswordNote')}
        </p>
      </>
    );
  }

  return (
    <>
      <SectionTitle>{t('profile.changePassword')}</SectionTitle>
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.currentPassword')}
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.newPassword')}
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('profile.confirmNewPassword')}
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? t('profile.changing') : t('profile.changePassword')}
        </button>
      </form>
    </>
  );
}

/* ── Notification Preferences Section ──────────────────────────────────── */

function NotificationPreferencesSection() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [emailNotif, setEmailNotif] = useState(
    user?.notification_preferences?.email ?? true
  );
  const [pushNotif, setPushNotif] = useState(
    user?.notification_preferences?.push ?? true
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({
        notification_preferences: {
          email: emailNotif,
          push: pushNotif,
        },
      });
      setSuccess(t('profile.preferencesUpdated'));
    } catch {
      setError(t('profile.failedToUpdatePreferences'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>{t('profile.notificationPreferences')}</SectionTitle>
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotif}
            onChange={(e) => setEmailNotif(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('profile.emailNotifications')}
          </span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pushNotif}
            onChange={(e) => setPushNotif(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('profile.pushNotifications')}
          </span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving') : t('profile.savePreferences')}
        </button>
      </form>
    </>
  );
}

/* ── Subscriptions Section ─────────────────────────────────────────────── */

function SubscriptionsSection() {
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

    // Resolve the actual value to submit
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
    <>
      <SectionTitle>{t('profile.subscriptions')}</SectionTitle>

      {/* Create form */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          {t('subscriptions.addSubscription')}
        </h3>

        <ErrorBanner message={error} />

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('subscriptions.filterType')}
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue('');
                  setSelectedOrganiser(null);
                }}
                className={inputCls}
              >
                {FILTER_TYPE_VALUES.map((ft) => (
                  <option key={ft} value={ft}>
                    {filterTypeLabels[ft]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
                  className={inputCls}
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

            {filterType === 'location' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
          </div>

          <button
            type="submit"
            disabled={createSub.isPending}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
          >
            {createSub.isPending ? t('subscriptions.adding') : t('subscriptions.addSubscriptionBtn')}
          </button>
        </form>
      </div>

      {/* Existing subscriptions */}
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
          {t('subscriptions.noSubscriptions')}
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((sub) => (
            <div
              key={sub.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mr-2">
                  {displayFilterType(sub.filter_type)}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {displayFilterValue(sub)}
                </span>
                {sub.filter_type === 'location' && !!sub.filter_meta?.radius_km && (
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                    ({String(sub.filter_meta.radius_km)} km)
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(sub.id)}
                disabled={deleteSub.isPending}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Section renderer ──────────────────────────────────────────────────── */

function renderSection(key: SectionKey) {
  switch (key) {
    case 'profile':
      return <ProfileSection />;
    case 'social':
      return <SocialLinksSection />;
    case 'password':
      return <PasswordSection />;
    case 'notifications':
      return <NotificationPreferencesSection />;
    case 'subscriptions':
      return <SubscriptionsSection />;
  }
}

/* ── Profile Page ──────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');

  const navLabels: Record<SectionKey, string> = {
    profile: t('profile.profile'),
    social: t('profile.socialLinks'),
    password: t('profile.password'),
    notifications: t('profile.notifications'),
    subscriptions: t('profile.subscriptions'),
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto">
      {/* ── Mobile horizontal nav ─────────────────────────────────────── */}
      <div className="md:hidden overflow-x-auto">
        <div className="flex space-x-1 min-w-max bg-white dark:bg-gray-800 shadow-md rounded-lg p-1.5">
          {NAV_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {NAV_ICONS[key]}
              <span>{navLabels[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <nav className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-2 sticky top-24 space-y-1">
          <h2 className="px-3 pt-2 pb-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('profile.settings')}
          </h2>
          {NAV_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeSection === key
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span
                className={
                  activeSection === key
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                }
              >
                {NAV_ICONS[key]}
              </span>
              <span>{navLabels[key]}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content area ──────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          {renderSection(activeSection)}
        </div>
      </main>
    </div>
  );
}
