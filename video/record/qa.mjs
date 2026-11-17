// Visual QA: walks every view and popup at several widths, saves screenshots and reports horizontal overflow.
//   node record/qa.mjs <outDir> [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
const BASE = process.argv[3] || "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { name: "w320", width: 320, height: 640, mobile: true },
  { name: "w375", width: 375, height: 812, mobile: true },
  { name: "w768", width: 768, height: 1024, mobile: true },
  { name: "w1280", width: 1280, height: 800, mobile: false },
];
const SHOT_CARDS = new Set(["w320", "w375", "w1280"]);
const report = [];

// Finds content wider than its box: page-level scroll, elements sticking out of the viewport or the dialog,
// and boxes whose own content is wider than they are (text not wrapping).
const OVERFLOW = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push(`PAGE scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
  const dlgs = document.querySelectorAll("[role=dialog]"); const dlg = dlgs[dlgs.length - 1];
  if (dlg && dlg.scrollWidth > dlg.clientWidth + 1) out.push(`DIALOG scrollWidth ${dlg.scrollWidth} > ${dlg.clientWidth}`);
  const root = dlg || document.body;
  const box = root.getBoundingClientRect();
  const clippedByAncestor = (el) => {
    for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== "visible" && a !== root) {
        const r = a.getBoundingClientRect(), e = el.getBoundingClientRect();
        if (e.right > r.right + 1 || e.left < r.left - 1) return false; // sticks out of its clipping parent: still a bug (cut off)
        return true;
      }
    }
    return false;
  };
  const describe = (el) =>
    `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} "${(el.textContent || "").trim().slice(0, 40)}"`;
  for (const el of root.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
    if (el.closest("[aria-hidden=true]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const right = Math.min(vw, box.right), left = Math.max(0, box.left);
    if ((r.right > right + 1 || r.left < left - 1) && !clippedByAncestor(el)) out.push(`OUT ${Math.round(r.left)}..${Math.round(r.right)} of ${Math.round(left)}..${Math.round(right)} ${describe(el)}`);
    if (s.overflowX === "visible" && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !["svg", "path"].includes(el.tagName.toLowerCase()))
      out.push(`WIDE ${el.scrollWidth}>${el.clientWidth} ${describe(el)}`);
  }
  return [...new Set(out)].slice(0, 15);
};

async function check(page, size, label, shot = true, full = true) {
  await page.waitForTimeout(500);
  const issues = await page.evaluate(OVERFLOW);
  if (issues.length) report.push({ size: size.name, view: label, issues });
  if (shot) await page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`), fullPage: full });
}
const post = (page, url, body) =>
  page.evaluate(
    async ([u, b]) => {
      const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
      return r.status;
    },
    [url, body],
  );
