import "server-only";
import crypto from "node:crypto";
import type { Q } from "./db";
import { getDb } from "./db";
import { isUnlocked, weekdayOfDay } from "./time";
import { config } from "./config";
import type { Category, Difficulty, DifficultyPref, Gear } from "./types";

export class DoorError extends Error {
  constructor(public code: "LOCKED" | "INVALID_DAY" | "NO_CHALLENGES" | "NOT_OPENED", message: string) {
    super(message);
  }
}

const DIFF_WEIGHTS: Record<DifficultyPref, Record<Difficulty, number>> = {
  BEGINNER: { EASY: 70, MEDIUM: 28, HARD: 2 },
  INTERMEDIATE: { EASY: 35, MEDIUM: 50, HARD: 15 },
  ADVANCED: { EASY: 20, MEDIUM: 45, HARD: 35 },
  SURPRISE: { EASY: 40, MEDIUM: 40, HARD: 20 },
};

interface PoolRow {
  id: string;
  category: Category;
  difficulty: Difficulty;
  minutes: number;
  gear: Gear;
}
interface TakenRow {
  day: number;
  challenge_id: string;
  category: Category;
  difficulty: Difficulty;
}

/** The active challenge scheduled for `day` (if not already used by this participant). */
export function scheduledFor<T extends { id: string; day: number | null }>(pool: T[], day: number, taken: { challenge_id: string }[] = []): T | null {
  const c = pool.find((x) => x.day === day);
  return c && !taken.some((t) => t.challenge_id === c.id) ? c : null;
}

/** Weighted pick using a CSPRNG. Exported for tests. */
export function pickChallenge(
  pool: PoolRow[],
  taken: TakenRow[],
  day: number,
  pref: DifficultyPref,
  excludeEquipment: boolean,
): PoolRow | null {
  const takenIds = new Set(taken.map((t) => t.challenge_id));
  let candidates = pool.filter((c) => !takenIds.has(c.id));
  if (excludeEquipment) {
    const filtered = candidates.filter((c) => c.gear === "NONE" || c.gear === "BASIC");
    if (filtered.length) candidates = filtered;
  }
  if (!candidates.length) return null;

  const neighbours = taken.filter((t) => Math.abs(t.day - day) === 1);
  const catCount = new Map<Category, number>();
  for (const t of taken) catCount.set(t.category, (catCount.get(t.category) ?? 0) + 1);
  const wd = weekdayOfDay(day);
  const weekend = wd === 0 || wd === 6;

  const weights = candidates.map((c) => {
    let w = DIFF_WEIGHTS[pref][c.difficulty];
    if (neighbours.some((n) => n.category === c.category)) w *= 0.15; // variety day to day
    if (c.difficulty === "HARD" && neighbours.some((n) => n.difficulty === "HARD")) w *= 0.2; // no hard streaks
    const cc = catCount.get(c.category) ?? 0;
    if (cc >= 3) w *= 0.35;
    if (!weekend && c.minutes > 75) w *= 0.3; // long adventures prefer weekends
    if (weekend && c.minutes > 75) w *= 1.6;
    if (c.gear === "FACILITY") w *= 0.6; // never make paid venues the norm
    return Math.max(1, Math.round(w * 100));
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = crypto.randomInt(total);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/**
 * Opens door `day` for the participant. Idempotent: the first call assigns a
 * challenge inside a transaction (participant row locked, PK + unique constraints
 * as a second safety net); later calls return the same assignment.
 */
export async function openDoor(
  participant: { id: string; difficulty_pref: DifficultyPref; exclude_equipment: boolean },
  day: number,
  now: Date,
): Promise<{ challengeId: string; created: boolean }> {
  if (!Number.isInteger(day) || day < 1 || day > config.days) throw new DoorError("INVALID_DAY", "Nie ma takiego okienka.");
  if (!isUnlocked(day, now)) throw new DoorError("LOCKED", "Cierpliwości! To okienko jeszcze jest zamknięte.");

  const db = await getDb();
  return db.tx(async (q: Q) => {
    await q.query("select id from participants where id = $1 for update", [participant.id]);
    const existing = await q.query<{ challenge_id: string }>(
      "select challenge_id from assignments where participant_id = $1 and day = $2",
      [participant.id, day],
    );
    if (existing[0]) return { challengeId: existing[0].challenge_id, created: false };

    const taken = await q.query<TakenRow>(
      `select a.day::int as day, a.challenge_id, c.category, c.difficulty
         from assignments a join challenges c on c.id = a.challenge_id
        where a.participant_id = $1`,
      [participant.id],
    );
    const pool = await q.query<PoolRow & { day: number | null }>(
      "select id, category, difficulty, minutes::int as minutes, gear, day::int as day from challenges where active = true",
    );
    // Shared calendar: the challenge scheduled for this day, same for everyone.
    // The weighted random picker is only a fallback for unscheduled days.
    const pick =
      scheduledFor(pool, day, taken) ??
      pickChallenge(pool.filter((c) => c.day == null), taken, day, participant.difficulty_pref, participant.exclude_equipment);
    if (!pick) throw new DoorError("NO_CHALLENGES", "Zabrakło wyzwań w puli. Daj znać organizatorowi.");

    const ins = await q.query<{ challenge_id: string }>(
      `insert into assignments (participant_id, day, challenge_id) values ($1, $2, $3)
       on conflict do nothing returning challenge_id`,
      [participant.id, day, pick.id],
    );
    if (ins[0]) return { challengeId: ins[0].challenge_id, created: true };
    const again = await q.query<{ challenge_id: string }>(
      "select challenge_id from assignments where participant_id = $1 and day = $2",
      [participant.id, day],
    );
    if (!again[0]) throw new DoorError("NO_CHALLENGES", "Nie udało się przydzielić wyzwania. Spróbuj ponownie.");
    return { challengeId: again[0].challenge_id, created: false };
  });
}
