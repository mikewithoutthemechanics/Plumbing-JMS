import { describe, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJob } from './useJob';
import { getJob } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedGetJob = getJob as unknown as MockedFunction<typeof getJob>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useJob hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial loading state', () => {
    const { result } = renderHook(() => useJob('1'), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  test('fetches job successfully', async () => {
    mockedGetJob.mockResolvedValueOnce({ id: '1', job_number: 'JOB-001', description: 'Test' } as any);

    const { result } = renderHook(() => useJob('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('1');
    expect(mockedGetJob).toHaveBeenCalledWith('1');
  });

  test('handles error when fetching job fails', async () => {
    mockedGetJob.mockRejectedValueOnce(new Error('Failed to fetch job'));

    const { result } = renderHook(() => useJob('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
