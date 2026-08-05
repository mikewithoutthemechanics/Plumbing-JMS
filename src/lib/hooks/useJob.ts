import { useQuery } from '@tanstack/react-query';
import { getJob } from '@/lib/supabase/services';

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
