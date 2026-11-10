import type { ResultType } from "./types";

export const RESULT_MAX = 80;

export function resultPlaceholder(type: ResultType, unit: string): string {
  switch (type) {
    case "TIME":
      return unit === "s" ? "np. 58" : unit === "min" ? "np. 12" : unit.startsWith("h") ? "np. 1:05:30" : "np. 8:12";
    case "REPS":
    case "COUNT":
      return "np. 42";
    case "DISTANCE":
      return unit === "m" ? "np. 2400" : unit.startsWith("cm") ? "np. 12" : "np. 5,2";
    case "WEIGHT":
      return "np. 24";
    default:
      return "Krótka notatka, np. „Było ciężko, ale zrobione”";
  }
}

export function resultLabel(type: ResultType): string {
  return (
    { TIME: "Twój czas", REPS: "Liczba powtórzeń", COUNT: "Twój wynik", DISTANCE: "Dystans", WEIGHT: "Ciężar", NOTE: "Notatka" } as const
  )[type];
}

function clean(s: string) {
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** Validates and formats a result. Returns {ok, value} or {ok:false, error}. Used on client and server. */
export function formatResult(
  type: ResultType,
  unit: string,
  raw: string,
  free: boolean,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = clean(raw ?? "");
  if (!v) return { ok: true, value: null };
  if (v.length > RESULT_MAX) return { ok: false, error: `Maksymalnie ${RESULT_MAX} znaków.` };
  if (free || type === "NOTE") return { ok: true, value: v };
  const u = unit ? ` ${unit}` : "";
  switch (type) {
    case "TIME": {
      if (unit === "s" || unit === "min") {
        if (!/^\d{1,5}$/.test(v)) return { ok: false, error: "Wpisz liczbę, np. 58." };
        return { ok: true, value: `${Number(v)}${u}` };
      }
      if (!/^\d{1,3}(:[0-5]\d){0,2}$/.test(v)) return { ok: false, error: "Wpisz czas w formacie 8:12 lub 1:05:30." };
      return { ok: true, value: v };
    }
    case "REPS":
    case "COUNT": {
      if (!/^\d{1,6}$/.test(v)) return { ok: false, error: "Wpisz liczbę całkowitą." };
      return { ok: true, value: `${Number(v)}${u}` };
    }
    case "DISTANCE":
    case "WEIGHT": {
      if (!/^\d{1,6}([.,]\d{1,2})?$/.test(v)) return { ok: false, error: "Wpisz liczbę, np. 5,2." };
      return { ok: true, value: `${v.replace(".", ",")}${u}` };
    }
  }
  return { ok: true, value: v };
}
