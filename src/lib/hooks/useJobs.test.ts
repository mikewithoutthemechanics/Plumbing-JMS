import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from './useJobs';
import { getJobs } from '@/lib/supabase/services';

// Mock the getJobs function (auto-mock)
vi.mock('@/lib/supabase/services');

const mockedGetJobs = getJobs as unknown as MockedFunction<typeof getJobs>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useJobs hook', () => {
  const mockJobs: any[] = [
    { id: '1', job_number: 'JOB-001', description: 'Fix leaky faucet', status: 'assigned' },
    { id: '2', job_number: 'JOB-002', description: 'Install new toilet', status: 'completed' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial state', () => {
    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('fetches jobs successfully', async () => {
    mockedGetJobs.mockResolvedValueOnce(mockJobs);

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockJobs);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('handles error when fetching jobs fails', async () => {
    // Mock the getJobs function to reject (getJobs throws on error, matches services contract)
    mockedGetJobs.mockRejectedValueOnce(new Error('Failed to fetch jobs'));

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  test('refetches when filters change', async () => {
    mockedGetJobs.mockResolvedValueOnce(mockJobs);

    const { result, rerender } = renderHook(({ filters }) => useJobs(filters), {
      wrapper: createWrapper(),
      initialProps: { filters: [] as [string, string, unknown][] },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockJobs);

    mockedGetJobs.mockResolvedValueOnce(mockJobs);

    rerender({ filters: [['status', 'eq', 'completed']] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetJobs).toHaveBeenCalledWith([['status', 'eq', 'completed']]);
  });
});
