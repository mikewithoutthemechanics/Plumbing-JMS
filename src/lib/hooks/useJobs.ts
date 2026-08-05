import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/supabase/services';

export function useJobs(filters: [string, string, unknown][] = []) {
  return useQuery({
    queryKey: ['jobs', JSON.stringify(filters)],
    queryFn: () => getJobs(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}