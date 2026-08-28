import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/procurement route', () => {
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
    b.in = vi.fn().mockReturnThis();
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
    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({ items: [{ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is neither owner nor technician', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'accountant' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({ items: [{ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 on validation errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('At least one item is required');
  });

  it('returns 400 for missing items', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
      expect(json.error).toContain('items');
  });

  it('returns 200 with procurement messages on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Pipe',
          unit: 'm',
          supplier_id: '123e4567-e89b-12d3-a456-426614174001',
          suppliers: { name: 'Supplier A', email: 'a@test.com', phone: '123' },
        },
      ],
      error: null,
    };

    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({ items: [{ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 5 }] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.messages).toHaveLength(1);
    expect(json.messages[0].supplier).toBe('Supplier A');
  });

  it('groups custom items under Custom Order', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = { data: [], error: null };

    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: JSON.stringify({ items: [{ custom_name: 'Custom Widget', quantity: 3 }] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages[0].supplier).toBe('Custom Order');
  });

  it('returns 400 on invalid request body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/procurement', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
