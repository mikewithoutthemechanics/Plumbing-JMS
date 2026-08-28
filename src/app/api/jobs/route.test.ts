import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PATCH, DELETE } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/jobs route', () => {
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
    b.update = vi.fn().mockReturnThis();
    b.delete = vi.fn().mockReturnThis();
    b.in = vi.fn().mockReturnThis();
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

      const req = new NextRequest('http://localhost:3000/api/jobs');
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns jobs for owner with optional status filter', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: [{ id: '1', status: 'pending' }], error: null };

      const req = new NextRequest('http://localhost:3000/api/jobs?status=pending');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.jobs).toEqual([{ id: '1', status: 'pending' }]);
    });

    it('filters jobs for technician by technicianId', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      resolveData = { data: [{ id: '1', assigned_to: 'tech-id', status: 'assigned' }], error: null };

      const req = new NextRequest('http://localhost:3000/api/jobs?technicianId=tech-id');
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(builder.eq).toHaveBeenCalledWith('assigned_to', 'tech-id');
    });

    it('sanitizes pricing for non-owner roles', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      resolveData = {
        data: [{ id: '1', status: 'assigned', assigned_to: 'user-id', admin_hourly_rate: 100, labour_cost: 50, materials_cost: 20, subtotal: 70, vat_amount: 10.5, grand_total: 80.5 }],
        error: null,
      };

      const req = new NextRequest('http://localhost:3000/api/jobs');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.jobs[0].admin_hourly_rate).toBeNull();
      expect(json.jobs[0].labour_cost).toBeNull();
    });

    it('returns 500 on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: null, error: { message: 'DB error' } };

      const req = new NextRequest('http://localhost:3000/api/jobs');
      const res = await GET(req);

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'DB error' });
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: '1', description: 'test', admin_hourly_rate: 100 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: '1', description: 'test', admin_hourly_rate: 100 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it('returns 400 for missing required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: '1' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing required fields' });
    });

    it('returns 400 on validation errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: 'not-a-uuid', description: 'test', admin_hourly_rate: 100 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid customer ID');
    });

    it('creates job and returns 201 on success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: 'job-1', job_number: 'JOB-123' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'Fix leak', admin_hourly_rate: 150 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.job.id).toBe('job-1');
    });

    it('auto-assigns to least busy technician when none provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = {
        data: [
          { id: 'tech-1', full_name: 'Alice' },
          { id: 'tech-2', full_name: 'Bob' },
        ],
        error: null,
      };
      singleMock.mockResolvedValueOnce({
        data: [
          { assigned_to: 'tech-2' },
        ],
        error: null,
      });
      singleMock.mockResolvedValueOnce({ data: { id: 'job-1' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'Fix leak', admin_hourly_rate: 150 }),
      });
      await POST(req);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_to: 'tech-1' })
      );
    });

    it('returns 400 on invalid request body', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: 'not json',
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1' }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1' }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(403);
    });

    it('returns 400 for missing job_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing job_id' });
    });

    it('returns 404 when job not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1' }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid state transition', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'invoiced' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1', status: 'pending' }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Invalid state transition' });
    });

    it('updates job and returns 200 on success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'pending', description: 'old' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'assigned', description: 'old' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1', status: 'assigned' }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.job.status).toBe('assigned');
    });

    it('sets completed_at when status changes to completed', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'assigned' }, error: null });
      resolveData = { data: { id: '1', status: 'completed' }, error: null };

      const req = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'PATCH',
        body: JSON.stringify({ job_id: '1', status: 'completed' }),
      });
      await PATCH(req);

      const updateCall = builder.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('completed_at');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const req = new NextRequest('http://localhost:3000/api/jobs?id=1');
      const res = await DELETE(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs?id=1');
      const res = await DELETE(req);

      expect(res.status).toBe(403);
    });

    it('returns 400 for missing job id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs');
      const res = await DELETE(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing job id' });
    });

    it('returns 404 when job not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: null, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs?id=1');
      const res = await DELETE(req);

      expect(res.status).toBe(404);
    });

    it('returns 400 when job is not pending', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'assigned' }, error: null });

      const req = new NextRequest('http://localhost:3000/api/jobs?id=1');
      const res = await DELETE(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Can only delete pending jobs' });
    });

    it('deletes pending job and returns 200', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      singleMock.mockResolvedValueOnce({ data: { id: '1', status: 'pending' }, error: null });
      resolveData = { data: null, error: null };

      const req = new NextRequest('http://localhost:3000/api/jobs?id=1');
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });
});
