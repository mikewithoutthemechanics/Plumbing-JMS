import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob } from '@/lib/supabase/services';

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJob,
    onMutate: async (newJob) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);
      queryClient.setQueryData(['jobs'], (old: any[] = []) => [...old, newJob]);
      return { previousJobs };
    },
    onError: (err, newJob, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}