import { assertProductionConfig } from "./env-check";

// Runtime guard as well (e.g. env changed after build): never serve placeholders or localhost URLs in production.
assertProductionConfig();

function int(v: string | undefined, d: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : d;
}

const start = (process.env.ADVENT_START || "2026-12-01").trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("ADVENT_START must be YYYY-MM-DD");

export const config = {
  start,
  days: Math.min(31, Math.max(1, int(process.env.ADVENT_DAYS, 24))),
  tz: process.env.ADVENT_TZ || "Europe/Warsaw",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "wlod_run",
  isProd: process.env.NODE_ENV === "production",
};

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (config.isProd) throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
    return "insecure-dev-secret-change-me";
  }
  return s;
}
