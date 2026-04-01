import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type {
  Event,
  EventListResponse,
  EventFilters,
  EventType,
} from '../types';

// ── Queries ─────────────────────────────────────────────────────────────

export function useEvents(filters: EventFilters = {}, enabled = true) {
  return useQuery<EventListResponse>({
    queryKey: ['events', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.event_type) params.event_type = filters.event_type;
      if (filters.status) params.status = filters.status;
      if (filters.organiser_id) params.organiser_id = filters.organiser_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.search) params.search = filters.search;
      if (filters.offset !== undefined) params.offset = filters.offset;
      if (filters.limit !== undefined) params.limit = filters.limit;

      const { data } = await api.get('/events/', { params });
      return data;
    },
    enabled,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery<Event>({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

interface NearbyParams {
  lat: number;
  lng: number;
  radius_km?: number;
  event_type?: EventType;
  organiser_id?: string;
  date_from?: string;
  date_to?: string;
  offset?: number;
  limit?: number;
}

export function useNearbyEvents(params: NearbyParams | null) {
  return useQuery<EventListResponse>({
    queryKey: ['events', 'nearby', params],
    queryFn: async () => {
      const { data } = await api.get('/events/nearby', { params: params! });
      return data;
    },
    enabled: !!params,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/events/', payload);
      return data as Event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.put(`/events/${id}`, payload);
      return data as Event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/events/${id}`);
      return data as Event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
