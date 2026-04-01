import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Subscription, SubscriptionListResponse } from '../types';

export function useSubscriptions() {
  return useQuery<SubscriptionListResponse>({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/');
      return data;
    },
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      filter_type: string;
      filter_value: string;
      filter_meta?: Record<string, unknown> | null;
    }) => {
      const { data } = await api.post('/subscriptions/', payload);
      return data as Subscription;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/subscriptions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}
