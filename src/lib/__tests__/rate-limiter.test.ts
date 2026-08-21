import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'not found' } })
        })
      }),
      upsert: async () => ({ error: null })
    })
  }))
}));

import { checkAuthRateLimit } from '../rate-limiter';

describe('rate-limiter', () => {
  it('checkAuthRateLimit returns allowed boolean', async () => {
    const result = await checkAuthRateLimit('1.2.3.4');
    expect(typeof result.allowed).toBe('boolean');
  });
});
