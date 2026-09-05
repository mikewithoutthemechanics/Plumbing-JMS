import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateMaterial } from './useUpdateMaterial';
import { updateMaterial } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedUpdateMaterial = updateMaterial as unknown as MockedFunction<typeof updateMaterial>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useUpdateMaterial hook', () => {
  const existingMaterials = [
    { id: '1', name: 'Pipe', admin_unit_price: 10 },
    { id: '2', name: 'Valve', admin_unit_price: 20 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useUpdateMaterial(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('updates material optimistically', async () => {
    mockedUpdateMaterial.mockResolvedValueOnce({ id: '1', name: 'Pipe Updated' });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['materials'], existingMaterials);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateMaterial(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'Pipe Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const materials = queryClient.getQueryData(['materials']) as any[];
    expect(materials[0].name).toBe('Pipe Updated');
    expect(materials[1].name).toBe('Valve');
  });

  test('reverts optimistic update on error', async () => {
    mockedUpdateMaterial.mockRejectedValueOnce(new Error('Update failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['materials'], existingMaterials);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateMaterial(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'Pipe Updated' } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const materials = queryClient.getQueryData(['materials']) as any[];
    expect(materials[0].name).toBe('Pipe');
  });

  test('invalidates materials query on settled', async () => {
    mockedUpdateMaterial.mockResolvedValueOnce({ id: '1', name: 'Pipe Updated' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateMaterial(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'Pipe Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['materials'] }));
  });
});
