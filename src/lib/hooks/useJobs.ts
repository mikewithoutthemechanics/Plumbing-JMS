import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/supabase/services';

function stableStringify(value: unknown): string {
  const cache = new WeakMap();
  const seen = new Set<string>();
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object') {
      if (cache.has(val)) return cache.get(val) as string;
      const id = '[ref_' + seen.size + ']';
      seen.add(id);
      cache.set(val, id);
      return val;
    }
    return val;
  });
}

export function useJobs(filters: [string, string, unknown][] = []) {
  return useQuery({
    queryKey: ['jobs', stableStringify(filters)],
    queryFn: () => getJobs(filters),
    staleTime: 1000 * 60 * 5,
  });
}