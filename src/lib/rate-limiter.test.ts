import { checkRateLimit, cleanupRateLimits } from './rate-limiter';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from '@/lib/supabase/server';

describe('rate limiter', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseAdminClient as Mock).mockResolvedValue(mockSupabase);
  });

  describe('checkRateLimit', () => {
    it('allows first request within limit', async () => {
      // Mock no existing record
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await checkRateLimit('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // MAX_ATTEMPTS - 1
      expect(result.resetAfter).toBe(Math.ceil(15 * 60)); // 15 minutes in seconds

      // Verify upsert was called with count=1
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        { key: 'test-key', count: 1, reset_at: expect.any(String) },
        { onConflict: 'key' }
      );
    });

    it('allows requests up to MAX_ATTEMPTS', async () => {
      // Simulate existing records with increasing counts: 0,1,2,3,4
      const now = Date.now();
      mockSupabase.single
        .mockResolvedValueOnce({ data: { count: 0, reset_at: now + 10000 }, error: null })
        .mockResolvedValueOnce({ data: { count: 1, reset_at: now + 10000 }, error: null })
        .mockResolvedValueOnce({ data: { count: 2, reset_at: now + 10000 }, error: null })
        .mockResolvedValueOnce({ data: { count: 3, reset_at: now + 10000 }, error: null })
        .mockResolvedValueOnce({ data: { count: 4, reset_at: now + 10000 }, error: null });

      // Make 5 requests (0->1, 1->2, 2->3, 3->4, 4->5)
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit('test-key');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i); // 5 - (i+1)
        expect(result.resetAfter).toBeGreaterThan(0);
      }
    });

    it('blocks request when exceeding MAX_ATTEMPTS', async () => {
      // Simulate existing record at limit
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 5, reset_at: Date.now() + 10000 }, error: null });

      const result = await checkRateLimit('test-key');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetAfter).toBeGreaterThan(0);
    });

    it('resets count after window expires', async () => {
      // First request within window
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 3, reset_at: Date.now() + 10000 }, error: null });
      let result = await checkRateLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // 5 - (3+1)

      // Second request after window expires (reset)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // Simulate no record (or expired)
      result = await checkRateLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Reset to first request state
    });

    it('treats different keys independently', async () => {
      // First key: use up limit
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 5, reset_at: Date.now() + 10000 }, error: null });
      let result = await checkRateLimit('key1');
      expect(result.allowed).toBe(false);

      // Second key: should be allowed
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      result = await checkRateLimit('key2');
      expect(result.allowed).toBe(true);
    });

    it('handles database errors gracefully', async () => {
      // Simulate select error
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      // Should still create new record on error
      const result = await checkRateLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('cleanupRateLimits', () => {
    it('deletes old entries', async () => {
      await cleanupRateLimits();

      expect(mockSupabase.from).toHaveBeenCalledWith('rate_limits');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.lt).toHaveBeenCalledWith('reset_at', expect.any(String));
    });
  });
});