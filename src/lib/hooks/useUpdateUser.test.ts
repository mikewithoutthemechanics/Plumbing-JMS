import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateUser } from './useUpdateUser';
import { updateUser } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedUpdateUser = updateUser as unknown as MockedFunction<typeof updateUser>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useUpdateUser hook', () => {
  const existingUsers = [
    { id: '1', email: 'user1@test.com', full_name: 'User One', role: 'technician' },
    { id: '2', email: 'user2@test.com', full_name: 'User Two', role: 'accountant' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('updates user optimistically', async () => {
    mockedUpdateUser.mockResolvedValueOnce({ id: '1', full_name: 'User One Updated' });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['users'], existingUsers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateUser(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { full_name: 'User One Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const users = queryClient.getQueryData(['users']) as any[];
    expect(users[0].full_name).toBe('User One Updated');
    expect(users[1].full_name).toBe('User Two');
  });

  test('reverts optimistic update on error', async () => {
    mockedUpdateUser.mockRejectedValueOnce(new Error('Update failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['users'], existingUsers);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateUser(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { full_name: 'User One Updated' } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const users = queryClient.getQueryData(['users']) as any[];
    expect(users[0].full_name).toBe('User One');
  });

  test('invalidates users query on settled', async () => {
    mockedUpdateUser.mockResolvedValueOnce({ id: '1', full_name: 'User One Updated' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUpdateUser(), { wrapper: Wrapper });
    result.current.mutate({ id: '1', changes: { full_name: 'User One Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] }));
  });
});
