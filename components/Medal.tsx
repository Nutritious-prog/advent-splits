"use client";
import { motion } from "motion/react";
import { MEDAL, MEDAL_COLORS, MEDAL_RIBBON, medalPercent, medalSegments } from "@/lib/medal";

/**
 * Progressive finisher medal: greyed out at the start, every completed day lights up
 * its own segment. At 100% the centre turns gold and reads FINISHER.
 */
export function Medal({
  completedDays,
  days,
  size = 120,
  animate = true,
  className = "",
}: {
  completedDays: number[];
  days: number;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const done = new Set(completedDays);
  const pct = medalPercent(done.size, days);
  const full = done.size >= days;
  const segs = medalSegments(days);
  const { w, h, cx, cy, rInner, rOuter } = MEDAL;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      role="img"
      aria-label={full ? "Medal FINISHER: wszystkie dni ukończone" : `Medal ukończony w ${pct}%: ${done.size} z ${days} segmentów`}
      className={className}
    >
      {MEDAL_RIBBON.map((d, i) => (
        <path key={i} d={d} fill={done.size > 0 ? MEDAL_COLORS.on : MEDAL_COLORS.off} opacity={done.size > 0 ? 0.85 : 1} />
      ))}
      <circle cx={cx} cy={cy} r={rOuter + 4} fill="none" stroke={full ? MEDAL_COLORS.on : MEDAL_COLORS.ring} strokeWidth={2} />
      {segs.map((d, i) => {
        const on = done.has(i + 1);
        return animate && on ? (
          <motion.path
            key={i}
            d={d}
            fill={MEDAL_COLORS.on}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.03, duration: 0.35 }}
          />
        ) : (
          <path key={i} d={d} fill={on ? MEDAL_COLORS.on : MEDAL_COLORS.off} />
        );
      })}
      <circle cx={cx} cy={cy} r={rInner - 6} fill={full ? MEDAL_COLORS.on : MEDAL_COLORS.disc} />
      <text
        x={cx}
        y={cy + (full ? 4 : 10)}
        textAnchor="middle"
        fontFamily="Anton, Impact, sans-serif"
        fontSize={full ? 24 : 40}
        fill={full ? "#191919" : done.size ? "#F2EBDD" : "#6E6C66"}
      >
        {full ? "FINISHER" : `${pct}%`}
      </text>
      {!full && (
        <text x={cx} y={cy + 28} textAnchor="middle" fontFamily="Archivo, sans-serif" fontSize={9} letterSpacing={2.5} fill="#92908A">
          MEDALU
        </text>
      )}
    </svg>
  );
}
