// Bundles once, then renders stills (for review) or the final videos.
//   node render.mjs stills <compId> <frame,frame,...> [scale]
//   node render.mjs video [compId ...]        (default: all four)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const [mode, ...rest] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts"), publicDir: path.join(ROOT, "public") });
const OUT = path.join(ROOT, "out");
const FFMPEG = path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
fs.mkdirSync(path.join(OUT, "stills"), { recursive: true });

if (mode === "stills") {
  const [id, list, scale] = rest;
  const composition = await selectComposition({ serveUrl, id });
  for (const f of list.split(",").map(Number)) {
    const output = path.join(OUT, "stills", `${id}-${String(f).padStart(5, "0")}.png`);
    await renderStill({ serveUrl, composition, frame: f, output, scale: Number(scale) || 0.5 });
    console.log(output);
  }
} else {
  const ids = rest.length ? rest : ["Promo-9x16-napisy", "Promo-9x16-czyste", "Promo-16x9-napisy", "Promo-16x9-czyste"];
  for (const id of ids) {
    const composition = await selectComposition({ serveUrl, id });
    const output = path.join(OUT, `${id}.mp4`);
    // Long renders of thousands of 1170×2532 frames make Chrome tabs bloat and stall, so render in chunks,
    // each in a fresh browser, and join them without re-encoding.
    const CHUNK = 800;
    const parts = [];
    const partsDir = path.join(OUT, "parts");
    fs.mkdirSync(partsDir, { recursive: true });
    for (let a = 0; a < composition.durationInFrames; a += CHUNK) {
      const b = Math.min(composition.durationInFrames - 1, a + CHUNK - 1);
      const part = path.join(partsDir, `${id}-${String(a).padStart(5, "0")}.mp4`);
      await renderMedia({
        serveUrl,
        composition,
        codec: "h264",
        crf: 16,
        pixelFormat: "yuv420p",
        x264Preset: "slow",
        frameRange: [a, b],
        outputLocation: part,
        concurrency: 4,
        timeoutInMilliseconds: 120000,
      });
      parts.push(part);
      console.log(`${id}: ${Math.round(((b + 1) / composition.durationInFrames) * 100)}%`);
    }
    const list = path.join(partsDir, `${id}.txt`);
    fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", output]);
    for (const p of [...parts, list]) fs.rmSync(p);
    console.log("done", output);
  }
}
