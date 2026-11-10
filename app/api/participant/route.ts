import { z } from "zod";
import { getDb } from "@/lib/db";
import { createSession, getParticipant } from "@/lib/session";
import { fail, handle, json, readJson } from "@/lib/api";
import { nicknameSchema, prefsSchema } from "@/lib/validation";
import { clientIp, rateLimit, sharedLimit } from "@/lib/ratelimit";

const body = prefsSchema.extend({ nickname: z.unknown() });

export const POST = handle(async (req) => {
  const existing = await getParticipant();
  if (existing) return json({ ok: true, existing: true });
  if (!rateLimit(`join:${clientIp(req)}`, 10, 60 * 60_000) || !(await sharedLimit(`join:ip:${clientIp(req)}`, 20, 60 * 60)))
    return fail(429, "Za dużo prób w krótkim czasie. Odpocznij chwilę jak między seriami.");

  const data = body.parse(await readJson(req));
  const nick = nicknameSchema.safeParse(data.nickname);
  if (!nick.success) return fail(400, nick.error.issues[0]?.message ?? "Nieprawidłowy nick.", "VALIDATION");

  const db = await getDb();
  await db.tx(async (q) => {
    const rows = await q.query<{ id: string }>(
      `insert into participants (nickname, difficulty_pref, exclude_equipment, gender) values ($1, $2, $3, $4) returning id`,
      [nick.data, data.difficultyPref ?? "SURPRISE", data.excludeEquipment ?? false, data.gender ?? "N"],
    );
    await createSession(q, rows[0].id);
  });
  return json({ ok: true });
});
