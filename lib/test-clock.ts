import "server-only";
import { cookies } from "next/headers";
import { config } from "./config";
import { endAt, serverNow, startAt, unlockAt, unlockedCount } from "./time";
import { isAdmin } from "./admin";

/**
 * TRYB TESTOWY: lets you use the real participant flow as if it were a chosen
 * advent day. The browser stores an offset (ms) in a cookie; the server adds it
 * to its clock, so countdowns keep ticking naturally.
 *
 * SAFETY (audit SEC-04): always available in local development. Outside development
 * it needs BOTH ENABLE_TEST_MODE=true (e.g. a staging deployment) AND a valid admin
 * session, so even a misconfigured deployment never lets visitors time-travel.
 */
export const TEST_COOKIE = "tua_test_offset";
const MAX_OFFSET = 400 * 86400_000;

/** Pure decision, exported for tests. */
export function testModeDecision(o: { isProd: boolean; flag: string | undefined; admin: boolean }): boolean {
  if (!o.isProd) return true;
  return o.flag === "true" && o.admin;
}

export async function testModeAllowed(): Promise<boolean> {
  if (!config.isProd) return true;
  if (process.env.ENABLE_TEST_MODE !== "true") return false;
  return testModeDecision({ isProd: true, flag: "true", admin: await isAdmin() });
}

async function readOffset(): Promise<number | null> {
  if (!(await testModeAllowed())) return null;
  const raw = (await cookies()).get(TEST_COOKIE)?.value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= MAX_OFFSET ? n : null;
}

/** Clock for participant-facing pages and APIs: real server time, or simulated in test mode. */
export async function requestNow(): Promise<Date> {
  const off = await readOffset();
  const real = serverNow();
  return off === null ? real : new Date(real.getTime() + off);
}

export type TestTarget = { mode: "day"; day: number } | { mode: "midnight"; day: number } | { mode: "pre" } | { mode: "post" };

/** Simulated instant for a target: noon (Warsaw) of the chosen day. */
export function targetInstant(t: TestTarget): Date {
  if (t.mode === "pre") return new Date(startAt().getTime() - 2 * 86400_000 - 3 * 3600_000);
  if (t.mode === "post") return new Date(endAt().getTime() + 2 * 86400_000 + 12 * 3600_000);
  if (t.mode === "midnight") return new Date(unlockAt(t.day).getTime() - 10_000); // 10 s before door `day` unlocks
  return new Date(unlockAt(t.day).getTime() + 12 * 3600_000);
}

export async function setTestTarget(t: TestTarget | null) {
  const jar = await cookies();
  if (!t) {
    jar.delete(TEST_COOKIE);
    return;
  }
  const offset = targetInstant(t).getTime() - serverNow().getTime();
  jar.set(TEST_COOKIE, String(Math.round(offset)), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
}

export async function testStatus() {
  const allowed = await testModeAllowed();
  const off = await readOffset();
  const now = await requestNow();
  const unlocked = unlockedCount(now);
  return {
    allowed,
    active: off !== null,
    now: now.toISOString(),
    unlocked,
    phase: now < startAt() ? "pre" : now >= endAt() ? "post" : "live",
    days: config.days,
  } as const;
}
