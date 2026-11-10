import type { Q } from "./db";

/**
 * End-of-retention cleanup (audit LEG-02): the privacy policy promises deletion no later
 * than 12 months after 24 December. Deletes participants (assignments and sessions cascade),
 * rate-limit counters and admin events. Challenges are kept (they are content, not personal data).
 * Returns the Supabase Auth user ids so the caller can delete the login e-mails too.
 */
export async function purgeParticipantData(q: Q, opts: { includeDemo?: boolean } = {}) {
  const authIds = (
    await q.query<{ auth_user_id: string }>(
      `select auth_user_id from participants where auth_user_id is not null ${opts.includeDemo ? "" : "and not is_demo"}`,
    )
  ).map((r) => r.auth_user_id);
  const deleted = await q.query<{ id: string }>(`delete from participants ${opts.includeDemo ? "" : "where not is_demo"} returning id`);
  await q.query("delete from rate_limits");
  await q.query("delete from admin_events");
  return { participants: deleted.length, authUserIds: authIds };
}

export async function countParticipantData(q: Q) {
  const [r] = await q.query<{ participants: number; linked: number; assignments: number }>(
    `select (select count(*)::int from participants where not is_demo) as participants,
            (select count(*)::int from participants where not is_demo and auth_user_id is not null) as linked,
            (select count(*)::int from assignments a join participants p on p.id = a.participant_id where not p.is_demo) as assignments`,
  );
  return r;
}
