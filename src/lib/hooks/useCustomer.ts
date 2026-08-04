import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '@/lib/supabase/services';
import type { Customer } from '@/lib/types';

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}