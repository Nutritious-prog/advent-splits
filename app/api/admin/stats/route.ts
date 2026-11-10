import { getDb } from "@/lib/db";
import { fail, handle, json } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { config } from "@/lib/config";
import { serverNow, unlockedCount } from "@/lib/time";

// Anonymous aggregates only: no nicknames, e-mails or per-person data leave this endpoint.
export const GET = handle(async () => {
  if (!(await isAdmin())) return fail(401, "Brak dostępu.");
  const db = await getDb();
  const one = async <T,>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p))[0];

  const totals = await one<{ participants: number; linked: number; revealed: number; completed: number; results: number }>(
    `select (select count(*)::int from participants where not is_demo) as participants,
            (select count(*)::int from participants where not is_demo and auth_user_id is not null) as linked,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id where not p.is_demo) as revealed,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id where not p.is_demo and a.completed_at is not null) as completed,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id where not p.is_demo and a.result is not null) as results`,
  );

  const daily = await db.query<{ date: string; active: number }>(
    `select to_char(d, 'YYYY-MM-DD') as date, count(distinct participant_id)::int as active from (
        select a.participant_id, (a.assigned_at at time zone $1)::date as d
          from assignments a join participants p on p.id = a.participant_id where not p.is_demo
        union all
        select a.participant_id, (a.completed_at at time zone $1)::date
          from assignments a join participants p on p.id = a.participant_id where not p.is_demo and a.completed_at is not null
      ) x group by d order by d desc limit 40`,
    [config.tz],
  );

  const signups = await db.query<{ date: string; n: number }>(
    `select to_char((created_at at time zone $1)::date, 'YYYY-MM-DD') as date, count(*)::int as n
       from participants where not is_demo group by 1 order by 1 desc limit 40`,
    [config.tz],
  );

  const perDay = await db.query<{ day: number; revealed: number; completed: number }>(
    `select a.day::int as day, count(*)::int as revealed, count(a.completed_at)::int as completed
       from assignments a join participants p on p.id = a.participant_id where not p.is_demo
      group by a.day order by a.day`,
  );

  const top = await db.query<{ id: string; title: string; category: string; assigned: number; completed: number }>(
    `select c.id, c.title, c.category, count(*)::int as assigned, count(a.completed_at)::int as completed
       from assignments a join challenges c on c.id = a.challenge_id join participants p on p.id = a.participant_id
      where not p.is_demo group by c.id, c.title, c.category order by assigned desc, completed desc limit 15`,
  );

  const pool = await one<{ active: number; total: number }>(
    "select count(*) filter (where active)::int as active, count(*)::int as total from challenges",
  );

  return json({
    serverNow: serverNow().toISOString(),
    unlocked: unlockedCount(serverNow()),
    days: config.days,
    totals,
    completionRate: totals.revealed ? totals.completed / totals.revealed : 0,
    daily,
    signups,
    perDay,
    top,
    pool,
  });
});
