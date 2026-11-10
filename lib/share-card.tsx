import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import iconNodes from "./icon-nodes.json";
import { config } from "./config";
import { CATEGORY_LABEL } from "./labels";
import { MEDAL, MEDAL_COLORS, MEDAL_RIBBON, medalPercent, medalSegments } from "./medal";
import type { Category } from "./types";

const C = { ink: "#191919", cream: "#F2EBDD", mustard: "#D6A441", charcoal: "#292824", gray: "#92908A" };

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fontCache: Promise<FontDef[]> | null = null;
function loadFonts(): Promise<FontDef[]> {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const read = async (f: string) => {
      const b = await fs.readFile(path.join(dir, f));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    };
    fontCache = Promise.all([
      read("anton-latin-400-normal.woff").then((data) => ({ name: "Anton", data, weight: 400 as const, style: "normal" as const })),
      read("anton-latin-ext-400-normal.woff").then((data) => ({ name: "AntonExt", data, weight: 400 as const, style: "normal" as const })),
      read("archivo-latin-400-normal.woff").then((data) => ({ name: "Archivo", data, weight: 400 as const, style: "normal" as const })),
      read("archivo-latin-ext-400-normal.woff").then((data) => ({ name: "ArchivoExt", data, weight: 400 as const, style: "normal" as const })),
      read("archivo-latin-700-normal.woff").then((data) => ({ name: "Archivo", data, weight: 700 as const, style: "normal" as const })),
      read("archivo-latin-ext-700-normal.woff").then((data) => ({ name: "ArchivoExt", data, weight: 700 as const, style: "normal" as const })),
    ]);
    fontCache.catch(() => (fontCache = null));
  }
  return fontCache;
}

function Icon({ name, size, color, stroke = 1.5 }: { name: string; size: number; color: string; stroke?: number }) {
  const all = iconNodes as unknown as Record<string, [string, Record<string, string>][]>;
  const nodes = all[name] ?? all.activity;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {nodes.map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return <Tag key={i} {...attrs} />;
      })}
    </svg>
  );
}

const LINES = [
  "GODNOŚĆ: NIEKONIECZNIE.",
  "PLAN BYŁ GŁUPI. ZADZIAŁAŁ.",
  "GOGGINS MOŻE BYĆ DUMNY.",
  "NIKT NIE KAZAŁ. I DOBRZE.",
  "ZERO GWARANCJI. ZERO ŻALU.",
  "KANAPA ZGŁASZA SPRZECIW.",
];

