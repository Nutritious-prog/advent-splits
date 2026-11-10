import { z } from "zod";
import { CATEGORIES, DIFFICULTIES, GEAR_LEVELS, RESULT_TYPES } from "./types";

const text = (max: number) => z.string().trim().max(max);

export const challengeInput = z.object({
  category: z.enum(CATEGORIES),
  title: text(80).min(2),
  teaser: text(200).min(2),
  description: text(2000).min(2),
  steps: z.array(text(400).min(1)).min(1).max(12),
  tips: text(600),
  difficulty: z.enum(DIFFICULTIES),
  minutes: z.number().int().min(1).max(600),
  equipment: z.array(text(120).min(1)).max(10),
  gear: z.enum(GEAR_LEVELS),
  icon: text(40).min(1),
  easier: text(600),
  harder: text(600),
  safety: text(800),
  caption: text(300),
  resultType: z.enum(RESULT_TYPES),
  resultUnit: text(40),
  day: z.number().int().min(1).max(31).nullable(),
  swap: text(800),
  active: z.boolean(),
});

export type ChallengeInput = z.infer<typeof challengeInput>;

export function challengeParams(c: ChallengeInput) {
  return [
    c.category, c.title, c.teaser, c.description, JSON.stringify(c.steps), c.tips, c.difficulty, c.minutes,
    JSON.stringify(c.equipment), c.gear, c.icon, c.easier, c.harder, c.safety, c.caption, c.resultType,
    c.resultUnit, c.active, c.day, c.swap,
  ];
}
