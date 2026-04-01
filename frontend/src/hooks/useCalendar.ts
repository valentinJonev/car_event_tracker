import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type {
  SavedEvent,
  SavedEventListResponse,
  SavedEventStatus,
  CalendarFeedInfo,
} from '../types';

// ── Queries ─────────────────────────────────────────────────────────────

interface CalendarFilters {
  date_from?: string;
  date_to?: string;
  offset?: number;
  limit?: number;
}

export function useMyCalendar(filters: CalendarFilters = {}, enabled = true) {
  return useQuery<SavedEventListResponse>({
    queryKey: ['my-calendar', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.offset !== undefined) params.offset = filters.offset;
      if (filters.limit !== undefined) params.limit = filters.limit;

      const { data } = await api.get('/calendar/', { params });
      return data;
    },
    enabled,
  });
}

export function useSavedEventStatus(eventId: string | undefined, enabled = true) {
  return useQuery<SavedEventStatus>({
    queryKey: ['saved-event-status', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/calendar/${eventId}/status`);
      return data;
    },
    enabled: !!eventId && enabled,
  });
}

export function useCalendarFeedInfo(enabled = true) {
  return useQuery<CalendarFeedInfo>({
    queryKey: ['calendar-feed-info'],
    queryFn: async () => {
      const { data } = await api.get('/calendar/feed/info');
      return data;
    },
    enabled,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────

export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/calendar/${eventId}`);
      return data as SavedEvent;
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: ['saved-event-status', eventId] });
      qc.invalidateQueries({ queryKey: ['my-calendar'] });
    },
  });
}

export function useUnsaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/calendar/${eventId}`);
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: ['saved-event-status', eventId] });
      qc.invalidateQueries({ queryKey: ['my-calendar'] });
    },
  });
}

export function useGenerateFeedToken() {
  const qc = useQueryClient();
  return useMutation<CalendarFeedInfo>({
    mutationFn: async () => {
      const { data } = await api.post('/calendar/feed/token');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-feed-info'] });
    },
  });
}

export function useRevokeFeedToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/calendar/feed/token');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-feed-info'] });
    },
  });
}
