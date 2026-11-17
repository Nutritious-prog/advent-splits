import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/lib/migrate";
import { seedChallenges } from "@/lib/seed";
import { dbRateLimit } from "@/lib/db-ratelimit";
import { countParticipantData, purgeParticipantData } from "@/lib/purge";
import type { DB, Q } from "@/lib/db";

// Real Postgres (PGlite, in memory) with the real migrations: same SQL as production.
let db: DB;
beforeAll(async () => {
  const pg = new PGlite();
  const wrap = (s: { query: typeof pg.query; exec: typeof pg.exec }): Q => ({
    query: async (t, p = []) => (await s.query(t, p as unknown[])).rows as never,
    exec: async (t) => void (await s.exec(t)),
  });
  db = { ...wrap(pg), tx: (fn) => pg.transaction((t) => fn(wrap(t as never))) as never };
  await runMigrations(db);
  await seedChallenges(db);
}, 60_000);

async function participant(nick: string) {
  return (await db.query<{ id: string }>("insert into participants (nickname) values ($1) returning id", [nick]))[0].id;
}
async function assign(pid: string, day: number, opts: { done?: string; result?: string; resultAt?: string } = {}) {
  const ch = (await db.query<{ id: string }>("select id from challenges where day = $1 and active", [day]))[0].id;
  await db.query(
    "insert into assignments (participant_id, day, challenge_id, completed_at, result, result_updated_at) values ($1, $2, $3, $4::timestamptz, $5, $6::timestamptz)",
    [pid, day, ch, opts.done ?? null, opts.result ?? null, opts.resultAt ?? null],
  );
}
describe("shared rate limit (SEC-02/SEC-05)", () => {
  it("allows `limit` hits per window, then blocks, regardless of caller", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await dbRateLimit(db, "join:ip:1.2.3.4", 5, 900, "s"));
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(await dbRateLimit(db, "join:ip:5.6.7.8", 5, 900, "s")).toBe(true);
  });
  it("stores only hashed keys", async () => {
    const keys = await db.query<{ key: string }>("select key from rate_limits");
    expect(keys.every((k) => /^[0-9a-f]{64}$/.test(k.key))).toBe(true);
  });
});

describe("end-of-retention purge (LEG-02)", () => {
  it("deletes all participant data but keeps the demo profile and challenges", async () => {
    const p = await participant("to-purge");
    await assign(p, 9, { done: "2026-12-09T10:00:00Z" });
    await db.query("insert into participants (nickname, is_demo) values ($1, true)", ["DEMO"]);
    const res = await db.tx((q) => purgeParticipantData(q));
    expect(res.participants).toBeGreaterThan(0);
    expect(await countParticipantData(db)).toEqual({ participants: 0, assignments: 0 });
    expect((await db.query("select id from participants where is_demo")).length).toBe(1);
    expect((await db.query("select id from challenges")).length).toBeGreaterThan(0);
  });
});
