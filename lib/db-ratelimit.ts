import crypto from "node:crypto";
import type { Q } from "./db";

/**
 * Fixed-window counter stored in Postgres (audit SEC-02/SEC-05): one atomic upsert per
 * call, so concurrent requests on different serverless instances share the same limit.
 * Returns true while the caller is within `limit` hits per `windowSec`.
 */
export async function dbRateLimit(q: Q, rawKey: string, limit: number, windowSec: number, secret: string): Promise<boolean> {
  const key = crypto.createHmac("sha256", secret + ":rl").update(rawKey).digest("hex");
  const rows = await q.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count`,
    [key, windowSec],
  );
  // Opportunistic cleanup of stale windows (~1% of calls).
  if (Math.random() < 0.01) await q.query("delete from rate_limits where window_start < now() - interval '1 day'");
  return Number(rows[0]?.count ?? 1) <= limit;
}
