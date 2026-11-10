"use client";
import { motion } from "motion/react";
import { useMemo } from "react";

/** Small, restrained burst of mustard/cream shapes. Rendered only when reduced motion is off. */
export function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const rnd = (i: number) => {
      const x = Math.sin(seed * 999 + i * 7.13) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: 34 }, (_, i) => {
      const angle = rnd(i) * Math.PI * 2;
      const dist = 120 + rnd(i + 50) * 220;
      return {
        i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 80,
        rot: rnd(i + 100) * 720 - 360,
        size: 6 + rnd(i + 150) * 9,
        shape: i % 3,
        color: i % 4 === 0 ? "#F2EBDD" : "#D6A441",
        delay: rnd(i + 200) * 0.12,
      };
    });
  }, [seed]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.rot, scale: 1 }}
          transition={{ duration: 1.5, delay: p.delay, ease: [0.15, 0.7, 0.4, 1], times: [0, 0.45, 1] }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.shape === 1 ? p.size * 0.4 : p.size,
            background: p.shape === 2 ? "transparent" : p.color,
            borderLeft: p.shape === 2 ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === 2 ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 2 ? `${p.size}px solid ${p.color}` : undefined,
            borderRadius: p.shape === 0 && p.i % 2 ? 999 : 0,
          }}
        />
      ))}
    </div>
  );
}
