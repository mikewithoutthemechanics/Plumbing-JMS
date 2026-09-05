import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/utils/export', () => ({
  generateExcelExport: vi.fn(),
}));

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import { generateExcelExport } from '@/lib/utils/export';

const mockGetSupabaseServerClient =
  getSupabaseServerClient as unknown as MockedFunction<typeof getSupabaseServerClient>;
const mockGetSupabaseAdminClient =
  getSupabaseAdminClient as unknown as MockedFunction<typeof getSupabaseAdminClient>;

describe('/api/export route', () => {
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
    builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    };
    (builder as Record<string, unknown>).then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(resolveData);
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

    it('returns 403 when user cannot export', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const res = await GET();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Forbidden' });
    });

    it('returns excel file for owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
            singleMock.mockResolvedValueOnce({
        data: { bank_name: 'Bank', account_name: 'Acc', account_number: '123', branch_code: '456', reference_prefix: 'PLB' },
        error: null,
      });

      const res = await GET();
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('returns 500 on export failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      resolveData = { data: null, error: { message: 'export fail' } };

      const res = await GET();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Export failed' });
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const req = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({ jobIds: ['1'] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'technician' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({ jobIds: ['1'] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing jobIds', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing jobIds' });
    });

    it('returns 400 when jobIds is not an array', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } });
      singleMock.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
      const req = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({ jobIds: '1' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing jobIds' });
    });
  });
});
