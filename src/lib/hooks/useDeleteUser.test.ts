import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteUser } from './useDeleteUser';
import { deleteUser } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedDeleteUser = deleteUser as unknown as MockedFunction<typeof deleteUser>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useDeleteUser hook', () => {
  const existingUsers = [
    { id: '1', email: 'user1@test.com' },
    { id: '2', email: 'user2@test.com' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('deletes user optimistically', async () => {
    mockedDeleteUser.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['users'], existingUsers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteUser(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const users = queryClient.getQueryData(['users']) as any[];
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('2');
  });

  test('reverts optimistic update on error', async () => {
    mockedDeleteUser.mockRejectedValueOnce(new Error('Delete failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['users'], existingUsers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteUser(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    const users = queryClient.getQueryData(['users']) as any[];
    expect(users).toHaveLength(2);
  });

  test('invalidates users query on settled', async () => {
    mockedDeleteUser.mockResolvedValueOnce(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteUser(), { wrapper: Wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] }));
  });
});
