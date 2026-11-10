import "server-only";
import { getDb } from "./db";
import type { ShareData } from "./share-card";
import type { Category } from "./types";

export async function loadShareData(participantId: string, nickname: string, day: number, withResult: boolean): Promise<ShareData | null> {
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const db = await getDb();
  const rows = await db.query<{ title: string; icon: string; category: Category; completed_at: unknown; result: string | null }>(
    `select c.title, c.icon, c.category, a.completed_at, a.result from assignments a join challenges c on c.id = a.challenge_id
      where a.participant_id = $1 and a.day = $2`,
    [participantId, day],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    day,
    title: r.title,
    icon: r.icon,
    category: r.category,
    completed: !!r.completed_at,
    nickname,
    result: withResult ? r.result : null,
  };
}

export async function loadSummaryData(p: import("./session").ParticipantRow, now: Date): Promise<import("./share-card").SummaryData> {
  const { buildState } = await import("./progress");
  const { CATEGORY_LABEL } = await import("./labels");
  const st = await buildState(p, now);
  return {
    nickname: p.nickname,
    days: st.days,
    completedDays: st.doors.filter((d) => d.status === "COMPLETED").map((d) => d.day),
    longestStreak: st.stats.longestStreak,
    minutes: st.stats.minutes,
    favorite: st.stats.favoriteCategory ? CATEGORY_LABEL[st.stats.favoriteCategory] : null,
    achievements: st.achievements.filter((a) => a.unlocked).length,
    achievementsTotal: st.achievements.length,
  };
}
