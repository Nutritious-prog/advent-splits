import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, DISPLAY, SANS, loadFonts } from "./brand";
import { cameraAt } from "./camera";
import { INTRO, PHONE_END, PLACED, TOTAL, XFADE, frameAt, type Caption, type Placed } from "./timeline";

loadFonts();

// ---------- layout ----------
export type Variant = "napisy" | "czyste";
export type Layout = {
  w: number;
  h: number;
  screenH: number; // phone screen height incl. status bar, in px
  cx: number;
  cy: number;
  zoomTo: [number, number]; // where a zoomed focus point lands
  captions: "top" | "left" | null;
  pop: { cx: number; cy: number; h: number };
};

export function layoutFor(w: number, h: number, variant: Variant): Layout {
  const portrait = h > w;
  if (portrait)
    return variant === "napisy"
      ? { w, h, screenH: 1290, cx: w / 2, cy: 1190, zoomTo: [w / 2, 1180], captions: "top", pop: { cx: w / 2, cy: 1150, h: 1380 } }
      : { w, h, screenH: 1560, cx: w / 2, cy: h / 2, zoomTo: [w / 2, h / 2], captions: null, pop: { cx: w / 2, cy: h / 2, h: 1560 } };
  return variant === "napisy"
    ? { w, h, screenH: 900, cx: 1390, cy: 548, zoomTo: [1390, 540], captions: "left", pop: { cx: 1390, cy: 540, h: 900 } }
    : { w, h, screenH: 910, cx: w / 2, cy: 548, zoomTo: [w / 2, h / 2], captions: null, pop: { cx: w / 2, cy: h / 2, h: 920 } };
}

const APP_W = 390, APP_H = 844, BAR = 47, SCREEN_CSS_H = APP_H + BAR;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// ---------- background ----------
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const Background: React.FC<{ L: Layout; t: number }> = ({ L, t }) => {
  const cell = Math.round(Math.min(L.w, L.h) / 4.2);
  const drift = (t * 18) % (cell * 1.12);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #222120 0%, ${C.ink} 45%, #0e0e0e 100%)` }}>
      {/* slow-drifting grid of advent doors */}
      <div
        style={{
          position: "absolute",
          inset: -cell * 2,
          transform: `translate(${-drift}px, ${-drift * 0.6}px) rotate(-8deg)`,
          backgroundImage: `linear-gradient(${C.line} 2px, transparent 2px), linear-gradient(90deg, ${C.line} 2px, transparent 2px)`,
          backgroundSize: `${cell * 1.12}px ${cell * 1.12}px`,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: L.cx - L.screenH * 0.55,
          top: L.cy - L.screenH * 0.55,
          width: L.screenH * 1.1,
          height: L.screenH * 1.1,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(214,164,65,${0.2 + 0.04 * Math.sin(t * 1.3)}) 0%, rgba(214,164,65,0) 62%)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      backgroundImage: GRAIN,
      opacity: 0.075,
      mixBlendMode: "overlay",
      backgroundPosition: `${(frame * 37) % 220}px ${(frame * 53) % 220}px`,
      pointerEvents: "none",
    }}
  />
);