export function siteHost() {
  return config.siteUrl.replace(/^https?:\/\//, "");
}

export interface ShareData {
  day: number;
  title: string;
  icon: string;
  category: Category;
  completed: boolean;
  nickname: string;
  result?: string | null;
}

export async function renderChallengeCard(d: ShareData) {
  const dd = String(d.day).padStart(2, "0");
  const titleSize = d.title.length > 26 ? 92 : d.title.length > 16 ? 112 : 136;
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: C.ink, color: C.cream, fontFamily: "Archivo, ArchivoExt", padding: 80, position: "relative" }}>
        <div style={{ position: "absolute", inset: 40, border: `2px solid ${C.charcoal}`, display: "flex" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 54, letterSpacing: 1, lineHeight: 1 }}>THE ADVENT</div>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 54, letterSpacing: 1, color: C.mustard, lineHeight: 1.1 }}>SPLITS</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: C.gray, letterSpacing: 4 }}>{`GRUDZIEŃ ${config.start.slice(0, 4)}`}</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 90, gap: 30 }}>
          <div style={{ fontFamily: "Anton, AntonExt", fontSize: 120, color: C.gray, lineHeight: 1 }}>DZIEŃ</div>
          <div style={{ fontFamily: "Anton, AntonExt", fontSize: 330, color: C.mustard, lineHeight: 0.8 }}>{dd}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 110 }}>
          <div style={{ width: 200, height: 200, borderRadius: 200, border: `3px solid ${C.cream}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={d.icon} size={110} color={C.cream} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 28, color: C.gray, letterSpacing: 6 }}>{CATEGORY_LABEL[d.category].toUpperCase()}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: d.completed ? C.mustard : "transparent", border: `3px solid ${C.mustard}`, color: d.completed ? C.ink : C.mustard, padding: "12px 26px", fontSize: 34, fontWeight: 700, letterSpacing: 3 }}>
              {d.completed ? <Icon name="check" size={36} color={C.ink} stroke={3} /> : null}
              {d.completed ? "ZALICZONE" : "WYZWANIE PODJĘTE"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: "Anton, AntonExt", fontSize: titleSize, lineHeight: 1.02, marginTop: 70, textTransform: "uppercase" }}>{d.title}</div>

        {d.result ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 50, borderTop: `2px solid ${C.charcoal}`, paddingTop: 30 }}>
            <div style={{ fontSize: 28, color: C.gray, letterSpacing: 6 }}>WYNIK</div>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 96, color: C.mustard, lineHeight: 1.1 }}>{d.result}</div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, lineHeight: 1.25 }}>
            {d.completed ? `DZIEŃ ${dd} ZALICZONY. ${LINES[d.day % LINES.length]}` : `DZIEŃ ${dd}. ZOBACZYMY, CZY PRZEŻYJĘ.`}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 50, paddingTop: 30, borderTop: `2px solid ${C.mustard}` }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, color: C.gray, letterSpacing: 4 }}>UCZESTNIK</div>
              <div style={{ fontSize: 44, fontWeight: 700 }}>{d.nickname}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 30, color: C.cream }}>{siteHost()}</div>
              <div style={{ fontSize: 30, color: C.mustard }}>{`@${config.instagram}`}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await loadFonts(), headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function renderInviteCard() {
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: C.ink, color: C.cream, fontFamily: "Archivo, ArchivoExt", padding: 90, position: "relative" }}>
        <div style={{ position: "absolute", inset: 40, border: `2px solid ${C.charcoal}`, display: "flex" }} />
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: C.gray }}>{`@${config.instagram.toUpperCase()} PRZEDSTAWIA`}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          <div style={{ fontFamily: "Anton, AntonExt", fontSize: 150, lineHeight: 0.95 }}>THE</div>
          <div style={{ fontFamily: "Anton, AntonExt", fontSize: 150, lineHeight: 0.95 }}>ADVENT</div>
          <div style={{ fontFamily: "Anton, AntonExt", fontSize: 150, lineHeight: 0.95, color: C.mustard }}>SPLITS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, fontFamily: "Anton, AntonExt", fontSize: 64, lineHeight: 1.1 }}>
          <div>24 DAYS.</div>
          <div>24 CHALLENGES.</div>
          <div style={{ color: C.mustard }}>QUESTIONABLE DECISIONS.</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 70 }}>
          {Array.from({ length: config.days }, (_, i) => (
            <div key={i} style={{ width: 132, height: 132, border: `2px solid ${i === 0 ? C.mustard : C.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton, AntonExt", fontSize: 54, color: i === 0 ? C.mustard : C.gray }}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", borderTop: `2px solid ${C.mustard}`, paddingTop: 36 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>START 1 GRUDNIA. ZERO GWARANCJI GODNOŚCI.</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 34 }}>
            <div style={{ color: C.cream }}>{siteHost()}</div>
            <div style={{ color: C.mustard }}>{`@${config.instagram}`}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export interface SummaryData {
  nickname: string;
  days: number;
  completedDays: number[];
  longestStreak: number;
  minutes: number;
  favorite: string | null;
  achievements: number;
  achievementsTotal: number;
}

function splitsLabel(n: number) {
  if (n === 1) return "SPLIT ZALICZONY.";
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? "SPLITY ZALICZONE." : "SPLITÓW ZALICZONYCH.";
}

/** "Mój grudzień" summary story card (1080×1920). */
export async function renderSummaryCard(d: SummaryData) {
  const done = new Set(d.completedDays);
  const full = d.completedDays.length >= d.days;
  const h = Math.floor(d.minutes / 60);
  const m = d.minutes % 60;
  const time = d.minutes === 0 ? "0 MIN" : h ? `${h} H ${m ? `${m} MIN` : ""}`.trim() : `${m} MIN`;
  const rows: [string, string][] = [
    ["NAJDŁUŻSZA SERIA", `${d.longestStreak} ${d.longestStreak === 1 ? "DZIEŃ" : "DNI"}`],
    ["CZAS RUCHU", `~${time}`],
    ["ULUBIONA KATEGORIA", d.favorite ? d.favorite.toUpperCase() : "—"],
    ["ODZNAKI", `${d.achievements} / ${d.achievementsTotal}`],
  ];
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: C.ink, color: C.cream, fontFamily: "Archivo, ArchivoExt", padding: 80, position: "relative" }}>
        <div style={{ position: "absolute", inset: 40, border: `2px solid ${C.charcoal}`, display: "flex" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 54, lineHeight: 1 }}>THE ADVENT</div>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 54, color: C.mustard, lineHeight: 1.1 }}>SPLITS</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: C.gray, letterSpacing: 4 }}>{`GRUDZIEŃ ${config.start.slice(0, 4)}`}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 70 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, color: C.gray, letterSpacing: 8 }}>{full ? "FULL DISTANCE" : "MÓJ GRUDZIEŃ"}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 10 }}>
              <div style={{ fontFamily: "Anton, AntonExt", fontSize: 260, color: C.mustard, lineHeight: 0.85 }}>{String(d.completedDays.length)}</div>
              <div style={{ fontFamily: "Anton, AntonExt", fontSize: 120, color: C.gray, lineHeight: 0.9 }}>{`/ ${d.days}`}</div>
            </div>
          </div>
          <MedalImage completedDays={d.completedDays} days={d.days} width={300} />
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginTop: 20 }}>{full ? "WSZYSTKIE SPLITY ZALICZONE." : splitsLabel(d.completedDays.length)}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 60 }}>
          {Array.from({ length: d.days }, (_, i) => (
            <div key={i} style={{ width: 138, height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton, AntonExt", fontSize: 34, background: done.has(i + 1) ? C.mustard : "transparent", color: done.has(i + 1) ? C.ink : C.gray, border: `2px solid ${done.has(i + 1) ? C.mustard : C.charcoal}` }}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.charcoal}`, padding: "22px 0" }}>
              <div style={{ fontSize: 28, color: C.gray, letterSpacing: 5 }}>{l}</div>
              <div style={{ fontFamily: "Anton, AntonExt", fontSize: 54 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 30, borderTop: `2px solid ${C.mustard}` }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: C.gray, letterSpacing: 4 }}>UCZESTNIK</div>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{d.nickname}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 30 }}>{siteHost()}</div>
            <div style={{ fontSize: 30, color: C.mustard }}>{`@${config.instagram}`}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await loadFonts(), headers: { "Cache-Control": "private, no-store" } },
  );
}

