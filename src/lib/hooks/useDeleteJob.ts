import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteJob } from '@/lib/supabase/services';

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);
      queryClient.setQueryData(['jobs'], (old: any[] = []) =>
        old.filter(job => job.id !== id)
      );
      return { previousJobs };
    },
    onError: (err, id, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}