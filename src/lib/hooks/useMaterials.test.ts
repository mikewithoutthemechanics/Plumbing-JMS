import { describe, test, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMaterials } from './useMaterials';
import { getMaterials } from '@/lib/supabase/services';

vi.mock('@/lib/supabase/services');

const mockedGetMaterials = getMaterials as unknown as MockedFunction<typeof getMaterials>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useMaterials hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns initial loading state', () => {
    const { result } = renderHook(() => useMaterials(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  test('fetches materials successfully', async () => {
    mockedGetMaterials.mockResolvedValueOnce([
      { id: '1', name: 'Pipe', admin_unit_price: 10 },
    ] as any);

    const { result } = renderHook(() => useMaterials(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(1);
    expect(mockedGetMaterials).toHaveBeenCalledWith([]);
  });

  test('fetches materials with filters', async () => {
    mockedGetMaterials.mockResolvedValueOnce([
      { id: '1', name: 'Pipe', admin_unit_price: 10 },
    ] as any);

    const { result } = renderHook(() => useMaterials([['is_active', 'eq', true]]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetMaterials).toHaveBeenCalledWith([['is_active', 'eq', true]]);
  });

  test('handles error when fetching materials fails', async () => {
    mockedGetMaterials.mockRejectedValueOnce(new Error('Failed to fetch materials'));

    const { result } = renderHook(() => useMaterials(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
