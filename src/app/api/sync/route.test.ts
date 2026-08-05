import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Supabase server client (NOT next/server — use the real NextRequest/NextResponse)
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
}));

import { getSupabaseServerClient } from '@/lib/supabase/server';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;

describe('/api/sync route', () => {
  let singleMock: ReturnType<typeof vi.fn>;
  let builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockSupabase: {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    singleMock = vi.fn();
    builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => builder),
    };
    mockGetSupabaseServerClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof getSupabaseServerClient>>);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 403 when user role is not owner or technician', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'visitor' }, error: null });

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Forbidden');
  });

  it('handles quote submission for owners', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock
      .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'quote-id', customer_name: 'John Doe' },
        error: null,
      });

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        quote: {
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '1234567890',
          description: 'Fix leaky faucet',
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect((await res.json()).quote).toEqual({ id: 'quote-id', customer_name: 'John Doe' });
  });

  it('handles sync operation for valid data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
    singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({
        table_name: 'customers',
        operation: 'INSERT',
        payload: { name: 'Jane Doe', email: 'jane@example.com' },
        id: 'sync-id',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
