import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateJob } from '@/lib/supabase/services';

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<any> }) => updateJob(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);
      queryClient.setQueryData(['jobs'], (old: any[] = []) =>
        old.map(job => (job.id === id ? { ...job, ...changes } : job))
      );
      return { previousJobs };
    },
    onError: (err, variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}