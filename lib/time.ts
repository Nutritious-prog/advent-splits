import { config } from "./config";

function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** UTC instant of local midnight (00:00) of y-m-d in the given IANA zone. */
export function zonedMidnight(y: number, m: number, d: number, tz = config.tz): Date {
  const guess = Date.UTC(y, m - 1, d);
  const off = tzOffsetMs(new Date(guess), tz);
  let t = guess - off;
  const off2 = tzOffsetMs(new Date(t), tz);
  if (off2 !== off) t = guess - off2;
  return new Date(t);
}

function startParts() {
  const [y, m, d] = config.start.split("-").map(Number);
  return { y, m, d };
}

/** Instant when door `day` (1-based) unlocks. */
export function unlockAt(day: number): Date {
  const { y, m, d } = startParts();
  return zonedMidnight(y, m, d + day - 1);
}

export function unlockTimes(): Date[] {
  return Array.from({ length: config.days }, (_, i) => unlockAt(i + 1));
}

export function startAt(): Date {
  return unlockAt(1);
}

export function endAt(): Date {
  return unlockAt(config.days + 1);
}

/** Number of unlocked doors at `now` (0 before launch, `days` after the last unlock). */
export function unlockedCount(now: Date): number {
  let n = 0;
  for (let i = 1; i <= config.days; i++) if (unlockAt(i).getTime() <= now.getTime()) n = i;
  return n;
}

export function isUnlocked(day: number, now: Date): boolean {
  return day >= 1 && day <= config.days && unlockAt(day).getTime() <= now.getTime();
}

export function nextUnlock(now: Date): Date | null {
  const n = unlockedCount(now);
  return n < config.days ? unlockAt(n + 1) : null;
}

/** Weekday (0 = Sunday) of the calendar date of door `day`. */
export function weekdayOfDay(day: number): number {
  const { y, m, d } = startParts();
  return new Date(Date.UTC(y, m - 1, d + day - 1)).getUTCDay();
}

/**
 * Authoritative server clock. DEV_NOW lets you time-travel locally;
 * it is ignored in production builds so it can never unlock doors publicly.
 */
export function serverNow(): Date {
  if (!config.isProd && process.env.DEV_NOW) {
    const d = new Date(process.env.DEV_NOW);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
