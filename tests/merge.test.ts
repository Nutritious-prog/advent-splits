import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/lib/migrate";
import { seedChallenges } from "@/lib/seed";
import { mergeParticipants, signPending, verifyPending } from "@/lib/merge";
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
const rows = (pid: string) =>
  db.query<{ day: number; completed_at: Date | null; result: string | null }>(
    "select day::int as day, completed_at, result from assignments where participant_id = $1 order by day",
    [pid],
  );

describe("merging a guest profile into an account (DATA-01)", () => {
  it("moves days only the guest has and keeps everything done", async () => {
    const guest = await participant("guest");
    const account = await participant("account");
    await assign(account, 1, { done: "2026-12-01T10:00:00Z" });
    await assign(guest, 2, { done: "2026-12-02T10:00:00Z", result: "5 km" });
    await assign(guest, 3);

    const s = await db.tx((q) => mergeParticipants(q, guest, account));
    expect(s).toEqual({ moved: 2, combined: 0, skipped: 0 });
    const r = await rows(account);
    expect(r.map((x) => x.day)).toEqual([1, 2, 3]);
    expect(r[1].result).toBe("5 km");
    expect((await db.query("select id from participants where id = $1", [guest])).length).toBe(0);
  });

  it("for the same day keeps the earliest completion and the most recent result", async () => {
    const guest = await participant("guest2");
    const account = await participant("account2");
    await assign(account, 5, { result: "stary", resultAt: "2026-12-05T08:00:00Z" });
    await assign(guest, 5, { done: "2026-12-05T09:00:00Z", result: "nowy", resultAt: "2026-12-05T12:00:00Z" });

    const s = await db.tx((q) => mergeParticipants(q, guest, account));
    expect(s.combined).toBe(1);
    const [day5] = await rows(account);
    expect(day5.completed_at).not.toBeNull();
    expect(day5.result).toBe("nowy");
  });

  it("never loses the account's completion when the guest hasn't done that day", async () => {
    const guest = await participant("guest3");
    const account = await participant("account3");
    await assign(account, 7, { done: "2026-12-07T10:00:00Z", result: "ok" });
    await assign(guest, 7);
    await db.tx((q) => mergeParticipants(q, guest, account));
    const [day7] = await rows(account);
    expect(day7.completed_at).not.toBeNull();
    expect(day7.result).toBe("ok");
  });
});

describe("pending merge token", () => {
  it("round-trips, expires and rejects tampering", () => {
    const tok = signPending({ from: "a", into: "b", exp: Date.now() + 60_000 }, "secret-1234567890");
    expect(verifyPending(tok, "secret-1234567890")?.into).toBe("b");
    expect(verifyPending(tok, "other-secret-123456")).toBeNull();
    expect(verifyPending(tok.replace(/.$/, (c) => (c === "A" ? "B" : "A")), "secret-1234567890")).toBeNull();
    const old = signPending({ from: "a", into: "b", exp: Date.now() - 1 }, "secret-1234567890");
    expect(verifyPending(old, "secret-1234567890")).toBeNull();
  });
});

describe("shared rate limit (SEC-02/SEC-05)", () => {
  it("allows `limit` hits per window, then blocks, regardless of caller", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await dbRateLimit(db, "otpv:email:a@b.pl", 5, 900, "s"));
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(await dbRateLimit(db, "otpv:email:other@b.pl", 5, 900, "s")).toBe(true);
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
    await db.query("update participants set auth_user_id = gen_random_uuid() where id = $1", [p]);
    await db.query("insert into participants (nickname, is_demo) values ($1, true)", ["DEMO"]);
    const res = await db.tx((q) => purgeParticipantData(q));
    expect(res.participants).toBeGreaterThan(0);
    expect(res.authUserIds.length).toBeGreaterThan(0);
    expect(await countParticipantData(db)).toEqual({ participants: 0, linked: 0, assignments: 0 });
    expect((await db.query("select id from participants where is_demo")).length).toBe(1);
    expect((await db.query("select id from challenges")).length).toBeGreaterThan(0);
  });
});
