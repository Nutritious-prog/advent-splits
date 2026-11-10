import type { Category, Difficulty, DifficultyPref, Gear } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  RUNNING: "Bieganie",
  CYCLING: "Rower",
  SWIMMING: "Pływanie",
  HIKING: "Wzniesienia i marsz",
  MULTISPORT: "Multisport",
  STRENGTH: "Siłownia",
  CALISTHENICS: "Kalistenika",
  MOBILITY: "Mobilność",
  COORDINATION: "Koordynacja",
  CARDIO: "Cardio",
  OUTDOOR: "Outdoor",
  SKILLS: "Nowe sporty",
  GAMES: "Gry ruchowe",
  HYBRID: "Hybryda",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Łatwe",
  MEDIUM: "Średnie",
  HARD: "Trudne",
};

export const GEAR_LABEL: Record<Gear, string> = {
  NONE: "Bez sprzętu",
  BASIC: "Prosty sprzęt",
  GYM: "Siłownia",
  FACILITY: "Obiekt sportowy",
};

export const PREF_LABEL: Record<DifficultyPref, { title: string; desc: string }> = {
  BEGINNER: { title: "POCZĄTKUJĄCY", desc: "Głównie łatwe wyzwania. Ruch bez dramatu." },
  INTERMEDIATE: { title: "ŚREDNI", desc: "Miks łatwych i średnich, czasem coś mocniejszego." },
  ADVANCED: { title: "ZAAWANSOWANY", desc: "Więcej trudnych wyzwań. Nadal z dniami oddechu." },
  SURPRISE: { title: "ZASKOCZ MNIE", desc: "Pełna losowość. Niech grudzień zdecyduje." },
};

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
