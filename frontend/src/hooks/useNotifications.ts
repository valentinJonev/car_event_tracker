import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Notification, NotificationListResponse } from '../types';

export function useNotifications(offset = 0, limit = 20) {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', offset, limit],
    queryFn: async () => {
      const { data } = await api.get('/notifications/', {
        params: { offset, limit },
      });
      return data;
    },
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/', {
        params: { offset: 0, limit: 50 },
      });
      const list = data as NotificationListResponse;
      return list.items.filter((n) => n.status !== 'read').length;
    },
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data as Notification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data as { message: string; count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
