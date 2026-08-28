import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateJob } from '@/lib/hooks/useCreateJob';
import { createJob } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedCreateJob = createJob as unknown as MockedFunction<typeof createJob>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useCreateJob hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useCreateJob(), { wrapper });
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.variables).toBeUndefined();
  });

  it('creates job successfully with optimistic update', async () => {
    mockedCreateJob.mockResolvedValue({ id: '1', description: 'Fix leak', job_number: 'JOB-1' });

    const { result } = renderHook(() => useCreateJob(), { wrapper });

    result.current.mutate({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'Fix leak', admin_hourly_rate: 150 });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual({ id: '1', description: 'Fix leak', job_number: 'JOB-1' });
    expect(mockedCreateJob).toHaveBeenNthCalledWith(1, expect.objectContaining({ description: 'Fix leak' }));
  });

  it('handles creation error', async () => {
    mockedCreateJob.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useCreateJob(), { wrapper });

    result.current.mutate({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'Fix leak', admin_hourly_rate: 150 });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('DB error');
  });
});
