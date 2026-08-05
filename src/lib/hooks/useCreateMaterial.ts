import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMaterial } from '@/lib/supabase/services';
import type { Material } from '@/lib/types';

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMaterial,
    onMutate: async (newMaterial) => {
      await queryClient.cancelQueries({ queryKey: ['materials'] });
      const previousMaterials = queryClient.getQueryData(['materials']);
      queryClient.setQueryData(['materials'], (old: Material[] = []) => [
        ...old,
        newMaterial,
      ]);
      return { previousMaterials };
    },
    onError: (err, newMaterial, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(['materials'], context.previousMaterials);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}