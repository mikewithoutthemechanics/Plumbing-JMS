import { describe, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteJob } from './useDeleteJob';
import { deleteJob } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedDeleteJob = deleteJob as unknown as MockedFunction<typeof deleteJob>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useDeleteJob hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns mutation object', () => {
    const { result } = renderHook(() => useDeleteJob(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });

  test('mutates successfully', async () => {
    mockedDeleteJob.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteJob(), { wrapper: createWrapper() });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedDeleteJob).toHaveBeenCalledWith('1');
  });

  test('rolls back on error', async () => {
    mockedDeleteJob.mockRejectedValueOnce(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteJob(), { wrapper: createWrapper() });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
