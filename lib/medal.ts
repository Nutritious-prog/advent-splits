/**
 * Geometry of the ADVENT SPLITS medal: a ring of N segments (one per calendar day),
 * starting at 12 o'clock and going clockwise. Shared by the app (React SVG) and the
 * share cards (Satori), so both draw exactly the same medal.
 */
export const MEDAL = { w: 200, h: 236, cx: 100, cy: 136, rOuter: 94, rInner: 64, gapDeg: 2.2 } as const;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

const f = (n: number) => n.toFixed(2);

export function medalSegments(n: number): string[] {
  const { cx, cy, rOuter, rInner, gapDeg } = MEDAL;
  const step = 360 / n;
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step + gapDeg / 2;
    const a1 = (i + 1) * step - gapDeg / 2;
    const [x0, y0] = polar(cx, cy, rOuter, a0);
    const [x1, y1] = polar(cx, cy, rOuter, a1);
    const [x2, y2] = polar(cx, cy, rInner, a1);
    const [x3, y3] = polar(cx, cy, rInner, a0);
    return `M${f(x0)} ${f(y0)} A${rOuter} ${rOuter} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${rInner} ${rInner} 0 0 0 ${f(x3)} ${f(y3)} Z`;
  });
}

/** Ribbon above the medal (two straps). */
export const MEDAL_RIBBON = ["M62 4 L92 4 L104 46 L80 52 Z", "M138 4 L108 4 L96 46 L120 52 Z"];

export const MEDAL_COLORS = { on: "#D6A441", off: "#33322E", disc: "#201F1D", ring: "#3E3D38" } as const;

export function medalPercent(done: number, total: number) {
  return Math.round((done / Math.max(1, total)) * 100);
}