// ---------- phone ----------
const StatusBar: React.FC<{ k: number }> = ({ k }) => (
  <div
    style={{
      height: BAR * k,
      background: C.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${30 * k}px`,
      color: C.cream,
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 15 * k,
      position: "relative",
    }}
  >
    <span style={{ paddingTop: 6 * k, letterSpacing: 0.2 * k }}>9:41</span>
    <div style={{ position: "absolute", left: "50%", top: 11 * k, width: 112 * k, height: 32 * k, marginLeft: -56 * k, borderRadius: 20 * k, background: "#000" }} />
    <div style={{ display: "flex", alignItems: "center", gap: 6 * k, paddingTop: 6 * k }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1.6 * k, height: 11 * k }}>
        {[4, 6, 8, 10.5].map((hh) => (
          <div key={hh} style={{ width: 3 * k, height: hh * k, background: C.cream, borderRadius: 1 * k }} />
        ))}
      </div>
      <div style={{ width: 25 * k, height: 12 * k, border: `${1.2 * k}px solid rgba(242,235,221,0.5)`, borderRadius: 3.5 * k, padding: 1.4 * k }}>
        <div style={{ width: "78%", height: "100%", background: C.cream, borderRadius: 1.6 * k }} />
      </div>
    </div>
  </div>
);

const Ripple: React.FC<{ x: number; y: number; k: number; p: number }> = ({ x, y, k, p }) => {
  const ring = interpolate(p, [0, 1], [0.35, 1.7], { ...clamp, easing: easeOut });
  const o = interpolate(p, [0, 0.15, 1], [0, 0.95, 0], clamp);
  const dot = interpolate(p, [0, 0.12, 0.45], [0, 1, 0], clamp);
  const s = 64 * k;
  return (
    <>
      <div style={{ position: "absolute", left: x * k - s / 2, top: (y + BAR) * k - s / 2, width: s, height: s, borderRadius: "50%", border: `${3 * k}px solid ${C.mustard}`, transform: `scale(${ring})`, opacity: o }} />
      <div style={{ position: "absolute", left: x * k - s / 4, top: (y + BAR) * k - s / 4, width: s / 2, height: s / 2, borderRadius: "50%", background: "rgba(242,235,221,0.55)", transform: `scale(${dot})`, opacity: dot }} />
    </>
  );
};

const Screen: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const SW = APP_W * k, AH = APP_H * k;
  return (
    <div style={{ position: "relative", width: SW, height: SCREEN_CSS_H * k, background: C.ink, overflow: "hidden" }}>
      <StatusBar k={k} />
      <div style={{ position: "absolute", top: BAR * k, left: 0, width: SW, height: AH }}>
        {PLACED.map((s, i) => {
          if (t < s.start || t >= s.end) return null;
          const p = i === 0 ? 1 : interpolate(t, [s.start, s.start + XFADE], [0, 1], { ...clamp, easing: easeInOut });
          // frame-accurate: pick the captured screencast frame for this clip time (no video decoder involved)
          const src = frameAt(s.clip, s.from + (t - s.start));
          return (
            <div key={s.id} style={{ position: "absolute", inset: 0, opacity: p, transform: `scale(${1.04 - 0.04 * p})`, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined }}>
              <Img src={staticFile(src)} style={{ width: SW, height: AH, display: "block" }} />
            </div>
          );
        })}
      </div>
      {PLACED.flatMap((s) =>
        s.marks.map((m) => {
          const tg = s.start + (m.t - s.from) + 0.1;
          if (t < tg - 0.05 || t > tg + 0.8 || tg < s.start || tg > s.end) return null;
          return <Ripple key={s.id + m.t} x={m.x!} y={m.y!} k={k} p={(t - tg) / 0.75} />;
        }),
      )}
      {/* glass sheen */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 32%)", pointerEvents: "none" }} />
    </div>
  );
};

const Phone: React.FC<{ L: Layout; t: number; fps: number; frame: number }> = ({ L, t, fps, frame }) => {
  const k = L.screenH / SCREEN_CSS_H;
  const bez = 13 * k;
  const radius = 58 * k;
  const cam = cameraAt(t);

  // entrance from below, exit down/back
  const enter = spring({ frame: frame - Math.round((INTRO - 1.0) * fps), fps, config: { damping: 18, stiffness: 70, mass: 1 } });
  const exit = interpolate(t, [PHONE_END - 0.7, PHONE_END + 0.2], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const enterY = (1 - enter) * L.h * 0.95;
  const enterRx = (1 - enter) * 28;

  const k1 = Math.max(0, Math.min(1, (cam.z - 1) / 0.35));
  const px = (cam.fx - APP_W / 2) * k;
  const py = (cam.fy + BAR - SCREEN_CSS_H / 2) * k;
  const tx = k1 * (L.zoomTo[0] - L.cx - cam.z * px);
  const ty = k1 * (L.zoomTo[1] - L.cy - cam.z * py);
  const scale = cam.z * (1 - exit * 0.25);
  const breathe = Math.sin(t * 0.9) * 0.6;

  return (
    <div
      style={{
        position: "absolute",
        left: L.cx,
        top: L.cy,
        width: 0,
        height: 0,
        transform: `translate(${tx}px, ${ty + enterY + exit * L.h * 0.25}px) perspective(${L.screenH * 2.4}px) rotateX(${cam.rx + enterRx + exit * 12}deg) rotateY(${cam.ry + breathe}deg) scale(${scale})`,
        opacity: 1 - exit,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -(APP_W * k) / 2 - bez,
          top: -(SCREEN_CSS_H * k) / 2 - bez,
          padding: bez,
          borderRadius: radius + bez,
          background: "linear-gradient(145deg, #3a3936 0%, #121212 35%, #0a0a0a 70%, #2b2a27 100%)",
          boxShadow: `0 ${60 * k}px ${140 * k}px rgba(0,0,0,0.65), 0 0 0 ${2 * k}px #4a4843, inset 0 0 ${4 * k}px rgba(255,255,255,0.15)`,
        }}
      >
        <div style={{ borderRadius: radius, overflow: "hidden", position: "relative" }}>
          <Screen k={k} t={t} />
        </div>
      </div>
    </div>
  );
};

