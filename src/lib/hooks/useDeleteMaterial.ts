import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMaterial } from '@/lib/supabase/services';

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['materials'] });
      const previousMaterials = queryClient.getQueryData(['materials']);
      queryClient.setQueryData(['materials'], (old: any[] = []) =>
        old.filter(material => material.id !== id)
      );
      return { previousMaterials };
    },
    onError: (err, id, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(['materials'], context.previousMaterials);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}