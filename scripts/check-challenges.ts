import { ALL_CHALLENGES } from "../lib/challenges";
import { CATEGORIES } from "../lib/types";
import { ICON_NAMES } from "../lib/icon-names";

const ids = new Set<string>();
const titles = new Set<string>();
const problems: string[] = [];
for (const c of ALL_CHALLENGES) {
  if (ids.has(c.id)) problems.push(`duplicate id ${c.id}`);
  ids.add(c.id);
  if (titles.has(c.title)) problems.push(`duplicate title ${c.title}`);
  titles.add(c.title);
  if (!ICON_NAMES.includes(c.icon)) problems.push(`${c.id}: unknown icon ${c.icon}`);
  if (c.steps.length < 3) problems.push(`${c.id}: <3 steps`);
  for (const k of ["teaser", "description", "tips", "easier", "harder"] as const)
    if (!c[k]) problems.push(`${c.id}: missing ${k}`);
  if (c.title.length > 80) problems.push(`${c.id}: title too long`);
}
const days = ALL_CHALLENGES.map((c) => c.day).filter((d): d is number => d != null).sort((a, b) => a - b);
if (days.length !== 24 || days.some((d, i) => d !== i + 1)) problems.push(`calendar days must be exactly 1–24, got: ${days.join(",")}`);
for (const c of ALL_CHALLENGES) if (!c.swap) problems.push(`${c.id}: missing swap`);
const byCat = Object.fromEntries(CATEGORIES.map((k) => [k, ALL_CHALLENGES.filter((c) => c.category === k).length]));
const byDiff = ["EASY", "MEDIUM", "HARD"].map((d) => `${d}=${ALL_CHALLENGES.filter((c) => c.difficulty === d).length}`);
const byGear = ["NONE", "BASIC", "GYM", "FACILITY"].map((g) => `${g}=${ALL_CHALLENGES.filter((c) => c.gear === g).length}`);
console.log(`total: ${ALL_CHALLENGES.length}`);
console.log(byCat);
console.log(byDiff.join(" "), "|", byGear.join(" "));
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("OK");
