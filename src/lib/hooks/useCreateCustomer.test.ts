import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateCustomer } from './useCreateCustomer';
import { createCustomer } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedCreateCustomer = createCustomer as unknown as MockedFunction<typeof createCustomer>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useCreateCustomer hook', () => {
  const newCustomer = { id: '1', name: 'John Doe', email: 'john@test.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('creates customer successfully', async () => {
    mockedCreateCustomer.mockResolvedValueOnce(newCustomer);

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });
    result.current.mutate(newCustomer);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newCustomer);
  });

  test('reverts optimistic update on error', async () => {
    mockedCreateCustomer.mockRejectedValueOnce(new Error('Create failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['customers'], [{ id: 'existing', name: 'Jane' }]);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: Wrapper });
    result.current.mutate(newCustomer);

    await waitFor(() => expect(result.current.isError).toBe(true));

    const customers = queryClient.getQueryData(['customers']) as any[];
    expect(customers).toHaveLength(1);
    expect(customers[0].id).toBe('existing');
  });

  test('invalidates customers query on settled', async () => {
    mockedCreateCustomer.mockResolvedValueOnce(newCustomer);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: Wrapper });
    result.current.mutate(newCustomer);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] }));
  });
});