async function closeAll(page) {
  for (let i = 0; i < 5 && (await page.locator("[role=dialog]").count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
}
const settle = (page) => page.waitForLoadState("networkidle").catch(() => {});

const browser = await chromium.launch();
for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.mobile,
    hasTouch: size.mobile,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  // Hide the dev-only Next.js badge so it does not cover content.
  await page.addInitScript(() => {
    const st = document.createElement("style");
    st.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
  });

  await page.goto(BASE + "/");
  await settle(page);
  await check(page, size, "01-landing");
  // FAQ expanded
  for (const b of await page.locator("summary").all()) await b.click().catch(() => {});
  await check(page, size, "02-landing-faq");
  await page.goto(BASE + "/?dolacz=1");
  await settle(page);
  await page.waitForTimeout(800);
  await check(page, size, "03-join", true, false);
  await page.goto(BASE + "/prywatnosc");
  await settle(page);
  await check(page, size, "04-privacy");
  await page.goto(BASE + "/nie-ma-takiej-strony");
  await check(page, size, "05-404", true, false);

  // Participant with a long nickname, before the start
  await page.goto(BASE + "/");
  await post(page, "/api/participant", { nickname: "kanapowa_ultraska_xx", gender: "F" });
  await post(page, "/api/test-clock", { mode: "pre" });
  await page.goto(BASE + "/kalendarz");
  await settle(page);
  await check(page, size, "06-calendar-pre");

  // Day 24: 1-10 done with results, 11-15 accepted, rest unopened
  await post(page, "/api/test-clock", { mode: "day", day: 24 });
  for (let d = 1; d <= 15; d++) {
    await post(page, `/api/doors/${d}/open`, {});
    await post(page, `/api/doors/${d}/accept`, {});
    if (d <= 10) {
      await post(page, `/api/doors/${d}/complete`, { done: true });
      await post(page, `/api/doors/${d}/result`, { value: d % 2 ? "1:23:45" : "12.5" });
    }
  }
  await page.goto(BASE + "/kalendarz");
  await settle(page);
  await check(page, size, "07-calendar-mid");

  for (let d = 1; d <= 24; d++) {
    const door = page.getByRole("button", { name: new RegExp(`^Okienko ${d},`) });
    await door.scrollIntoViewIfNeeded();
    await door.click();
    await page.locator("[role=dialog]").last().waitFor();
    await page.waitForTimeout(d > 15 ? 1800 : 700);
    // unopened doors show a reveal step first: accept to see the full card
    const accept = page.getByRole("button", { name: /podejmuję wyzwanie/i });
    if (await accept.isVisible().catch(() => false)) {
      await check(page, size, `10-card-${String(d).padStart(2, "0")}a-reveal`, SHOT_CARDS.has(size.name), false);
      await accept.click();
      await page.waitForTimeout(700);
    }
    const shot = SHOT_CARDS.has(size.name);
    await check(page, size, `10-card-${String(d).padStart(2, "0")}`, shot, false);
    if (shot) {
      await page.locator("[role=dialog]").last().evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${size.name}-10-card-${String(d).padStart(2, "0")}z-bottom.png`) });
    }
    if (d === 3) {
      const share = page.locator("[role=dialog]").getByRole("button", { name: /udostępnij|relacj|grafik/i }).first();
      if (await share.isVisible().catch(() => false)) {
        await share.click();
        await page.waitForTimeout(2500);
        await check(page, size, "11-share-sheet", true, false);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(800);
      }
    }
    await closeAll(page);
  }

  await page.goto(BASE + "/statystyki");
  await settle(page);
  await check(page, size, "12-stats");
  await page.goto(BASE + "/profil");
  await settle(page);
  await check(page, size, "13-profile");
  for (const [name, re] of [
    ["14-profile-invite", /grafika zaproszenia/i],
    ["15-profile-reset", /resetuj postęp/i],
    ["16-profile-delete", /usuń moje konto/i],
  ]) {
    await page.getByRole("button", { name: re }).click();
    await page.waitForTimeout(name.includes("invite") ? 2500 : 800);
    await check(page, size, name, true, false);
    await closeAll(page);
  }

  // Finish all 24 → finale + summary
  for (let d = 11; d <= 24; d++) {
    await post(page, `/api/doors/${d}/open`, {});
    await post(page, `/api/doors/${d}/accept`, {});
    if (d < 24) await post(page, `/api/doors/${d}/complete`, { done: true });
  }
  await page.goto(BASE + "/kalendarz");
  await settle(page);
  const door24 = page.getByRole("button", { name: /^Okienko 24,/ });
  await door24.scrollIntoViewIfNeeded();
  await door24.click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /oznacz jako wykonane/i }).click();
  await page.waitForTimeout(4000);
  await check(page, size, "17-finale", true, false);
  await closeAll(page);
  await page.goto(BASE + "/kalendarz");
  await settle(page);
  await check(page, size, "18-calendar-full");
  const sum = page.getByRole("button", { name: /moje podsumowanie/i });
  if (await sum.count()) {
    await sum.first().scrollIntoViewIfNeeded();
    await sum.first().click();
    await page.waitForTimeout(2500);
    await check(page, size, "19-summary-sheet", true, false);
    await page.keyboard.press("Escape");
  }
  await post(page, "/api/test-clock", { mode: "post" });
  await page.goto(BASE + "/kalendarz");
  await settle(page);
  await check(page, size, "20-calendar-post");
  await page.goto(BASE + "/statystyki");
  await settle(page);
  await check(page, size, "21-stats-full");
  // test mode panel
  const tt = page.getByRole("button", { name: /tryb testowy/i });
  if (await tt.count()) {
    await tt.first().click();
    await page.waitForTimeout(800);
    await check(page, size, "22-test-panel", true, false);
  }

  // clean up the test participant
  await page.evaluate(() => fetch("/api/me", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "USUŃ" }) }));
  await ctx.close();
  console.log("done", size.name);
}
await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`${report.length} views with issues`);
for (const r of report) console.log(`\n[${r.size}] ${r.view}\n  ${r.issues.join("\n  ")}`);
