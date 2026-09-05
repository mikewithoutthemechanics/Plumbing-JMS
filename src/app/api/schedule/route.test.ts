import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/schedule route', () => {
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
    b.gte = vi.fn().mockReturnThis();
    b.lte = vi.fn().mockReturnThis();
    b.order = vi.fn().mockReturnThis();
    b.insert = vi.fn().mockReturnThis();
    b.upsert = vi.fn().mockReturnThis();
    b.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(resolveData);
    builder = b;
    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => builder),
    };
    mockGetSupabaseServerClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseServerClient>>);
    mockGetSupabaseAdminClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseAdminClient>>);
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns schedule for next 30 days', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      resolveData = { data: [{ id: '1', date: '2024-06-15', status: 'available', profiles: { full_name: 'Tech', role: 'technician' } }], error: null };

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ schedule: [{ id: '1', date: '2024-06-15', status: 'available', profiles: { full_name: 'Tech', role: 'technician' } }] });
    });

    it('returns 500 on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      resolveData = { data: null, error: { message: 'DB error' } };

      const res = await GET();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'DB error' });
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ profile_id: '1', date: '2024-06-15', status: 'available' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ profile_id: '1', date: '2024-06-15', status: 'available' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('upserts schedule entry and returns 200', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'sched-1', profile_id: '1', date: '2024-06-15', status: 'available' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ profile_id: '1', date: '2024-06-15', status: 'available', notes: 'On site' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ schedule: { id: 'sched-1', profile_id: '1', date: '2024-06-15', status: 'available' } });
    });

    it('returns 500 on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const req = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ profile_id: '1', date: '2024-06-15', status: 'available' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'DB error' });
    });
  });
});
