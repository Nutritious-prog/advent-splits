import { Easing } from "remotion";
import { KEYS } from "./timeline";

const ease = Easing.bezier(0.65, 0, 0.35, 1);

export type Cam = { z: number; fx: number; fy: number; ry: number; rx: number };

// Eased interpolation between neighbouring keys; holds the first/last key outside the range.
export function cameraAt(t: number): Cam {
  if (t <= KEYS[0].t) return KEYS[0];
  const last = KEYS[KEYS.length - 1];
  if (t >= last.t) return last;
  let i = 0;
  while (KEYS[i + 1].t < t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const p = ease((t - a.t) / Math.max(0.0001, b.t - a.t));
  const mix = (x: number, y: number) => x + (y - x) * p;
  // Focus only matters when zoomed: blend it toward the screen centre as zoom approaches 1.
  return { z: mix(a.z, b.z), fx: mix(a.fx, b.fx), fy: mix(a.fy, b.fy), ry: mix(a.ry, b.ry), rx: mix(a.rx, b.rx) };
}
