// Records the app scene by scene in a phone-sized headless Chromium (CDP screencast, 3x pixel density),
// then encodes each scene to public/rec/<scene>.mp4 at a constant 30 fps plus <scene>.json with timed
// marks (taps with coordinates, beats) that the Remotion composition uses for zooms and tap ripples.
//
//   node record/record.mjs [baseUrl] [scene ...]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3006";
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("http"));
const ADMIN = process.env.REC_ADMIN_PASSWORD ?? "nagranie-promo-2026";
const W = 390, H = 844, DSF = 3, FPS = 60;
const FRAMES = path.join(ROOT, "public", "frames");
const OUT = path.join(ROOT, "public", "rec");
fs.mkdirSync(OUT, { recursive: true });
// Remotion ships an ffmpeg build with libx264; use it so nothing else has to be installed.
const FFMPEG = path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

const HIDE_CSS = `
  /* test-mode pill and anything dev-only stays out of the footage */
  .fixed.bottom-20.left-3, nextjs-portal { display: none !important; }
  * { caret-color: #d6a441; }
`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--hide-scrollbars"] });

async function phone() {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DSF,
    isMobile: true,
    hasTouch: true,
    bypassCSP: true,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.addInitScript((css) => {
    const add = () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add);
  }, HIDE_CSS);
  const page = await ctx.newPage();
  await page.goto(BASE + "/prywatnosc"); // any page, so fetch() has the right origin
  return { ctx, page };
}

const post = (page, p, body) =>
  page.evaluate(
    async ([p, b]) => {
      const r = await fetch(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b ?? {}) });
      return { status: r.status, body: await r.text() };
    },
    [p, body],
  );

async function asAdmin(page) {
  const r = await post(page, "/api/admin/login", { password: ADMIN });
  if (r.status !== 200) throw new Error("admin login failed: " + r.body);
}
const clock = (page, day) => post(page, "/api/test-clock", { mode: "day", day });

async function seedDays(page, days, results = {}) {
  for (const d of days) {
    await clock(page, d);
    for (const a of ["open", "accept", "complete"]) {
      const r = await post(page, `/api/doors/${d}/${a}`, a === "complete" ? { done: true } : {});
      if (r.status >= 400) throw new Error(`day ${d} ${a}: ${r.status} ${r.body}`);
    }
    if (results[d]) await post(page, `/api/doors/${d}/result`, { value: results[d] });
  }
}

// ---------- recording helpers ----------
async function record(page, name, fn) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const dir = path.join(FRAMES, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const marks = [];
  let t0 = null;
  let pending = Promise.resolve();
  // Screencast timestamps are epoch seconds; marks use the same clock, so both share one timeline.
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const t = metadata.timestamp;
    if (t0 === null) t0 = t;
    const file = String(frames.length).padStart(5, "0") + ".jpg";
    frames.push({ t: t - t0, file });
    pending = pending.then(() => fs.promises.writeFile(path.join(dir, file), Buffer.from(data, "base64")));
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 94, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  // a no-op repaint so the first frame arrives immediately
  await page.evaluate(() => document.body.style.setProperty("--rec", String(Math.random())));
  while (t0 === null) await page.waitForTimeout(10);
  const now = () => Date.now() / 1000 - t0;
  const mark = (label, extra = {}) => marks.push({ t: now(), label, ...extra });
  await fn({ mark, now });
  await page.waitForTimeout(400);
  const end = now();
  await cdp.send("Page.stopScreencast");
  await pending;
  await cdp.detach();
  fs.writeFileSync(path.join(dir, "frames.json"), JSON.stringify({ name, end, frames, marks }));
  encode(name);
}

