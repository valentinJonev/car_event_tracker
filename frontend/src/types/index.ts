export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'organiser' | 'admin';
  oauth_provider: string | null;
  social_links: SocialLinks | null;
  notification_preferences: NotificationPreferences | null;
  is_active: boolean;
  calendar_feed_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserUpdatePayload {
  display_name?: string;
  avatar_url?: string;
  social_links?: SocialLinks;
  notification_preferences?: NotificationPreferences;
  current_password?: string;
  new_password?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  start_datetime: string;
  end_datetime: string | null;
  is_all_day: boolean;
  location_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  max_attendees: number | null;
  organiser_id: string;
  organiser: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export type EventType =
  | 'racing'
  | 'car_show'
  | 'track_day'
  | 'meetup'
  | 'drift'
  | 'drag'
  | 'hillclimb'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface EventListResponse {
  items: Event[];
  total: number;
  offset: number;
  limit: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  filter_type: 'organiser' | 'event_type' | 'location';
  filter_value: string;
  filter_meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionListResponse {
  items: Subscription[];
  total: number;
}

export interface NotificationEventSnapshot {
  id: string;
  title: string;
  event_type: EventType;
  start_datetime: string;
  organiser_name: string;
  is_all_day: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  event_id: string;
  channel: 'email' | 'push';
  status: 'pending' | 'sent' | 'failed' | 'read';
  message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  event: NotificationEventSnapshot | null;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  offset: number;
  limit: number;
}

export interface OrgRequest {
  id: string;
  user_id: string;
  user: {
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgRequestListResponse {
  items: OrgRequest[];
  total: number;
}

export interface EventFilters {
  event_type?: EventType;
  status?: EventStatus;
  organiser_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface OrganiserPageItem {
  id: string;
  display_name: string;
  avatar_url: string | null;
  event_count: number;
  upcoming_event_count: number;
}

export interface OrganiserPageResponse {
  items: OrganiserPageItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface OrganiserDetail {
  id: string;
  display_name: string;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  created_at: string;
  event_count: number;
  upcoming_event_count: number;
}

// ── Personal Calendar ──────────────────────────────────────────────────

export interface SavedEvent {
  id: string;
  user_id: string;
  event_id: string;
  event: Event;
  created_at: string;
}

export interface SavedEventListResponse {
  items: SavedEvent[];
  total: number;
  offset: number;
  limit: number;
}

export interface SavedEventStatus {
  is_saved: boolean;
  saved_event_id: string | null;
}

export interface CalendarFeedInfo {
  calendar_feed_token: string | null;
  feed_url: string | null;
}

// ── Platform Stats ─────────────────────────────────────────────────────

export interface FeaturedEventOrganiser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FeaturedEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  start_datetime: string;
  end_datetime: string | null;
  is_all_day: boolean;
  location_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  max_attendees: number | null;
  organiser_id: string;
  organiser: FeaturedEventOrganiser | null;
  save_count: number;
  is_admin_pick: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformStats {
  total_users: number;
  total_organisers: number;
  featured_event: FeaturedEvent | null;
}
