import type { Challenge } from "./types";

export const CHALLENGE_COLUMNS =
  "c.id, c.category, c.title, c.teaser, c.description, c.steps, c.tips, c.difficulty, c.minutes, c.equipment, c.gear, c.icon, c.easier, c.harder, c.safety, c.caption, c.result_type, c.result_unit, c.day, c.swap, c.active";

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function rowToChallenge(r: Record<string, unknown>): Challenge {
  return {
    id: String(r.id),
    category: r.category as Challenge["category"],
    title: String(r.title),
    teaser: String(r.teaser),
    description: String(r.description),
    steps: arr(r.steps),
    tips: String(r.tips ?? ""),
    difficulty: r.difficulty as Challenge["difficulty"],
    minutes: Number(r.minutes),
    equipment: arr(r.equipment),
    gear: r.gear as Challenge["gear"],
    icon: String(r.icon),
    easier: String(r.easier ?? ""),
    harder: String(r.harder ?? ""),
    safety: String(r.safety ?? ""),
    caption: String(r.caption ?? ""),
    resultType: r.result_type as Challenge["resultType"],
    resultUnit: String(r.result_unit ?? ""),
    day: r.day == null ? null : Number(r.day),
    swap: String(r.swap ?? ""),
    active: Boolean(r.active),
  };
}
