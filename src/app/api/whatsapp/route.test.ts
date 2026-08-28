import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT, POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/whatsapp route', () => {
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
    b.order = vi.fn().mockReturnThis();
    b.maybeSingle = singleMock;
    b.update = vi.fn().mockReturnThis();
    b.insert = vi.fn().mockReturnThis();
    b.limit = vi.fn().mockReturnThis();
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

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it('returns config for owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', base_url: 'http://wa', enabled: true }, error: null });

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ config: { id: '1', base_url: 'http://wa', enabled: true } });
    });
  });

  describe('PUT', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'PUT',
        body: JSON.stringify({ base_url: 'http://wa', enabled: true }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'PUT',
        body: JSON.stringify({ base_url: 'http://wa', enabled: true }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(403);
    });

    it('updates existing config', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'existing' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'existing', base_url: 'http://wa2' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'PUT',
        body: JSON.stringify({ base_url: 'http://wa2', enabled: false }),
      });
      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ config: { id: 'existing', base_url: 'http://wa2' } });
    });

    it('inserts new config when none exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'new', base_url: 'http://wa' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'PUT',
        body: JSON.stringify({ base_url: 'http://wa', enabled: true }),
      });
      const res = await PUT(req);

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ config: { id: 'new', base_url: 'http://wa' } });
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner or accountant', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing invoice_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing invoice_id' });
    });

    it('returns 404 when invoice not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });

      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Invoice not found' });
    });

    it('returns 400 when WhatsApp not configured', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', customer_id: 'c1', customers: { name: 'John' } }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });

      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'WhatsApp not configured' });
    });

    it('returns 400 when customer has no phone', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', customer_id: 'c1', customers: { name: 'John' } }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', enabled: true, reminder_template: 'Hi' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Customer has no phone number' });
    });
  });
});
