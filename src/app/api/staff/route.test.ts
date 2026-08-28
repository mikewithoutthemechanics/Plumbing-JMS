import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, DELETE } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockCreateClient =
  createClient as unknown as MockedFunction<typeof createClient>;

describe('/api/staff route', () => {
  let singleMock: ReturnType<typeof vi.fn>;
  let resolveData: { data: unknown; error: unknown };
  let builder: Record<string, ReturnType<typeof vi.fn>>;
  let mockSupabase: {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };
  let mockAdminClient: {
    auth: { admin: { createUser: ReturnType<typeof vi.fn>; deleteUser: ReturnType<typeof vi.fn> } };
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
    mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    };
    mockGetSupabaseServerClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseServerClient>>);
    mockCreateClient.mockReturnValue(mockAdminClient as unknown as Awaited<ReturnType<typeof createClient>>);
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

    it('returns staff list for owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: [{ id: '1', email: 'tech@test.com', full_name: 'Tech', role: 'technician' }], error: null };

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ staff: [{ id: '1', email: 'tech@test.com', full_name: 'Tech', role: 'technician' }] });
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
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', full_name: 'Test', role: 'technician' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', full_name: 'Test', role: 'technician' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Email, full name, and role are required' });
    });

    it('returns 400 for invalid role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', full_name: 'Test', role: 'admin' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Invalid role' });
    });

    it('creates staff and returns 201 on success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      mockAdminClient.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: 'new-user-id', email: 'test@test.com' } },
        error: null,
      });
      singleMock.mockResolvedValueOnce({
        data: { id: 'new-user-id', email: 'test@test.com', full_name: 'Test', role: 'technician' },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', full_name: 'Test', role: 'technician' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.staff.email).toBe('test@test.com');
    });

    it('returns 400 on auth error during user creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      mockAdminClient.auth.admin.createUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already registered' },
      });

      const req = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', full_name: 'Test', role: 'technician' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Email already registered' });
    });
  });

  describe('DELETE', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/staff?id=1');
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff?id=1');
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing staff id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff');
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing staff id' });
    });

    it('returns 400 when trying to delete self', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/staff?id=user-id');
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Cannot delete yourself' });
    });

    it('deletes staff and returns 200 on success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValueOnce({ data: null, error: null });

      const req = new NextRequest('http://localhost:3000/api/staff?id=other-id');
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});
