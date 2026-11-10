import "server-only";
import { getDb } from "./db";
import { iso } from "./db";
import { config } from "./config";
import { endAt, nextUnlock, startAt, unlockAt, unlockedCount } from "./time";
import { CHALLENGE_COLUMNS, rowToChallenge } from "./challenge-row";
import type { ParticipantRow } from "./session";
import { gx, type Gender } from "./gender";
import type { Achievement, CalendarState, Category, Challenge, DoorState, Stats } from "./types";

interface AssignmentJoined {
  day: number;
  accepted_at: unknown;
  completed_at: unknown;
  result: string | null;
  challenge: Challenge;
}

export async function loadAssignments(participantId: string, gender: Gender = "N"): Promise<AssignmentJoined[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, unknown>>(
    `select a.day::int as day, a.accepted_at, a.completed_at, a.result, ${CHALLENGE_COLUMNS}
       from assignments a join challenges c on c.id = a.challenge_id
      where a.participant_id = $1 order by a.day`,
    [participantId],
  );
  return rows.map((r) => ({
    day: Number(r.day),
    accepted_at: r.accepted_at,
    completed_at: r.completed_at,
    result: (r.result as string | null) ?? null,
    challenge: genderize(rowToChallenge(r), gender),
  }));
}

/** Applies the participant's form of address to "[męska|żeńska]" markup in challenge texts. */
function genderize(c: Challenge, g: Gender): Challenge {
  const t = (x: string) => gx(x, g);
  return {
    ...c,
    title: t(c.title), teaser: t(c.teaser), description: t(c.description), steps: c.steps.map(t), tips: t(c.tips),
    easier: t(c.easier), harder: t(c.harder), safety: t(c.safety), caption: t(c.caption), swap: t(c.swap),
  };
}

export function computeStats(list: AssignmentJoined[], unlocked: number): Stats {
  const done = new Set(list.filter((a) => a.completed_at).map((a) => a.day));
  // Streak = consecutive calendar doors (days) with a completed challenge.
  // Today's door doesn't break the streak until the day is over.
  let current = 0;
  let d = unlocked;
  if (d >= 1 && !done.has(d)) d -= 1;
  while (d >= 1 && done.has(d)) {
    current++;
    d--;
  }
  let longest = 0;
  let run = 0;
  for (let i = 1; i <= config.days; i++) {
    run = done.has(i) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const completed = list.filter((a) => a.completed_at);
  const counts = new Map<Category, number>();
  for (const a of completed) counts.set(a.challenge.category, (counts.get(a.challenge.category) ?? 0) + 1);
  let fav: Category | null = null;
  let best = 0;
  for (const a of [...completed].reverse()) {
    const n = counts.get(a.challenge.category)!;
    if (n > best) {
      best = n;
      fav = a.challenge.category;
    }
  }
  return {
    completed: completed.length,
    revealed: list.length,
    currentStreak: current,
    longestStreak: longest,
    minutes: completed.reduce((s, a) => s + a.challenge.minutes, 0),
    favoriteCategory: fav,
    categoriesCompleted: counts.size,
    results: list.filter((a) => a.result).length,
  };
}

export function computeAchievements(s: Stats): Achievement[] {
  const total = config.days;
  const half = Math.ceil(total / 2);
  const b = (id: string, title: string, description: string, value: number, target: number): Achievement => ({
    id,
    title,
    description,
    target,
    progress: Math.min(value, target),
    unlocked: value >= target,
  });
  return [
    b("first-blood", "FIRST BLOOD", "Pierwsze ukończone wyzwanie.", s.completed, 1),
    b("no-excuses", "NO EXCUSES?", "Trzy ukończone wyzwania.", s.completed, 3),
    b("on-fire", "SERIA", "Pięć okienek z rzędu.", s.longestStreak, 5),
    b("questionable", "QUESTIONABLE DECISIONS", "Siedem ukończonych wyzwań.", s.completed, 7),
    b("multisport", "MULTISPORT", "Wyzwania z pięciu różnych dyscyplin.", s.categoriesCompleted, 5),
    b("halfway", "HALFWAY THERE", `${half} ukończonych wyzwań.`, s.completed, half),
    b("protocol", "PROTOKÓŁ", "Pięć zapisanych wyników.", s.results, 5),
    b("legend", "FULL DISTANCE", `Wszystkie ${total} wyzwania ukończone.`, s.completed, total),
  ];
}

export async function buildState(p: ParticipantRow, now: Date): Promise<CalendarState> {
  const list = await loadAssignments(p.id, p.gender ?? "N");
  const unlocked = unlockedCount(now);
  const byDay = new Map(list.map((a) => [a.day, a]));
  const doors: DoorState[] = [];
  for (let day = 1; day <= config.days; day++) {
    const a = byDay.get(day);
    const base = { day, unlockAt: unlockAt(day).toISOString() };
    if (day > unlocked) doors.push({ ...base, status: "LOCKED" });
    else if (!a) doors.push({ ...base, status: "AVAILABLE" });
    else
      doors.push({
        ...base,
        status: a.completed_at ? "COMPLETED" : "OPENED",
        challenge: a.challenge,
        acceptedAt: iso(a.accepted_at),
        completedAt: iso(a.completed_at),
        result: a.result,
      });
  }
  const stats = computeStats(list, unlocked);
  return {
    serverNow: now.toISOString(),
    startAt: startAt().toISOString(),
    endAt: endAt().toISOString(),
    days: config.days,
    unlocked,
    nextUnlockAt: nextUnlock(now)?.toISOString() ?? null,
    participant: {
      nickname: p.nickname,
      gender: p.gender ?? "N",
      difficultyPref: p.difficulty_pref,
      excludeEquipment: p.exclude_equipment,
      linked: !!p.auth_user_id,
      isDemo: p.is_demo,
    },
    doors,
    stats,
    achievements: computeAchievements(stats),
  };
}
