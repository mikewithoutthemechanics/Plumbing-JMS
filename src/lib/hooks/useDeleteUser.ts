import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUser } from '@/lib/supabase/services';

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old: any[] = []) =>
        old.filter(user => user.id !== id)
      );
      return { previousUsers };
    },
    onError: (err, id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}