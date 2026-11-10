"use client";
import { motion } from "motion/react";
import { Check, Lock } from "lucide-react";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { warsawDate } from "@/lib/client";
import type { DoorState } from "@/lib/types";

const STATUS_LABEL = { LOCKED: "zamknięte", AVAILABLE: "do otwarcia", OPENED: "otwarte", COMPLETED: "ukończone" };

export function Door({
  door,
  opening,
  isToday,
  isFinal = false,
  onActivate,
  index,
}: {
  door: DoorState;
  opening: boolean;
  isToday: boolean;
  isFinal?: boolean;
  onActivate: (door: DoorState) => void;
  index: number;
}) {
  const n = String(door.day).padStart(2, "0");
  const tags = `${isFinal ? ", finał" : ""}${isToday && door.status !== "LOCKED" ? ", dzisiejsze" : ""}`;
  const label =
    door.status === "LOCKED"
      ? `Okienko ${door.day}${tags}, ${STATUS_LABEL.LOCKED}, otwiera się ${warsawDate(door.unlockAt)}`
      : door.challenge
        ? `Okienko ${door.day}${tags}, ${STATUS_LABEL[door.status]}: ${door.challenge.title}`
        : `Okienko ${door.day}${tags}, ${STATUS_LABEL[door.status]}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.35 }}
      className="relative aspect-[4/5] [perspective:900px]"
    >
      <motion.button
        type="button"
        onClick={() => onActivate(door)}
        aria-label={label}
        disabled={opening}
        animate={opening ? { x: [0, -5, 5, -4, 4, -2, 0], rotate: [0, -1, 1, -1, 1, 0, 0] } : { x: 0, rotate: 0 }}
        transition={{ duration: 0.38 }}
        whileHover={door.status === "LOCKED" ? { y: -2 } : { y: -3 }}
        whileTap={{ scale: 0.96 }}
        className={`group relative h-full w-full text-left outline-offset-4 ${door.status === "AVAILABLE" ? "animate-door-pulse" : ""}`}
      >
        {/* Inside of the door, revealed when the panel swings open */}
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden bg-mustard">
          <motion.span
            initial={false}
            animate={opening ? { scale: [0.4, 1.3], opacity: [0, 1] } : { scale: 0.4, opacity: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="text-ink"
          >
            <ChallengeIcon name="sparkles" className="h-10 w-10" strokeWidth={2} />
          </motion.span>
        </span>

        {/* Door panel */}
        <motion.span
          initial={false}
          animate={opening ? { rotateY: -112 } : { rotateY: 0 }}
          transition={opening ? { delay: 0.36, duration: 0.62, ease: [0.7, 0, 0.3, 1] } : { duration: 0.3 }}
          style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
          className={`absolute inset-0 flex flex-col justify-between p-2.5 sm:p-3 ${
            door.status === "LOCKED"
              ? "hatch border border-line bg-[#1d1d1c] text-muted"
              : door.status === "AVAILABLE"
                ? "bg-charcoal text-cream"
                : door.status === "OPENED"
                  ? "border border-cream/25 bg-charcoal text-cream"
                  : "bg-mustard text-ink"
          }`}
        >
          {/* Number + today marker (a dot, so it fits even on 320 px screens; the label lives in aria-label and the bottom row) */}
          <span className="flex items-start justify-between">
            <span className={`display text-[2rem] leading-none sm:text-5xl ${door.status === "LOCKED" ? "text-cream/40" : ""}`}>{n}</span>
            {isToday && door.status !== "LOCKED" && (
              <span aria-hidden className={`mt-1 h-2.5 w-2.5 rounded-full ${door.status === "COMPLETED" ? "bg-ink" : "bg-mustard"}`} />
            )}
          </span>

          {/* Bottom row: min. 11 px text (audit A11Y-01) */}
          <span className="flex items-end justify-between gap-1">
            {door.status === "LOCKED" && (
              <>
                <span className={`text-[11px] font-bold uppercase leading-none tracking-wide ${isFinal ? "text-mustard" : "text-cream/55"}`}>
                  {isFinal ? "Finał" : warsawDate(door.unlockAt, { day: "numeric", month: "numeric" })}
                </span>
                <Lock size={13} className="shrink-0 text-cream/45 transition-transform group-hover:-rotate-12" aria-hidden />
              </>
            )}
            {door.status === "AVAILABLE" && (
              <span className="text-[11px] font-bold uppercase leading-none tracking-wide text-mustard sm:text-xs">
                {isToday ? "Dziś" : "Otwórz"}
              </span>
            )}
            {door.status === "OPENED" && door.challenge && (
              <>
                <span className="hidden text-[11px] font-semibold uppercase leading-tight tracking-wide text-cream/70 sm:line-clamp-2">
                  {door.challenge.title}
                </span>
                <ChallengeIcon name={door.challenge.icon} className="ml-auto h-5 w-5 shrink-0 text-mustard sm:h-6 sm:w-6" />
              </>
            )}
            {door.status === "COMPLETED" && door.challenge && (
              <>
                <ChallengeIcon name={door.challenge.icon} className="h-5 w-5 shrink-0 opacity-60 sm:h-6 sm:w-6" />
                <span className="flex h-6 w-6 items-center justify-center bg-ink text-mustard sm:h-7 sm:w-7">
                  <Check size={15} strokeWidth={3} aria-hidden />
                </span>
              </>
            )}
          </span>
        </motion.span>
      </motion.button>
    </motion.div>
  );
}
