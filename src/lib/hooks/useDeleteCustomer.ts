import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCustomer } from '@/lib/supabase/services';

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previousCustomers = queryClient.getQueryData(['customers']);
      queryClient.setQueryData(['customers'], (old: any[] = []) =>
        old.filter(customer => customer.id !== id)
      );
      return { previousCustomers };
    },
    onError: (err, id, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}