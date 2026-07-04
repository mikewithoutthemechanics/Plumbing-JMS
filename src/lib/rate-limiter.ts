import { getSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAfter: number;
}> {
  const supabase = await getSupabaseAdminClient();
  const now = Date.now();

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
    .upsert({ key, count, reset_at: new Date(resetAt).toISOString() }, { onConflict: ['key'] });

  const allowed = count <= MAX_ATTEMPTS;
  const remaining = Math.max(0, MAX_ATTEMPTS - count);
  const resetAfter = Math.max(0, resetAt - now);
  return { allowed, remaining, resetAfter: Math.ceil(resetAfter / 1000) };
}

// Optional: cleanup old entries (call periodically)
export async function cleanupRateLimits() {
  const supabase = await getSupabaseAdminClient();
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // older than 24h
  await supabase.from('rate_limits').delete().lt('reset_at', expiry);
}