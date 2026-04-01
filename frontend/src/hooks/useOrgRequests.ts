import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { OrgRequest, OrgRequestListResponse } from '../types';

/** Current user's latest organiser request */
export function useMyOrgRequest() {
  return useQuery<OrgRequest | null>({
    queryKey: ['orgRequest', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/organiser-requests/me');
        return data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

/** Submit a new organiser request */
export function useSubmitOrgRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { data } = await api.post('/organiser-requests/', { reason });
      return data as OrgRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgRequest'] });
    },
  });
}

/** Admin: list pending requests */
export function usePendingOrgRequests() {
  return useQuery<OrgRequestListResponse>({
    queryKey: ['orgRequests', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/admin/organiser-requests/');
      return data;
    },
  });
}

/** Admin: approve or reject */
export function useReviewOrgRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'approved' | 'rejected';
    }) => {
      const { data } = await api.put(`/admin/organiser-requests/${id}`, {
        status,
      });
      return data as OrgRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgRequests'] });
    },
  });
}
