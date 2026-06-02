import "server-only";

/**
 * Tiny in-memory per-IP rate limiter for the public /api/chat endpoint.
 *
 * This is a best-effort guard for a single-region serverless/Node deployment:
 * it caps how often one IP can hit the (token-spending) chat route. It is NOT
 * a distributed limiter — on a multi-instance deployment each instance keeps
 * its own counters, so for hard global limits swap this for Upstash/Redis. It
 * still meaningfully blunts a single abusive client and costs nothing.
 *
 * Algorithm: fixed window. Each IP gets {@link MAX_REQUESTS} requests per
 * {@link WINDOW_MS}. Stale buckets are pruned opportunistically so memory stays
 * bounded even under churny IPs.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per IP per window
const MAX_TRACKED_IPS = 10_000; // hard cap on the map size

type Bucket = { count: number; resetAt: number };

// Module-scoped: persists across requests within one server instance.
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  /** Whole seconds until the window resets (for the Retry-After header). */
  retryAfter: number;
  remaining: number;
};

/** Derive a best-effort client key from proxy headers, falling back to "unknown". */
export function clientKeyFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    // First hop is the originating client.
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Consume one token for `key`. Returns whether the request is allowed. */
export function rateLimit(key: string, now = Date.now()): RateLimitResult {
  pruneIfNeeded(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0, remaining: MAX_REQUESTS - 1 };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfter: 0,
    remaining: MAX_REQUESTS - existing.count,
  };
}

/** Drop expired buckets; if the map is somehow huge, clear the oldest entries. */
function pruneIfNeeded(now: number): void {
  if (buckets.size < MAX_TRACKED_IPS) {
    // Cheap path: only prune when we cross a small threshold to avoid O(n) work
    // on every request. Expired single entries are also handled inline above.
    if (buckets.size < 256) return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Last resort: if still over the hard cap, clear everything (fail open).
  if (buckets.size > MAX_TRACKED_IPS) buckets.clear();
}