// ---------- captions ----------
const CaptionBlock: React.FC<{ c: Caption; start: number; t: number; L: Layout }> = ({ c, start, t, L }) => {
  const t0 = start + c.at;
  const t1 = t0 + c.dur;
  if (t < t0 - 0.1 || t > t1 + 0.6) return null;
  const portrait = L.captions === "top";
  const size = portrait ? 118 : 116;
  const out = interpolate(t, [t1, t1 + 0.45], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const box: React.CSSProperties = portrait
    ? { position: "absolute", left: 80, right: 80, top: 150 }
    : { position: "absolute", left: 150, width: 860, top: "50%", transform: "translateY(-50%)" };
  return (
    <div style={box}>
      {c.lines.map((line, i) => {
        const p = interpolate(t, [t0 + i * 0.09, t0 + i * 0.09 + 0.55], [0, 1], { ...clamp, easing: easeOut });
        return (
          // the mask needs headroom, otherwise accents above capitals (Ó, Ś, Ż) get clipped
          <div key={i} style={{ overflow: "hidden", lineHeight: 0.98, paddingTop: size * 0.16, marginTop: -size * 0.16, paddingBottom: size * 0.14, marginBottom: -size * 0.12 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: size,
                textTransform: "uppercase",
                color: i === c.accent ? C.mustard : C.cream,
                transform: `translateY(${(1 - p) * 110 - out * 110}%)`,
                letterSpacing: 0.5,
                textShadow: "0 8px 40px rgba(0,0,0,0.5)",
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
      {c.sub && (
        <div
          style={{
            marginTop: 22,
            fontFamily: SANS,
            fontSize: portrait ? 36 : 34,
            lineHeight: 1.3,
            color: "rgba(242,235,221,0.78)",
            opacity: interpolate(t, [t0 + 0.35, t0 + 0.8], [0, 1], clamp) * (1 - out),
            transform: `translateY(${interpolate(t, [t0 + 0.35, t0 + 0.8], [16, 0], { ...clamp, easing: easeOut })}px)`,
            maxWidth: portrait ? 900 : 760,
          }}
        >
          {c.sub}
        </div>
      )}
    </div>
  );
};

const Captions: React.FC<{ L: Layout; t: number }> = ({ L, t }) => {
  if (!L.captions) return null;
  const any = PLACED.some((s) => s.captions.some((c) => t > s.start + c.at - 0.2 && t < s.start + c.at + c.dur + 0.6));
  const shade = interpolate(Number(any), [0, 1], [0, 1]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {L.captions === "top" ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 760, background: `linear-gradient(${C.ink}f2 0%, ${C.ink}c0 50%, ${C.ink}00 100%)`, opacity: shade }} />
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1150, background: `linear-gradient(90deg, ${C.ink}e6 0%, ${C.ink}99 60%, ${C.ink}00 100%)`, opacity: shade }} />
      )}
      {PLACED.flatMap((s) => s.captions.map((c, i) => <CaptionBlock key={s.id + i} c={c} start={s.start} t={t} L={L} />))}
    </AbsoluteFill>
  );
};

// ---------- share-card pop ----------
const Pops: React.FC<{ L: Layout; t: number; fps: number; frame: number }> = ({ L, t, fps, frame }) => {
  return (
    <>
      {PLACED.filter((s) => s.pop).map((s: Placed) => {
        const pop = s.pop!;
        const t0 = s.start + pop.at, t1 = t0 + pop.dur;
        if (t < t0 || t > t1 + 0.6) return null;
        const pin = spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 16, stiffness: 110 } });
        const pout = interpolate(t, [t1, t1 + 0.5], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
        const h = L.pop.h;
        const w = (h * 9) / 16;
        const startScale = (L.screenH * 0.42) / h;
        const scale = startScale + (1 - startScale) * pin - pout * 0.3;
        const rot = (1 - pin) * 10 - 3 + pout * -6;
        const float = Math.sin((t - t0) * 2.1) * 8;
        return (
          <AbsoluteFill key={s.id} style={{ pointerEvents: "none" }}>
            <AbsoluteFill style={{ background: "rgba(10,10,10,0.55)", opacity: Math.min(pin, 1) * (1 - pout) }} />
            <div
              style={{
                position: "absolute",
                left: L.pop.cx - w / 2,
                top: L.pop.cy - h / 2,
                width: w,
                height: h,
                transform: `translateY(${float + pout * 260}px) rotate(${rot}deg) scale(${scale})`,
                opacity: 1 - pout,
                boxShadow: "0 50px 140px rgba(0,0,0,0.75), 0 0 0 3px rgba(214,164,65,0.9)",
              }}
            >
              <Img src={staticFile(pop.src)} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

// ---------- intro / outro ----------
const Wordmark: React.FC<{ t: number; t0: number; size: number }> = ({ t, t0, size }) => {
  const row = (text: string, color: string, delay: number) => (
    <div style={{ display: "flex", overflow: "hidden", lineHeight: 0.95, paddingTop: size * 0.16, marginTop: -size * 0.16, paddingBottom: size * 0.04 }}>
      {text.split("").map((ch, i) => {
        const p = interpolate(t, [t0 + delay + i * 0.035, t0 + delay + i * 0.035 + 0.5], [0, 1], { ...clamp, easing: easeOut });
        return (
          <span key={i} style={{ fontFamily: DISPLAY, fontSize: size, color, transform: `translateY(${(1 - p) * 105}%)`, display: "inline-block", whiteSpace: "pre" }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
  return (
    <div>
      {row("THE ADVENT", C.cream, 0)}
      {row("SPLITS", C.mustard, 0.18)}
    </div>
  );
};

const Intro: React.FC<{ L: Layout; t: number }> = ({ L, t }) => {
  if (t > INTRO + 0.4) return null;
  const portrait = L.h > L.w;
  const size = portrait ? 230 : 210;
  const bar = interpolate(t, [0.05, 0.45], [0, 1], { ...clamp, easing: easeOut });
  const out = interpolate(t, [INTRO - 0.85, INTRO - 0.15], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const eyebrow = interpolate(t, [0.5, 0.9], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, transform: `scale(${1 + out * 0.18}) translateY(${-out * 80}px)` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: 8, fontSize: portrait ? 30 : 26, color: C.muted, marginBottom: 26, opacity: eyebrow }}>
          @WLOD_RUN PRZEDSTAWIA
        </div>
        <Wordmark t={t} t0={0.25} size={size} />
        <div style={{ height: 12, width: size * 3.1, marginTop: 26, background: C.mustard, transform: `scaleX(${bar})`, transformOrigin: "left" }} />
        <div style={{ marginTop: 26, fontFamily: DISPLAY, fontSize: portrait ? 64 : 56, color: C.cream, letterSpacing: 1, opacity: interpolate(t, [1.0, 1.4], [0, 1], clamp) }}>
          24 DNI · 24 WYZWANIA · 1–24 GRUDNIA
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ L: Layout; t: number }> = ({ L, t }) => {
  const t0 = PHONE_END - 0.3;
  if (t < t0) return null;
  const portrait = L.h > L.w;
  const size = portrait ? 210 : 190;
  const fade = interpolate(t, [t0, t0 + 0.4], [0, 1], clamp);
  const cell = portrait ? 74 : 54;
  const gap = portrait ? 12 : 9;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fade }}>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: portrait ? "flex-start" : "center", gap: portrait ? 70 : 120 }}>
        <div>
          <Wordmark t={t} t0={t0 + 0.05} size={size} />
          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                alignSelf: "flex-start",
                background: C.mustard,
                color: C.ink,
                fontFamily: DISPLAY,
                fontSize: portrait ? 76 : 64,
                padding: portrait ? "10px 28px 14px" : "8px 24px 12px",
                letterSpacing: 1,
                transform: `translateY(${interpolate(t, [t0 + 0.5, t0 + 0.9], [30, 0], { ...clamp, easing: easeOut })}px)`,
                opacity: interpolate(t, [t0 + 0.5, t0 + 0.8], [0, 1], clamp),
              }}
            >
              ADVENTSPLITS.PL
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: portrait ? 40 : 34, color: C.cream, letterSpacing: 2, opacity: interpolate(t, [t0 + 0.8, t0 + 1.1], [0, 1], clamp) }}>
              START 1 GRUDNIA · <span style={{ color: C.mustard }}>@WLOD_RUN</span>
            </div>
          </div>
        </div>
        {/* 24 doors filling up */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(6, ${cell}px)`, gap }}>
          {Array.from({ length: 24 }, (_, i) => {
            const p = interpolate(t, [t0 + 0.6 + i * 0.05, t0 + 0.6 + i * 0.05 + 0.25], [0, 1], { ...clamp, easing: easeOut });
            return (
              <div
                key={i}
                style={{
                  width: cell,
                  height: cell,
                  border: `2px solid ${p > 0.5 ? C.mustard : "rgba(242,235,221,0.18)"}`,
                  background: `rgba(214,164,65,${p})`,
                  transform: `scale(${0.85 + 0.15 * p})`,
                  fontFamily: DISPLAY,
                  fontSize: cell * 0.38,
                  color: p > 0.5 ? C.ink : "rgba(242,235,221,0.3)",
                  padding: cell * 0.08,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- composition ----------
export const Promo: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const L = layoutFor(width, height, variant);
  const fadeIn = interpolate(t, [0, 0.25], [0, 1], clamp);
  const fadeOut = interpolate(t, [TOTAL - 0.35, TOTAL], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.ink, opacity: fadeIn * fadeOut }}>
      <Background L={L} t={t} />
      <Phone L={L} t={t} fps={fps} frame={frame} />
      <Captions L={L} t={t} />
      <Pops L={L} t={t} fps={fps} frame={frame} />
      <Intro L={L} t={t} />
      <Outro L={L} t={t} />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
