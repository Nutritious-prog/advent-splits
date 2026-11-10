import { z } from "zod";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api";
import { authClient, emailAuthEnabled } from "@/lib/supabase-auth";
import { createSession, destroySession, getParticipant } from "@/lib/session";
import { clientIp, rateLimit, sharedLimit } from "@/lib/ratelimit";
import { config, sessionSecret } from "@/lib/config";
import { signPending } from "@/lib/merge";

const PENDING_MERGE_COOKIE = "tua_merge";

export const POST = handle(async (req) => {
  if (!emailAuthEnabled()) return fail(503, "Logowanie e-mailem nie jest jeszcze skonfigurowane.", "DISABLED");
  const { email, code } = z
    .object({ email: z.string().trim().toLowerCase().email().max(200), code: z.string().trim().regex(/^\d{6,10}$/) })
    .parse(await readJson(req));
  // Per-IP (fast, in memory) and per-e-mail (shared across instances) limits: SEC-02, SEC-05.
  if (!rateLimit(`otpv:${clientIp(req)}`, 10, 15 * 60_000)) return fail(429, "Za dużo prób. Spróbuj za chwilę.");
  if (!(await sharedLimit(`otpv:email:${email}`, 5, 15 * 60))) return fail(429, "Za dużo prób dla tego adresu. Poproś o nowy kod za kilkanaście minut.");

  const { data, error } = await authClient().auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user) return fail(400, "Kod jest nieprawidłowy albo wygasł.", "BAD_CODE");
  const uid = data.user.id;

  const db = await getDb();
  const current = await getParticipant();
  const owner = (
    await db.query<{ id: string }>("select id from participants where auth_user_id = $1 and is_demo = false", [uid])
  )[0];

  if (owner && current && owner.id === current.id) return json({ ok: true, mode: "already" });

  if (owner && current) {
    // This e-mail already owns a calendar AND this device has a guest profile.
    // Never drop the guest's progress silently (audit DATA-01): ask first.
    const counts = await db.query<{ pid: string; opened: number; done: number }>(
      `select participant_id as pid, count(*)::int as opened, count(completed_at)::int as done
         from assignments where participant_id = any($1::uuid[]) group by participant_id`,
      [[current.id, owner.id]],
    );
    const mine = counts.find((c) => c.pid === current.id);
    if (mine && mine.opened > 0) {
      const theirs = counts.find((c) => c.pid === owner.id);
      (await cookies()).set(
        PENDING_MERGE_COOKIE,
        signPending({ from: current.id, into: owner.id, exp: Date.now() + 10 * 60_000 }, sessionSecret()),
        { httpOnly: true, secure: config.isProd, sameSite: "strict", path: "/api/auth", maxAge: 600 },
      );
      return json({
        ok: true,
        mode: "conflict",
        device: { opened: mine.opened, done: mine.done },
        account: { opened: theirs?.opened ?? 0, done: theirs?.done ?? 0 },
      });
    }
  }

  if (owner) {
    // Account exists and this device has nothing worth keeping: just sign in.
    await destroySession();
    await db.tx((q) => createSession(q, owner.id));
    return json({ ok: true, mode: "switched" });
  }
  if (current) {
    await db.query("update participants set auth_user_id = $2, updated_at = now() where id = $1", [current.id, uid]);
    return json({ ok: true, mode: "linked" });
  }
  const base = email.split("@")[0].replace(/[^\p{L}\p{N}._-]/gu, "").slice(0, 24);
  const nick = base.length >= 2 ? base : "sportowiec";
  await db.tx(async (q) => {
    const rows = await q.query<{ id: string }>("insert into participants (nickname, auth_user_id) values ($1, $2) returning id", [nick, uid]);
    await createSession(q, rows[0].id);
  });
  return json({ ok: true, mode: "created" });
});
