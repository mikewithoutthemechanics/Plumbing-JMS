import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PATCH } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/invoices route', () => {
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
    b.maybeSingle = singleMock;
    b.single = singleMock;
    b.insert = vi.fn().mockReturnThis();
    b.update = vi.fn().mockReturnThis();
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
      const req = new NextRequest('http://localhost:3000/api/invoices');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is neither owner nor accountant', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices');
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('returns invoices list with customer filter', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: [{ id: '1', invoice_number: 'INV-1', customer_id: 'c1' }], error: null };

      const req = new NextRequest('http://localhost:3000/api/invoices?customerId=c1');
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(builder.eq).toHaveBeenCalledWith('customer_id', 'c1');
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner or accountant', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 on validation errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: 'bad-id' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 404 when job not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Job not found' });
    });

    it('returns 400 when invoice already exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'existing' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Invoice already exists for this job' });
    });

    it('creates invoice and returns 201 on success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000', grand_total: 100, vat_amount: 15, subtotal: 85 }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'inv-1', invoice_number: 'INV-240101-abc' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.invoice.id).toBe('inv-1');
    });
  });

  describe('PATCH', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ invoice_id: '1', amount: 50 }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner or accountant', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ invoice_id: '1', amount: 50 }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it('returns 404 when invoice not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });
      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ invoice_id: '1', amount: 50 }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });

    it('records payment and updates invoice status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000', amount_due: 100, amount_paid: 0, customer_id: 'c1' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'pay-1' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000', status: 'partial', amount_paid: 50 }, error: null });

      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ invoice_id: '1', amount: 50 }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invoice.status).toBe('partial');
    });

    it('marks invoice as paid when fully paid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000', amount_due: 100, amount_paid: 50, customer_id: 'c1' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'pay-2' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '123e4567-e89b-12d3-a456-426614174000', status: 'paid', amount_paid: 100, paid_at: expect.any(String) }, error: null });

      const req = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ invoice_id: '1', amount: 50 }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invoice.status).toBe('paid');
    });
  });
});
