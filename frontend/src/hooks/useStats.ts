import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { PlatformStats } from '../types';

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const { data } = await api.get('/stats/');
      return data;
    },
    staleTime: 60_000, // 1 min — stats don't change rapidly
  });
}
