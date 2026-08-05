import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '@/lib/supabase/services';
import type { User } from '@/lib/types';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old: User[] = []) => [
        ...old,
        newUser,
      ]);
      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}