"use client";
import { motion } from "motion/react";
import { Flag, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { pick } from "@/lib/gender";
import { CATEGORY_LABEL, formatMinutes } from "@/lib/labels";
import type { CalendarState } from "@/lib/types";

/** Shown after the 24th door (or the last missing one) is completed. */
export function FinaleSheet({
  open,
  onClose,
  state,
  onShowSummary,
}: {
  open: boolean;
  onClose: () => void;
  state: CalendarState;
  onShowSummary: () => void;
}) {
  const s = state.stats;
  const full = s.completed >= state.days;
  const g = state.participant.gender;
  const missing = state.days - s.completed;

  return (
    <Sheet open={open} onClose={onClose} label="Finał">
      <div className="relative overflow-hidden p-6 pt-8 sm:p-8">
        <motion.div
          initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
          className="flex h-16 w-16 items-center justify-center bg-mustard text-ink"
        >
          <Flag size={30} aria-hidden />
        </motion.div>

        <p className="eyebrow mt-6 text-mustard">{full ? "Meta" : "Dzień 24 zaliczony"}</p>
        <motion.h2 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="display mt-2 text-6xl">
          {full ? "Full distance" : "Meta. Prawie."}
        </motion.h2>
        <p className="mt-4 text-lg leading-relaxed text-cream/75">
          {full
            ? pick(
                g,
                "Zrobiłeś wszystkie 24 wyzwania. Twój grudzień przejdzie do historii (przynajmniej Twojej).",
                "Zrobiłaś wszystkie 24 wyzwania. Twój grudzień przejdzie do historii (przynajmniej Twojej).",
                "Wszystkie 24 wyzwania zaliczone. Ten grudzień przejdzie do historii (przynajmniej Twojej).",
              )
            : `Masz ${s.completed}/${state.days}. Zostało ${missing} ${missing === 1 ? "okienko" : missing < 5 ? "okienka" : "okienek"} do nadrobienia, a kalendarz zostaje otwarty także po świętach.`}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line">
          {[
            ["Zaliczone", `${s.completed} / ${state.days}`],
            ["Najdłuższa seria", `${s.longestStreak}`],
            ["Czas ruchu", s.minutes ? `~${formatMinutes(s.minutes)}` : "—"],
            ["Ulubiona kategoria", s.favoriteCategory ? CATEGORY_LABEL[s.favoriteCategory] : "—"],
          ].map(([l, v]) => (
            <div key={l} className="bg-ink p-3">
              <dd className="display text-2xl">{v}</dd>
              <dt className="eyebrow mt-1">{l}</dt>
            </div>
          ))}
        </dl>

        <Button size="lg" className="mt-6 w-full" onClick={onShowSummary}>
          <Share2 size={18} /> Moje podsumowanie do relacji
        </Button>
        <button onClick={onClose} className="mt-3 min-h-11 w-full text-sm text-cream/55 hover:text-cream">
          Wróć do kalendarza
        </button>
      </div>
    </Sheet>
  );
}
