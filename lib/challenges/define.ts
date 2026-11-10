import type { Category, Challenge, Difficulty, Gear, ResultType } from "../types";

export interface CalendarSeed {
  /** Calendar day (1–24). Everyone gets the same challenge on the same day. */
  day: number;
  id: string;
  category: Category;
  title: string;
  teaser: string;
  description: string;
  steps: string[];
  tips: string;
  difficulty: Difficulty;
  minutes: number;
  equipment?: string[];
  gear?: Gear;
  icon: string;
  easier: string;
  harder: string;
  /** Equivalent for another endurance discipline (runner on a swim day etc.). */
  swap: string;
  safety?: string;
  /** May contain gender markup: "[Przebiegłem|Przebiegłam]". */
  caption?: string;
  /** [type, unit]: drives the adaptive result form */
  result?: [ResultType, string?];
}

export function defineCalendar(items: CalendarSeed[]): Challenge[] {
  return items.map((s) => ({
    id: `d${String(s.day).padStart(2, "0")}-${s.id}`,
    category: s.category,
    title: s.title,
    teaser: s.teaser,
    description: s.description,
    steps: s.steps,
    tips: s.tips,
    difficulty: s.difficulty,
    minutes: s.minutes,
    equipment: s.equipment ?? [],
    gear: s.gear ?? ((s.equipment?.length ?? 0) > 0 ? "BASIC" : "NONE"),
    icon: s.icon,
    easier: s.easier,
    harder: s.harder,
    safety: s.safety ?? "",
    caption: s.caption ?? "",
    resultType: s.result?.[0] ?? "NOTE",
    resultUnit: s.result?.[1] ?? "",
    day: s.day,
    swap: s.swap,
    active: true,
  }));
}