// Constant-rate clip: output frame k shows the newest captured frame at time k / FPS.
function encode(name) {
  const dir = path.join(FRAMES, name);
  const { end, frames, marks } = JSON.parse(fs.readFileSync(path.join(dir, "frames.json"), "utf8"));
  const total = Math.floor(end * FPS);
  const list = [];
  let i = 0;
  for (let k = 0; k < total; k++) {
    const t = k / FPS;
    while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
    list.push(`file '${frames[i].file}'`, `duration ${(1 / FPS).toFixed(6)}`);
  }
  list.push(`file '${frames[i].file}'`);
  fs.writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
  execFileSync(
    FFMPEG,
    ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-vf", `scale=${W * DSF}:${H * DSF}:flags=lanczos,format=yuv420p`,
      "-r", String(FPS), "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-g", "30", "-movflags", "+faststart",
      path.join(OUT, `${name}.mp4`)],
    { cwd: dir, stdio: "inherit" },
  );
  const meta = { name, width: W, height: H, dsf: DSF, fps: FPS, duration: total / FPS, captured: frames.length, marks };
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(meta, null, 2));
  console.log(`${name}: ${meta.duration.toFixed(1)} s, ${(frames.length / end).toFixed(1)} captured fps`);
}
if (process.argv.includes("--encode-only")) {
  for (const n of fs.readdirSync(FRAMES)) if (fs.existsSync(path.join(FRAMES, n, "frames.json"))) encode(n);
  process.exit(0);
}

async function tap(page, mark, locator, label = "tap") {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw new Error("no box for " + label);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  mark(label, { x, y, w: b.width, h: b.height });
  await page.mouse.move(x, y);
  await page.waitForTimeout(120);
  await locator.click();
}

