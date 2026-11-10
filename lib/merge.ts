import crypto from "node:crypto";
import type { Q } from "./db";

/**
 * Merging a guest profile into an e-mail account (audit DATA-01).
 * Without this, signing in with an e-mail that already owns a calendar silently
 * abandoned the guest's progress on the current device.
 */

interface Row {
  day: number;
  challenge_id: string;
  accepted_at: Date | string | null;
  completed_at: Date | string | null;
  result: string | null;
  result_updated_at: Date | string | null;
}

const t = (v: Date | string | null) => (v == null ? null : new Date(v).getTime());
const earliest = (a: Date | string | null, b: Date | string | null) => {
  const x = t(a);
  const y = t(b);
  if (x == null) return b;
  if (y == null) return a;
  return x <= y ? a : b;
};

export interface MergeSummary {
  moved: number;
  combined: number;
  skipped: number;
}

/**
 * Moves `fromId`'s progress into `intoId`, then deletes `fromId` (sessions cascade).
 * Rules per calendar day:
 *  - only `from` has the day → the assignment moves over;
 *  - both have the same challenge → keep the earliest acceptance/completion and the most recently edited result;
 *  - both have different challenges (legacy random pool) → the account's row wins; `from` is skipped.
 * Must run inside a transaction.
 */
export async function mergeParticipants(q: Q, fromId: string, intoId: string): Promise<MergeSummary> {
  if (fromId === intoId) return { moved: 0, combined: 0, skipped: 0 };
  await q.query("select id from participants where id = any($1::uuid[]) for update", [[fromId, intoId]]);
  const cols = "day::int as day, challenge_id, accepted_at, completed_at, result, result_updated_at";
  const from = await q.query<Row>(`select ${cols} from assignments where participant_id = $1 order by day`, [fromId]);
  const into = await q.query<Row>(`select ${cols} from assignments where participant_id = $1`, [intoId]);
  const intoByDay = new Map(into.map((r) => [r.day, r]));
  const intoChallenges = new Set(into.map((r) => r.challenge_id));
  const summary: MergeSummary = { moved: 0, combined: 0, skipped: 0 };

  for (const r of from) {
    const mine = intoByDay.get(r.day);
    if (!mine) {
      if (intoChallenges.has(r.challenge_id)) {
        summary.skipped++;
        continue;
      }
      await q.query("update assignments set participant_id = $1 where participant_id = $2 and day = $3", [intoId, fromId, r.day]);
      intoChallenges.add(r.challenge_id);
      summary.moved++;
      continue;
    }
    if (mine.challenge_id !== r.challenge_id) {
      summary.skipped++;
      continue;
    }
    const takeTheirs = mine.result == null || (r.result != null && (t(r.result_updated_at) ?? 0) > (t(mine.result_updated_at) ?? 0));
    await q.query(
      `update assignments set accepted_at = $3::timestamptz, completed_at = $4::timestamptz, result = $5, result_updated_at = $6::timestamptz
        where participant_id = $1 and day = $2`,
      [
        intoId,
        r.day,
        iso(earliest(mine.accepted_at, r.accepted_at)),
        iso(earliest(mine.completed_at, r.completed_at)),
        takeTheirs ? r.result : mine.result,
        iso(takeTheirs ? r.result_updated_at : mine.result_updated_at),
      ],
    );
    summary.combined++;
  }
  await q.query("delete from participants where id = $1", [fromId]);
  return summary;
}

function iso(v: Date | string | null) {
  return v == null ? null : new Date(v).toISOString();
}

/* ---------- short-lived signed token for the "merge or switch?" decision ---------- */

export interface PendingMerge {
  from: string;
  into: string;
  exp: number;
}

export function signPending(p: PendingMerge, secret: string): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret + ":merge").update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPending(token: string | undefined, secret: string, now = Date.now()): PendingMerge | null {
  if (!token || token.length > 1000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const good = crypto.createHmac("sha256", secret + ":merge").update(body).digest("base64url");
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as PendingMerge;
    if (typeof p.from !== "string" || typeof p.into !== "string" || typeof p.exp !== "number" || p.exp < now) return null;
    return p;
  } catch {
    return null;
  }
}
