import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteMaterial } from './useDeleteMaterial';
import { deleteMaterial } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedDeleteMaterial = deleteMaterial as unknown as MockedFunction<typeof deleteMaterial>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useDeleteMaterial hook', () => {
  const existingMaterials = [
    { id: '1', name: 'Pipe' },
    { id: '2', name: 'Valve' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useDeleteMaterial(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('deletes material optimistically', async () => {
    mockedDeleteMaterial.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['materials'], existingMaterials);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteMaterial(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const materials = queryClient.getQueryData(['materials']) as any[];
    expect(materials).toHaveLength(1);
    expect(materials[0].id).toBe('2');
  });

  test('reverts optimistic update on error', async () => {
    mockedDeleteMaterial.mockRejectedValueOnce(new Error('Delete failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['materials'], existingMaterials);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteMaterial(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    const materials = queryClient.getQueryData(['materials']) as any[];
    expect(materials).toHaveLength(2);
  });

  test('invalidates materials query on settled', async () => {
    mockedDeleteMaterial.mockResolvedValueOnce(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteMaterial(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['materials'] }));
  });
});
