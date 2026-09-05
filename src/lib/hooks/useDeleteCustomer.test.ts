import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteCustomer } from './useDeleteCustomer';
import { deleteCustomer } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedDeleteCustomer = deleteCustomer as unknown as MockedFunction<typeof deleteCustomer>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useDeleteCustomer hook', () => {
  const existingCustomers = [
    { id: '1', name: 'John' },
    { id: '2', name: 'Jane' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('deletes customer optimistically', async () => {
    mockedDeleteCustomer.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['customers'], existingCustomers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const customers = queryClient.getQueryData(['customers']) as any[];
    expect(customers).toHaveLength(1);
    expect(customers[0].id).toBe('2');
  });

  test('reverts optimistic update on error', async () => {
    mockedDeleteCustomer.mockRejectedValueOnce(new Error('Delete failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['customers'], existingCustomers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    const customers = queryClient.getQueryData(['customers']) as any[];
    expect(customers).toHaveLength(2);
  });

  test('invalidates customers query on settled', async () => {
    mockedDeleteCustomer.mockResolvedValueOnce(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] }));
  });
});
