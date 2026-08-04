import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCustomer } from '@/lib/supabase/services';

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<any> }) => updateCustomer(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previousCustomers = queryClient.getQueryData(['customers']);
      queryClient.setQueryData(['customers'], (old: any[] = []) =>
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