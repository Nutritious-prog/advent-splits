import "server-only";
// Best-effort in-memory limiter (per server instance). Good enough to slow down
// casual abuse; put Vercel Firewall / WAF rules in front for real protection.
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= limit;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Limit shared by all server instances (stored in Postgres). Use for security-sensitive
 * endpoints: admin login, OTP start/verify, profile creation (audit SEC-02, SEC-05).
 */
export async function sharedLimit(rawKey: string, limit: number, windowSec: number): Promise<boolean> {
  const [{ getDb }, { dbRateLimit }, { sessionSecret }] = await Promise.all([import("./db"), import("./db-ratelimit"), import("./config")]);
  return dbRateLimit(await getDb(), rawKey, limit, windowSec, sessionSecret());
}
