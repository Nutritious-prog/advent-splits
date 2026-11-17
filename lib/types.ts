/** Endurance-focused categories used by the calendar. */
export const CATEGORIES = ["RUNNING", "CYCLING", "SWIMMING", "HIKING", "STRENGTH", "MOBILITY", "MULTISPORT"] as const;
/** Categories of the retired random pool (kept so old rows still render). */
export const LEGACY_CATEGORIES = ["CALISTHENICS", "COORDINATION", "CARDIO", "OUTDOOR", "SKILLS", "GAMES", "HYBRID"] as const;
export type Category = (typeof CATEGORIES)[number] | (typeof LEGACY_CATEGORIES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const GEAR_LEVELS = ["NONE", "BASIC", "GYM", "FACILITY"] as const;
export type Gear = (typeof GEAR_LEVELS)[number];

export const RESULT_TYPES = ["TIME", "REPS", "DISTANCE", "COUNT", "WEIGHT", "NOTE"] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

export const DIFFICULTY_PREFS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "SURPRISE"] as const;
export type DifficultyPref = (typeof DIFFICULTY_PREFS)[number];

export interface Challenge {
  id: string;
  category: Category;
  title: string;
  teaser: string;
  description: string;
  steps: string[];
  tips: string;
  difficulty: Difficulty;
  minutes: number;
  equipment: string[];
  gear: Gear;
  icon: string;
  easier: string;
  harder: string;
  safety: string;
  caption: string;
  resultType: ResultType;
  resultUnit: string;
  /** Calendar day this challenge is scheduled for (same for everyone). */
  day: number | null;
  /** Equivalent for people from another endurance discipline. */
  swap: string;
  active: boolean;
}

export type DoorStatus = "LOCKED" | "AVAILABLE" | "OPENED" | "COMPLETED";

export interface DoorState {
  day: number;
  unlockAt: string;
  status: DoorStatus;
  challenge?: Challenge;
  acceptedAt?: string | null;
  completedAt?: string | null;
  result?: string | null;
}

export interface Stats {
  completed: number;
  revealed: number;
  currentStreak: number;
  longestStreak: number;
  minutes: number;
  favoriteCategory: Category | null;
  categoriesCompleted: number;
  results: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  /** Progress towards the badge (capped at target). */
  progress: number;
  target: number;
}

export interface ParticipantView {
  nickname: string;
  gender: import("./gender").Gender;
  difficultyPref: DifficultyPref;
  excludeEquipment: boolean;
  isDemo: boolean;
}

export interface CalendarState {
  serverNow: string;
  startAt: string;
  endAt: string;
  days: number;
  unlocked: number;
  nextUnlockAt: string | null;
  participant: ParticipantView;
  doors: DoorState[];
  stats: Stats;
  achievements: Achievement[];
}
