// The edit: which slice of which recording plays when, where the camera looks, and the captions.
// Times are seconds. Camera keys use clip time (the recording's own clock), focus in app CSS px (390 × 844).
import s1 from "../public/rec/s1-landing.json";
import s2 from "../public/rec/s2-join.json";
import s3 from "../public/rec/s3-calendar.json";
import s4 from "../public/rec/s4-challenge.json";
import s5 from "../public/rec/s5-share.json";
import s6 from "../public/rec/s6-stats.json";
import s8 from "../public/rec/s8-finale.json";
import f1 from "../public/frames/s1-landing/frames.json";
import f2 from "../public/frames/s2-join/frames.json";
import f3 from "../public/frames/s3-calendar/frames.json";
import f4 from "../public/frames/s4-challenge/frames.json";
import f5 from "../public/frames/s5-share/frames.json";
import f6 from "../public/frames/s6-stats/frames.json";
import f8 from "../public/frames/s8-finale/frames.json";

// Captured screencast frames (variable rate). The edit shows, for clip time t, the newest frame at or before t.
export type FrameSet = { name: string; frames: { t: number; file: string }[] };
const FRAME_SETS: Record<string, FrameSet> = {
  "rec/s1-landing.mp4": f1,
  "rec/s2-join.mp4": f2,
  "rec/s3-calendar.mp4": f3,
  "rec/s4-challenge.mp4": f4,
  "rec/s5-share.mp4": f5,
  "rec/s6-stats.mp4": f6,
  "rec/s8-finale.mp4": f8,
};
export function frameAt(clip: string, t: number): string {
  const set = FRAME_SETS[clip];
  const fr = set.frames;
  let lo = 0, hi = fr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (fr[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return `frames/${set.name}/${fr[lo].file}`;
}

export const FPS = 60;
export const INTRO = 3.0; // brand intro before the phone settles
export const XFADE = 0.4; // screen cross-fade between scenes
export const OUTRO = 4.6;

export type Key = { t: number; z?: number; fx?: number; fy?: number; ry?: number; rx?: number };
export type Mark = { t: number; label: string; x?: number; y?: number };
export type Caption = { at: number; dur: number; lines: string[]; accent?: number; sub?: string };
export type Pop = { at: number; dur: number; src: string };
export type Scene = {
  id: string;
  clip: string;
  from: number;
  to: number;
  keys: Key[];
  marks: Mark[];
  captions: Caption[];
  pop?: Pop;
};

const taps = (m: { marks: Mark[] }) => m.marks.filter((k) => k.x !== undefined);

export const SCENES: Scene[] = [
  {
    id: "landing",
    clip: "rec/s1-landing.mp4",
    from: 0.35,
    to: 8.2,
    marks: taps(s1),
    keys: [
      { t: 0.35, z: 1.6, fx: 150, fy: 240, ry: -10, rx: 4 },
      { t: 2.6, z: 1.0, ry: -6, rx: 2 },
      { t: 5.4, z: 1.04, ry: 7, rx: 0 },
      { t: 8.2, z: 1.0, ry: 2 },
    ],
    captions: [{ at: 0.6, dur: 3.6, lines: ["24 dni.", "24 wyzwania."], accent: 1, sub: "Adwent dla biegaczy, kolarzy i pływaków" }],
  },
  {
    id: "join",
    clip: "rec/s2-join.mp4",
    from: 0.25,
    to: 6.5,
    marks: taps(s2),
    keys: [
      { t: 0.25, z: 1.0, ry: 2 },
      { t: 0.7, z: 1.18, fx: 195, fy: 780 },
      { t: 1.5, z: 1.3, fx: 195, fy: 430 },
      { t: 1.9, z: 1.75, fx: 195, fy: 408 },
      { t: 3.15, z: 1.75, fx: 195, fy: 420 },
      { t: 3.6, z: 1.55, fx: 170, fy: 560 },
      { t: 4.3, z: 1.2, fx: 195, fy: 720 },
      { t: 5.3, z: 1.0, ry: -5 },
      { t: 6.5, z: 1.0, ry: -3 },
    ],
    captions: [{ at: 0.4, dur: 4.6, lines: ["Dołączasz", "w 10 sekund."], accent: 1, sub: "Tylko nick. Bez hasła, bez maila." }],
  },
  {
    id: "calendar",
    clip: "rec/s3-calendar.mp4",
    from: 0.5,
    to: 7.5,
    marks: taps(s3),
    keys: [
      { t: 0.5, z: 1.0, ry: -4 },
      { t: 1.6, z: 1.42, fx: 195, fy: 230, ry: 0 },
      { t: 3.0, z: 1.42, fx: 195, fy: 250 },
      { t: 4.1, z: 1.0, ry: 4 },
      { t: 5.6, z: 2.0, fx: 241, fy: 173, ry: 0 },
      { t: 7.5, z: 2.05, fx: 241, fy: 173 },
    ],
    captions: [{ at: 0.4, dur: 5.6, lines: ["Codziennie", "nowe okienko."], accent: 1, sub: "Odblokowuje się o północy. Ten sam split dla wszystkich." }],
  },
  {
    id: "challenge",
    clip: "rec/s4-challenge.mp4",
    from: 0.0,
    to: 16.6,
    marks: taps(s4),
    keys: [
      { t: 0.0, z: 2.05, fx: 241, fy: 173 },
      { t: 0.35, z: 1.9, fx: 241, fy: 180 },
      { t: 1.5, z: 1.0, ry: -3 },
      { t: 3.0, z: 1.5, fx: 200, fy: 170 },
      { t: 4.6, z: 1.5, fx: 200, fy: 250 },
      { t: 5.7, z: 1.0, ry: 4 },
      { t: 8.6, z: 1.0, ry: 2 },
      { t: 9.25, z: 1.45, fx: 195, fy: 720 },
      { t: 10.4, z: 1.45, fx: 175, fy: 760 },
      { t: 10.9, z: 1.5, fx: 160, fy: 780 },
      { t: 11.6, z: 1.15, fx: 195, fy: 330 },
      { t: 13.6, z: 1.15, fx: 195, fy: 360 },
      { t: 14.1, z: 1.8, fx: 180, fy: 790 },
      { t: 15.2, z: 1.8, fx: 200, fy: 760 },
      { t: 16.1, z: 1.3, fx: 195, fy: 700 },
      { t: 16.6, z: 1.15, fx: 195, fy: 650 },
    ],
    captions: [
      { at: 0.3, dur: 2.7, lines: ["Otwórz."], accent: 0 },
      { at: 3.2, dur: 5.0, lines: ["Bieg. Rower.", "Basen. Siła."], accent: 1, sub: "Plus mobilność i podbiegi. Z wersją łatwiejszą i trudniejszą." },
      { at: 9.0, dur: 2.4, lines: ["Zrób.", "Odhacz."], accent: 1 },
      { at: 11.6, dur: 2.3, lines: ["Odznaki", "lecą same."], accent: 1 },
      { at: 14.0, dur: 2.7, lines: ["Zapisz", "swój wynik."], accent: 1 },
    ],
  },
  {
    id: "share",
    clip: "rec/s5-share.mp4",
    from: 0.0,
    to: 6.9,
    marks: taps(s5),
    keys: [
      { t: 0.0, z: 1.2, fx: 195, fy: 760 },
      { t: 0.7, z: 1.0 },
      { t: 1.5, z: 1.32, fx: 195, fy: 330 },
      { t: 2.4, z: 1.0, ry: -6 },
      { t: 6.9, z: 0.94, ry: -8 },
    ],
    captions: [{ at: 0.3, dur: 6.2, lines: ["Gotowa grafika", "do relacji."], accent: 1, sub: "1080 × 1920. Pobierz i wrzuć na Instagram." }],
    pop: { at: 2.3, dur: 4.4, src: "rec/card-day7.png" },
  },
  {
    id: "stats",
    clip: "rec/s6-stats.mp4",
    from: 0.3,
    to: 8.3,
    marks: taps(s6),
    keys: [
      { t: 0.3, z: 1.0, ry: 5 },
      { t: 1.2, z: 1.55, fx: 195, fy: 290 },
      { t: 2.9, z: 1.5, fx: 195, fy: 330 },
      { t: 3.8, z: 1.0, ry: -4 },
      { t: 6.9, z: 1.28, fx: 195, fy: 470 },
      { t: 8.3, z: 1.28, fx: 195, fy: 470 },
    ],
    captions: [{ at: 0.4, dur: 7.2, lines: ["Medal rośnie", "z każdym dniem."], accent: 1, sub: "24 segmenty, seria i odznaki" }],
  },
  {
    id: "finale",
    clip: "rec/s8-finale.mp4",
    from: 0.5,
    to: 14.6,
    marks: taps(s8),
    keys: [
      { t: 0.5, z: 1.5, fx: 195, fy: 250, ry: -4 },
      { t: 2.6, z: 1.0, ry: 0 },
      { t: 5.0, z: 1.1, fx: 195, fy: 470, ry: 5 },
      { t: 7.8, z: 1.0, ry: 0 },
      { t: 8.9, z: 1.3, fx: 195, fy: 560 },
      { t: 9.7, z: 1.0 },
      { t: 10.6, z: 1.35, fx: 195, fy: 300 },
      { t: 11.4, z: 1.0, ry: 6 },
      { t: 14.6, z: 0.94, ry: 8 },
    ],
    captions: [
      { at: 0.5, dur: 6.6, lines: ["24 / 24.", "Full distance."], accent: 1, sub: "Medal FINISHER na koniec grudnia" },
      { at: 8.6, dur: 5.6, lines: ["Twój grudzień", "na jednej grafice."], accent: 1 },
    ],
    pop: { at: 10.4, dur: 2.9, src: "rec/card-summary.png" },
  },
];

// Global placement: each scene overlaps the previous by XFADE.
export type Placed = Scene & { start: number; end: number };
export const PLACED: Placed[] = (() => {
  let t = INTRO - 0.6;
  return SCENES.map((s) => {
    const p = { ...s, start: t, end: t + (s.to - s.from) };
    t = p.end - XFADE;
    return p;
  });
})();
export const PHONE_END = PLACED[PLACED.length - 1].end;
export const TOTAL = PHONE_END + OUTRO - 0.8;

// Camera keys on the global clock. Keys of a scene that fall inside the next scene's fade are dropped,
// so the move into the next scene starts from wherever the camera was.
type GKey = Required<Key>;
export const KEYS: GKey[] = (() => {
  const out: GKey[] = [];
  PLACED.forEach((s, i) => {
    const next = PLACED[i + 1];
    for (const k of s.keys) {
      const t = s.start + (k.t - s.from);
      if (next && t > next.start + XFADE * 0.5) continue;
      out.push({ t, z: k.z ?? 1, fx: k.fx ?? 195, fy: k.fy ?? 422, ry: k.ry ?? 0, rx: k.rx ?? 0 });
    }
  });
  return out.sort((a, b) => a.t - b.t);
})();
