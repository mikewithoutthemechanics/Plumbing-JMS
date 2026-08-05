import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/supabase/services';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}