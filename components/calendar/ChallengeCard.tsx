"use client";
import { motion, type Variants } from "motion/react";
import { Check, Clock, Gauge, Package, Share2, ShieldAlert, Lightbulb, RotateCcw, Flag, Shuffle } from "lucide-react";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { Button } from "@/components/ui/Button";
import { ResultForm } from "./ResultForm";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, GEAR_LABEL, formatMinutes } from "@/lib/labels";
import type { DoorState } from "@/lib/types";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
};

const longestWord = (s: string, min = 8): number => Math.max(min, ...s.split(/\s+/).map((w) => w.length));

function DifficultyBars({ level }: { level: "EASY" | "MEDIUM" | "HARD" }) {
  const n = level === "EASY" ? 1 : level === "MEDIUM" ? 2 : 3;
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-1.5 ${i <= n ? "bg-mustard" : "bg-cream/15"}`} style={{ height: 5 + i * 4 }} />
      ))}
    </span>
  );
}

export function ChallengeCard({
  door,
  busy,
  onAccept,
  onComplete,
  onUndo,
  onShare,
  onSaveResult,
}: {
  door: DoorState;
  busy: string | null;
  onAccept: () => void;
  onComplete: () => void;
  onUndo: () => void;
  onShare: () => void;
  onSaveResult: (value: string, free: boolean) => Promise<void>;
}) {
  const c = door.challenge!;
  const completed = door.status === "COMPLETED";
  const accepted = !!door.acceptedAt;

  return (
    <div className="relative">
      <motion.div variants={container} initial="hidden" animate="show" className="px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
        <motion.div variants={item} className="flex items-center gap-3 pr-10">
          <span className="display shrink-0 whitespace-nowrap text-2xl text-mustard">DZIEŃ {String(door.day).padStart(2, "0")}</span>
          <span className="h-px flex-1 bg-line" />
          <span className="eyebrow min-w-0 text-right">{CATEGORY_LABEL[c.category]}</span>
        </motion.div>

        <div className="mt-6 flex items-start gap-4 sm:gap-5">
          <motion.div
            initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 min-[400px]:h-20 min-[400px]:w-20 sm:h-24 sm:w-24 ${
              completed ? "border-mustard bg-mustard text-ink" : "border-cream text-cream"
            }`}
          >
            <ChallengeIcon name={c.icon} className="h-8 w-8 min-[400px]:h-10 min-[400px]:w-10 sm:h-12 sm:w-12" strokeWidth={1.4} />
          </motion.div>
          <motion.div variants={item} className="min-w-0 flex-1 pt-1 [container-type:inline-size]">
            {/* Long single words (WYTRZYMAŁOŚCIOWCÓW) shrink the title to the column width instead of overflowing. */}
            <h2
              className="display text-[length:min(2.15rem,var(--fit))] [overflow-wrap:anywhere] sm:text-[length:min(3rem,var(--fit))]"
              style={{ "--fit": `calc(100cqw / ${(longestWord(c.title) * 0.5).toFixed(2)})` } as React.CSSProperties}
            >
              {/* keep "6 × 1" together so the × never ends a line */}
              {c.title.replace(/ × /g, " × ")}
            </h2>
            <p className="mt-2 text-base text-cream/70">{c.teaser}</p>
          </motion.div>
        </div>

        <motion.dl variants={item} className="mt-6 grid grid-cols-3 border border-line">
          <div className="flex flex-col gap-1.5 border-r border-line p-3">
            <dt className="eyebrow flex items-center gap-1.5">
              <Gauge size={12} aria-hidden /> Poziom
            </dt>
            <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase min-[400px]:text-sm">
              <DifficultyBars level={c.difficulty} /> {DIFFICULTY_LABEL[c.difficulty]}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 border-r border-line p-3">
            <dt className="eyebrow flex items-center gap-1.5">
              <Clock size={12} aria-hidden /> Czas
            </dt>
            <dd className="text-xs font-bold uppercase min-[400px]:text-sm">~{formatMinutes(c.minutes)}</dd>
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            <dt className="eyebrow flex items-center gap-1.5">
              <Package size={12} aria-hidden /> Sprzęt
            </dt>
            <dd className="text-xs font-bold uppercase leading-tight [overflow-wrap:anywhere] min-[400px]:text-sm">{GEAR_LABEL[c.gear]}</dd>
          </div>
        </motion.dl>

        <motion.p variants={item} className="mt-6 text-[1.02rem] leading-relaxed text-cream/90">
          {c.description}
        </motion.p>

        {c.equipment.length > 0 && (
          <motion.div variants={item} className="mt-5">
            <p className="eyebrow">Potrzebujesz</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {c.equipment.map((e) => (
                <li key={e} className="border border-line px-2.5 py-1 text-sm text-cream/80">
                  {e}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <motion.div variants={item} className="mt-7">
          <h3 className="eyebrow">Jak to zrobić</h3>
          <ol className="mt-3 space-y-3">
            {c.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="display flex h-7 w-7 shrink-0 items-center justify-center bg-cream text-base text-ink">{i + 1}</span>
                <span className="pt-0.5 leading-relaxed text-cream/90">{s}</span>
              </li>
            ))}
          </ol>
        </motion.div>

        {c.tips && (
          <motion.div variants={item} className="mt-6 flex gap-3 border-l-2 border-mustard bg-mustard/5 p-4">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-mustard" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-mustard">Protip. </span>
              {c.tips}
            </p>
          </motion.div>
        )}

        <motion.div variants={item} className="mt-6 grid gap-3 sm:grid-cols-2">
          {c.easier && (
            <div className="border border-line p-4">
              <p className="eyebrow">Wersja łatwiejsza</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/85">{c.easier}</p>
            </div>
          )}
          {c.harder && (
            <div className="border border-line p-4">
              <p className="eyebrow text-mustard">Wersja trudniejsza</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/85">{c.harder}</p>
            </div>
          )}
        </motion.div>

        {c.swap && (
          <motion.div variants={item} className="mt-3 flex gap-3 border border-line p-4">
            <Shuffle size={18} className="mt-0.5 shrink-0 text-mustard" aria-hidden />
            <p className="text-sm leading-relaxed text-cream/85">
              <span className="font-bold uppercase tracking-wider text-mustard">Inna dyscyplina? </span>
              {c.swap}
            </p>
          </motion.div>
        )}

        {c.safety && (
          <motion.div variants={item} className="mt-6 flex gap-3 border border-danger/30 bg-danger/5 p-4">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <p className="text-sm leading-relaxed text-cream/85">
              <span className="font-bold uppercase tracking-wider text-danger">Bezpieczeństwo. </span>
              {c.safety}
            </p>
          </motion.div>
        )}

        <motion.p variants={item} className="mt-5 text-xs leading-relaxed text-cream/55">
          Słuchaj swojego ciała. Ból to sygnał do przerwania, nie do zaciśnięcia zębów. Wybierz wersję, która dziś ma sens.
        </motion.p>

        {completed && (
          <motion.div variants={item} className="mt-7">
            <ResultForm challenge={c} current={door.result} onSave={onSaveResult} />
          </motion.div>
        )}
      </motion.div>

      <div className="sticky bottom-0 z-10 border-t border-line bg-ink/95 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 backdrop-blur sm:px-8">
        {completed ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-mustard">
                <span className="flex h-7 w-7 items-center justify-center bg-mustard text-ink">
                  <Check size={16} strokeWidth={3} />
                </span>
                Zaliczone
              </span>
              <button onClick={onUndo} disabled={busy === "complete"} className="flex min-h-11 items-center gap-1.5 text-xs text-cream/55 hover:text-cream">
                <RotateCcw size={13} /> Cofnij
              </button>
            </div>
            <Button size="lg" onClick={onShare}>
              <Share2 size={18} /> Udostępnij
            </Button>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {accepted && (
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-mustard">
                <Flag size={14} aria-hidden /> Wyzwanie podjęte. Teraz tylko je zrobić.
              </p>
            )}
            {!accepted ? (
              <Button size="lg" onClick={onAccept} loading={busy === "accept"}>
                <Flag size={18} /> Podejmuję wyzwanie
              </Button>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              <Button size="lg" variant={accepted ? "primary" : "outline"} onClick={onComplete} loading={busy === "complete"}>
                <Check size={18} /> Oznacz jako wykonane
              </Button>
              <Button size="lg" variant="outline" onClick={onShare} aria-label="Udostępnij" className="px-4">
                <Share2 size={18} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
