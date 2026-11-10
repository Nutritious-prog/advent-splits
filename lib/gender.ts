export const GENDERS = ["M", "F", "N"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABEL: Record<Gender, { title: string; example: string }> = {
  M: { title: "ON", example: "„Zrobiłeś to!”" },
  F: { title: "ONA", example: "„Zrobiłaś to!”" },
  N: { title: "NEUTRALNIE", example: "„Zrobione!”" },
};

const MARKUP = /\[([^[\]|]*)\|([^[\]]*)\]/g;

/**
 * Renders gendered markup used in content: "[Przebiegłem|Przebiegłam]".
 * M → first, F → second, N → "Przebiegłem/am" (shared prefix) or "Wszedłem/Weszłam".
 */
export function gx(text: string, g: Gender): string {
  if (!text || !text.includes("[")) return text;
  return text.replace(MARKUP, (_, m: string, f: string) => {
    if (g === "M") return m;
    if (g === "F") return f;
    let i = 0;
    while (i < m.length && i < f.length && m[i] === f[i]) i++;
    return i >= 3 ? `${m}/${f.slice(i)}` : `${m}/${f}`;
  });
}

/** Pick a UI string by form of address. */
export function pick(g: Gender | undefined, m: string, f: string, n: string): string {
  return g === "M" ? m : g === "F" ? f : n;
}
