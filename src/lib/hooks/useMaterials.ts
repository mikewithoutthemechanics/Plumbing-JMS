import { useQuery } from '@tanstack/react-query';
import { getMaterials } from '@/lib/supabase/services';

export function useMaterials(filters: [string, string, unknown][] = []) {
  return useQuery({
    queryKey: ['materials', JSON.stringify(filters)],
    queryFn: () => getMaterials(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}