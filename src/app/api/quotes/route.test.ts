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

describe('/api/quotes route', () => {
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
    b.insert = vi.fn().mockReturnThis();
    b.order = vi.fn().mockReturnThis();
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
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const res = await GET();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Forbidden' });
    });

    it('returns quotes list for owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: [{ id: '1', customer_name: 'John', description: 'Fix tap' }], error: null };

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ quotes: [{ id: '1', customer_name: 'John', description: 'Fix tap' }] });
    });

    it('returns empty array when no quotes exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: null, error: null };

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ quotes: [] });
    });

    it('returns 500 on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: null, error: { message: 'DB error' } };

      const res = await GET();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'DB error' });
    });
  });

  describe('POST', () => {
    it('creates a quote and returns 201', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { id: 'quote-1', customer_name: 'John', description: 'Fix tap', status: 'pending' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ customer_name: 'John', description: 'Fix tap' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.quote.id).toBe('quote-1');
    });

    it('logs audit when user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { id: 'quote-1' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ customer_name: 'John', description: 'Fix tap' }),
      });
      await POST(req);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ customer_name: 'John', status: 'pending' })
      );
    });

    it('returns 500 on insert error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

      const req = new NextRequest('http://localhost:3000/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ customer_name: 'John', description: 'Fix tap' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Insert failed' });
    });
  });
});
