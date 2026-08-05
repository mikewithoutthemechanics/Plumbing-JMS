import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer } from '@/lib/supabase/services';
import type { Customer } from '@/lib/types';

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onMutate: async (newCustomer) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previousCustomers = queryClient.getQueryData(['customers']);
      queryClient.setQueryData(['customers'], (old: Customer[] = []) => [
        ...old,
        newCustomer,
      ]);
      return { previousCustomers };
    },
    onError: (err, newCustomer, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}