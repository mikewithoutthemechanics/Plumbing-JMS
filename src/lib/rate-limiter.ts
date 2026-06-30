interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_STORE = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAfter: number } {
  const now = Date.now();
  const entry = RATE_LIMIT_STORE.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAfter: WINDOW_MS };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAfter: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetAfter: entry.resetAt - now };
}

// Cleanup expired entries periodically to prevent memory leak
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
    if (now > entry.resetAt) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

// Start cleanup interval (runs every minute)
if (typeof window === 'undefined') {
  // Only start interval in Node.js environment (server-side)
  setInterval(cleanupExpiredEntries, 60_000);
}
