import { useState, useRef, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Link2, Lock, Bell, Newspaper, Menu, X } from 'lucide-react';
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
  profile: <User className="w-5 h-5" />,
  social: <Link2 className="w-5 h-5" />,
  password: <Lock className="w-5 h-5" />,
  notifications: <Bell className="w-5 h-5" />,
  subscriptions: <Newspaper className="w-5 h-5" />,
};

const NAV_KEYS: SectionKey[] = ['profile', 'social', 'password', 'notifications', 'subscriptions'];

/* ── Reusable helpers ──────────────────────────────────────────────────── */

const inputCls =
  'w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder-zinc-500';

const selectCls =
  'w-full bg-zinc-900 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-white mb-4">
      {children}
    </h2>
  );
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 px-4 py-3 rounded-2xl mb-4 text-sm">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl mb-4 text-sm">
      {message}
    </div>
  );
}

function PrimaryButton({ children, disabled, type = 'submit' }: { children: React.ReactNode; disabled?: boolean; type?: 'submit' | 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="bg-white text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
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
            className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <span className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/20">
            {initials}
          </span>
        )}
        <div>
          <p className="text-white font-medium">
            {user?.display_name}
          </p>
          <p className="text-zinc-400 text-sm">
            {user?.email}
          </p>
          {(user?.role === 'organiser' || user?.role === 'admin') && (
            <span className="inline-block mt-1 text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full border border-white/10">
              {user.role}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
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
          <label className="block text-sm text-zinc-400 mb-1">
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
          <label className="block text-sm text-zinc-400 mb-1">
            {t('profile.emailLabel')}
          </label>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
            className={`${inputCls} opacity-50 cursor-not-allowed`}
          />
          <p className="text-xs text-zinc-500 mt-1">
            {t('profile.emailReadonly')}
          </p>
        </div>
        <PrimaryButton disabled={saving}>
          {saving ? t('common.saving') : t('profile.saveProfile')}
        </PrimaryButton>
      </form>
    </>
  );
}

/* ── Social Links Section ──────────────────────────────────────────────── */

function getInstagramHandle(value: string | null | undefined) {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const withoutAt = trimmed.replace(/^@/, '');
  const match = withoutAt.match(/instagram\.com\/([^/?#]+)/i);

  return (match?.[1] ?? withoutAt).replace(/^@/, '');
}

function normalizeInstagramHandle(value: string) {
  const handle = value.trim().replace(/^@/, '');
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

function SocialLinksSection() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [facebook, setFacebook] = useState(user?.social_links?.facebook ?? '');
  const [instagram, setInstagram] = useState(getInstagramHandle(user?.social_links?.instagram));
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
            instagram: normalizeInstagramHandle(instagram),
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
          <label className="block text-sm text-zinc-400 mb-1">
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
          <label className="block text-sm text-zinc-400 mb-1">
            {t('profile.instagramPageUrl')}
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={t('profile.instagramPlaceholder')}
            className={inputCls}
          />
        </div>
        <PrimaryButton disabled={saving}>
          {saving ? t('common.saving') : t('profile.saveSocialLinks')}
        </PrimaryButton>
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
        <p className="text-sm text-zinc-400">
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
          <label className="block text-sm text-zinc-400 mb-1">
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
          <label className="block text-sm text-zinc-400 mb-1">
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
          <label className="block text-sm text-zinc-400 mb-1">
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
        <PrimaryButton disabled={saving}>
          {saving ? t('profile.changing') : t('profile.changePassword')}
        </PrimaryButton>
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
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={emailNotif}
            onChange={(e) => setEmailNotif(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
          />
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
            {t('profile.emailNotifications')}
          </span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={pushNotif}
            onChange={(e) => setPushNotif(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
          />
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
            {t('profile.pushNotifications')}
          </span>
        </label>
        <PrimaryButton disabled={saving}>
          {saving ? t('common.saving') : t('profile.savePreferences')}
        </PrimaryButton>
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
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          {t('subscriptions.addSubscription')}
        </h3>

        <ErrorBanner message={error} />

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {t('subscriptions.filterType')}
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue('');
                  setSelectedOrganiser(null);
                }}
                className={selectCls}
              >
                {FILTER_TYPE_VALUES.map((ft) => (
                  <option key={ft} value={ft}>
                    {filterTypeLabels[ft]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">
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
                  className={selectCls}
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
                <label className="block text-xs text-zinc-500 mb-1">
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

          <PrimaryButton disabled={createSub.isPending}>
            {createSub.isPending ? t('subscriptions.adding') : t('subscriptions.addSubscriptionBtn')}
          </PrimaryButton>
        </form>
      </div>

      {/* Existing subscriptions */}
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center text-zinc-500 text-sm py-4">
          {t('subscriptions.noSubscriptions')}
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((sub) => (
            <div
              key={sub.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <span className="text-xs uppercase tracking-wide text-zinc-500 mr-2">
                  {displayFilterType(sub.filter_type)}
                </span>
                <span className="text-sm font-medium text-zinc-200">
                  {displayFilterValue(sub)}
                </span>
                {sub.filter_type === 'location' && !!sub.filter_meta?.radius_km && (
                  <span className="ml-2 text-xs text-zinc-500">
                    ({String(sub.filter_meta.radius_km)} km)
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(sub.id)}
                disabled={deleteSub.isPending}
                className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50 transition-colors"
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Close mobile nav on outside click
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

  const navLabels: Record<SectionKey, string> = {
    profile: t('profile.profile'),
    social: t('profile.socialLinks'),
    password: t('profile.password'),
    notifications: t('profile.notifications'),
    subscriptions: t('profile.subscriptions'),
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto">
      {/* ── Mobile hamburger nav ──────────────────────────────────────── */}
      <div className="md:hidden relative" ref={mobileNavRef}>
        <button
          onClick={() => setMobileNavOpen((s) => !s)}
          className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 transition-colors hover:bg-white/10"
        >
          {mobileNavOpen ? (
            <X className="h-5 w-5 text-zinc-400" />
          ) : (
            <Menu className="h-5 w-5 text-zinc-400" />
          )}
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            {NAV_ICONS[activeSection]}
            {navLabels[activeSection]}
          </span>
        </button>

        {mobileNavOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-zinc-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5">
            {NAV_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActiveSection(key);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={activeSection === key ? 'text-zinc-900' : 'text-zinc-500'}>
                  {NAV_ICONS[key]}
                </span>
                {navLabels[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <nav className="bg-white/5 border border-white/10 rounded-3xl p-2 sticky top-24 space-y-1">
          <h2 className="px-3 pt-2 pb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t('profile.settings')}
          </h2>
          {NAV_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                activeSection === key
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className={
                  activeSection === key
                    ? 'text-white'
                    : 'text-zinc-500'
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          {renderSection(activeSection)}
        </div>
      </main>
    </div>
  );
}
