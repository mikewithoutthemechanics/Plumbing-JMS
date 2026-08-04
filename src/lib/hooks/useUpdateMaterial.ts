import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMaterial } from '@/lib/supabase/services';

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<any> }) => updateMaterial(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: ['materials'] });
      const previousMaterials = queryClient.getQueryData(['materials']);
      queryClient.setQueryData(['materials'], (old: any[] = []) =>
        old.map(material => (material.id === id ? { ...material, ...changes } : material))
      );
      return { previousMaterials };
    },
    onError: (err, variables, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(['materials'], context.previousMaterials);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}