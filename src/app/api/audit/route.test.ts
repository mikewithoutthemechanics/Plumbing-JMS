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

describe('/api/audit route', () => {
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
    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'profiles', action: 'INSERT' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not owner', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'profiles', action: 'INSERT' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns 400 for invalid table name', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'invalid_table', action: 'INSERT' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid table name' });
  });

  it('returns 400 for invalid action', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'profiles', action: 'INVALID' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid action' });
  });

  it('inserts audit log and returns 201 on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = { data: { id: 'audit-1' }, error: null };

    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'profiles', record_id: '1', action: 'INSERT', new_values: { name: 'Test' } }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: 'profiles',
        action: 'INSERT',
        changed_by: 'user-id',
      })
    );
  });

  it('returns 500 on insert error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    resolveData = { data: null, error: { message: 'Insert failed' } };

    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      body: JSON.stringify({ table_name: 'profiles', record_id: '1', action: 'INSERT' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to log audit' });
  });
});
