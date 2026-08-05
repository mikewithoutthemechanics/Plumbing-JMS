import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCustomer } from '@/lib/supabase/services';
import type { Customer } from '@/lib/types';

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Customer> }) => updateCustomer(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previousCustomers = queryClient.getQueryData(['customers']);
      queryClient.setQueryData(['customers'], (old: Customer[] = []) =>
        old.map(customer => (customer.id === id ? { ...customer, ...changes } : customer))
      );
      return { previousCustomers };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}