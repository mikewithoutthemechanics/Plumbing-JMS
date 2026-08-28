import { describe, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateJob } from './useUpdateJob';
import { updateJob } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedUpdateJob = updateJob as unknown as MockedFunction<typeof updateJob>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useUpdateJob hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns mutation object', () => {
    const { result } = renderHook(() => useUpdateJob(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });

  test('mutates successfully', async () => {
    mockedUpdateJob.mockResolvedValueOnce({ id: '1', job_number: 'JOB-001', description: 'Updated' } as any);

    const { result } = renderHook(() => useUpdateJob(), { wrapper: createWrapper() });

    result.current.mutate({ id: '1', changes: { description: 'Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedUpdateJob).toHaveBeenCalledWith('1', { description: 'Updated' });
  });

  test('rolls back on error', async () => {
    mockedUpdateJob.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateJob(), { wrapper: createWrapper() });

    result.current.mutate({ id: '1', changes: { description: 'Updated' } });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
