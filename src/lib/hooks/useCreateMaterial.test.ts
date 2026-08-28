import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateMaterial } from './useCreateMaterial';
import { createMaterial } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedCreateMaterial = createMaterial as unknown as MockedFunction<typeof createMaterial>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useCreateMaterial hook', () => {
  const newMaterial = { id: '1', name: 'Pipe', unit: 'm', admin_unit_price: 10, quantity_on_hand: 100 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('creates material successfully', async () => {
    mockedCreateMaterial.mockResolvedValueOnce(newMaterial);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate(newMaterial);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newMaterial);
  });

  test('reverts optimistic update on error', async () => {
    mockedCreateMaterial.mockRejectedValueOnce(new Error('Create failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['materials'], [{ id: 'existing', name: 'Valve' }]);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: Wrapper });
    result.current.mutate(newMaterial);

    await waitFor(() => expect(result.current.isError).toBe(true));

    const materials = queryClient.getQueryData(['materials']) as any[];
    expect(materials).toHaveLength(1);
    expect(materials[0].id).toBe('existing');
  });

  test('invalidates materials query on settled', async () => {
    mockedCreateMaterial.mockResolvedValueOnce(newMaterial);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: Wrapper });
    result.current.mutate(newMaterial);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['materials'] }));
  });
});
