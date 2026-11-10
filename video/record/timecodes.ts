// Prints the edit's timecodes (scene starts and captions), e.g. for writing the voiceover.
import { INTRO, PLACED, TOTAL } from "../src/timeline";

const f = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};
console.log(`intro      0:00.0 – ${f(INTRO)}`);
for (const p of PLACED) {
  console.log(`${p.id.padEnd(10)} ${f(p.start)} – ${f(p.end)}`);
  for (const c of p.captions) console.log(`             ${f(p.start + c.at)}  ${c.lines.join(" ")}`);
}
console.log(`outro      ${f(PLACED[PLACED.length - 1].end - 0.3)} – ${f(TOTAL)}`);
