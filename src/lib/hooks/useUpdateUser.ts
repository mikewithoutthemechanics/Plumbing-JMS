import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '@/lib/supabase/services';
import type { User } from '@/lib/types';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<User> }) => updateUser(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old: User[] = []) =>
        old.map(user => (user.id === id ? { ...user, ...changes } : user))
      );
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}