import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { OrganiserPageResponse, OrganiserDetail } from '../types';

interface BrowseOrganisersParams {
  search?: string;
  offset?: number;
  limit?: number;
}

export function useOrganisers(params: BrowseOrganisersParams = {}) {
  return useQuery<OrganiserPageResponse>({
    queryKey: ['organisers', 'browse', params],
    queryFn: async () => {
      const qp: Record<string, string | number> = {};
      if (params.search) qp.search = params.search;
      if (params.offset !== undefined) qp.offset = params.offset;
      if (params.limit !== undefined) qp.limit = params.limit;

      const { data } = await api.get('/users/organisers/browse', { params: qp });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useOrganiserDetail(id: string | undefined) {
  return useQuery<OrganiserDetail>({
    queryKey: ['organiser', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/organisers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
