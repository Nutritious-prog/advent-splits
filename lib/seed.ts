import type { Q } from "./db";
import { ALL_CHALLENGES } from "./challenges";

/**
 * Inserts seed challenges that don't exist yet (never overwrites admin edits).
 * With overwrite=true, seed content replaces existing texts (keeps the `active` flag).
 */
export async function seedChallenges(db: Q, opts: { overwrite?: boolean } = {}): Promise<number> {
  const rows = ALL_CHALLENGES.map((c) => ({
    id: c.id,
    category: c.category,
    title: c.title,
    teaser: c.teaser,
    description: c.description,
    steps: c.steps,
    tips: c.tips,
    difficulty: c.difficulty,
    minutes: c.minutes,
    equipment: c.equipment,
    gear: c.gear,
    icon: c.icon,
    easier: c.easier,
    harder: c.harder,
    safety: c.safety,
    caption: c.caption,
    result_type: c.resultType,
    result_unit: c.resultUnit,
    day: c.day,
    swap: c.swap,
  }));
  const res = await db.query<{ id: string }>(
    `insert into challenges (id, category, title, teaser, description, steps, tips, difficulty, minutes,
       equipment, gear, icon, easier, harder, safety, caption, result_type, result_unit, day, swap)
     select id, category, title, teaser, description, steps, tips, difficulty, minutes,
       equipment, gear, icon, easier, harder, safety, caption, result_type, result_unit, day, swap
     from jsonb_to_recordset($1::text::jsonb) as x(
       id text, category text, title text, teaser text, description text, steps jsonb, tips text,
       difficulty text, minutes int, equipment jsonb, gear text, icon text, easier text, harder text,
       safety text, caption text, result_type text, result_unit text, day smallint, swap text)
     on conflict (id) do ${opts.overwrite ? `update set category = excluded.category, title = excluded.title, teaser = excluded.teaser,
       description = excluded.description, steps = excluded.steps, tips = excluded.tips, difficulty = excluded.difficulty,
       minutes = excluded.minutes, equipment = excluded.equipment, gear = excluded.gear, icon = excluded.icon,
       easier = excluded.easier, harder = excluded.harder, safety = excluded.safety, caption = excluded.caption,
       result_type = excluded.result_type, result_unit = excluded.result_unit, day = excluded.day, swap = excluded.swap,
       active = true, updated_at = now()` : "nothing"}
     returning id`,
    [JSON.stringify(rows)],
  );
  return res.length;
}
