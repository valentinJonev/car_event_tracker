import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface OrganiserOption {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface OrganiserListResponse {
  items: OrganiserOption[];
}

/**
 * Search organisers by display name (debounced query).
 * Returns all organisers when search is empty.
 */
export function useOrganiserSearch(search: string) {
  return useQuery<OrganiserListResponse>({
    queryKey: ['organisers', search],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 20 };
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/users/organisers', { params });
      return data;
    },
    // Keep previous data while fetching to avoid flicker
    placeholderData: (prev) => prev,
  });
}
