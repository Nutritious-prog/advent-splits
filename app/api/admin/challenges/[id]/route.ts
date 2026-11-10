import { getDb } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { challengeInput, challengeParams } from "@/lib/admin-challenges";

export const PATCH = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const { id } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const db = await getDb();

  // Quick toggle: { active: boolean }
  if (Object.keys(body).length === 1 && typeof body.active === "boolean") {
    const r = await db.query("update challenges set active = $2, updated_at = now() where id = $1 returning id", [id, body.active]);
    return r.length ? json({ ok: true }) : fail(404, "Nie znaleziono wyzwania.");
  }
  const c = challengeInput.parse(body);
  const r = await db.query(
    `update challenges set category = $2, title = $3, teaser = $4, description = $5, steps = $6::text::jsonb, tips = $7,
        difficulty = $8, minutes = $9, equipment = $10::text::jsonb, gear = $11, icon = $12, easier = $13, harder = $14,
        safety = $15, caption = $16, result_type = $17, result_unit = $18, active = $19, day = $20, swap = $21, updated_at = now()
      where id = $1 returning id`,
    [id, ...challengeParams(c)],
  );
  return r.length ? json({ ok: true }) : fail(404, "Nie znaleziono wyzwania.");
});
