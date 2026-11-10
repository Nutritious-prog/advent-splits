import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { CHALLENGE_COLUMNS, rowToChallenge } from "@/lib/challenge-row";
import { challengeInput, challengeParams } from "@/lib/admin-challenges";
import { seedChallenges } from "@/lib/seed";

export const GET = handle(async () => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const db = await getDb();
  const rows = await db.query<Record<string, unknown>>(
    `select ${CHALLENGE_COLUMNS},
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id
              where a.challenge_id = c.id and not p.is_demo) as assigned,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id
              where a.challenge_id = c.id and a.completed_at is not null and not p.is_demo) as completed
       from challenges c order by c.category, c.title`,
  );
  return json(rows.map((r) => ({ ...rowToChallenge(r), assigned: Number(r.assigned), completed: Number(r.completed) })));
});

export const POST = handle(async (req) => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const body = (await readJson(req)) as Record<string, unknown>;
  const db = await getDb();
  if (body.action === "seed") {
    const inserted = await seedChallenges(db);
    return json({ ok: true, inserted });
  }
  const c = challengeInput.parse(body);
  const slug = c.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const id = `custom-${slug || "wyzwanie"}-${crypto.randomBytes(2).toString("hex")}`;
  await db.query(
    `insert into challenges (id, category, title, teaser, description, steps, tips, difficulty, minutes, equipment,
       gear, icon, easier, harder, safety, caption, result_type, result_unit, active, day, swap)
     values ($1, $2, $3, $4, $5, $6::text::jsonb, $7, $8, $9, $10::text::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [id, ...challengeParams(c)],
  );
  return json({ ok: true, id });
});
