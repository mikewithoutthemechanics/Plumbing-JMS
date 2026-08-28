import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateCustomer } from './useUpdateCustomer';
import { updateCustomer } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedUpdateCustomer = updateCustomer as unknown as MockedFunction<typeof updateCustomer>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useUpdateCustomer hook', () => {
  const existingCustomers = [
    { id: '1', name: 'John', email: 'john@test.com' },
    { id: '2', name: 'Jane', email: 'jane@test.com' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('updates customer optimistically', async () => {
    mockedUpdateCustomer.mockResolvedValueOnce({ id: '1', name: 'John Updated' });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['customers'], existingCustomers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'John Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const customers = queryClient.getQueryData(['customers']) as any[];
    expect(customers[0].name).toBe('John Updated');
    expect(customers[1].name).toBe('Jane');
  });

  test('reverts optimistic update on error', async () => {
    mockedUpdateCustomer.mockRejectedValueOnce(new Error('Update failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['customers'], existingCustomers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'John Updated' } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const customers = queryClient.getQueryData(['customers']) as any[];
    expect(customers[0].name).toBe('John');
  });

  test('invalidates customers query on settled', async () => {
    mockedUpdateCustomer.mockResolvedValueOnce({ id: '1', name: 'John Updated' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { name: 'John Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] }));
  });
});
