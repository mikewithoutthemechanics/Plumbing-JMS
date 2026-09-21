import { getSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 100;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory fallback for when service role key is not configured (dev mode)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now >= value.resetAt) {
      memoryStore.delete(key);
    }
  }
}

function checkMemoryStore(key: string): { allowed: boolean; remaining: number; resetAfter: number } {
  cleanupMemoryStore();
  const now = Date.now();
  const existing = memoryStore.get(key);

  let count: number;
  let resetAt: number;

  if (!existing) {
    count = 1;
    resetAt = now + WINDOW_MS;
  } else if (now >= existing.resetAt) {
    count = 1;
    resetAt = now + WINDOW_MS;
  } else {
    count = existing.count + 1;
    resetAt = existing.resetAt;
  }

  memoryStore.set(key, { count, resetAt });

  const allowed = count <= MAX_ATTEMPTS;
  const remaining = Math.max(0, MAX_ATTEMPTS - count);
  const resetAfter = Math.max(0, resetAt - now);
  return { allowed, remaining, resetAfter: Math.ceil(resetAfter / 1000) };
}

export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAfter: number;
}> {
  const now = Date.now();

  // Try Supabase first if service role key is available
  try {
    const supabase = await getSupabaseAdminClient();

    // Try to get existing record
    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('key', key)
      .single();

    let count: number;
    let resetAt: number;

    if (selectError || !existing) {
      // No existing record, create new
      count = 1;
      resetAt = now + WINDOW_MS;
    } else {
      const existingResetAt = new Date(existing.reset_at as string).getTime();
      if (now >= existingResetAt) {
        // Window expired, reset
        count = 1;
        resetAt = now + WINDOW_MS;
      } else {
        // Within window, increment
        count = (existing.count as number) + 1;
        resetAt = existingResetAt;
      }
    }

    // Upsert the record
    await supabase
      .from('rate_limits')
      .upsert({ key, count, reset_at: new Date(resetAt).toISOString() }, { onConflict: 'key' });

    const allowed = count <= MAX_ATTEMPTS;
    const remaining = Math.max(0, MAX_ATTEMPTS - count);
    const resetAfter = Math.max(0, resetAt - now);
    return { allowed, remaining, resetAfter: Math.ceil(resetAfter / 1000) };
  } catch (error) {
    // Fallback to in-memory store if Supabase unavailable (e.g., missing service role key, table doesn't exist)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[RateLimiter] Falling back to in-memory store:', error instanceof Error ? error.message : String(error));
    }
    return checkMemoryStore(key);
  }
}

// Optional: cleanup old entries (call periodically)
export async function cleanupRateLimits() {
  const supabase = await getSupabaseAdminClient();
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // older than 24h
  await supabase.from('rate_limits').delete().lt('reset_at', expiry);
}

// Additional rate limiting for specific routes
export async function checkAuthRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const key = `auth:${ip}`;
  const result = await checkRateLimit(key);
  return { allowed: result.allowed };
}

// Rate limiting for API endpoints
export async function checkApiRateLimit(key: string): Promise<{ allowed: boolean }> {
  const result = await checkRateLimit(key);
  return { allowed: result.allowed };
}