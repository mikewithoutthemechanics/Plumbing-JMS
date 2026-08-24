/**
 * Minimal in-memory rate limiter.
 *
 * NOTE: this is per-process-instance memory. For multi-instance /
 * serverless deployments prefer a distributed store (e.g. Upstash Redis).
 */

type Entry = { count: number; resetAt: number };

const hits = new Map<string, Entry>();

// Periodically sweep expired entries so the Map cannot grow unbounded.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return { ok: true, retryAfterSec: 0 };
  }

  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return { ok: false, retryAfterSec };
}
