// Contact sheet for review: N evenly spaced frames per clip, laid out in a grid and screenshotted.
//   node record/sheet.mjs <clip.mp4> [count] [out.png]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const FFMPEG = path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const FFPROBE = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe");
const [clip, countRaw, outRaw] = process.argv.slice(2);
const count = Number(countRaw) || 8;
const dur = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip]).toString());
const tmp = path.join(ROOT, "record", "peek", path.basename(clip, path.extname(clip)));
fs.mkdirSync(tmp, { recursive: true });
const imgs = [];
for (let i = 0; i < count; i++) {
  const t = (dur * (i + 0.5)) / count;
  const f = path.join(tmp, `${i}.jpg`);
  execFileSync(FFMPEG, ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", clip, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", f]);
  imgs.push({ t, src: "data:image/jpeg;base64," + fs.readFileSync(f).toString("base64") });
}
const cols = Math.min(count, 4);
const html = `<body style="margin:0;background:#000;font:12px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;width:${cols * 300}px">
${imgs.map((i) => `<div><img src="${i.src}" style="width:100%;display:block"><div>${i.t.toFixed(1)}s</div></div>`).join("")}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: cols * 300, height: 400 } });
await p.setContent(html);
await p.waitForTimeout(200);
const out = outRaw ?? path.join(ROOT, "record", "peek", path.basename(clip, path.extname(clip)) + "-sheet.png");
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log(out);