function MedalImage({ completedDays, days, width }: { completedDays: number[]; days: number; width: number }) {
  const done = new Set(completedDays);
  const full = done.size >= days;
  const scale = width / MEDAL.w;
  const disc = (MEDAL.rInner - 6) * 2 * scale;
  return (
    <div style={{ display: "flex", position: "relative", width, height: MEDAL.h * scale }}>
      <svg width={width} height={MEDAL.h * scale} viewBox={`0 0 ${MEDAL.w} ${MEDAL.h}`}>
        {MEDAL_RIBBON.map((p, i) => (
          <path key={i} d={p} fill={done.size ? MEDAL_COLORS.on : MEDAL_COLORS.off} />
        ))}
        <circle cx={MEDAL.cx} cy={MEDAL.cy} r={MEDAL.rOuter + 4} fill="none" stroke={full ? MEDAL_COLORS.on : MEDAL_COLORS.ring} strokeWidth={2} />
        {medalSegments(days).map((p, i) => (
          <path key={i} d={p} fill={done.has(i + 1) ? MEDAL_COLORS.on : MEDAL_COLORS.off} />
        ))}
        <circle cx={MEDAL.cx} cy={MEDAL.cy} r={MEDAL.rInner - 6} fill={full ? MEDAL_COLORS.on : MEDAL_COLORS.disc} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: (MEDAL.cx * scale) - disc / 2,
          top: (MEDAL.cy * scale) - disc / 2,
          width: disc,
          height: disc,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "Anton, AntonExt", fontSize: full ? 34 : 60, color: full ? C.ink : C.cream, lineHeight: 1 }}>
          {full ? "FINISHER" : `${medalPercent(done.size, days)}%`}
        </div>
        {full ? null : <div style={{ fontSize: 14, letterSpacing: 4, color: C.gray, marginTop: 6 }}>MEDALU</div>}
      </div>
    </div>
  );
}

/** Link preview image (Open Graph, 1200×630). */
export async function renderOgCard() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: C.ink, color: C.cream, fontFamily: "Archivo, ArchivoExt", padding: 70 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 7, color: C.gray }}>{`@${config.instagram.toUpperCase()} PRZEDSTAWIA`}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 128, lineHeight: 0.92 }}>THE ADVENT</div>
            <div style={{ fontFamily: "Anton, AntonExt", fontSize: 128, lineHeight: 0.92, color: C.mustard }}>SPLITS</div>
          </div>
          <div style={{ display: "flex", fontFamily: "Anton, AntonExt", fontSize: 40 }}>24 DAYS. 24 CHALLENGES. QUESTIONABLE DECISIONS.</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 330, gap: 10, alignContent: "center" }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton, AntonExt", fontSize: 30, border: `2px solid ${i === 0 ? C.mustard : C.charcoal}`, color: i === 0 ? C.mustard : C.gray }}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await loadFonts() },
  );
}

/** App icon (home screen / manifest). */
export async function renderAppIcon(size: number) {
  const s = size / 512;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: C.ink }}>
        <div style={{ width: 360 * s, height: 360 * s, border: `${26 * s}px solid ${C.mustard}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton, AntonExt", fontSize: 190 * s, color: C.cream }}>
          24
        </div>
      </div>
    ),
    { width: size, height: size, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
