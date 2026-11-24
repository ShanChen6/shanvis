/**
 * Minimal in-memory sliding-window rate limiter. Per server instance only, so
 * it is a guard against accidental hammering, not a security boundary.
 * Replace with a shared store (e.g. Upstash/Redis) when deploying at scale.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()) {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false as const, retryAfterMs: windowMs - (now - recent[0]) };
    }
    recent.push(now);
    hits.set(key, recent);
    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 10_000) {
      for (const [k, ts] of hits) if (ts.every((t) => now - t >= windowMs)) hits.delete(k);
    }
    return { ok: true as const, remaining: limit - recent.length };
  };
}

export function clientKey(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "anonymous";
}
