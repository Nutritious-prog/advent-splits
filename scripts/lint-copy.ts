// Copy linter for challenge texts: catches mechanical mistakes before launch.
import { ALL_CHALLENGES } from "../lib/challenges";

const issues: string[] = [];
const check = (id: string, field: string, t: string) => {
  if (!t) return;
  if (/ {2,}/.test(t)) issues.push(`${id}.${field}: double space`);
  if (/ [,.;:!?]/.test(t)) issues.push(`${id}.${field}: space before punctuation`);
  const rep = t.match(/(?<!\p{L})(\p{L}+) \1(?!\p{L})/iu);
  if (rep) issues.push(`${id}.${field}: repeated word "${rep[0]}"`);
  if ((t.match(/„/g) || []).length !== (t.match(/”/g) || []).length) issues.push(`${id}.${field}: unbalanced „”`);
  if ((t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length) issues.push(`${id}.${field}: unbalanced ()`);
  if ((t.match(/\[/g) || []).length !== (t.match(/\]/g) || []).length) issues.push(`${id}.${field}: unbalanced gender markup`);
  if (/[a-ząćęłńóśźż][.!?] [a-ząćęłńóśźż]/.test(t) && !/(?<!\p{L})(np|ok|tj|m\.in|min|maks|ul|cm|km|kg)\. \p{Ll}/iu.test(t))
    issues.push(`${id}.${field}: lowercase after sentence end: "${t.match(/.{0,15}[a-ząćęłńóśźż][.!?] [a-ząćęłńóśźż].{0,10}/)![0]}"`);
  if (field !== "caption" && /\b\p{L}+(łem|łam)\b/u.test(t) && !/(tyłem|stołem|ciałem|sygnałem|kozłem|finałem|działem|dołem|kołem|wałem|udziałem)\b/.test(t))
    issues.push(`${id}.${field}: first-person form outside caption: "${t.match(/\b\p{L}+(łem|łam)\b/u)![0]}"`);
};
for (const c of ALL_CHALLENGES) {
  for (const f of ["title", "teaser", "description", "tips", "easier", "harder", "safety", "caption", "swap"] as const) check(c.id, f, c[f]);
  c.steps.forEach((s, i) => {
    check(c.id, `steps[${i}]`, s);
    if (!/[.!?:”)]$/.test(s)) issues.push(`${c.id}.steps[${i}]: no closing punctuation`);
  });
  for (const f of ["description", "tips", "easier", "harder", "safety", "swap"] as const)
    if (c[f] && !/[.!?”)]$/.test(c[f])) issues.push(`${c.id}.${f}: no closing punctuation`);
  if (c.difficulty === "HARD" && !c.safety) issues.push(`${c.id}: HARD without safety note`);
  if (c.gear === "FACILITY" && !/bez|w domu|domow|zamiast|alternatyw/i.test(c.easier + " " + c.swap)) issues.push(`${c.id}: FACILITY without free alternative in easier`);
}
console.log(issues.length ? issues.join("\n") : "no issues");
console.log(`checked ${ALL_CHALLENGES.length} challenges, ${issues.length} issues`);
