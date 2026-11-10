import { z } from "zod";
import { DIFFICULTY_PREFS } from "./types";
import { GENDERS } from "./gender";

export const nicknameSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, "Nick musi mieć co najmniej 2 znaki.")
      .max(24, "Nick może mieć maksymalnie 24 znaki.")
      .regex(/^[\p{L}\p{N} ._\-]+$/u, "Nick może zawierać litery, cyfry, spacje oraz . _ -"),
  );

export const prefsSchema = z.object({
  difficultyPref: z.enum(DIFFICULTY_PREFS).optional(),
  excludeEquipment: z.boolean().optional(),
  gender: z.enum(GENDERS).optional(),
});
