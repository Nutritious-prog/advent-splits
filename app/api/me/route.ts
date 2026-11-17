import { z } from "zod";
import { getDb } from "@/lib/db";
import { destroySession, getParticipant, type ParticipantRow } from "@/lib/session";
import { fail, handle, json, readJson } from "@/lib/api";
import { buildState } from "@/lib/progress";
import { requestNow } from "@/lib/test-clock";
import { nicknameSchema, prefsSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.", "NO_PROFILE");
  return json(await buildState(p, await requestNow()));
});

const patch = prefsSchema.extend({ nickname: z.unknown().optional() });

export const PATCH = handle(async (req) => {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.", "NO_PROFILE");
  const data = patch.parse(await readJson(req));
  let nickname = p.nickname;
  if (data.nickname !== undefined) {
    const n = nicknameSchema.safeParse(data.nickname);
    if (!n.success) return fail(400, n.error.issues[0]?.message ?? "Nieprawidłowy nick.", "VALIDATION");
    nickname = n.data;
  }
  const db = await getDb();
  const rows = await db.query<ParticipantRow>(
    `update participants set nickname = $2, difficulty_pref = $3, exclude_equipment = $4, gender = $5, updated_at = now()
      where id = $1 returning id, nickname, difficulty_pref, exclude_equipment, gender, auth_user_id, is_demo`,
    [p.id, nickname, data.difficultyPref ?? p.difficulty_pref, data.excludeEquipment ?? p.exclude_equipment, data.gender ?? p.gender],
  );
  return json(await buildState(rows[0], await requestNow()));
});

// Permanently deletes the participant: progress and sessions.
export const DELETE = handle(async (req) => {
  const p = await getParticipant();
  if (!p) return fail(401, "Nie masz jeszcze profilu.", "NO_PROFILE");
  z.object({ confirm: z.literal("USUŃ") }).parse(await readJson(req));
  const db = await getDb();
  await db.query("delete from participants where id = $1", [p.id]); // cascades to sessions + assignments
  await destroySession();
  return json({ ok: true });
});
