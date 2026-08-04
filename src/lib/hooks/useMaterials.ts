import { useQuery } from '@tanstack/react-query';
import { getMaterials } from '@/lib/supabase/services';
import type { Material } from '@/lib/types';

export function useMaterials(filters: [string, string, unknown][] = []) {
  return useQuery({
    queryKey: ['materials', JSON.stringify(filters)],
    queryFn: () => getMaterials(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}