import { describe, expect, it } from "vitest";
import { isUnlocked, nextUnlock, unlockAt, unlockedCount, zonedMidnight } from "@/lib/time";

describe("Europe/Warsaw unlock schedule", () => {
  it("door 1 opens 1 Dec 00:00 Warsaw (= 30 Nov 23:00 UTC)", () => {
    expect(unlockAt(1).toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(unlockAt(24).toISOString()).toBe("2026-12-23T23:00:00.000Z");
  });

  it("handles DST transitions in the zone helper", () => {
    expect(zonedMidnight(2026, 3, 29, "Europe/Warsaw").toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(zonedMidnight(2026, 3, 30, "Europe/Warsaw").toISOString()).toBe("2026-03-29T22:00:00.000Z");
  });

  it("counts unlocked doors exactly at the boundary", () => {
    const t = unlockAt(5).getTime();
    expect(unlockedCount(new Date(t - 1))).toBe(4);
    expect(unlockedCount(new Date(t))).toBe(5);
    expect(isUnlocked(5, new Date(t - 1))).toBe(false);
    expect(isUnlocked(5, new Date(t))).toBe(true);
  });

  it("nothing is open before launch, everything after the end", () => {
    const before = new Date("2026-11-08T12:00:00Z");
    const after = new Date("2027-01-10T12:00:00Z");
    expect(unlockedCount(before)).toBe(0);
    expect(nextUnlock(before)?.toISOString()).toBe(unlockAt(1).toISOString());
    expect(unlockedCount(after)).toBe(24);
    expect(nextUnlock(after)).toBeNull();
  });

  it("rejects invalid days", () => {
    const now = new Date("2027-01-10T12:00:00Z");
    expect(isUnlocked(0, now)).toBe(false);
    expect(isUnlocked(25, now)).toBe(false);
  });
});
