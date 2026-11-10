import { describe, expect, it } from "vitest";
import { computeAchievements, computeStats } from "@/lib/progress";
import { ALL_CHALLENGES } from "@/lib/challenges";

const ch = (i: number) => ALL_CHALLENGES[i];
const a = (day: number, done: boolean, i = day) => ({
  day,
  accepted_at: null,
  completed_at: done ? new Date() : null,
  result: null,
  challenge: ch(i),
});

describe("streaks and stats", () => {
  it("today's unfinished door does not break the streak", () => {
    expect(computeStats([a(1, true), a(2, true), a(3, true), a(4, false)], 4).currentStreak).toBe(3);
  });

  it("a missed past day breaks the streak", () => {
    const s = computeStats([a(1, true), a(2, true), a(3, false), a(4, false)], 5);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(2);
  });

  it("counts the run ending yesterday while today is pending", () => {
    const s = computeStats([a(1, true), a(2, false), a(3, true), a(4, true)], 5);
    expect(s.currentStreak).toBe(2);
    expect(s.longestStreak).toBe(2);
  });

  it("activity minutes come only from completed challenges", () => {
    const list = [a(1, true, 0), a(2, false, 1)];
    const s = computeStats(list, 2);
    expect(s.minutes).toBe(ch(0).minutes);
    expect(s.revealed).toBe(2);
    expect(s.completed).toBe(1);
  });

  it("achievements unlock at their thresholds", () => {
    // first challenge of each of the 7 categories
    const idx = [...new Set(ALL_CHALLENGES.map((c) => c.category))].map((cat) => ALL_CHALLENGES.findIndex((c) => c.category === cat));
    const list = idx.map((ci, i) => a(i + 1, true, ci));
    const on = computeAchievements(computeStats(list, 7))
      .filter((x) => x.unlocked)
      .map((x) => x.id);
    expect(on).toEqual(expect.arrayContaining(["first-blood", "no-excuses", "on-fire", "questionable", "multisport"]));
    expect(on).not.toContain("legend");
  });
});
