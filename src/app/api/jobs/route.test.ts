/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/utils/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/notifications/service', () => ({
  processJobAssignedNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { getSupabaseServerClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient = getSupabaseServerClient as unknown as ReturnType<typeof vi.fn>;

function createJobBuilder() {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  // thenable for `await query`
  builder.then = (onFulfilled: any) => Promise.resolve({ data: [], error: null }).then(onFulfilled);
  return builder;
}

describe('/api/jobs GET — Phase 1 guards', () => {
  let jobBuilder: any;

  beforeEach(() => {
    jobBuilder = createJobBuilder();
    const profileBuilder: any = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'technician' }, error: null }),
        }),
      }),
    };

    const mockSupabase: any = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'tech-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'job_cards') return jobBuilder;
        // fallback for any other table (customer join etc. not executed due to early returns)
        return jobBuilder;
      }),
    };
    mockGetSupabaseServerClient.mockResolvedValue(mockSupabase);
  });

  it('403 when technician queries other technicianId', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?technicianId=other-tech-id');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/cannot query other technician/i);
  });

  it('200 when technician queries own technicianId', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?technicianId=tech-1');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('400 when limit out of range', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?limit=200');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/limit must be an integer 1-100/i);
  });

  it('400 when limit is not integer', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?limit=abc');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('400 when offset negative', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?limit=10&offset=-1');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/offset must be an integer/i);
  });

  it('200 and calls range when limit/offset valid', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?limit=10&offset=5');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(jobBuilder.range).toHaveBeenCalledWith(5, 14);
  });

  it('200 without limit does not call range', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(jobBuilder.range).not.toHaveBeenCalled();
  });

  it('calls range with default offset 0 when only limit provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs?limit=5');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(jobBuilder.range).toHaveBeenCalledWith(0, 4);
  });
});
