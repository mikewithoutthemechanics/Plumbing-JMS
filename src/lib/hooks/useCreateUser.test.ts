import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateUser } from './useCreateUser';
import { createUser } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedCreateUser = createUser as unknown as MockedFunction<typeof createUser>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useCreateUser hook', () => {
  const newUser = { id: '1', email: 'user@test.com', full_name: 'User', role: 'technician' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  test('creates user successfully', async () => {
    mockedCreateUser.mockResolvedValueOnce(newUser);

    const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
    result.current.mutate(newUser);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newUser);
  });

  test('reverts optimistic update on error', async () => {
    mockedCreateUser.mockRejectedValueOnce(new Error('Create failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData(['users'], [{ id: 'existing', email: 'existing@test.com' }]);

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateUser(), { wrapper: Wrapper });
    result.current.mutate(newUser);

    await waitFor(() => expect(result.current.isError).toBe(true));

    const users = queryClient.getQueryData(['users']) as any[];
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('existing');
  });

  test('invalidates users query on settled', async () => {
    mockedCreateUser.mockResolvedValueOnce(newUser);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateUser(), { wrapper: Wrapper });
    result.current.mutate(newUser);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] }));
  });
});
