import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/debtors route', () => {
  let singleMock: ReturnType<typeof vi.fn>;
  let resolveData: { data: unknown; error: unknown };
  let builder: Record<string, ReturnType<typeof vi.fn>>;
  let mockSupabase: {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    singleMock = vi.fn();
    singleMock.mockReturnValue({ data: null, error: null });
    resolveData = { data: null, error: null };
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn().mockReturnThis();
    b.eq = vi.fn().mockReturnThis();
    b.single = singleMock;
    b.gt = vi.fn().mockReturnThis();
    b.order = vi.fn().mockReturnThis();
    b.insert = vi.fn().mockReturnThis();
    b.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(resolveData);
    builder = b;
    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => builder),
    };
    mockGetSupabaseServerClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseServerClient>>);
    mockGetSupabaseAdminClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseAdminClient>>);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is neither owner nor accountant', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns debtors list with total for owner', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = { data: [{ id: '1', name: 'Customer A', outstanding: 1000 }, { id: '2', name: 'Customer B', outstanding: 500 }], error: null };

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.debtors).toHaveLength(2);
    expect(json.totalOutstanding).toBe(1500);
  });

  it('returns 500 on database error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = { data: null, error: { message: 'DB error' } };

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'DB error' });
  });

  it('allows accountant access', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'accountant' }, error: null });
    resolveData = { data: [], error: null };

    const res = await GET();
    expect(res.status).toBe(200);
  });
});