// Eased scroll of the window or of the open dialog.
async function glide(page, dy, ms = 1400, target = "window") {
  await page.evaluate(
    async ([dy, ms, target]) => {
      const el = target === "dialog" ? document.querySelector("[role=dialog]") : null;
      const get = () => (el ? el.scrollTop : window.scrollY);
      const set = (v) => (el ? (el.scrollTop = v) : window.scrollTo(0, v));
      const from = get();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      await new Promise((done) => {
        const s = performance.now();
        const step = (n) => {
          const t = Math.min(1, (n - s) / ms);
          set(from + dy * ease(t));
          t < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      });
    },
    [dy, ms, target],
  );
}
const wait = (page, ms) => page.waitForTimeout(ms);
const save = async (page, url, file) => {
  const r = await page.request.get(BASE + url);
  if (!r.ok()) throw new Error(`${url}: ${r.status()}`);
  fs.writeFileSync(path.join(OUT, file), await r.body());
};

// ---------- scenes ----------
// Main persona: joins on day 7, has days 1–6 done, completes day 7 (swim 1000 m) on camera.
const A = await phone();
await asAdmin(A.page);
await clock(A.page, 7);

await record(A.page, "s1-landing", async ({ mark }) => {
  await A.page.goto(BASE + "/");
  await A.page.waitForLoadState("networkidle");
  mark("hero");
  await wait(A.page, 2600);
  mark("scroll");
  await glide(A.page, 700, 2200);
  await wait(A.page, 900);
  await glide(A.page, 900, 2200);
  await wait(A.page, 900);
  await glide(A.page, -1600, 1800);
  await wait(A.page, 700);
});

await record(A.page, "s2-join", async ({ mark }) => {
  if (!A.page.url().endsWith("/")) await A.page.goto(BASE + "/");
  await wait(A.page, 600);
  await tap(A.page, mark, A.page.getByRole("button", { name: /dołącz/i }).first(), "join");
  await wait(A.page, 900);
  const input = A.page.locator("[role=dialog] input").first();
  await tap(A.page, mark, input, "nick");
  await input.pressSequentially("wlod_run", { delay: 120 });
  await wait(A.page, 500);
  await tap(A.page, mark, A.page.locator("label", { has: A.page.locator("input[name=gender][value=M]") }), "gender");
  await wait(A.page, 700);
  await tap(A.page, mark, A.page.getByRole("button", { name: /wchodzę/i }), "enter");
  await A.page.waitForURL(/kalendarz/, { timeout: 15000 });
  mark("calendar");
  await wait(A.page, 3200);
});

// off camera: days 1–6 done with results, back to day 7
await seedDays(A.page, [1, 2, 3, 4, 5, 6], { 1: "8.4", 3: "4:12", 4: "24", 5: "1:35", 6: "6" });
await clock(A.page, 7);

await record(A.page, "s3-calendar", async ({ mark }) => {
  await A.page.goto(BASE + "/kalendarz");
  await A.page.waitForLoadState("networkidle");
  mark("header");
  await wait(A.page, 2400);
  mark("grid");
  await glide(A.page, 420, 1800);
  await wait(A.page, 2200);
});

await record(A.page, "s4-challenge", async ({ mark }) => {
  await tap(A.page, mark, A.page.getByRole("button", { name: /^Okienko 7,/ }), "door");
  await wait(A.page, 2600);
  mark("card");
  await glide(A.page, 380, 1800, "dialog");
  await wait(A.page, 1400);
  await glide(A.page, 420, 1800, "dialog");
  await wait(A.page, 1000);
  await tap(A.page, mark, A.page.getByRole("button", { name: /podejmuję wyzwanie/i }), "accept");
  await wait(A.page, 1400);
  await tap(A.page, mark, A.page.getByRole("button", { name: /oznacz jako wykonane/i }), "complete");
  mark("confetti");
  await wait(A.page, 3000);
  const result = A.page.locator("[role=dialog] input").first();
  await tap(A.page, mark, result, "result");
  await result.pressSequentially("16:42", { delay: 150 });
  await wait(A.page, 400);
  await tap(A.page, mark, A.page.getByRole("button", { name: /^zapisz$/i }), "save");
  await wait(A.page, 2200);
});

await record(A.page, "s5-share", async ({ mark }) => {
  const btn = A.page.locator("[role=dialog]").getByRole("button", { name: /udostępnij|relacj|grafik/i }).first();
  await tap(A.page, mark, btn, "share");
  await A.page.waitForFunction(() => [...document.querySelectorAll("[role=dialog] img")].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
  mark("preview");
  await wait(A.page, 3200);
  await glide(A.page, 300, 1500, "dialog");
  await wait(A.page, 1500);
});
await save(A.page, "/api/share/7", "card-day7.png");

await record(A.page, "s6-stats", async ({ mark }) => {
  await A.page.goto(BASE + "/statystyki");
  await A.page.waitForLoadState("networkidle");
  mark("stats");
  await wait(A.page, 2400);
  await glide(A.page, 600, 2400);
  await wait(A.page, 1400);
  await glide(A.page, 700, 2400);
  await wait(A.page, 1400);
});

await record(A.page, "s7-profile", async ({ mark }) => {
  await A.page.goto(BASE + "/profil");
  await A.page.waitForLoadState("networkidle");
  mark("profile");
  await wait(A.page, 2600);
  await glide(A.page, 500, 2200);
  await wait(A.page, 1600);
});

// Finisher persona: all 24 done, on 24.12.
const B = await phone();
await asAdmin(B.page);
await clock(B.page, 1);
await post(B.page, "/api/participant", { nickname: "kanapowa_ultraska", gender: "F" }).then(async (r) => {
  if (r.status >= 400) await post(B.page, "/api/participant", { nickname: "kanapowa_ultraska" });
});
const results24 = { 1: "8.4", 3: "4:12", 4: "24", 5: "1:35", 6: "6", 7: "16:42", 8: "8", 11: "6.2", 13: "21.1", 15: "22:48", 19: "64", 21: "10" };
await seedDays(B.page, Array.from({ length: 24 }, (_, i) => i + 1), results24);
await clock(B.page, 24);

await record(B.page, "s8-finale", async ({ mark }) => {
  await B.page.goto(BASE + "/kalendarz");
  await B.page.waitForLoadState("networkidle");
  mark("finisher");
  await wait(B.page, 2600);
  await glide(B.page, 520, 2000);
  await wait(B.page, 1400);
  await glide(B.page, -520, 1400);
  await wait(B.page, 500);
  await tap(B.page, mark, B.page.getByRole("button", { name: /moje podsumowanie/i }), "summary");
  await wait(B.page, 3600);
  await glide(B.page, 400, 1800, "dialog");
  await wait(B.page, 1800);
});
await save(B.page, "/api/share/summary", "card-summary.png").catch((e) => console.warn("summary card:", e.message));
await save(B.page, "/api/share/24", "card-day24.png").catch((e) => console.warn("day 24 card:", e.message));

await browser.close();
console.log("done →", OUT);
