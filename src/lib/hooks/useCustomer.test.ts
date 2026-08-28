import { describe, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomer } from './useCustomer';
import { getCustomer } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedGetCustomer = getCustomer as unknown as MockedFunction<typeof getCustomer>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useCustomer hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial loading state', () => {
    const { result } = renderHook(() => useCustomer('1'), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  test('fetches customer successfully', async () => {
    mockedGetCustomer.mockResolvedValueOnce({ id: '1', name: 'John', email: 'john@test.com' } as any);

    const { result } = renderHook(() => useCustomer('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('John');
    expect(mockedGetCustomer).toHaveBeenCalledWith('1');
  });

  test('handles error when fetching customer fails', async () => {
    mockedGetCustomer.mockRejectedValueOnce(new Error('Failed to fetch customer'));

    const { result } = renderHook(() => useCustomer('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
