import { describe, expect, it } from "vitest";
import { pickChallenge, scheduledFor } from "@/lib/assign";
import { ALL_CHALLENGES } from "@/lib/challenges";

const pool = ALL_CHALLENGES.map((c) => ({ id: c.id, category: c.category, difficulty: c.difficulty, minutes: c.minutes, gear: c.gear, day: c.day }));
type Taken = { day: number; challenge_id: string; category: (typeof pool)[number]["category"]; difficulty: (typeof pool)[number]["difficulty"] };

describe("shared calendar", () => {
  it("has exactly one scheduled challenge for every day 1–24", () => {
    const days = pool.map((c) => c.day).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(days).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it("gives everyone the same challenge on the same day", () => {
    for (let day = 1; day <= 24; day++) {
      expect(scheduledFor(pool, day)?.day).toBe(day);
      expect(scheduledFor(pool, day)?.id).toBe(scheduledFor([...pool].reverse(), day)?.id);
    }
  });

  it("does not hand out a scheduled challenge twice to the same participant", () => {
    const c = scheduledFor(pool, 5)!;
    expect(scheduledFor(pool, 5, [{ challenge_id: c.id }])).toBeNull();
  });
});

describe("calendar load (CONT-01)", () => {
  it("never schedules two HARD days in a row", () => {
    const byDay = [...ALL_CHALLENGES].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    for (let i = 1; i < byDay.length; i++) {
      expect(byDay[i - 1].difficulty === "HARD" && byDay[i].difficulty === "HARD", `days ${byDay[i - 1].day}-${byDay[i].day}`).toBe(false);
    }
  });
});

describe("fallback picker (unscheduled days)", () => {
  it("never repeats a challenge", () => {
    for (let run = 0; run < 20; run++) {
      const taken: Taken[] = [];
      for (let day = 1; day <= 24; day++) {
        const p = pickChallenge(pool, taken, day, "SURPRISE", false)!;
        expect(taken.some((t) => t.challenge_id === p.id)).toBe(false);
        taken.push({ day, challenge_id: p.id, category: p.category, difficulty: p.difficulty });
      }
    }
  });

  it("respects the no-specialised-equipment preference", () => {
    for (let i = 0; i < 200; i++) expect(["NONE", "BASIC"]).toContain(pickChallenge(pool, [], 1 + (i % 24), "SURPRISE", true)!.gear);
  });

  it("returns null when the pool is exhausted", () => {
    const taken: Taken[] = pool.map((c, i) => ({ day: i + 1, challenge_id: c.id, category: c.category, difficulty: c.difficulty }));
    expect(pickChallenge(pool, taken, 5, "SURPRISE", false)).toBeNull();
  });
});
