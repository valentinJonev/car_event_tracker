import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type {
  FeaturedEventSettingResponse,
  SetFeaturedEventPayload,
  User,
  UserListResponse,
} from '../types';

export function useAdminUsers(search?: string) {
  return useQuery<UserListResponse>({
    queryKey: ['admin', 'users', search],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: { search: search || undefined },
      });
      return data;
    },
  });
}

export function useFeaturedEventOverride() {
  return useQuery<FeaturedEventSettingResponse>({
    queryKey: ['admin', 'featuredEventOverride'],
    queryFn: async () => {
      const { data } = await api.get('/admin/featured-event');
      return data;
    },
  });
}

export function useSetFeaturedEventOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetFeaturedEventPayload) => {
      const { data } = await api.put('/admin/featured-event', payload);
      return data as FeaturedEventSettingResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'featuredEventOverride'] });
      qc.invalidateQueries({ queryKey: ['platformStats'] });
    },
  });
}

export function useClearFeaturedEventOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/admin/featured-event');
      return data as FeaturedEventSettingResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'featuredEventOverride'] });
      qc.invalidateQueries({ queryKey: ['platformStats'] });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: User['role'] }) => {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role });
      return data as User;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
