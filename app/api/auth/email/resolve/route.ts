import { z } from "zod";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api";
import { createSession, getParticipant } from "@/lib/session";
import { sessionSecret } from "@/lib/config";
import { mergeParticipants, verifyPending } from "@/lib/merge";

const PENDING_MERGE_COOKIE = "tua_merge";

/**
 * Second step after an OTP verification that hit an account conflict (audit DATA-01).
 * The decision is bound to a signed, 10-minute, httpOnly token issued by /verify, and to
 * the guest session that started it, so it cannot be replayed or used for another profile.
 *  - "merge": guest progress is merged into the account, the guest profile is removed;
 *  - "switch": sign in to the account and delete the guest profile (the user confirmed it).
 */
export const POST = handle(async (req) => {
  const { action } = z.object({ action: z.enum(["merge", "switch"]) }).parse(await readJson(req));
  const jar = await cookies();
  const pending = verifyPending(jar.get(PENDING_MERGE_COOKIE)?.value, sessionSecret());
  if (!pending) return fail(400, "Decyzja wygasła. Zaloguj się kodem jeszcze raz.", "EXPIRED");

  const current = await getParticipant();
  if (!current || current.id !== pending.from) return fail(403, "Ta decyzja dotyczy innej sesji.");

  const db = await getDb();
  let summary = null;
  // No early logout: deleting the guest profile cascades to its session, and the new
  // session cookie overwrites the old one. If the transaction fails, nothing changes.
  await db.tx(async (q) => {
    if (action === "merge") summary = await mergeParticipants(q, pending.from, pending.into);
    else await q.query("delete from participants where id = $1", [pending.from]);
    await createSession(q, pending.into);
  });
  jar.delete({ name: PENDING_MERGE_COOKIE, path: "/api/auth" });
  return json({ ok: true, mode: action === "merge" ? "merged" : "switched", summary });
});
