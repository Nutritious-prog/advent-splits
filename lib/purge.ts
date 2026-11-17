import type { Q } from "./db";

/**
 * End-of-retention cleanup (audit LEG-02): the privacy policy promises deletion no later
 * than 12 months after 24 December. Deletes participants (assignments and sessions cascade),
 * rate-limit counters and admin events. Challenges are kept (they are content, not personal data).
 */
export async function purgeParticipantData(q: Q, opts: { includeDemo?: boolean } = {}) {
  const deleted = await q.query<{ id: string }>(`delete from participants ${opts.includeDemo ? "" : "where not is_demo"} returning id`);
  await q.query("delete from rate_limits");
  await q.query("delete from admin_events");
  return { participants: deleted.length, };
}

export async function countParticipantData(q: Q) {
  const [r] = await q.query<{ participants: number; assignments: number }>(
    `select (select count(*)::int from participants where not is_demo) as participants,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id where not p.is_demo) as assignments`,
  );
  return r;
}
